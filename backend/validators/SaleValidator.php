<?php

declare(strict_types=1);

namespace App\Validators;

use App\Http\HttpException;
use DateTimeImmutable;

final class SaleValidator
{
    private const PAYMENT_METHODS = ['cash', 'card', 'bank_transfer', 'mobile_wallet', 'other'];
    private const PAYMENT_STATUSES = ['paid', 'pending', 'failed', 'refunded'];
    private const SALE_STATUSES = ['completed', 'cancelled', 'refunded'];
    private const SORT_COLUMNS = ['created_at', 'invoice_number', 'grand_total', 'status'];

    public function validate(array $input): array
    {
        $errors = [];
        $token = trim((string) ($input['request_token'] ?? ''));
        $items = $input['items'] ?? null;
        $discountType = (string) ($input['discount_type'] ?? 'none');
        $discountValue = $this->decimal((string) ($input['discount_value'] ?? '0'), 2);
        $paymentMethod = (string) ($input['payment_method'] ?? '');
        $amountReceived = $this->decimal((string) ($input['amount_received'] ?? '0'), 2);
        $customerName = trim((string) ($input['customer_name'] ?? ''));
        $customerPhone = trim((string) ($input['customer_phone'] ?? ''));
        $notes = trim((string) ($input['notes'] ?? ($input['note'] ?? '')));
        $paymentReference = trim((string) ($input['payment_reference'] ?? ''));
        $heldSaleId = ($input['held_sale_id'] ?? null) === null ? null : filter_var($input['held_sale_id'], FILTER_VALIDATE_INT);

        if ($token === '' || strlen($token) < 16 || strlen($token) > 100 || preg_match('/^[A-Za-z0-9._:-]+$/', $token) !== 1) $errors['request_token'] = ['Use a valid request token between 16 and 100 characters.'];
        if (!is_array($items) || $items === []) $errors['items'] = ['The cart is empty.'];
        if (!in_array($discountType, ['none', 'fixed', 'percentage'], true)) $errors['discount_type'] = ['Select a valid discount type.'];
        if ($discountValue === null || $discountValue < 0) $errors['discount_value'] = ['Discount cannot be negative.'];
        if ($discountType === 'percentage' && ($discountValue ?? 101) > 10000) $errors['discount_value'] = ['Percentage discount cannot exceed 100%.'];
        if (!in_array($paymentMethod, self::PAYMENT_METHODS, true)) $errors['payment_method'] = ['Select a supported payment method.'];
        if ($amountReceived === null || $amountReceived < 0) $errors['amount_received'] = ['Enter a valid received amount.'];
        if (mb_strlen($customerName) > 150) $errors['customer_name'] = ['Customer name must not exceed 150 characters.'];
        if ($customerPhone !== '' && (mb_strlen($customerPhone) > 30 || preg_match('/^[0-9+() .-]{7,30}$/', $customerPhone) !== 1)) $errors['customer_phone'] = ['Enter a reasonable customer phone number.'];
        if (mb_strlen($notes) > 1000) $errors['notes'] = ['Notes must not exceed 1000 characters.'];
        if (mb_strlen($paymentReference) > 150) $errors['payment_reference'] = ['Payment reference must not exceed 150 characters.'];
        if ($heldSaleId === false || ($heldSaleId !== null && $heldSaleId < 1)) $errors['held_sale_id'] = ['Select a valid held sale.'];

        $merged = [];
        if (is_array($items)) {
            foreach ($items as $index => $item) {
                if (!is_array($item)) { $errors["items.$index"] = ['Enter a valid sale item.']; continue; }
                $id = filter_var($item['product_id'] ?? null, FILTER_VALIDATE_INT);
                $unitId = filter_var($item['unit_id'] ?? null, FILTER_VALIDATE_INT);
                $quantity = $this->decimal((string) ($item['quantity'] ?? ''), 3);
                if ($id === false || $id < 1) { $errors["items.$index.product_id"] = ['Select a valid product.']; continue; }
                if ($unitId !== false && $unitId !== null && $unitId < 1) { $errors["items.$index.unit_id"] = ['Select a valid unit.']; continue; }
                if ($quantity === null || $quantity <= 0) { $errors["items.$index.quantity"] = ['Quantity must be greater than zero.']; continue; }
                
                $key = $id . '_' . ($unitId ?? '0');
                if (!isset($merged[$key])) {
                    $merged[$key] = ['product_id' => (int)$id, 'unit_id' => $unitId ? (int)$unitId : null, 'quantity' => 0.0];
                }
                $merged[$key]['quantity'] += ($quantity / 1000.0);
            }
        }
        if ($errors !== []) throw new HttpException('Please correct the sale details.', 422, $errors);
        return ['request_token'=>$token,'items'=>array_values($merged),'discount_type'=>$discountType,'discount_value_cents'=>$discountValue,'payment_method'=>$paymentMethod,'amount_received_cents'=>$amountReceived,'customer_name'=>$customerName===''?null:$customerName,'customer_phone'=>$customerPhone===''?null:$customerPhone,'notes'=>$notes===''?null:$notes,'payment_reference'=>$paymentReference===''?null:$paymentReference,'held_sale_id'=>$heldSaleId===null?null:(int)$heldSaleId];
    }

    public function filters(array $input): array
    {
        $errors = [];
        $page = $this->positiveInt($input['page'] ?? 1, 1);
        $limit = min($this->positiveInt($input['limit'] ?? 20, 20), 100);
        $dateFrom = trim((string) ($input['date_from'] ?? ''));
        $dateTo = trim((string) ($input['date_to'] ?? ''));
        $cashierId = $this->nullablePositiveInt($input['cashier_id'] ?? null, 'cashier_id', $errors);
        $paymentMethod = trim((string) ($input['payment_method'] ?? ''));
        $paymentStatus = trim((string) ($input['payment_status'] ?? ''));
        $status = trim((string) ($input['status'] ?? ''));
        $minTotal = $this->optionalMoney($input['min_total'] ?? '', 'min_total', $errors);
        $maxTotal = $this->optionalMoney($input['max_total'] ?? '', 'max_total', $errors);
        $sortBy = (string) ($input['sort_by'] ?? 'created_at');
        $sortDirection = strtolower((string) ($input['sort_direction'] ?? 'desc'));

        if ($dateFrom !== '' && !$this->validDate($dateFrom)) $errors['date_from'] = ['Enter a valid start date.'];
        if ($dateTo !== '' && !$this->validDate($dateTo)) $errors['date_to'] = ['Enter a valid end date.'];
        if ($dateFrom !== '' && $dateTo !== '' && $this->validDate($dateFrom) && $this->validDate($dateTo) && $dateFrom > $dateTo) $errors['date_from'] = ['Start date cannot be after end date.'];
        if ($paymentMethod !== '' && !in_array($paymentMethod, self::PAYMENT_METHODS, true)) $errors['payment_method'] = ['Select a valid payment method.'];
        if ($paymentStatus !== '' && !in_array($paymentStatus, self::PAYMENT_STATUSES, true)) $errors['payment_status'] = ['Select a valid payment status.'];
        if ($status !== '' && !in_array($status, self::SALE_STATUSES, true)) $errors['status'] = ['Select a valid sale status.'];
        if ($minTotal !== null && $maxTotal !== null && (float) $minTotal > (float) $maxTotal) $errors['min_total'] = ['Minimum total cannot exceed maximum total.'];
        if (!in_array($sortBy, self::SORT_COLUMNS, true)) $errors['sort_by'] = ['Select a valid sort field.'];
        if (!in_array($sortDirection, ['asc', 'desc'], true)) $errors['sort_direction'] = ['Select a valid sort direction.'];
        if ($errors !== []) throw new HttpException('Please correct the sales filters.', 422, $errors);

        return ['search'=>mb_substr(trim((string)($input['search']??'')),0,150),'date_from'=>$dateFrom,'date_to'=>$dateTo,'cashier_id'=>$cashierId,'payment_method'=>$paymentMethod,'payment_status'=>$paymentStatus,'status'=>$status,'customer'=>mb_substr(trim((string)($input['customer']??'')),0,150),'min_total'=>$minTotal,'max_total'=>$maxTotal,'page'=>$page,'limit'=>$limit,'sort_by'=>$sortBy,'sort_direction'=>$sortDirection];
    }

    public function cancellation(array $input): array
    {
        return ['reason' => $this->reason($input)];
    }

    public function refund(array $input): array
    {
        if (isset($input['items']) || isset($input['refund_amount']) || isset($input['amount'])) throw new HttpException('Partial refunds are not supported yet. Refund the complete sale instead.', 422);
        $method = trim((string) ($input['refund_method'] ?? ''));
        $errors = [];
        if (!in_array($method, self::PAYMENT_METHODS, true)) $errors['refund_method'] = ['Select a valid refund method.'];
        $reason = $this->reason($input, $errors);
        if ($errors !== []) throw new HttpException('Please correct the refund details.', 422, $errors);
        return ['reason'=>$reason,'refund_method'=>$method];
    }

    private function reason(array $input, array &$errors = []): string
    {
        $reason = trim((string) ($input['reason'] ?? ''));
        if ($reason === '') $errors['reason'] = ['A reason is required.'];
        elseif (mb_strlen($reason) > 500) $errors['reason'] = ['Reason must not exceed 500 characters.'];
        if ($errors !== []) throw new HttpException('Please provide a valid reason.', 422, $errors);
        return $reason;
    }

    private function validDate(string $value): bool { $date=DateTimeImmutable::createFromFormat('!Y-m-d',$value); return $date!==false && $date->format('Y-m-d')===$value; }
    private function positiveInt(mixed $value,int $default): int { $parsed=filter_var($value,FILTER_VALIDATE_INT); return $parsed===false||$parsed<1?$default:(int)$parsed; }
    private function nullablePositiveInt(mixed $value,string $field,array &$errors): ?int { if($value===null||$value==='')return null;$parsed=filter_var($value,FILTER_VALIDATE_INT);if($parsed===false||$parsed<1){$errors[$field]=['Select a valid cashier.'];return null;}return(int)$parsed; }
    private function optionalMoney(mixed $value,string $field,array &$errors): ?string { if($value===null||$value==='')return null;$scaled=$this->decimal((string)$value,2);if($scaled===null||$scaled<0){$errors[$field]=['Enter a valid non-negative amount.'];return null;}return number_format($scaled/100,2,'.',''); }
    private function decimal(string $value,int $scale): ?int { $value=trim($value);if(preg_match('/^\d+(?:\.(\d+))?$/',$value,$matches)!==1)return null;$fraction=str_pad(substr($matches[1]??'',0,$scale),$scale,'0');return(int)strstr($value.'.','.',true)*(10**$scale)+(int)$fraction; }
}
