<?php

declare(strict_types=1);

namespace App\Services;

use App\Repositories\DashboardRepository;
use DateTimeImmutable;

final class DashboardService
{
    public function __construct(private readonly DashboardRepository $repository) {}

    public function overview(array $user): array
    {
        $isAdmin = in_array('reports.profit', $user['permissions'] ?? [], true);
        $cashierId = in_array('sales.view_all', $user['permissions'] ?? [], true) ? null : (int) $user['id'];
        $sales = $this->repository->salesSummary($cashierId);
        $products = $this->repository->productSummary();
        $netSales = (float) ($sales['net_sales'] ?? 0);
        $cost = $isAdmin ? (float) $this->repository->costOfGoodsSold(null) : null;
        $expenses = $isAdmin ? (float) $this->repository->todayExpenses() : null;

        return [
            'summary' => [
                'today_sales' => $this->money($netSales),
                'today_expenses' => $expenses === null ? null : $this->money($expenses),
                'estimated_profit' => $cost === null || $expenses === null ? null : $this->money($netSales - $cost - $expenses),
                'sales_count' => (int) ($sales['sales_count'] ?? 0),
                'total_products' => (int) ($products['active_products'] ?? 0),
                'low_stock_count' => (int) ($products['low_stock'] ?? 0),
                'out_of_stock_count' => (int) ($products['out_of_stock'] ?? 0),
            ],
            'profit_breakdown' => $isAdmin ? [
                'gross_sales' => $this->money((float) ($sales['gross_sales'] ?? 0)),
                'discounts' => $this->money((float) ($sales['discounts'] ?? 0)),
                'net_sales' => $this->money($netSales),
                'cost_of_goods_sold' => $this->money($cost ?? 0),
                'gross_profit' => $this->money($netSales - ($cost ?? 0)),
                'expenses' => $this->money($expenses ?? 0),
                'estimated_profit' => $this->money($netSales - ($cost ?? 0) - ($expenses ?? 0)),
            ] : null,
            'recent_sales' => $this->repository->recentSales($cashierId),
            'best_selling_products' => $this->repository->bestSellingProducts($cashierId),
            'hourly_sales' => $this->fillPeriods($this->repository->hourlySales($cashierId), 0, 23, true),
            'monthly_sales' => $this->monthSeries($this->repository->monthlySales($cashierId)),
            'payment_methods' => $this->repository->paymentMethods($cashierId),
            'permissions' => ['view_financials' => $isAdmin],
            'generated_for' => $this->repository->currentDate(),
        ];
    }

    private function monthSeries(array $rows): array
    {
        $today = new DateTimeImmutable($this->repository->currentDate());
        return $this->fillPeriods($rows, 1, (int) $today->format('j'));
    }

    private function fillPeriods(array $rows, int $start, int $end, bool $hours = false): array
    {
        $values = [];
        foreach ($rows as $row) {
            $values[(int) $row['period_key']] = $row;
        }
        $series = [];
        for ($period = $start; $period <= $end; $period++) {
            $series[] = [
                'key' => $period,
                'label' => $hours ? sprintf('%02d:00', $period) : (string) $period,
                'total' => $this->money((float) ($values[$period]['total'] ?? 0)),
                'sales_count' => (int) ($values[$period]['sales_count'] ?? 0),
            ];
        }
        return $series;
    }

    private function money(float $value): string
    {
        return number_format($value, 2, '.', '');
    }
}
