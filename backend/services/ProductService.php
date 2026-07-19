<?php

declare(strict_types=1);

namespace App\Services;

use App\Config\Database;
use App\Http\HttpException;
use App\Repositories\ActivityLogRepository;
use App\Repositories\ProductRepository;
use App\Repositories\StockTransactionRepository;
use App\Validators\ProductValidator;
use Throwable;
use App\Services\BarcodeService;

final class ProductService
{
    public function __construct(
        private readonly Database $database,
        private readonly ProductRepository $products,
        private readonly StockTransactionRepository $stockTransactions,
        private readonly ActivityLogRepository $activity,
        private readonly ProductValidator $validator,
        private readonly ProductImageService $images,
        private readonly BarcodeService $barcodes
    ) {
    }

    public function list(array $query, bool $canViewCosts): array
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

        $result = $this->products->paginate([
            'search' => mb_substr(trim((string) ($query['search'] ?? '')), 0, 150),
            'category_id' => $categoryId === null ? null : (int) $categoryId,
            'status' => $status,
            'page' => $page,
            'limit' => $limit,
        ]);

        if (!$canViewCosts) {
            $result['products'] = array_map($this->withoutCost(...), $result['products']);
        }

        return $result;
    }

    public function get(int $id, bool $canViewCosts): array
    {
        $product = $this->findOrFail($id);

        return $canViewCosts ? $product : $this->withoutCost($product);
    }

    public function create(array $input, int $userId, bool $canViewCosts): array
    {
        $data = $this->validator->validateDetails($input);
        
        $barcodeGenerated = false;
        if (empty($data['barcode'])) {
            $data['barcode'] = $this->barcodes->generateUniqueBarcode();
            $barcodeGenerated = true;
        }

        $this->validateRelationsAndUniqueness($data);

        if (!$canViewCosts) {
            $data['purchase_cost'] = '0.00';
        }
        if (!$data['track_stock']) {
            $data['quantity'] = '0.000';
        }

        $data['image'] = $this->images->store(
            is_string($data['image_data']) ? $data['image_data'] : null
        );
        $connection = $this->database->connection();
        $connection->beginTransaction();

        try {
            $product = $this->products->create($data);
            
            if ($barcodeGenerated) {
                $this->products->updateBarcodeData((int) $product['id'], $data['barcode'], 'C128', 'generated');
                $product['barcode_type'] = 'C128';
                $product['barcode_source'] = 'generated';
            }

            $quantity = $this->toMilli((string) $product['quantity']);

            if ((int) $product['track_stock'] === 1 && $quantity > 0) {
                $this->stockTransactions->create([
                    'product_id' => (int) $product['id'],
                    'user_id' => $userId,
                    'transaction_type' => 'opening',
                    'quantity' => $this->quantity($quantity),
                    'previous_stock' => '0.000',
                    'new_stock' => $this->quantity($quantity),
                    'reason' => 'Opening stock recorded when product was created.',
                    'reference_type' => 'product',
                    'reference_id' => (int) $product['id'],
                ]);
            }

            $this->activity->log($userId, 'product.created', 'Product ' . $product['name'] . ' created.');
            $connection->commit();

            return $canViewCosts ? $product : $this->withoutCost($product);
        } catch (Throwable $exception) {
            if ($connection->inTransaction()) {
                $connection->rollBack();
            }
            $this->images->delete($data['image']);
            throw $exception;
        }
    }

    public function update(int $id, array $input, int $userId, bool $canViewCosts): array
    {
        $existing = $this->findOrFail($id);
        $data = $this->validator->validateDetails($input);
        $this->validateRelationsAndUniqueness($data, $id);

        if ($this->toMilli((string) $data['quantity']) !== $this->toMilli((string) $existing['quantity'])) {
            throw new HttpException(
                'Use Inventory to change product quantity so the movement is recorded.',
                422,
                ['quantity' => ['Stock quantity cannot be edited from the product form.']]
            );
        }

        $data['quantity'] = (string) $existing['quantity'];
        if (!$canViewCosts) {
            $data['purchase_cost'] = (string) $existing['purchase_cost'];
        }

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
            $this->activity->log($userId, 'product.updated', 'Product ' . $updated['name'] . ' updated.');
        } catch (Throwable $exception) {
            $this->images->delete($newImage);
            throw $exception;
        }

        if (($newImage !== null || $data['remove_image']) && $existing['image'] !== null) {
            $this->images->delete($existing['image']);
        }

        return $canViewCosts ? $updated : $this->withoutCost($updated);
    }

    public function updateStatus(int $id, array $input, int $userId, bool $canViewCosts): array
    {
        $this->findOrFail($id);
        $product = $this->products->updateStatus($id, $this->validator->validateStatus($input));
        $this->activity->log($userId, 'product.status_changed', 'Product ' . $product['name'] . ' status changed to ' . $product['status'] . '.');

        return $canViewCosts ? $product : $this->withoutCost($product);
    }

    public function delete(int $id, int $userId): void
    {
        $product = $this->findOrFail($id);

        if ($this->products->isLinkedToSales($id)) {
            throw new HttpException('This product has sale history and cannot be deleted. Deactivate it instead.', 409);
        }
        if ($this->products->isLinkedToPurchases($id)) {
            throw new HttpException('This product has purchase history and cannot be deleted. Deactivate it instead.', 409);
        }
        if ($this->products->isLinkedToStockTransactions($id)) {
            throw new HttpException('This product has stock history and cannot be deleted. Deactivate it instead.', 409);
        }

        $this->stockTransactions->deleteByProduct($id);
        $this->products->delete($id);
        $this->images->delete($product['image']);
        $this->activity->log($userId, 'product.deleted', 'Product ' . $product['name'] . ' deleted.');
    }

    public function generateBarcode(int $id, int $userId): array
    {
        $product = $this->findOrFail($id);
        if ($product['barcode'] !== null) {
            throw new HttpException('This product already has a barcode.', 409);
        }
        $barcode = $this->barcodes->generateUniqueBarcode();
        $this->products->updateBarcodeData($id, $barcode, 'C128', 'generated');
        $this->activity->log($userId, 'barcode.generated', 'Generated barcode ' . $barcode . ' for product ' . $product['name'] . '.');
        return $this->findOrFail($id);
    }

    public function setBarcode(int $id, string $barcode, int $userId): array
    {
        $product = $this->findOrFail($id);
        $barcode = trim($barcode);
        if ($barcode === '') {
            $this->products->updateBarcodeData($id, null, null, null);
            $this->activity->log($userId, 'barcode.removed', 'Removed barcode for product ' . $product['name'] . '.');
            return $this->findOrFail($id);
        }

        if ($product['barcode'] !== $barcode && $this->products->barcodeExists($barcode, $id)) {
            throw new HttpException('A product with this barcode already exists.', 409, ['barcode' => ['Barcode must be unique.']]);
        }

        $this->products->updateBarcodeData($id, $barcode, 'C128', 'manual');
        $this->activity->log($userId, 'barcode.updated', 'Assigned barcode ' . $barcode . ' to product ' . $product['name'] . '.');
        return $this->findOrFail($id);
    }

    public function recordBarcodePrint(array $ids, int $userId): void
    {
        $this->products->recordBarcodePrint($ids);
        $this->activity->log($userId, 'labels.printed', 'Printed labels for ' . count($ids) . ' product(s).');
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
            throw new HttpException('The selected category does not exist.', 422, ['category_id' => ['Select an existing category.']]);
        }
        if ($this->products->codeExists($data['product_code'], $ignoreId)) {
            throw new HttpException('A product with this code already exists.', 409, ['product_code' => ['Product code must be unique.']]);
        }
        if ($data['barcode'] !== null && $this->products->barcodeExists($data['barcode'], $ignoreId)) {
            throw new HttpException('A product with this barcode already exists.', 409, ['barcode' => ['Barcode must be unique.']]);
        }
    }

    private function withoutCost(array $product): array
    {
        unset($product['purchase_cost']);

        return $product;
    }

    private function toMilli(string $value): int
    {
        [$whole, $fraction] = array_pad(explode('.', $value, 2), 2, '');

        return (int) $whole * 1000 + (int) str_pad(substr($fraction, 0, 3), 3, '0');
    }

    private function quantity(int $milli): string
    {
        return intdiv($milli, 1000) . '.' . str_pad((string) ($milli % 1000), 3, '0', STR_PAD_LEFT);
    }
}