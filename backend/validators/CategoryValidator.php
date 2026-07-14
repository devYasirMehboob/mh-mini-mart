<?php

declare(strict_types=1);

namespace App\Validators;

use App\Http\HttpException;

final class CategoryValidator
{
    public function validateDetails(array $input): array
    {
        $name = trim((string) ($input['name'] ?? ''));
        $description = trim((string) ($input['description'] ?? ''));
        $errors = [];

        if ($name === '') {
            $errors['name'] = ['Category name is required.'];
        } elseif (mb_strlen($name) > 100) {
            $errors['name'] = ['Category name must not exceed 100 characters.'];
        }

        if (mb_strlen($description) > 1000) {
            $errors['description'] = ['Description must not exceed 1000 characters.'];
        }

        if ($errors !== []) {
            throw new HttpException('Please correct the highlighted fields.', 422, $errors);
        }

        return [
            'name' => $name,
            'description' => $description === '' ? null : $description,
        ];
    }

    public function validateStatus(array $input): string
    {
        $status = (string) ($input['status'] ?? '');

        if (!in_array($status, ['active', 'inactive'], true)) {
            throw new HttpException(
                'Select a valid category status.',
                422,
                ['status' => ['Status must be active or inactive.']]
            );
        }

        return $status;
    }
}
