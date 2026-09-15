<?php

declare(strict_types=1);

namespace App\Services;

use App\Repositories\CustomerLedgerRepository;
use App\Repositories\CustomerRepository;

/**
 * CustomerLedgerService
 *
 * Central service for all ledger entries and balance calculations.
 * All money is stored in cents (integer) internally; formatted as DECIMAL strings for the DB.
 */
final class CustomerLedgerService
{
    public function __construct(
        private readonly CustomerLedgerRepository $ledger,
        private readonly CustomerRepository       $customers
    ) {}

    // -------------------------------------------------------------------------
    // Settlement formula
    // net = prevBalance + currentBill - amountReceived
    // if net > 0 → new outstanding = net
    // if net = 0 → fully settled
    // if net < 0 → new outstanding = 0, excess = advance (if enabled)
    // -------------------------------------------------------------------------
    public function calculateSettlement(
        int $prevBalanceCents,
        int $currentBillCents,
        int $receivedCents
    ): array {
        $netCents = $prevBalanceCents + $currentBillCents - $receivedCents;

        $newOutstandingCents = max(0, $netCents);
        $excessCents         = $netCents < 0 ? abs($netCents) : 0;

        // Of the received amount, how much goes to current bill vs. old khata?
        $appliedToCurrentSaleCents = min($receivedCents, $currentBillCents);
        $appliedToOldKhataCents    = max(0, $receivedCents - $currentBillCents);

        // Credit amount = unpaid portion of current bill
        $creditAmountCents = max(0, $currentBillCents - $appliedToCurrentSaleCents);

        return [
            'net_cents'                   => $netCents,
            'new_outstanding_cents'       => $newOutstandingCents,
            'excess_cents'                => $excessCents,
            'applied_to_current_sale_cents' => $appliedToCurrentSaleCents,
            'applied_to_old_khata_cents'  => $appliedToOldKhataCents,
            'credit_amount_cents'         => $creditAmountCents,
        ];
    }

    // -------------------------------------------------------------------------
    // Post ledger entries for a completed credit/partial sale
    // Called inside SaleService::complete() within the same PDO transaction
    // -------------------------------------------------------------------------
    public function postSaleLedgerEntries(
        int    $customerId,
        int    $saleId,
        int    $cashierId,
        int    $prevBalanceCents,
        int    $currentBillCents,
        int    $receivedCents,
        array  $settlement,
        string $invoiceNumber,
        string $salePaymentRequestToken
    ): void {
        $balance = $prevBalanceCents;

        // 1. Credit sale entry (if any credit was created)
        if ($settlement['credit_amount_cents'] > 0) {
            $balance += $settlement['credit_amount_cents'];
            $this->ledger->create([
                'customer_id'   => $customerId,
                'entry_number'  => $this->ledger->nextEntryNumber(),
                'entry_type'    => 'credit_sale',
                'reference_type'=> 'sale',
                'reference_id'  => $saleId,
                'sale_id'       => $saleId,
                'debit_amount'  => $this->money($settlement['credit_amount_cents']),
                'credit_amount' => '0.00',
                'balance_after' => $this->money($balance),
                'description'   => 'Credit sale: invoice ' . $invoiceNumber,
                'entry_date'    => date('Y-m-d'),
                'created_by'    => $cashierId,
            ]);
        }

        // 2. Sale payment entry (if they paid more than the current bill, applying to old khata)
        $appliedToKhata = $settlement['applied_to_old_khata_cents'];
        if ($appliedToKhata > 0) {
            $balance -= $appliedToKhata;
            $balance  = max(0, $balance); // cannot go below zero here
            $this->ledger->create([
                'customer_id'    => $customerId,
                'entry_number'   => $this->ledger->nextEntryNumber(),
                'entry_type'     => 'sale_payment',
                'reference_type' => 'sale',
                'reference_id'   => $saleId,
                'sale_id'        => $saleId,
                'debit_amount'   => '0.00',
                'credit_amount'  => $this->money($appliedToKhata),
                'balance_after'  => $this->money($settlement['new_outstanding_cents']),
                'description'    => 'Payment at sale: invoice ' . $invoiceNumber,
                'entry_date'     => date('Y-m-d'),
                'request_token'  => $salePaymentRequestToken,
                'created_by'     => $cashierId,
            ]);
        }
    }

    // -------------------------------------------------------------------------
    // Post ledger entry for a standalone khata payment
    // -------------------------------------------------------------------------
    public function postKhataPayment(
        int    $customerId,
        int    $paymentId,
        int    $cashierId,
        int    $prevBalanceCents,
        int    $receivedCents,
        int    $newOutstandingCents,
        string $paymentNumber,
        string $requestToken
    ): void {
        $this->ledger->create([
            'customer_id'    => $customerId,
            'entry_number'   => $this->ledger->nextEntryNumber(),
            'entry_type'     => 'customer_payment',
            'reference_type' => 'customer_payment',
            'reference_id'   => $paymentId,
            'payment_id'     => $paymentId,
            'debit_amount'   => '0.00',
            'credit_amount'  => $this->money($receivedCents),
            'balance_after'  => $this->money($newOutstandingCents),
            'description'    => 'Khata payment: ' . $paymentNumber,
            'entry_date'     => date('Y-m-d'),
            'request_token'  => $requestToken,
            'created_by'     => $cashierId,
        ]);
    }

    // -------------------------------------------------------------------------
    // Reverse ledger entries for a cancelled sale
    // -------------------------------------------------------------------------
    public function reverseSaleLedgerEntries(int $customerId, int $saleId, int $cashierId, string $invoiceNumber): void
    {
        // Delegate to repository to cancel entries
        $this->ledger->cancelEntriesForSale($saleId);
        
        // Re-calculate the customer balance based on all active entries
        $reconciliation = $this->reconcile($customerId);
        $newBalance = $reconciliation['calculated_balance'];
        
        // 3. Keep the existing advance_balance the same when updating
        $cust = $this->customers->findById($customerId);
        $advanceBalance = $cust ? $cust['advance_balance'] : '0.00';

        $this->customers->updateBalance($customerId, $newBalance, $advanceBalance);
    }

    // -------------------------------------------------------------------------
    // Statement
    // -------------------------------------------------------------------------
    public function getStatement(int $customerId, array $filters): array
    {
        $openingBalance = '0.00';
        if (!empty($filters['date_from'])) {
            $openingBalance = $this->ledger->getBalanceBeforeDate($customerId, $filters['date_from']);
        }

        $entries = $this->ledger->getStatement($customerId, $filters);

        return [
            'opening_balance' => $openingBalance,
            'entries'         => $entries,
        ];
    }

    // -------------------------------------------------------------------------
    // Paginated ledger for customer detail
    // -------------------------------------------------------------------------
    public function getLedger(int $customerId, int $page, int $limit): array
    {
        return $this->ledger->paginateByCustomer($customerId, $page, $limit);
    }

    // -------------------------------------------------------------------------
    // Balance reconciliation
    // -------------------------------------------------------------------------
    public function reconcile(int $customerId): array
    {
        return $this->ledger->reconcile($customerId);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------
    private function money(int $cents): string
    {
        return number_format($cents / 100, 2, '.', '');
    }
}
