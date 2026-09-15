<?php

declare(strict_types=1);

namespace App\Validators;

use App\Http\HttpException;

final class CustomerValidator
{
    private const CUSTOMER_TYPES = ['walk_in_system', 'walk_in_khata', 'regular'];
    private const PAYMENT_METHODS = ['cash', 'card', 'bank_transfer', 'mobile_wallet', 'other'];
    private const SORT_COLUMNS = ['name', 'created_at', 'current_balance'];

    public function create(array $input): array
    {
        $errors = [];
        $name   = trim((string) ($input['name'] ?? ''));
        $phone  = trim((string) ($input['phone'] ?? ''));
        $email  = trim((string) ($input['email'] ?? ''));
        $address = trim((string) ($input['address'] ?? ''));
        $notes  = trim((string) ($input['notes'] ?? ''));
        $type   = (string) ($input['customer_type'] ?? 'regular');
        $khataEnabled = filter_var($input['khata_enabled'] ?? false, FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
        $creditLimit  = $this->decimal((string) ($input['credit_limit'] ?? '0'), 2);

        if ($name === '') $errors['name'] = ['Customer name is required.'];
        elseif (mb_strlen($name) > 150) $errors['name'] = ['Name must not exceed 150 characters.'];

        if ($phone !== '' && !preg_match('/^[0-9+() .-]{7,30}$/', $phone)) {
            $errors['phone'] = ['Enter a valid phone number.'];
        }
        if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = ['Enter a valid email address.'];
        }
        if (mb_strlen($address) > 500) $errors['address'] = ['Address must not exceed 500 characters.'];
        if (mb_strlen($notes) > 1000) $errors['notes'] = ['Notes must not exceed 1000 characters.'];
        if (!in_array($type, self::CUSTOMER_TYPES, true)) $errors['customer_type'] = ['Invalid customer type.'];
        if ($creditLimit === null || $creditLimit < 0) $errors['credit_limit'] = ['Credit limit must be zero or positive.'];

        if ($errors !== []) throw new HttpException('Please correct the customer details.', 422, $errors);

        return [
            'name'          => $name,
            'phone'         => $phone === '' ? null : $phone,
            'email'         => $email === '' ? null : $email,
            'address'       => $address === '' ? null : $address,
            'notes'         => $notes === '' ? null : $notes,
            'customer_type' => $type,
            'khata_enabled' => $khataEnabled,
            'credit_limit'  => number_format($creditLimit / 100, 2, '.', ''),
        ];
    }

    public function update(array $input): array
    {
        return $this->create($input);
    }

    public function quickAdd(array $input): array
    {
        $errors = [];
        $name  = trim((string) ($input['name'] ?? ''));
        $phone = trim((string) ($input['phone'] ?? ''));
        $notes = trim((string) ($input['notes'] ?? ''));

        if ($name === '') $errors['name'] = ['Customer name is required.'];
        elseif (mb_strlen($name) > 150) $errors['name'] = ['Name must not exceed 150 characters.'];
        if ($phone !== '' && !preg_match('/^[0-9+() .-]{7,30}$/', $phone)) {
            $errors['phone'] = ['Enter a valid phone number.'];
        }
        if ($errors !== []) throw new HttpException('Please correct the details.', 422, $errors);

        return [
            'name'         => $name,
            'phone'        => $phone === '' ? null : $phone,
            'notes'        => $notes === '' ? null : $notes,
            'khata_enabled'=> 1,
            'customer_type'=> 'walk_in_khata',
            'credit_limit' => '0.00',
        ];
    }

    public function payment(array $input): array
    {
        $errors = [];
        $token   = trim((string) ($input['request_token'] ?? ''));
        $amount  = $this->decimal((string) ($input['amount'] ?? ''), 2);
        $method  = trim((string) ($input['payment_method'] ?? 'cash'));
        $refNum  = trim((string) ($input['reference_number'] ?? ''));
        $date    = trim((string) ($input['payment_date'] ?? date('Y-m-d')));
        $notes   = trim((string) ($input['notes'] ?? ''));

        if ($token === '' || strlen($token) < 16) $errors['request_token'] = ['A valid request token is required.'];
        if ($amount === null || $amount <= 0) $errors['amount'] = ['Enter a positive payment amount.'];
        if (!in_array($method, self::PAYMENT_METHODS, true)) $errors['payment_method'] = ['Select a valid payment method.'];
        if ($refNum !== '' && mb_strlen($refNum) > 150) $errors['reference_number'] = ['Reference must not exceed 150 characters.'];
        if (!$this->validDate($date)) $errors['payment_date'] = ['Enter a valid payment date.'];

        if ($errors !== []) throw new HttpException('Please correct the payment details.', 422, $errors);

        return [
            'request_token'    => $token,
            'amount_cents'     => $amount,
            'payment_method'   => $method,
            'reference_number' => $refNum === '' ? null : $refNum,
            'payment_date'     => $date,
            'notes'            => $notes === '' ? null : $notes,
        ];
    }

    public function filters(array $input): array
    {
        $errors = [];
        $page   = max(1, (int) ($input['page'] ?? 1));
        $limit  = min(max(1, (int) ($input['limit'] ?? 20)), 100);
        $sort   = (string) ($input['sort_by'] ?? 'name');
        $dir    = strtolower((string) ($input['sort_direction'] ?? 'asc'));

        if (!in_array($sort, self::SORT_COLUMNS, true)) $errors['sort_by'] = ['Invalid sort field.'];
        if (!in_array($dir, ['asc', 'desc'], true)) $errors['sort_direction'] = ['Invalid sort direction.'];
        if ($errors !== []) throw new HttpException('Invalid filter parameters.', 422, $errors);

        return [
            'search'         => mb_substr(trim((string) ($input['search'] ?? '')), 0, 150),
            'customer_type'  => trim((string) ($input['customer_type'] ?? '')),
            'status'         => trim((string) ($input['status'] ?? '')),
            'has_outstanding'=> !empty($input['has_outstanding']),
            'has_advance'    => !empty($input['has_advance']),
            'khata_enabled'  => $input['khata_enabled'] ?? '',
            'page'           => $page,
            'limit'          => $limit,
            'sort_by'        => $sort,
            'sort_direction' => $dir,
        ];
    }

    private function decimal(string $value, int $scale): ?int
    {
        $value = trim($value);
        if (preg_match('/^\d+(?:\.(\d+))?$/', $value, $m) !== 1) return null;
        $fraction = str_pad(substr($m[1] ?? '', 0, $scale), $scale, '0');
        return (int) strstr($value . '.', '.', true) * (10 ** $scale) + (int) $fraction;
    }

    private function validDate(string $value): bool
    {
        $d = \DateTimeImmutable::createFromFormat('!Y-m-d', $value);
        return $d !== false && $d->format('Y-m-d') === $value;
    }
}
