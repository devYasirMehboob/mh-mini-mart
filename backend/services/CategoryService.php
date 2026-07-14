<?php

declare(strict_types=1);

namespace App\Services;

use App\Http\HttpException;
use App\Repositories\CategoryRepository;
use App\Validators\CategoryValidator;

final class CategoryService
{
    public function __construct(
        private readonly CategoryRepository $categories,
        private readonly CategoryValidator $validator
    ) {
    }

    public function list(string $search): array
    {
        return $this->categories->all(trim($search));
    }

    public function get(int $id): array
    {
        return $this->findOrFail($id);
    }

    public function create(array $input): array
    {
        $data = $this->validator->validateDetails($input);
        $this->ensureUniqueName($data['name']);

        return $this->categories->create($data);
    }

    public function update(int $id, array $input): array
    {
        $this->findOrFail($id);
        $data = $this->validator->validateDetails($input);
        $this->ensureUniqueName($data['name'], $id);

        return $this->categories->update($id, $data);
    }

    public function updateStatus(int $id, array $input): array
    {
        $this->findOrFail($id);
        $status = $this->validator->validateStatus($input);

        return $this->categories->updateStatus($id, $status);
    }

    public function delete(int $id): void
    {
        $this->findOrFail($id);

        if ($this->categories->isLinkedToProducts($id)) {
            throw new HttpException(
                'This category cannot be deleted because it is linked to one or more products.',
                409
            );
        }

        $this->categories->delete($id);
    }

    private function findOrFail(int $id): array
    {
        $category = $this->categories->find($id);

        if ($category === null) {
            throw new HttpException('Category not found.', 404);
        }

        return $category;
    }

    private function ensureUniqueName(string $name, ?int $ignoreId = null): void
    {
        if ($this->categories->nameExists($name, $ignoreId)) {
            throw new HttpException(
                'A category with this name already exists.',
                409,
                ['name' => ['Category name must be unique.']]
            );
        }
    }
}
