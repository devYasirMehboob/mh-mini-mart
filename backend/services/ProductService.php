<?php

declare(strict_types=1);

namespace App\Services;

use App\Http\HttpException;
use App\Repositories\ProductRepository;
use App\Validators\ProductValidator;
use Throwable;

final class ProductService
{
    public function __construct(
        private readonly ProductRepository $products,
        private readonly ProductValidator $validator,
        private readonly ProductImageService $images
    ) {
    }

    public function list(array $query): array
    {
        $page = max(1, (int) ($query['page'] ?? 1));
        $limit = min(100, max(1, (int) ($query['limit'] ?? 20)));
        $categoryId = ($query['category_id'] ?? '') === ''
            ? null
            : filter_var($query['category_id'], FILTER_VALIDATE_INT);
        $status = trim((string) ($query['status'] ?? ''));

        if ($categoryId === false || ($categoryId !== null && $categoryId < 1)) {
            throw new HttpException('Select a valid category filter.', 422);
        }

        if ($status !== '' && !in_array($status, ['active', 'inactive'], true)) {
            throw new HttpException('Select a valid status filter.', 422);
        }

        return $this->products->paginate([
            'search' => trim((string) ($query['search'] ?? '')),
            'category_id' => $categoryId === null ? null : (int) $categoryId,
            'status' => $status,
            'page' => $page,
            'limit' => $limit,
        ]);
    }

    public function get(int $id): array
    {
        return $this->findOrFail($id);
    }

    public function create(array $input): array
    {
        $data = $this->validator->validateDetails($input);
        $this->validateRelationsAndUniqueness($data);
        $data['image'] = $this->images->store(
            is_string($data['image_data']) ? $data['image_data'] : null
        );

        try {
            return $this->products->create($data);
        } catch (Throwable $exception) {
            $this->images->delete($data['image']);
            throw $exception;
        }
    }

    public function update(int $id, array $input): array
    {
        $existing = $this->findOrFail($id);
        $data = $this->validator->validateDetails($input);
        $this->validateRelationsAndUniqueness($data, $id);
        $newImage = null;

        if (is_string($data['image_data']) && $data['image_data'] !== '') {
            $newImage = $this->images->store($data['image_data']);
            $data['image'] = $newImage;
        } elseif ($data['remove_image']) {
            $data['image'] = null;
        } else {
            $data['image'] = $existing['image'];
        }

        try {
            $updated = $this->products->update($id, $data);
        } catch (Throwable $exception) {
            $this->images->delete($newImage);
            throw $exception;
        }

        if (($newImage !== null || $data['remove_image']) && $existing['image'] !== null) {
            $this->images->delete($existing['image']);
        }

        return $updated;
    }

    public function updateStatus(int $id, array $input): array
    {
        $this->findOrFail($id);

        return $this->products->updateStatus(
            $id,
            $this->validator->validateStatus($input)
        );
    }

    public function delete(int $id): void
    {
        $product = $this->findOrFail($id);

        if ($this->products->isLinkedToSales($id)) {
            throw new HttpException(
                'This product has sale history and cannot be deleted. Deactivate it instead.',
                409
            );
        }

        if ($this->products->isLinkedToStockTransactions($id)) {
            throw new HttpException(
                'This product has stock history and cannot be deleted. Deactivate it instead.',
                409
            );
        }

        $this->products->delete($id);
        $this->images->delete($product['image']);
    }

    private function findOrFail(int $id): array
    {
        $product = $this->products->find($id);

        if ($product === null) {
            throw new HttpException('Product not found.', 404);
        }

        return $product;
    }

    private function validateRelationsAndUniqueness(array $data, ?int $ignoreId = null): void
    {
        if (!$this->products->categoryExists($data['category_id'])) {
            throw new HttpException(
                'The selected category does not exist.',
                422,
                ['category_id' => ['Select an existing category.']]
            );
        }

        if ($this->products->codeExists($data['product_code'], $ignoreId)) {
            throw new HttpException(
                'A product with this code already exists.',
                409,
                ['product_code' => ['Product code must be unique.']]
            );
        }

        if ($data['barcode'] !== null
            && $this->products->barcodeExists($data['barcode'], $ignoreId)
        ) {
            throw new HttpException(
                'A product with this barcode already exists.',
                409,
                ['barcode' => ['Barcode must be unique.']]
            );
        }
    }
}
