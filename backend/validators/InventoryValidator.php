<?php

declare(strict_types=1);

namespace App\Validators;

use App\Http\HttpException;

final class InventoryValidator
{
    private const MANUAL_TYPES = [
        'opening', 'addition', 'reduction', 'adjustment',
        'damaged', 'expired', 'wastage',
    ];

    private const REASON_REQUIRED = [
        'reduction', 'adjustment', 'damaged', 'expired', 'wastage',
    ];

    public function validate(array $input, string $transactionType): array
    {
        if (!in_array($transactionType, self::MANUAL_TYPES, true)) {
            throw new HttpException('This stock transaction type cannot be entered manually.', 422);
        }

        $errors = [];
        $productId = filter_var($input['product_id'] ?? null, FILTER_VALIDATE_INT);
        $quantity = is_numeric($input['quantity'] ?? null)
            ? (float) $input['quantity']
            : null;
        $reason = trim((string) ($input['reason'] ?? ''));

        if ($productId === false || $productId < 1) {
            $errors['product_id'] = ['Select a valid product.'];
        }

        if ($quantity === null
            || ($transactionType === 'adjustment' ? $quantity < 0 : $quantity <= 0)
        ) {
            $errors['quantity'] = [
                $transactionType === 'adjustment'
                    ? 'Final quantity cannot be negative.'
                    : 'Quantity must be greater than zero.',
            ];
        }

        if (in_array($transactionType, self::REASON_REQUIRED, true) && $reason === '') {
            $errors['reason'] = ['A reason is required for this stock movement.'];
        } elseif (mb_strlen($reason) > 500) {
            $errors['reason'] = ['Reason must not exceed 500 characters.'];
        }

        if ($errors !== []) {
            throw new HttpException('Please correct the highlighted fields.', 422, $errors);
        }

        return [
            'product_id' => (int) $productId,
            'quantity' => number_format($quantity, 3, '.', ''),
            'reason' => $reason === '' ? null : $reason,
        ];
    }
}
