<?php

declare(strict_types=1);

namespace App\Services;

use App\Http\HttpException;
use App\Repositories\PurchaseReportRepository;
use App\Repositories\ReportRepository;
use App\Validators\ReportValidator;

final class ReportService
{
    private const PURCHASE_REPORTS = [
        'purchase_summary',
        'supplier_purchases',
        'product_purchases',
        'monthly_purchases',
        'supplier_balances',
        'purchase_payments',
        'purchase_returns',
    ];

    public function __construct(
        private readonly ReportRepository $reports,
        private readonly PurchaseReportRepository $purchaseReports,
        private readonly ReportValidator $validator
    ) {
    }

    public function report(string $type, array $query, array $user): array
    {
        $type = $this->validator->type($type);
        $filters = $this->validator->filters($query, $type);
        $canProfit = $this->can($user, 'reports.profit');
        $viewAll = $this->can($user, 'sales.view_all');

        if ($type === 'profit' && !$canProfit) {
            throw new HttpException('You do not have permission to view profit reports.', 403);
        }
        if (in_array($type, self::PURCHASE_REPORTS, true) && !$this->can($user, 'purchases.view')) {
            throw new HttpException('You do not have permission to view purchase reports.', 403);
        }
        if (!$viewAll && !in_array($type, self::PURCHASE_REPORTS, true)) {
            $filters['cashier_id'] = (int) $user['id'];
        }

        $data = match ($type) {
            'overview' => $this->overview($filters),
            'sales' => $this->sales($filters),
            'daily_sales' => $this->reports->groupedSales($filters, 'day'),
            'weekly_sales' => $this->reports->groupedSales($filters, 'week'),
            'monthly_sales' => $this->reports->groupedSales($filters, 'month'),
            'products' => $this->reports->products($filters),
            'categories' => $this->reports->categories($filters),
            'cashiers' => $this->reports->cashiers($filters),
            'payment_methods' => $this->reports->paymentMethods($filters),
            'expenses' => $this->reports->expenses($filters),
            'profit' => $this->profit($filters),
            'stock' => $this->reports->stock($filters),
            'packaging_stock' => $this->reports->packagingStock($filters),
            'low_stock' => $this->reports->stock($filters, 'low'),
            'out_of_stock' => $this->reports->stock($filters, 'out'),
            'wastage' => $this->reports->wastage($filters),
            'best_selling_products' => $this->reports->products($filters, true),
            default => $this->purchaseReports->report($type, $filters),
        };

        if (!$canProfit) {
            $data = $this->removeSensitive($data);
        }
        $data['report_type'] = $type;
        $data['permissions'] = [
            'can_export' => $this->can($user, 'reports.export') && (!in_array($type, self::PURCHASE_REPORTS, true) || $this->can($user, 'purchases.export')),
            'can_view_costs' => $canProfit,
            'can_view_profit' => $canProfit,
            'can_view_all_cashiers' => $viewAll,
        ];
        return $data;
    }

    public function options(array $user): array
    {
        $options = $this->reports->options();
        if (!$this->can($user, 'sales.view_all')) {
            $options['cashiers'] = array_values(array_filter(
                $options['cashiers'],
                fn (array $row): bool => (int) $row['id'] === (int) $user['id']
            ));
        }
        if (!$this->can($user, 'expenses.view')) {
            $options['expense_categories'] = [];
        }
        if (!$this->can($user, 'purchases.view')) {
            $options['suppliers'] = [];
        }
        return $options;
    }

    private function sales(array $filters): array
    {
        $data = $this->reports->sales($filters);
        $trend = $this->reports->groupedSales($filters, 'day');
        $data['chart'] = $trend['chart'];
        return $data;
    }

    private function overview(array $filters): array
    {
        $summary = [...$this->reports->financialSummary($filters), ...$this->reports->overviewExtras($filters)];
        $trend = $this->reports->groupedSales($filters, 'day');
        $payments = $this->reports->paymentMethods($filters);
        $categories = $this->reports->categories($filters);
        return [
            'summary' => $summary,
            'rows' => $trend['rows'],
            'chart' => $trend['chart'],
            'pagination' => $trend['pagination'],
            'filters' => $filters,
            'payment_breakdown' => $payments['rows'],
            'category_breakdown' => $categories['rows'],
        ];
    }

    private function profit(array $filters): array
    {
        $grouped = $this->reports->groupedSales($filters, $filters['group_by']);
        $grouped['summary'] = $this->reports->financialSummary($filters);
        return $grouped;
    }

    private function can(array $user, string $permission): bool
    {
        return in_array($permission, $user['permissions'] ?? [], true);
    }

    private function removeSensitive(array $data): array
    {
        $sensitive = [
            'cost_of_goods', 'gross_profit', 'estimated_net_profit', 'gross_margin', 'net_margin',
            'expenses', 'total_expenses', 'purchase_cost', 'estimated_stock_value', 'stock_value',
            'cost_impact', 'estimated_cost_impact',
        ];
        $clean = static function (array $row) use ($sensitive): array {
            foreach ($sensitive as $key) {
                unset($row[$key]);
            }
            return $row;
        };
        if (isset($data['summary']) && is_array($data['summary'])) {
            $data['summary'] = $clean($data['summary']);
        }
        if (isset($data['rows'])) {
            $data['rows'] = array_map($clean, $data['rows']);
        }
        if (isset($data['chart'])) {
            $data['chart'] = array_map($clean, $data['chart']);
        }
        return $data;
    }
}