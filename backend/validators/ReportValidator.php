<?php

declare(strict_types=1);
namespace App\Validators;
use App\Http\HttpException;

final class ReportValidator
{
    public const TYPES = ['overview','sales','daily_sales','weekly_sales','monthly_sales','products','categories','cashiers','payment_methods','expenses','profit','stock','packaging_stock','low_stock','out_of_stock','wastage','best_selling_products','purchase_summary','supplier_purchases','product_purchases','monthly_purchases','supplier_balances','purchase_payments','purchase_returns'];
    private const PAYMENTS = ['cash','card','bank_transfer','mobile_wallet','other'];
    private const SALE_STATUSES = ['completed','cancelled','refunded'];
    private const EXPENSE_STATUSES = ['active','voided'];
    private const STOCK_STATUSES = ['in_stock','low_stock','out_of_stock'];
    private const TRANSACTIONS = ['wastage','damaged','expired'];
    private const SORTS = ['date','created_at','amount','title','invoice_number','grand_total','quantity','quantity_sold','net_sales','gross_sales','gross_profit','name','category','status','stock','shortage','cost_impact','transaction_count','purchase_date','payment_date','return_date','total_purchases','balance_due','current_balance'];

    public function type(string $type): string
    {
        if (!in_array($type, self::TYPES, true)) {
            throw new HttpException('Select a valid report type.', 422, ['report_type' => ['The report type is not supported.']]);
        }
        return $type;
    }

    public function filters(array $input, string $type): array
    {
        $this->type($type);
        [$defaultFrom, $defaultTo] = $this->defaultRange();
        $dateFrom = trim((string) ($input['date_from'] ?? $defaultFrom));
        $dateTo = trim((string) ($input['date_to'] ?? $defaultTo));
        $errors = [];
        foreach (['date_from' => $dateFrom, 'date_to' => $dateTo] as $field => $value) {
            $date = \DateTimeImmutable::createFromFormat('!Y-m-d', $value);
            if (!$date || $date->format('Y-m-d') !== $value) $errors[$field] = ['Enter a valid date.'];
        }
        if ($dateFrom !== '' && $dateTo !== '' && $dateFrom > $dateTo) $errors['date_to'] = ['End date must be on or after start date.'];
        $rangeDays = (strtotime($dateTo) - strtotime($dateFrom)) / 86400;
        if ($rangeDays > 3660) $errors['date_to'] = ['Report date range cannot exceed ten years.'];
        $payment = trim((string) ($input['payment_method'] ?? ''));
        $saleStatus = trim((string) ($input['sale_status'] ?? ''));
        $expenseStatus = trim((string) ($input['expense_status'] ?? 'active'));
        $stockStatus = trim((string) ($input['stock_status'] ?? ''));
        $transaction = trim((string) ($input['transaction_type'] ?? ''));
        $tracking = trim((string) ($input['tracking'] ?? ''));
        $groupBy = trim((string) ($input['group_by'] ?? 'day'));
        $sortBy = trim((string) ($input['sort_by'] ?? $this->defaultSort($type)));
        $direction = strtolower(trim((string) ($input['sort_direction'] ?? 'desc')));
        if ($payment !== '' && !in_array($payment, self::PAYMENTS, true)) $errors['payment_method'] = ['Select a valid payment method.'];
        if ($saleStatus !== '' && !in_array($saleStatus, self::SALE_STATUSES, true)) $errors['sale_status'] = ['Select a valid sale status.'];
        if ($expenseStatus === 'all') $expenseStatus = '';
        if ($expenseStatus !== '' && !in_array($expenseStatus, self::EXPENSE_STATUSES, true)) $errors['expense_status'] = ['Select a valid expense status.'];
        if ($stockStatus !== '' && !in_array($stockStatus, self::STOCK_STATUSES, true)) $errors['stock_status'] = ['Select a valid stock status.'];
        if ($transaction !== '' && !in_array($transaction, self::TRANSACTIONS, true)) $errors['transaction_type'] = ['Select a valid transaction type.'];
        if ($tracking !== '' && !in_array($tracking, ['tracked', 'untracked'], true)) $errors['tracking'] = ['Select a valid tracking option.'];
        if (!in_array($groupBy, ['day','week','month'], true)) $errors['group_by'] = ['Group by must be day, week, or month.'];
        if (!in_array($sortBy, self::SORTS, true)) $errors['sort_by'] = ['Select a valid sort field.'];
        if (!in_array($direction, ['asc','desc'], true)) $errors['sort_direction'] = ['Select a valid sort direction.'];
        $ids = [];
        foreach (['cashier_id','product_id','category_id','expense_category_id','user_id','supplier_id'] as $field) {
            $raw = $input[$field] ?? '';
            $ids[$field] = $raw === '' ? null : filter_var($raw, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
            if ($ids[$field] === false) $errors[$field] = ['Select a valid record.'];
        }
        $numbers = [];
        foreach (['min_total','max_total','min_amount','max_amount'] as $field) {
            $raw = trim((string) ($input[$field] ?? ''));
            $numbers[$field] = $raw === '' ? null : $raw;
            if ($raw !== '' && (!is_numeric($raw) || (float) $raw < 0)) $errors[$field] = ['Enter a valid non-negative amount.'];
        }
        if ($numbers['min_total'] !== null && $numbers['max_total'] !== null && (float) $numbers['min_total'] > (float) $numbers['max_total']) $errors['max_total'] = ['Maximum total must be at least the minimum.'];
        if ($numbers['min_amount'] !== null && $numbers['max_amount'] !== null && (float) $numbers['min_amount'] > (float) $numbers['max_amount']) $errors['max_amount'] = ['Maximum amount must be at least the minimum.'];
        $search = trim((string) ($input['search'] ?? ''));
        if (mb_strlen($search) > 150) $errors['search'] = ['Search must not exceed 150 characters.'];
        if ($errors !== []) throw new HttpException('Some report filters are invalid.', 422, $errors);
        return [
            'date_from' => $dateFrom, 'date_to' => $dateTo, 'search' => $search,
            ...$ids, 'payment_method' => $payment, 'sale_status' => $saleStatus,
            'expense_status' => $expenseStatus, 'stock_status' => $stockStatus,
            'transaction_type' => $transaction, 'tracking' => $tracking,
            'group_by' => $groupBy, ...$numbers,
            'page' => max(1, (int) ($input['page'] ?? 1)),
            'limit' => min(100, max(10, (int) ($input['limit'] ?? 20))),
            'sort_by' => $sortBy, 'sort_direction' => $direction,
        ];
    }

    private function defaultRange(): array
    {
        return [date('Y-m-01'), date('Y-m-d')];
    }

    private function defaultSort(string $type): string
    {
        return match ($type) {
            'sales', 'expenses', 'wastage', 'purchase_summary', 'purchase_payments', 'purchase_returns' => 'date',
            'supplier_purchases', 'product_purchases', 'monthly_purchases' => 'total_purchases',
            'supplier_balances' => 'current_balance',
            'stock', 'low_stock', 'out_of_stock' => 'name',
            default => 'net_sales',
        };
    }
}


