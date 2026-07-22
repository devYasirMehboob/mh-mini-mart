<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Services\ProductUnitService;
use App\Http\Response;
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
            Response::json(true, 'Product units retrieved successfully.', $units);
        } catch (Exception $e) {
            Response::json(false, $e->getMessage(), null, 500);
        }
    }

    public function store(Request $request, int $productId): void
    {
        try {
            $this->productUnitService->addProductUnit($productId, $request->body());
            Response::json(true, 'Product unit added successfully.', [], 201);
        } catch (Exception $e) {
            Response::json(false, $e->getMessage(), null, 422);
        }
    }

    public function update(Request $request, int $productId, int $unitId): void
    {
        try {
            $this->productUnitService->updateProductUnit($unitId, $request->body());
            Response::json(true, 'Product unit updated successfully.');
        } catch (Exception $e) {
            Response::json(false, $e->getMessage(), null, 422);
        }
    }
    
    public function destroy(Request $request, int $productId, int $unitId): void
    {
        try {
            $this->productUnitService->deleteProductUnit($unitId);
            Response::json(true, 'Product unit removed successfully.');
        } catch (Exception $e) {
            Response::json(false, $e->getMessage(), null, 422);
        }
    }
}
