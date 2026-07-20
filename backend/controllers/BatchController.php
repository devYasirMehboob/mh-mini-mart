<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Http\JsonResponse;
use App\Http\Request;
use App\Http\HttpException;
use App\Repositories\BatchRepository;
use App\Repositories\ProductRepository;
use App\Repositories\StockTransactionRepository;
use App\Config\Database;
use App\Services\Logger;

final class BatchController
{
    public function __construct(
        private readonly Request $request,
        private readonly BatchRepository $batchRepository,
        private readonly ProductRepository $productRepository,
        private readonly StockTransactionRepository $stockTransactionRepository,
        private readonly Database $database,
        private readonly ?Logger $logger
    ) {
    }

    public function index(): void
    {

        $filters = [
            'search' => trim((string) ($this->request->query()['search'] ?? '')),
            'product_id' => !empty($this->request->query()['product_id']) ? (int) $this->request->query()['product_id'] : null,
            'status' => trim((string) ($this->request->query()['status'] ?? '')),
            'expiry_state' => trim((string) ($this->request->query()['expiry_state'] ?? '')),
            'near_days' => 30, // could be loaded from settings
            'page' => max(1, (int) ($this->request->query()['page'] ?? 1)),
            'limit' => max(1, min(100, (int) ($this->request->query()['limit'] ?? 20))),
        ];

        $result = $this->batchRepository->paginate($filters);
        error_log("BatchFilters: " . json_encode($filters));
        error_log("BatchResultCount: " . count($result['batches']));
        JsonResponse::success('Batches retrieved successfully.', $result);
    }

    public function summary(): void
    {

        $summaryStatement = $this->database->connection()->prepare(
            'SELECT 
                COUNT(*) as total_batches,
                SUM(CASE WHEN status = "active" AND remaining_quantity > 0 THEN 1 ELSE 0 END) as active_batches,
                SUM(CASE WHEN status = "active" AND remaining_quantity > 0 AND expiry_date < CURRENT_DATE THEN 1 ELSE 0 END) as expired_batches,
                SUM(CASE WHEN status = "active" AND remaining_quantity > 0 AND expiry_date >= CURRENT_DATE AND expiry_date <= DATE_ADD(CURRENT_DATE, INTERVAL 30 DAY) THEN 1 ELSE 0 END) as near_expiry_batches,
                SUM(CASE WHEN status = "blocked" THEN 1 ELSE 0 END) as blocked_batches
             FROM product_batches'
        );
        $summaryStatement->execute();
        $summary = $summaryStatement->fetch();

        JsonResponse::success('Batch summary retrieved.', $summary);
    }

    public function show(int $id): void
    {
        $batch = $this->batchRepository->find($id);

        if ($batch === null) {
            throw new HttpException('Batch not found.', 404);
        }

        JsonResponse::success('Batch details retrieved.', $batch);
    }

    public function block(int $id, array $user): void
    {

        $batch = $this->batchRepository->find($id);
        if ($batch === null) {
            throw new HttpException('Batch not found.', 404);
        }

        if ($batch['status'] === 'blocked') {
            throw new HttpException('Batch is already blocked.', 400);
        }

        $this->batchRepository->updateStatus($id, 'blocked');
        
        if ($this->logger !== null) {
            $this->logger->info('BATCH', "Batch {$id} blocked by user " . $user['id']);
        }

        JsonResponse::success('Batch blocked successfully.');
    }

    public function unblock(int $id, array $user): void
    {

        $batch = $this->batchRepository->find($id);
        if ($batch === null) {
            throw new HttpException('Batch not found.', 404);
        }

        if ($batch['status'] !== 'blocked') {
            throw new HttpException('Batch is not blocked.', 400);
        }

        if ($batch['remaining_quantity'] <= 0) {
            $this->batchRepository->updateStatus($id, 'depleted');
        } else {
            $this->batchRepository->updateStatus($id, 'active');
        }

        if ($this->logger !== null) {
            $this->logger->info('BATCH', "Batch {$id} unblocked by user " . $user['id']);
        }

        JsonResponse::success('Batch unblocked successfully.');
    }

    public function dispose(int $id, array $user): void
    {

        $quantity = (float) $this->request->post('quantity', 0);
        $reason = trim((string) $this->request->post('reason', ''));
        $disposalType = trim((string) $this->request->post('disposal_type', ''));

        if ($quantity <= 0) {
            throw new HttpException('Quantity must be greater than zero.', 422);
        }
        if ($disposalType === '') {
            throw new HttpException('Disposal type is required.', 422);
        }

        try {
            $this->database->connection()->beginTransaction();

            // Lock batch and product
            $batches = $this->batchRepository->findManyForUpdate([$id]);
            if (!isset($batches[$id])) {
                throw new HttpException('Batch not found.', 404);
            }
            $batch = $batches[$id];

            $products = $this->productRepository->findManyForUpdate([(int)$batch['product_id']]);
            $product = $products[(int)$batch['product_id']];

            if ($quantity > (float)$batch['remaining_quantity']) {
                throw new HttpException('Disposal quantity cannot exceed remaining batch quantity.', 422);
            }

            // Reduce batch
            $newBatchQty = (float)$batch['remaining_quantity'] - $quantity;
            $this->batchRepository->updateQuantity($id, number_format($newBatchQty, 3, '.', ''));

            // Reduce product
            $newProductQty = (float)$product['quantity'] - $quantity;
            $this->productRepository->updateQuantity((int)$product['id'], number_format($newProductQty, 3, '.', ''));

            // Record disposal
            $this->batchRepository->createDisposal([
                'product_batch_id' => $id,
                'quantity' => $quantity,
                'reason' => $reason,
                'disposal_type' => $disposalType,
                'processed_by' => $user['id'],
            ]);

            // Create stock transaction
            $this->stockTransactionRepository->create([
                'product_id' => $product['id'],
                'user_id' => $user['id'],
                'transaction_type' => $disposalType === 'expired' ? 'expired' : ($disposalType === 'damaged' ? 'damaged' : 'wastage'),
                'quantity' => $quantity,
                'previous_stock' => $product['quantity'],
                'new_stock' => number_format($newProductQty, 3, '.', ''),
                'reason' => $reason,
                'reference_type' => 'batch_disposal',
                'reference_id' => $id,
                'batch_id' => $id
            ]);

            if ($this->logger !== null) {
                $this->logger->info('BATCH', "Batch {$id} disposed {$quantity} units by user " . $user['id']);
            }

            $this->database->connection()->commit();
            JsonResponse::success('Batch stock disposed successfully.');

        } catch (\Throwable $e) {
            $this->database->connection()->rollBack();
            throw $e;
        }
    }
}
