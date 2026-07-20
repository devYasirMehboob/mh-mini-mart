<?php

declare(strict_types=1);

namespace App\Validators;

use App\Http\HttpException;
use DateTime;

final class BatchValidator
{
    public function validate(array $input, bool $trackExpiry): array
    {
        $errors = [];
        $batchNumber = trim((string) ($input['batch_number'] ?? ''));
        $manufacturingDate = trim((string) ($input['manufacturing_date'] ?? ''));
        $expiryDate = trim((string) ($input['expiry_date'] ?? ''));
        $quantity = $this->number($input['quantity'] ?? null);
        $unitCost = $this->number($input['unit_cost'] ?? null);

        if ($batchNumber === '') {
            $errors['batch_number'] = ['Batch number is required.'];
        } elseif (mb_strlen($batchNumber) > 100) {
            $errors['batch_number'] = ['Batch number must not exceed 100 characters.'];
        }

        if ($quantity === null || $quantity <= 0) {
            $errors['quantity'] = ['Quantity must be greater than zero.'];
        }

        if ($unitCost !== null && $unitCost < 0) {
            $errors['unit_cost'] = ['Unit cost cannot be negative.'];
        }

        $mfgDateObj = null;
        if ($manufacturingDate !== '') {
            $mfgDateObj = DateTime::createFromFormat('Y-m-d', $manufacturingDate);
            if ($mfgDateObj === false) {
                $errors['manufacturing_date'] = ['Invalid manufacturing date format (YYYY-MM-DD).'];
            }
        }

        $expDateObj = null;
        if ($expiryDate !== '') {
            $expDateObj = DateTime::createFromFormat('Y-m-d', $expiryDate);
            if ($expDateObj === false) {
                $errors['expiry_date'] = ['Invalid expiry date format (YYYY-MM-DD).'];
            }
        } elseif ($trackExpiry) {
            $errors['expiry_date'] = ['Expiry date is required for this product.'];
        }

        if (!isset($errors['manufacturing_date']) && !isset($errors['expiry_date']) && $mfgDateObj !== null && $expDateObj !== null) {
            if ($mfgDateObj > $expDateObj) {
                $errors['manufacturing_date'] = ['Manufacturing date cannot be after expiry date.'];
            }
        }

        if ($errors !== []) {
            throw new HttpException('Please correct the batch details.', 422, $errors);
        }

        return [
            'batch_number' => $batchNumber,
            'manufacturing_date' => $manufacturingDate === '' ? null : $manufacturingDate,
            'expiry_date' => $expiryDate === '' ? null : $expiryDate,
            'quantity' => number_format($quantity, 3, '.', ''),
            'unit_cost' => number_format($unitCost ?? 0, 2, '.', ''),
        ];
    }

    private function number(mixed $value): ?float
    {
        return is_numeric($value) ? (float) $value : null;
    }
}
