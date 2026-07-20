<?php

declare(strict_types=1);

namespace App\Services;

use App\Repositories\BatchRepository;
use App\Http\HttpException;

final class BatchAllocationService
{
    public function __construct(private readonly BatchRepository $batchRepository)
    {
    }

    /**
     * Allocates requested quantity across valid sellable batches using FEFO.
     * Returns array of allocations: [['batch' => $batchRow, 'quantity' => $allocatedQty], ...]
     */
    public function allocate(int $productId, float $requestedQuantity): array
    {
        if ($requestedQuantity <= 0) {
            return [];
        }

        // getSellableBatches already applies FOR UPDATE lock and sorts by expiry ASC
        $batches = $this->batchRepository->getSellableBatches($productId);

        $allocations = [];
        $remainingToAllocate = $requestedQuantity;

        foreach ($batches as $batch) {
            $available = (float) $batch['remaining_quantity'];
            if ($available <= 0) continue;

            $allocateQty = min($available, $remainingToAllocate);
            
            $allocations[] = [
                'batch' => $batch,
                'quantity' => $allocateQty
            ];

            $remainingToAllocate -= $allocateQty;

            // Use epsilon comparison for floats
            if ($remainingToAllocate < 0.001) {
                break;
            }
        }

        if ($remainingToAllocate > 0.001) {
            throw new HttpException('Insufficient sellable stock for this product.', 400);
        }

        return $allocations;
    }
}
