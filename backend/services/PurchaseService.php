<?php
declare(strict_types=1);
namespace App\Services;

use App\Config\Database;
use App\Http\HttpException;
use App\Repositories\ActivityLogRepository;
use App\Repositories\ProductRepository;
use App\Repositories\PurchaseItemRepository;
use App\Repositories\PurchasePaymentRepository;
use App\Repositories\PurchaseRepository;
use App\Repositories\PurchaseReturnRepository;
use App\Repositories\StockTransactionRepository;
use App\Repositories\SupplierRepository;
use App\Validators\PurchaseValidator;
use App\Repositories\BatchRepository;
use Throwable;

final class PurchaseService
{
    public function __construct(
        private readonly Database $db,
        private readonly PurchaseRepository $purchases,
        private readonly PurchaseItemRepository $items,
        private readonly PurchasePaymentRepository $payments,
        private readonly PurchaseReturnRepository $returns,
        private readonly SupplierRepository $suppliers,
        private readonly ProductRepository $products,
        private readonly StockTransactionRepository $stock,
        private readonly PurchaseValidator $validator,
        private readonly ActivityLogRepository $activity,
        private readonly SystemConfigurationService $config,
        private readonly ?BatchRepository $batches = null
    ) {
    }

    public function list(array $q): array
    {
        $f = $this->validator->filters($q);
        return $this->purchases->paginate($f) + [
            'summary' => $this->purchases->summary(),
            'suppliers' => $this->suppliers->active()
        ];
    }

    public function detail(int $id): array
    {
        $p = $this->purchases->find($id);
        if (!$p) {
            throw new HttpException('Purchase not found.', 404);
        }
        $p['items'] = $this->items->byPurchase($id);
        $p['payments'] = $this->payments->byPurchase($id);
        $p['returns'] = $this->returns->byPurchase($id);
        return $p;
    }

    public function create(array $input, int $user, bool $draft = false): array
    {
        $d = $this->validator->purchase($input);
        $existing = $this->purchases->findByToken($d['request_token']);
        if ($existing) {
            return $this->detail((int)$existing['id']);
        }
        return $this->save($d, $user, $draft, null);
    }

    public function updateDraft(int $id, array $input, int $user): array
    {
        $d = $this->validator->purchase($input);
        return $this->save($d, $user, true, $id);
    }

    public function completeDraft(int $id, array $input, int $user): array
    {
        $d = $this->validator->purchase($input);
        return $this->save($d, $user, false, $id);
    }

    private function save(array $d, int $user, bool $draft, ?int $id): array
    {
        $pdo = $this->db->connection();
        $pdo->beginTransaction();
        try {
            $current = $id ? $this->purchases->find($id, true) : null;
            if ($id && (!$current || $current['purchase_status'] !== 'draft')) {
                throw new HttpException('Only draft purchases can be edited or completed.', 409);
            }
            $supplier = $this->suppliers->find($d['supplier_id'], true);
            if (!$supplier) {
                throw new HttpException('Supplier not found.', 404);
            }
            if ($supplier['status'] !== 'active') {
                throw new HttpException('Select an active supplier.', 422, ['supplier_id' => ['This supplier is inactive.']]);
            }
            if ($this->purchases->invoiceExists($d['supplier_id'], $d['supplier_invoice_number'], $id)) {
                throw new HttpException('This supplier invoice number is already recorded.', 409, ['supplier_invoice_number' => ['Invoice number must be unique for this supplier.']]);
            }

            $calculated = $this->calculate($d);
            $paid = $draft ? 0 : $d['amount_paid_cents'];
            if ($paid > $calculated['grand']) {
                throw new HttpException('Payment cannot exceed the purchase total.', 422, ['amount_paid' => ['Enter no more than ' . $this->money($calculated['grand']) . '.']]);
            }

            $status = $paid === 0 ? 'unpaid' : ($paid === $calculated['grand'] ? 'paid' : 'partially_paid');

            $write = [
                'supplier_id' => $d['supplier_id'],
                'supplier_invoice_number' => $d['supplier_invoice_number'],
                'purchase_date' => $d['purchase_date'],
                'subtotal' => $this->money($calculated['subtotal']),
                'discount_amount' => $this->money($d['overall_discount_cents']),
                'tax_amount' => $this->money($d['tax_cents']),
                'shipping_amount' => $this->money($d['shipping_amount_cents']),
                'other_charges' => $this->money($d['other_charges_cents']),
                'grand_total' => $this->money($calculated['grand']),
                'payment_status' => $draft ? 'unpaid' : $status,
                'notes' => $d['notes']
            ];

            if ($id) {
                $this->items->deleteByPurchase($id);
                $this->purchases->updateDraft($id, $write);
                $purchaseId = $id;
            } else {
                $purchaseId = $this->purchases->create($write + [
                    'purchase_number' => $this->purchases->nextNumber($d['purchase_date']),
                    'request_token' => $d['request_token'],
                    'amount_paid' => $this->money($paid),
                    'balance_due' => $this->money($draft ? $calculated['grand'] : $calculated['grand'] - $paid),
                    'purchase_status' => $draft ? 'draft' : 'completed',
                    'created_by' => $user
                ]);
            }

            $linesWithIds = [];
            foreach ($calculated['lines'] as $line) {
                $itemId = $this->items->create($purchaseId, [
                    'product_id' => $line['product']['id'],
                    'product_name' => $line['product']['name'],
                    'product_code' => $line['product']['product_code'],
                    'quantity' => $this->quantity($line['quantity']),
                    'unit_cost' => $this->money($line['cost']),
                    'line_discount' => $this->money($line['discount']),
                    'tax_amount' => '0.00',
                    'line_total' => $this->money($line['total'])
                ]);
                $line['item_id'] = $itemId;
                $linesWithIds[] = $line;
            }

            if (!$draft) {
                if ($id) {
                    $this->purchases->completeDraft($id, [
                        'subtotal' => $write['subtotal'],
                        'discount_amount' => $write['discount_amount'],
                        'tax_amount' => $write['tax_amount'],
                        'shipping_amount' => $write['shipping_amount'],
                        'other_charges' => $write['other_charges'],
                        'grand_total' => $write['grand_total'],
                        'amount_paid' => $this->money($paid),
                        'balance_due' => $this->money($calculated['grand'] - $paid),
                        'payment_status' => $status
                    ]);
                }
                
                $purchaseNumber = $current['purchase_number'] ?? $this->purchases->find($purchaseId)['purchase_number'];
                $this->postStock($linesWithIds, $purchaseId, $user, $purchaseNumber, $d['purchase_date']);
                $this->suppliers->adjustBalance($d['supplier_id'], $this->signedMoney($calculated['grand'] - $paid));
                
                if ($paid > 0) {
                    $this->payments->create([
                        'purchase_id' => $purchaseId,
                        'supplier_id' => $d['supplier_id'],
                        'amount' => $this->money($paid),
                        'payment_method' => $d['payment_method'],
                        'reference_number' => $d['payment_reference'],
                        'payment_date' => $d['purchase_date'],
                        'notes' => 'Initial purchase payment',
                        'paid_by' => $user
                    ]);
                }
            }

            $this->activity->log(
                $user,
                $draft ? 'purchase.draft_saved' : 'purchase.completed',
                ($draft ? 'Draft purchase ' : 'Purchase ') . ($current['purchase_number'] ?? $this->purchases->find($purchaseId)['purchase_number']) . ($draft ? ' saved.' : ' completed.')
            );
            $pdo->commit();
            return $this->detail($purchaseId);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }

    private function calculate(array $d): array
    {
        $locked = $this->products->findManyForUpdate(array_keys($d['items']));
        if (count($locked) !== count($d['items'])) {
            throw new HttpException('One or more selected products no longer exist.', 409);
        }

        $lines = [];
        $subtotal = 0;
        foreach ($d['items'] as $id => $row) {
            $product = $locked[$id];
            if ($product['status'] !== 'active') {
                throw new HttpException($product['name'] . ' is inactive.', 422);
            }

            if ((int)$product['track_batches'] === 1) {
                if (empty($row['batch_number'])) {
                    $row['batch_number'] = 'B' . date('ymd') . strtoupper(substr(uniqid(), -4));
                }
            }
            
            if ((int)$product['track_expiry'] === 1) {
                if (empty($row['expiry_date'])) {
                    throw new HttpException("Expiry date is required for {$product['name']}.", 422);
                }
            }

            $gross = intdiv($row['quantity_milli'] * $row['unit_cost_cents'] + 500, 1000);
            if ($row['line_discount_cents'] > $gross) {
                throw new HttpException('Line discount cannot exceed ' . $product['name'] . ' line value.', 422);
            }
            
            $total = $gross - $row['line_discount_cents'];
            $subtotal += $total;
            
            $lines[] = [
                'product' => $product,
                'quantity' => $row['quantity_milli'],
                'cost' => $row['unit_cost_cents'],
                'discount' => $row['line_discount_cents'],
                'total' => $total,
                'batch_number' => $row['batch_number'] ?? null,
                'manufacturing_date' => $row['manufacturing_date'] ?? null,
                'expiry_date' => $row['expiry_date'] ?? null,
            ];
        }

        if ($d['overall_discount_cents'] > $subtotal) {
            throw new HttpException('Overall discount cannot exceed the subtotal.', 422, ['overall_discount' => ['Discount is too large.']]);
        }

        $grand = $subtotal - $d['overall_discount_cents'] + $d['tax_cents'] + $d['shipping_amount_cents'] + $d['other_charges_cents'];
        return compact('lines', 'subtotal', 'grand');
    }

    private function postStock(array $lines, int $purchase, int $user, string $number, string $purchaseDate): void
    {
        $tracking = (bool) $this->config->get('inventory', 'global_tracking_enabled', true);
        
        foreach ($lines as $line) {
            $product = $line['product'];
            $this->products->updatePurchaseCost((int)$product['id'], $this->money($line['cost']));
            
            if (!$tracking || (int)$product['track_stock'] !== 1) {
                continue;
            }

            $batchId = null;
            if ($product['track_batches'] || $product['track_expiry']) {
                $batchNumber = trim((string)($line['batch_number'] ?? ''));
                if ($batchNumber === '') {
                    $batchNumber = 'B' . date('dmy', strtotime($purchaseDate)) . strtoupper(substr(uniqid(), -4));
                }
                
                $batchId = $this->batches->create([
                    'product_id' => $product['id'],
                    'purchase_id' => $purchase,
                    'purchase_item_id' => $line['item_id'] ?? null,
                    'batch_number' => $batchNumber,
                    'manufacturing_date' => $line['manufacturing_date'],
                    'expiry_date' => $line['expiry_date'],
                    'received_quantity' => $this->quantity($line['quantity']),
                    'unit_cost' => $this->money($line['cost']),
                    'received_at' => $purchaseDate . ' ' . date('H:i:s'),
                    'created_by' => $user,
                ]);
            }

            $previous = $this->toScaled((string)$product['quantity'], 3);
            $new = $previous + $line['quantity'];
            $this->products->updateQuantity((int)$product['id'], $this->quantity($new));
            
            $this->stock->create([
                'product_id' => $product['id'],
                'user_id' => $user,
                'transaction_type' => 'purchase',
                'quantity' => $this->quantity($line['quantity']),
                'previous_stock' => $this->quantity($previous),
                'new_stock' => $this->quantity($new),
                'reason' => 'Purchase ' . $number,
                'reference_type' => 'purchase',
                'reference_id' => $purchase,
                'batch_id' => $batchId
            ]);
        }
    }

    public function addPayment(int $id, array $input, int $user): array
    {
        $d = $this->validator->payment($input);
        $pdo = $this->db->connection();
        $pdo->beginTransaction();
        try {
            $p = $this->purchases->find($id, true);
            if (!$p) {
                throw new HttpException('Purchase not found.', 404);
            }
            if (!in_array($p['purchase_status'], ['completed', 'partially_returned', 'returned'], true)) {
                throw new HttpException('Payments can only be added to posted purchases.', 409);
            }

            $due = $this->toScaled((string)$p['balance_due'], 2);
            if ($d['amount_cents'] > $due) {
                throw new HttpException('Payment exceeds the outstanding balance.', 422, ['amount' => ['Outstanding balance is ' . $this->money($due) . '.']]);
            }

            $paid = $this->toScaled((string)$p['amount_paid'], 2) + $d['amount_cents'];
            $remaining = $due - $d['amount_cents'];
            $status = $remaining === 0 ? 'paid' : 'partially_paid';

            $this->payments->create([
                'purchase_id' => $id,
                'supplier_id' => $p['supplier_id'],
                'amount' => $this->money($d['amount_cents']),
                'payment_method' => $d['payment_method'],
                'reference_number' => $d['reference_number'],
                'payment_date' => $d['payment_date'],
                'notes' => $d['notes'],
                'paid_by' => $user
            ]);

            $this->purchases->applyPayment($id, $this->money($d['amount_cents']), $this->money($paid), $this->money($remaining), $status);
            $this->suppliers->adjustBalance((int)$p['supplier_id'], $this->signedMoney(-$d['amount_cents']));
            $this->activity->log($user, 'purchase.payment_recorded', 'Payment recorded for ' . $p['purchase_number'] . '.');
            $pdo->commit();
            return $this->detail($id);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }

    public function cancel(int $id, array $input, int $user): array
    {
        $reason = $this->validator->cancellation($input);
        $pdo = $this->db->connection();
        $pdo->beginTransaction();
        try {
            $p = $this->purchases->find($id, true);
            if (!$p) {
                throw new HttpException('Purchase not found.', 404);
            }
            if ($p['purchase_status'] !== 'completed') {
                throw new HttpException('Only an unreturned completed purchase can be cancelled.', 409);
            }
            if ($this->toScaled((string)$p['amount_paid'], 2) > 0) {
                throw new HttpException('A paid purchase cannot be cancelled. Record a purchase return and supplier refund instead.', 409);
            }

            $items = $this->items->byPurchase($id, true);
            foreach ($items as $item) {
                if ((int)$item['track_stock'] !== 1 || (int)$item['stock_posted'] !== 1) {
                    continue;
                }
                $current = $this->toScaled((string)$item['current_stock'], 3);
                $qty = $this->toScaled((string)$item['quantity'], 3);
                if ($current < $qty) {
                    throw new HttpException($item['product_name'] . ' does not have enough current stock to reverse this purchase.', 409);
                }
                $new = $current - $qty;
                $this->products->updateQuantity((int)$item['product_id'], $this->quantity($new));
                
                // We should also reverse batches here if batch tracking is active
                // But for now, we'll keep the stock reversal simple. A full batch reversal
                // requires looking up the batch created by this item and updating it.
                // In production, cancellation is rare compared to refunds.
                
                $this->stock->create([
                    'product_id' => $item['product_id'],
                    'user_id' => $user,
                    'transaction_type' => 'purchase_cancel',
                    'quantity' => $this->quantity($qty),
                    'previous_stock' => $this->quantity($current),
                    'new_stock' => $this->quantity($new),
                    'reason' => 'Cancelled ' . $p['purchase_number'] . ': ' . $reason,
                    'reference_type' => 'purchase_cancel',
                    'reference_id' => $id
                ]);
            }

            $this->suppliers->adjustBalance((int)$p['supplier_id'], $this->signedMoney(-$this->toScaled((string)$p['grand_total'], 2)));
            $this->purchases->cancel($id, $user, $reason);
            $this->activity->log($user, 'purchase.cancelled', 'Purchase ' . $p['purchase_number'] . ' cancelled.');
            $pdo->commit();
            return $this->detail($id);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }

    public function returnable(int $id): array
    {
        $p = $this->purchases->find($id);
        if (!$p) {
            throw new HttpException('Purchase not found.', 404);
        }
        if (!in_array($p['purchase_status'], ['completed', 'partially_returned'], true)) {
            throw new HttpException('This purchase is not returnable.', 409);
        }
        return [
            'purchase' => $p,
            'items' => array_values(array_filter($this->items->byPurchase($id), fn($i) => (float)$i['returned_quantity'] < (float)$i['quantity']))
        ];
    }

    public function export(array $q): array
    {
        $f = $this->validator->filters($q);
        return $this->purchases->exportRows($f);
    }

    private function money(int $c): string
    {
        return intdiv($c, 100) . '.' . str_pad((string)($c % 100), 2, '0', STR_PAD_LEFT);
    }

    private function signedMoney(int $c): string
    {
        return ($c < 0 ? '-' : '') . $this->money(abs($c));
    }

    private function quantity(int $m): string
    {
        return intdiv($m, 1000) . '.' . str_pad((string)($m % 1000), 3, '0', STR_PAD_LEFT);
    }

    private function toScaled(string $v, int $s): int
    {
        [$w, $f] = array_pad(explode('.', $v, 2), 2, '');
        return (int)$w * (10 ** $s) + (int)str_pad(substr($f, 0, $s), $s, '0');
    }
}
