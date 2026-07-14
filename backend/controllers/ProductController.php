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

    public function index(): never
    {
        JsonResponse::success(
            'Products retrieved successfully.',
            $this->productService->list($_GET)
        );
    }

    public function store(): never
    {
        $this->session->verifyCsrfToken();

        JsonResponse::success(
            'Product created successfully.',
            ['product' => $this->productService->create($this->request->json())],
            201
        );
    }

    public function show(int $id): never
    {
        JsonResponse::success(
            'Product retrieved successfully.',
            ['product' => $this->productService->get($id)]
        );
    }

    public function update(int $id): never
    {
        $this->session->verifyCsrfToken();

        JsonResponse::success(
            'Product updated successfully.',
            ['product' => $this->productService->update($id, $this->request->json())]
        );
    }

    public function updateStatus(int $id): never
    {
        $this->session->verifyCsrfToken();

        JsonResponse::success(
            'Product status changed successfully.',
            ['product' => $this->productService->updateStatus($id, $this->request->json())]
        );
    }

    public function destroy(int $id): never
    {
        $this->session->verifyCsrfToken();
        $this->productService->delete($id);

        JsonResponse::success('Product deleted successfully.');
    }
}
