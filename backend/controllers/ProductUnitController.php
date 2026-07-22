<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Services\ProductUnitService;
use App\Http\JsonResponse;
use App\Http\Request;
use Exception;

class ProductUnitController
{
    private ProductUnitService $productUnitService;

    public function __construct(ProductUnitService $productUnitService)
    {
        $this->productUnitService = $productUnitService;
    }

    public function index(Request $request, int $productId): void
    {
        try {
            $units = $this->productUnitService->getUnitsForProduct($productId);
            JsonResponse::success('Product units retrieved successfully.', $units);
        } catch (Exception $e) {
            JsonResponse::error($e->getMessage(), 500);
        }
    }

    public function store(Request $request, int $productId): void
    {
        try {
            $this->productUnitService->addProductUnit($productId, $request->json());
            JsonResponse::success('Product unit added successfully.', [], 201);
        } catch (Exception $e) {
            JsonResponse::error($e->getMessage(), 422);
        }
    }

    public function update(Request $request, int $productId, int $unitId): void
    {
        try {
            $this->productUnitService->updateProductUnit($unitId, $request->json());
            JsonResponse::success('Product unit updated successfully.');
        } catch (Exception $e) {
            JsonResponse::error($e->getMessage(), 422);
        }
    }

    public function destroy(Request $request, int $productId, int $unitId): void
    {
        try {
            $this->productUnitService->deleteProductUnit($unitId);
            JsonResponse::success('Product unit removed successfully.');
        } catch (Exception $e) {
            JsonResponse::error($e->getMessage(), 422);
        }
    }
}
