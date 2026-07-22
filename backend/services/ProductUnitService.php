<?php

declare(strict_types=1);

namespace App\Services;

use App\Repositories\ProductUnitRepository;
use Exception;

class ProductUnitService
{
    private ProductUnitRepository $productUnitRepository;

    public function __construct(ProductUnitRepository $productUnitRepository)
    {
        $this->productUnitRepository = $productUnitRepository;
    }

    public function getUnitsForProduct(int $productId): array
    {
        return $this->productUnitRepository->getUnitsForProduct($productId);
    }

    public function addProductUnit(int $productId, array $data): void
    {
        if (empty($data['unit_id']) || empty($data['conversion_to_base'])) {
            throw new Exception("Unit ID and conversion factor are required.");
        }
        $this->productUnitRepository->addProductUnit($productId, $data);
    }

    public function updateProductUnit(int $id, array $data): void
    {
        if (empty($data['conversion_to_base'])) {
            throw new Exception("Conversion factor is required.");
        }
        $this->productUnitRepository->updateProductUnit($id, $data);
    }
    
    public function deleteProductUnit(int $id): void
    {
        $this->productUnitRepository->deleteProductUnit($id);
    }
}
