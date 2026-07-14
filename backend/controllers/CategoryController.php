<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Http\JsonResponse;
use App\Http\Request;
use App\Security\SessionManager;
use App\Services\CategoryService;

final class CategoryController
{
    public function __construct(
        private readonly Request $request,
        private readonly CategoryService $categoryService,
        private readonly SessionManager $session
    ) {
    }

    public function index(): never
    {
        $search = trim((string) ($_GET['search'] ?? ''));

        JsonResponse::success(
            'Categories retrieved successfully.',
            ['categories' => $this->categoryService->list($search)]
        );
    }

    public function store(): never
    {
        $this->session->verifyCsrfToken();

        JsonResponse::success(
            'Category created successfully.',
            ['category' => $this->categoryService->create($this->request->json())],
            201
        );
    }

    public function show(int $id): never
    {
        JsonResponse::success(
            'Category retrieved successfully.',
            ['category' => $this->categoryService->get($id)]
        );
    }

    public function update(int $id): never
    {
        $this->session->verifyCsrfToken();

        JsonResponse::success(
            'Category updated successfully.',
            ['category' => $this->categoryService->update($id, $this->request->json())]
        );
    }

    public function updateStatus(int $id): never
    {
        $this->session->verifyCsrfToken();

        JsonResponse::success(
            'Category status updated successfully.',
            ['category' => $this->categoryService->updateStatus($id, $this->request->json())]
        );
    }

    public function destroy(int $id): never
    {
        $this->session->verifyCsrfToken();
        $this->categoryService->delete($id);

        JsonResponse::success('Category deleted successfully.');
    }
}
