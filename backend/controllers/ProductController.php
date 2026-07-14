<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Http\JsonResponse;
use App\Http\Request;
use App\Security\SessionManager;
use App\Services\ProductService;

final class ProductController
{
    public function __construct(
        private readonly Request $request,
        private readonly ProductService $productService,
        private readonly SessionManager $session
    ) {
    }

    public function index(array $user): never
    {
        JsonResponse::success(
            'Products retrieved successfully.',
            $this->productService->list($_GET, $this->canViewCosts($user))
        );
    }

    public function store(array $user): never
    {
        $this->session->verifyCsrfToken();

        JsonResponse::success(
            'Product created successfully.',
            ['product' => $this->productService->create(
                $this->request->json(),
                (int) $user['id'],
                $this->canViewCosts($user)
            )],
            201
        );
    }

    public function show(int $id, array $user): never
    {
        JsonResponse::success(
            'Product retrieved successfully.',
            ['product' => $this->productService->get($id, $this->canViewCosts($user))]
        );
    }

    public function update(int $id, array $user): never
    {
        $this->session->verifyCsrfToken();

        JsonResponse::success(
            'Product updated successfully.',
            ['product' => $this->productService->update(
                $id,
                $this->request->json(),
                (int) $user['id'],
                $this->canViewCosts($user)
            )]
        );
    }

    public function updateStatus(int $id, array $user): never
    {
        $this->session->verifyCsrfToken();

        JsonResponse::success(
            'Product status changed successfully.',
            ['product' => $this->productService->updateStatus(
                $id,
                $this->request->json(),
                (int) $user['id'],
                $this->canViewCosts($user)
            )]
        );
    }

    public function destroy(int $id, array $user): never
    {
        $this->session->verifyCsrfToken();
        $this->productService->delete($id, (int) $user['id']);

        JsonResponse::success('Product deleted successfully.');
    }

    private function canViewCosts(array $user): bool
    {
        return in_array('products.costs.view', $user['permissions'] ?? [], true);
    }
}