<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Services\UnitService;
use App\Http\JsonResponse;
use App\Http\Request;
use Exception;

class UnitController
{
    private UnitService $unitService;

    public function __construct(UnitService $unitService)
    {
        $this->unitService = $unitService;
    }

    public function index(Request $request): void
    {
        try {
            $units = $this->unitService->getAllUnits();
            JsonResponse::success('Units retrieved successfully.', $units);
        } catch (Exception $e) {
            JsonResponse::error($e->getMessage(), 500);
        }
    }
    
    public function active(Request $request): void
    {
        try {
            $units = $this->unitService->getActiveUnits();
            JsonResponse::success('Active units retrieved successfully.', $units);
        } catch (Exception $e) {
            JsonResponse::error($e->getMessage(), 500);
        }
    }

    public function store(Request $request): void
    {
        try {
            $unit = $this->unitService->createUnit($request->json());
            JsonResponse::success('Unit created successfully.', $unit, 201);
        } catch (Exception $e) {
            JsonResponse::error($e->getMessage(), 400);
        }
    }

    public function update(Request $request, int $id): void
    {
        try {
            $unit = $this->unitService->updateUnit($id, $request->json());
            JsonResponse::success('Unit updated successfully.');
        } catch (Exception $e) {
            JsonResponse::error($e->getMessage(), 400);
        }
    }
}
