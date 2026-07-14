<?php

declare(strict_types=1);

namespace App\Validators;

use App\Http\HttpException;

final class ProductValidator
{
    private const UNIT_TYPES = [
        'piece', 'pack', 'kilogram', 'gram', 'dozen', 'box', 'bottle',
    ];

    public function validateDetails(array $input): array
    {
        $errors = [];
        $name = trim((string) ($input['name'] ?? ''));
        $productCode = trim((string) ($input['product_code'] ?? ''));
        $barcode = trim((string) ($input['barcode'] ?? ''));
        $categoryId = filter_var($input['category_id'] ?? null, FILTER_VALIDATE_INT);
        $purchaseCost = $this->number($input['purchase_cost'] ?? null);
        $sellingPrice = $this->number($input['selling_price'] ?? null);
        $quantity = $this->number($input['quantity'] ?? null);
        $minimumStock = $this->number($input['minimum_stock'] ?? null);
        $unitType = (string) ($input['unit_type'] ?? '');
        $trackStock = $this->boolean($input['track_stock'] ?? null);
        $status = (string) ($input['status'] ?? 'active');

        if ($name === '') {
            $errors['name'] = ['Product name is required.'];
        } elseif (mb_strlen($name) > 150) {
            $errors['name'] = ['Product name must not exceed 150 characters.'];
        }

        if ($productCode === '') {
            $errors['product_code'] = ['Product code is required.'];
        } elseif (mb_strlen($productCode) > 60) {
            $errors['product_code'] = ['Product code must not exceed 60 characters.'];
        }

        if ($barcode !== '' && mb_strlen($barcode) > 100) {
            $errors['barcode'] = ['Barcode must not exceed 100 characters.'];
        }

        if ($categoryId === false || $categoryId < 1) {
            $errors['category_id'] = ['Select a valid category.'];
        }

        if ($purchaseCost === null || $purchaseCost < 0) {
            $errors['purchase_cost'] = ['Purchase cost cannot be negative.'];
        }

        if ($sellingPrice === null || $sellingPrice <= 0) {
            $errors['selling_price'] = ['Selling price must be greater than zero.'];
        }

        if ($quantity === null || $quantity < 0) {
            $errors['quantity'] = ['Quantity cannot be negative.'];
        }

        if ($minimumStock === null || $minimumStock < 0) {
            $errors['minimum_stock'] = ['Minimum stock cannot be negative.'];
        }

        if (!in_array($unitType, self::UNIT_TYPES, true)) {
            $errors['unit_type'] = ['Select a valid unit type.'];
        }

        if ($trackStock === null) {
            $errors['track_stock'] = ['Stock tracking must be enabled or disabled.'];
        }

        if (!in_array($status, ['active', 'inactive'], true)) {
            $errors['status'] = ['Status must be active or inactive.'];
        }

        if ($errors !== []) {
            throw new HttpException('Please correct the highlighted fields.', 422, $errors);
        }

        return [
            'category_id' => (int) $categoryId,
            'name' => $name,
            'product_code' => $productCode,
            'barcode' => $barcode === '' ? null : $barcode,
            'purchase_cost' => number_format($purchaseCost, 2, '.', ''),
            'selling_price' => number_format($sellingPrice, 2, '.', ''),
            'quantity' => number_format($quantity, 3, '.', ''),
            'minimum_stock' => number_format($minimumStock, 3, '.', ''),
            'unit_type' => $unitType,
            'track_stock' => $trackStock,
            'status' => $status,
            'image_data' => $input['image_data'] ?? null,
            'remove_image' => $this->boolean($input['remove_image'] ?? false) ?? false,
        ];
    }

    public function validateStatus(array $input): string
    {
        $status = (string) ($input['status'] ?? '');

        if (!in_array($status, ['active', 'inactive'], true)) {
            throw new HttpException(
                'Select a valid product status.',
                422,
                ['status' => ['Status must be active or inactive.']]
            );
        }

        return $status;
    }

    private function number(mixed $value): ?float
    {
        return is_numeric($value) ? (float) $value : null;
    }

    private function boolean(mixed $value): ?bool
    {
        if (is_bool($value)) {
            return $value;
        }

        if ($value === 1 || $value === '1') {
            return true;
        }

        if ($value === 0 || $value === '0' || $value === false) {
            return false;
        }

        return null;
    }
}
