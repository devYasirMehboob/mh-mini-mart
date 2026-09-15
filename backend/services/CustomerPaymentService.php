<?php

declare(strict_types=1);

namespace App\Services;

use App\Config\Database;
use App\Http\HttpException;
use App\Repositories\ActivityLogRepository;
use App\Repositories\CustomerPaymentRepository;
use App\Repositories\CustomerRepository;
use App\Repositories\SaleRepository;
use App\Validators\CustomerValidator;

/**
 * CustomerPaymentService
 *
 * Handles standalone khata payments (customer visits to pay old balance).
 * Does NOT create a fake sale. Uses a single PDO transaction.
 */
final class CustomerPaymentService
{
    public function __construct(
        private readonly Database                 $database,
        private readonly CustomerRepository       $customers,
        private readonly CustomerPaymentRepository $payments,
        private readonly CustomerLedgerService    $ledger,
        private readonly CustomerValidator        $validator,
        private readonly ActivityLogRepository    $activity,
        private readonly SaleRepository           $sales
    ) {}

    public function receive(int $cashierId, int $customerId, array $input): array
    {
        $data = $this->validator->payment($input);

        // Idempotency check
        $existing = $this->payments->findByToken($data['request_token']);
        if ($existing !== null) {
            return ['payment' => $this->payments->findById((int) $existing['id']), 'already_recorded' => true];
        }

        $amountCents = (int) $data['amount_cents'];

        $pdo = $this->database->connection();
        $pdo->beginTransaction();

        try {
            // Lock customer row
            $customer = $this->customers->findByIdForUpdate($customerId);
            if ($customer === null) throw new HttpException('Customer not found.', 404);
            if ((int) $customer['is_system_walk_in'] === 1) {
                throw new HttpException('The anonymous Walk-in Customer cannot hold a khata balance.', 422);
            }
            if ($customer['status'] !== 'active') {
                throw new HttpException('This customer account is inactive.', 422);
            }
            if ((int) $customer['khata_enabled'] !== 1) {
                throw new HttpException('Khata is not enabled for this customer.', 422);
            }

            $prevBalanceCents = (int) round((float) $customer['current_balance'] * 100);

            if ($amountCents > $prevBalanceCents && $prevBalanceCents > 0) {
                // Only allow paying exactly what is owed (advance handling is future phase)
                throw new HttpException(
                    'Payment amount exceeds outstanding balance. Advance deposits are not yet supported.',
                    422,
                    ['amount' => ['Maximum payable: ' . number_format($prevBalanceCents / 100, 2)]]
                );
            }
            if ($amountCents <= 0) {
                throw new HttpException('Payment amount must be greater than zero.', 422);
            }

            $newOutstandingCents = max(0, $prevBalanceCents - $amountCents);
            $paymentNumber = $this->payments->nextPaymentNumber();

            // Create payment record
            $paymentId = $this->payments->create([
                'payment_number'   => $paymentNumber,
                'customer_id'      => $customerId,
                'sale_id'          => null,
                'amount'           => number_format($amountCents / 100, 2, '.', ''),
                'payment_method'   => $data['payment_method'],
                'reference_number' => $data['reference_number'],
                'payment_date'     => $data['payment_date'],
                'notes'            => $data['notes'],
                'request_token'    => $data['request_token'],
                'previous_balance' => number_format($prevBalanceCents / 100, 2, '.', ''),
                'balance_after'    => number_format($newOutstandingCents / 100, 2, '.', ''),
                'received_by'      => $cashierId,
            ]);

            // Post ledger entry
            $this->ledger->postKhataPayment(
                $customerId,
                $paymentId,
                $cashierId,
                $prevBalanceCents,
                $amountCents,
                $newOutstandingCents,
                $paymentNumber,
                $data['request_token'] . '_kpay'
            );

            // Update cached customer balance
            $this->customers->updateBalance(
                $customerId,
                number_format($newOutstandingCents / 100, 2, '.', ''),
                $customer['advance_balance']
            );

            // FIFO allocation of payment to pending/partial sales
            $unpaidSales = $this->sales->findUnpaidByCustomer($customerId);
            $remainingPaymentCents = $amountCents;

            foreach ($unpaidSales as $sale) {
                if ($remainingPaymentCents <= 0) {
                    break;
                }

                $grandTotalCents = (int) round((float) $sale['grand_total'] * 100);
                $receivedCents = (int) round((float) $sale['amount_received'] * 100);
                $appliedCents = (int) round((float) $sale['customer_payment_applied'] * 100);

                $dueCents = max(0, $grandTotalCents - ($receivedCents + $appliedCents));
                
                if ($dueCents > 0) {
                    $applyCents = min($dueCents, $remainingPaymentCents);
                    $newAppliedCents = $appliedCents + $applyCents;
                    $remainingPaymentCents -= $applyCents;

                    $newTotalReceivedCents = $receivedCents + $newAppliedCents;
                    $newPaymentStatus = $newTotalReceivedCents >= $grandTotalCents ? 'paid' : 'partial';

                    $this->sales->updatePaymentApplied(
                        (int) $sale['id'],
                        number_format($newAppliedCents / 100, 2, '.', ''),
                        $newPaymentStatus
                    );
                }
            }

            // Activity log
            $this->activity->log(
                $cashierId,
                'khata_payment_received',
                'Khata payment received: ' . $paymentNumber .
                    ' — ' . $customer['name'] . ' paid Rs. ' . number_format($amountCents / 100, 2) .
                    '. Remaining: Rs. ' . number_format($newOutstandingCents / 100, 2)
            );

            $pdo->commit();

            return [
                'payment'         => $this->payments->findById($paymentId),
                'already_recorded'=> false,
            ];
        } catch (\Throwable $e) {
            $pdo->rollBack();
            if ($e instanceof HttpException) throw $e;
            throw new HttpException('Payment failed. Please try again.', 500);
        }
    }

    public function getPayments(int $customerId, int $page = 1, int $limit = 20): array
    {
        return $this->payments->paginateByCustomer($customerId, $page, $limit);
    }

    public function getPaymentById(int $id): array
    {
        $payment = $this->payments->findById($id);
        if ($payment === null) throw new HttpException('Payment not found.', 404);
        return $payment;
    }
}
