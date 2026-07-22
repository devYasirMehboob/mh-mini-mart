<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Config\Database;
use PDO;

final class DashboardRepository
{
    public function __construct(private readonly Database $database) {}

    public function salesSummary(?int $cashierId): array
    {
        [$filter, $parameters] = $this->cashierFilter($cashierId);
        $statement = $this->database->connection()->prepare(
            'SELECT COALESCE(SUM(s.subtotal), 0) AS gross_sales,
                    COALESCE(SUM(s.discount_amount), 0) AS discounts,
                    COALESCE(SUM(s.subtotal - s.discount_amount), 0) AS net_sales,
                    COALESCE(SUM(s.tax_amount), 0) AS tax_amount,
                    COUNT(*) AS sales_count
             FROM sales s
             WHERE s.status = :status
               AND s.created_at >= CURRENT_DATE()
               AND s.created_at < CURRENT_DATE() + INTERVAL 1 DAY' . $filter
        );
        $statement->execute(['status' => 'completed', ...$parameters]);
        return $statement->fetch() ?: [];
    }

    public function costOfGoodsSold(?int $cashierId): string
    {
        [$filter, $parameters] = $this->cashierFilter($cashierId);
        $statement = $this->database->connection()->prepare(
            'SELECT COALESCE(SUM(si.purchase_cost * si.quantity_base), 0)
             FROM sale_items si
             INNER JOIN sales s ON s.id = si.sale_id
             WHERE s.status = :status
               AND s.created_at >= CURRENT_DATE()
               AND s.created_at < CURRENT_DATE() + INTERVAL 1 DAY' . $filter
        );
        $statement->execute(['status' => 'completed', ...$parameters]);
        return (string) $statement->fetchColumn();
    }

    public function todayExpenses(): string
    {
        $statement = $this->database->connection()->prepare(
            'SELECT COALESCE(SUM(amount), 0) FROM expenses
             WHERE status = :status AND expense_date = CURRENT_DATE()'
        );
        $statement->execute(['status' => 'active']);
        return (string) $statement->fetchColumn();
    }

    public function productSummary(): array
    {
        $statement = $this->database->connection()->prepare(
            'SELECT COALESCE(SUM(status = :active), 0) AS active_products,
                    COALESCE(SUM(track_stock = 1 AND stock_quantity_base > 0 AND stock_quantity_base <= minimum_stock), 0) AS low_stock,
                    COALESCE(SUM(track_stock = 1 AND stock_quantity_base <= 0), 0) AS out_of_stock
             FROM products'
        );
        $statement->execute(['active' => 'active']);
        return $statement->fetch() ?: [];
    }

    public function recentSales(?int $cashierId, int $limit = 8): array
    {
        [$filter, $parameters] = $this->cashierFilter($cashierId);
        $statement = $this->database->connection()->prepare(
            'SELECT s.id, s.invoice_number, s.grand_total, s.payment_method,
                    s.status, s.created_at, a.name AS cashier_name, a.role AS cashier_role
             FROM sales s
             INNER JOIN access_credentials a ON a.id = s.cashier_id
             WHERE s.status = :status' . $filter . '
             ORDER BY s.created_at DESC, s.id DESC LIMIT :limit'
        );
        $statement->bindValue(':status', 'completed');
        foreach ($parameters as $name => $value) {
            $statement->bindValue(':' . $name, $value, PDO::PARAM_INT);
        }
        $statement->bindValue(':limit', $limit, PDO::PARAM_INT);
        $statement->execute();
        return $statement->fetchAll();
    }

    public function bestSellingProducts(?int $cashierId, int $limit = 5): array
    {
        [$filter, $parameters] = $this->cashierFilter($cashierId);
        $statement = $this->database->connection()->prepare(
            "SELECT si.product_id, si.product_name, si.product_code,
                    SUM(si.quantity_base) AS quantity_sold,
                    SUM(si.line_total - si.discount_amount) AS sales_amount
             FROM sale_items si
             INNER JOIN sales s ON s.id = si.sale_id
             WHERE s.status = :status
               AND s.created_at >= DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01')
               AND s.created_at < DATE_FORMAT(CURRENT_DATE() + INTERVAL 1 MONTH, '%Y-%m-01')" . $filter . '
             GROUP BY si.product_id, si.product_name, si.product_code
             ORDER BY quantity_sold DESC, sales_amount DESC LIMIT :limit'
        );
        $statement->bindValue(':status', 'completed');
        foreach ($parameters as $name => $value) {
            $statement->bindValue(':' . $name, $value, PDO::PARAM_INT);
        }
        $statement->bindValue(':limit', $limit, PDO::PARAM_INT);
        $statement->execute();
        return $statement->fetchAll();
    }

    public function hourlySales(?int $cashierId): array
    {
        return $this->periodSales('HOUR(s.created_at)',
            's.created_at >= CURRENT_DATE() AND s.created_at < CURRENT_DATE() + INTERVAL 1 DAY', $cashierId);
    }

    public function monthlySales(?int $cashierId): array
    {
        return $this->periodSales('DAY(s.created_at)',
            "s.created_at >= DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01') AND s.created_at < DATE_FORMAT(CURRENT_DATE() + INTERVAL 1 MONTH, '%Y-%m-01')", $cashierId);
    }

    public function paymentMethods(?int $cashierId): array
    {
        [$filter, $parameters] = $this->cashierFilter($cashierId);
        $statement = $this->database->connection()->prepare(
            "SELECT s.payment_method, COUNT(*) AS sales_count, COALESCE(SUM(s.grand_total), 0) AS total
             FROM sales s
             WHERE s.status = :status
               AND s.created_at >= DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01')
               AND s.created_at < DATE_FORMAT(CURRENT_DATE() + INTERVAL 1 MONTH, '%Y-%m-01')" . $filter . '
             GROUP BY s.payment_method ORDER BY total DESC'
        );
        $statement->execute(['status' => 'completed', ...$parameters]);
        return $statement->fetchAll();
    }

    public function currentDate(): string
    {
        $statement = $this->database->connection()->prepare('SELECT CURRENT_DATE()');
        $statement->execute();
        return (string) $statement->fetchColumn();
    }

    private function periodSales(string $groupExpression, string $dateCondition, ?int $cashierId): array
    {
        [$filter, $parameters] = $this->cashierFilter($cashierId);
        $statement = $this->database->connection()->prepare(
            'SELECT ' . $groupExpression . ' AS period_key, COALESCE(SUM(s.subtotal - s.discount_amount), 0) AS total,
                    COUNT(*) AS sales_count FROM sales s
             WHERE s.status = :status AND ' . $dateCondition . $filter . '
             GROUP BY period_key ORDER BY period_key ASC'
        );
        $statement->execute(['status' => 'completed', ...$parameters]);
        return $statement->fetchAll();
    }

    private function cashierFilter(?int $cashierId): array
    {
        return $cashierId === null
            ? ['', []]
            : [' AND s.cashier_id = :cashier_id', ['cashier_id' => $cashierId]];
    }
}

