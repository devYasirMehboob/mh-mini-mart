<?php

declare(strict_types=1);

namespace App\Validators;

use App\Http\HttpException;

final class ProductValidator
{

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
        $baseUnitId = filter_var($input['base_unit_id'] ?? null, FILTER_VALIDATE_INT);
        $defaultPurchaseUnitId = filter_var($input['default_purchase_unit_id'] ?? null, FILTER_VALIDATE_INT);
        $defaultSaleUnitId = filter_var($input['default_sale_unit_id'] ?? null, FILTER_VALIDATE_INT);
        $allowWeightedSale = $this->boolean($input['allow_weighted_sale'] ?? false) ? 1 : 0;
        $trackStock = $this->boolean($input['track_stock'] ?? null);
        $trackBatches = $this->boolean($input['track_batches'] ?? false);
        $trackExpiry = $this->boolean($input['track_expiry'] ?? false);
        $status = (string) ($input['status'] ?? 'active');

        $stockMode = (string) ($input['stock_mode'] ?? 'own');
        $stockSourceId = filter_var($input['stock_source_id'] ?? null, FILTER_VALIDATE_INT);
        $consumptionQuantity = $this->number($input['consumption_quantity'] ?? null);
        $consumptionUnitId = filter_var($input['consumption_unit_id'] ?? null, FILTER_VALIDATE_INT);
        $consumptionQuantityBase = $this->number($input['consumption_quantity_base'] ?? null);
        $allowCustomSale = $this->boolean($input['allow_custom_sale'] ?? false);
        $defaultCustomSaleUnitId = filter_var($input['default_custom_sale_unit_id'] ?? null, FILTER_VALIDATE_INT);
        $trackContainers = $this->boolean($input['track_containers'] ?? false);
        $containerType = trim((string) ($input['container_type'] ?? ''));

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

        if ($stockMode === 'own' && ($quantity === null || $quantity < 0)) {
            $errors['quantity'] = ['Quantity cannot be negative.'];
        }

        if ($minimumStock === null || $minimumStock < 0) {
            $errors['minimum_stock'] = ['Minimum stock cannot be negative.'];
        }

        if ($baseUnitId !== false && $baseUnitId < 1) {
            $errors['base_unit_id'] = ['Select a valid base unit.'];
        }
        if ($defaultPurchaseUnitId !== false && $defaultPurchaseUnitId < 1) {
            $errors['default_purchase_unit_id'] = ['Select a valid purchase unit.'];
        }
        if ($defaultSaleUnitId !== false && $defaultSaleUnitId < 1) {
            $errors['default_sale_unit_id'] = ['Select a valid sale unit.'];
        }
        if ($trackStock === null) {
            $errors['track_stock'] = ['Stock tracking must be enabled or disabled.'];
        }

        if (!in_array($stockMode, ['own', 'shared', 'source'], true)) {
            $errors['stock_mode'] = ['Invalid stock mode.'];
        }

        if ($stockMode === 'shared') {
            if ($stockSourceId === false || $stockSourceId < 1) {
                $errors['stock_source_id'] = ['Select a valid stock source.'];
            }
            if ($consumptionQuantity === null || $consumptionQuantity <= 0) {
                $errors['consumption_quantity'] = ['Consumption quantity must be greater than zero.'];
            }
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
            'quantity' => number_format($quantity ?? 0, 3, '.', ''),
            'minimum_stock' => number_format($minimumStock, 3, '.', ''),
            'base_unit_id' => $baseUnitId === false ? null : (int)$baseUnitId,
            'default_purchase_unit_id' => $defaultPurchaseUnitId === false ? null : (int)$defaultPurchaseUnitId,
            'default_sale_unit_id' => $defaultSaleUnitId === false ? null : (int)$defaultSaleUnitId,
            'stock_mode' => $stockMode,
            'stock_source_id' => $stockMode === 'shared' ? (int)$stockSourceId : null,
            'consumption_quantity' => $stockMode === 'shared' ? number_format($consumptionQuantity, 3, '.', '') : null,
            'consumption_unit_id' => $consumptionUnitId === false ? null : (int)$consumptionUnitId,
            'consumption_quantity_base' => $consumptionQuantityBase !== null ? number_format($consumptionQuantityBase, 6, '.', '') : null,
            'allow_custom_sale' => $allowCustomSale,
            'default_custom_sale_unit_id' => $defaultCustomSaleUnitId === false ? null : (int)$defaultCustomSaleUnitId,
            'track_stock' => $trackStock,
            'track_batches' => $trackBatches ?? false,
            'track_expiry' => $trackExpiry ?? false,
            'track_containers' => $trackContainers ?? false,
            'container_type' => $containerType === '' ? null : $containerType,
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
