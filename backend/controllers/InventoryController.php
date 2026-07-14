<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Http\JsonResponse;
use App\Http\Request;
use App\Middleware\AuthMiddleware;
use App\Security\SessionManager;
use App\Services\InventoryService;

final class InventoryController
{
    public function __construct(
        private readonly Request $request,
        private readonly InventoryService $inventoryService,
        private readonly AuthMiddleware $authMiddleware,
        private readonly SessionManager $session
    ) {
    }

    public function index(): never
    {
        JsonResponse::success(
            'Inventory retrieved successfully.',
            $this->inventoryService->list($_GET)
        );
    }

    public function summary(): never
    {
        JsonResponse::success(
            'Inventory summary retrieved successfully.',
            ['summary' => $this->inventoryService->summary()]
        );
    }

    public function transactions(): never
    {
        JsonResponse::success(
            'Stock transactions retrieved successfully.',
            $this->inventoryService->history($_GET)
        );
    }

    public function productTransactions(int $productId): never
    {
        JsonResponse::success(
            'Product stock history retrieved successfully.',
            $this->inventoryService->history($_GET, $productId)
        );
    }

    public function changeStock(string $transactionType, string $message): never
    {
        $this->session->verifyCsrfToken();
        $user = $this->authMiddleware->requirePermission('inventory.adjust');

        JsonResponse::success(
            $message,
            $this->inventoryService->changeStock(
                (int) $user['id'],
                $transactionType,
                $this->request->json()
            ),
            201
        );
    }
}
