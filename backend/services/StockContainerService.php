<?php

declare(strict_types=1);

namespace App\Services;

use App\Config\Database;
use App\Http\HttpException;
use App\Repositories\StockContainerRepository;
use App\Repositories\ProductRepository;
use App\Repositories\StockTransactionRepository;
use App\Repositories\ActivityLogRepository;

class StockContainerService
{
    public function __construct(
        private readonly StockContainerRepository $containers,
        private readonly ProductRepository $products,
        private readonly StockTransactionRepository $stockTransactions,
        private readonly ActivityLogRepository $activityLog
    ) {}

    /**
     * Create N containers from a purchase item.
     * Called after purchase completion when track_containers = 1.
     *
     * @param int   $productId
     * @param int   $purchaseId
     * @param int   $purchaseItemId
     * @param int   $containerCount   Number of physical bags
     * @param float $qtyPerContainer  Quantity per bag in BASE UNITS
     * @param string $containerType   bag, can, box, etc.
     * @param int|null $batchId
     * @param int   $userId
     */
    public function createFromPurchase(
        int $productId,
        int $purchaseId,
        int $purchaseItemId,
        int $containerCount,
        float $qtyPerContainer,
        string $containerType,
        ?int $batchId,
        int $userId
    ): array {
        $created = [];

        for ($i = 0; $i < $containerCount; $i++) {
            $code    = $this->containers->nextContainerCode($containerType);
            $barcode = $this->containers->nextContainerBarcode('MH-BAG');

            $id = $this->containers->create([
                'product_id'             => $productId,
                'batch_id'               => $batchId,
                'purchase_id'            => $purchaseId,
                'purchase_item_id'       => $purchaseItemId,
                'container_code'         => $code,
                'container_type'         => $containerType,
                'original_quantity_base' => $qtyPerContainer,
                'barcode'                => $barcode,
                'barcode_source'         => 'generated',
                'status'                 => 'sealed',
            ]);

            $created[] = $this->containers->findById($id);
        }

        return $created;
    }

    /**
     * FIFO deduction from containers.
     * Opens sealed bags as needed. Returns list of allocations made.
     *
     * @param int   $productId
     * @param float $quantityBase   Total base quantity to deduct
     * @return array  List of ['container_id' => int, 'quantity_base' => float]
     */
    public function allocate(int $productId, float $quantityBase): array
    {
        $eligibles = $this->containers->findEligibleForSale($productId, true);
        $remaining = $quantityBase;
        $allocations = [];

        foreach ($eligibles as $container) {
            if ($remaining <= 0) break;

            $available = (float)$container['remaining_quantity_base'];
            $take = min($available, $remaining);

            $this->containers->deduct((int)$container['id'], $take);

            $allocations[] = [
                'container_id'  => (int)$container['id'],
                'quantity_base' => $take,
            ];

            $remaining -= $take;
            $remaining = round($remaining, 6);
        }

        if ($remaining > 0.0001) {
            throw new HttpException(
                'Not enough container stock available. Please check physical bag inventory.',
                409
            );
        }

        return $allocations;
    }

    /**
     * Restore stock from container allocations (for refunds).
     */
    public function restoreAllocations(array $allocations): void
    {
        foreach ($allocations as $alloc) {
            $container = $this->containers->findById((int)$alloc['stock_container_id']);
            if ($container && in_array($container['status'], ['open', 'depleted'], true)) {
                $this->containers->restore((int)$alloc['stock_container_id'], (float)$alloc['quantity_base']);
            }
        }
    }

    public function getByProduct(int $productId): array
    {
        return $this->containers->findByProduct($productId);
    }

    public function getSummary(int $productId): array
    {
        return $this->containers->getSummaryByProduct($productId);
    }

    public function findById(int $id): ?array
    {
        return $this->containers->findById($id);
    }

    public function findByBarcode(string $barcode): ?array
    {
        return $this->containers->findByBarcode($barcode);
    }

    public function regenerateBarcode(int $containerId, int $userId): array
    {
        $container = $this->containers->findById($containerId);
        if (!$container) {
            throw new HttpException('Container not found.', 404);
        }

        $newBarcode = $this->containers->nextContainerBarcode('MH-BAG');
        $this->containers->updateBarcode($containerId, $newBarcode, 'generated');

        $updated = $this->containers->findById($containerId);

        $this->activityLog->log($userId, 'container_barcode_regenerated', [
            'container_id'   => $containerId,
            'container_code' => $container['container_code'],
            'product_id'     => $container['product_id'],
            'old_barcode'    => $container['barcode'],
            'new_barcode'    => $newBarcode,
        ]);

        return $updated;
    }

    public function updateBarcode(int $containerId, string $newBarcode, int $userId): array
    {
        $container = $this->containers->findById($containerId);
        if (!$container) {
            throw new HttpException('Container not found.', 404);
        }

        $newBarcode = trim($newBarcode);
        if (empty($newBarcode)) {
            throw new HttpException('Barcode cannot be empty.', 422);
        }

        if ($this->containers->barcodeExists($newBarcode, $containerId)) {
            throw new HttpException('This barcode is already in use.', 409);
        }

        $this->containers->updateBarcode($containerId, $newBarcode, 'manual');
        return $this->containers->findById($containerId);
    }
}
