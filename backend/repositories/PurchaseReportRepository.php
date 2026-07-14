<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Config\Database;
use PDO;

final class PurchaseReportRepository
{
    public function __construct(private readonly Database $database)
    {
    }

    public function report(string $type, array $filters): array
    {
        return match ($type) {
            'purchase_summary' => $this->purchaseSummary($filters),
            'supplier_purchases' => $this->supplierPurchases($filters),
            'product_purchases' => $this->productPurchases($filters),
            'monthly_purchases' => $this->monthlyPurchases($filters),
            'supplier_balances' => $this->supplierBalances($filters),
            'purchase_payments' => $this->purchasePayments($filters),
            'purchase_returns' => $this->purchaseReturns($filters),
        };
    }

    private function purchaseSummary(array $filters): array
    {
        [$where, $params] = $this->purchaseWhere($filters, 'ps');
        $total = (int) $this->scalar('SELECT COUNT(*) FROM purchases p JOIN suppliers s ON s.id=p.supplier_id' . $where, $params);
        $summary = $this->first(
            "SELECT COUNT(*) total_records,
                COALESCE(SUM(p.purchase_status IN ('completed','partially_returned','returned')),0) completed_purchases,
                COALESCE(SUM(p.purchase_status='cancelled'),0) cancelled_purchases,
                COALESCE(SUM(CASE WHEN p.purchase_status IN ('completed','partially_returned','returned') THEN p.grand_total ELSE 0 END),0) total_purchases,
                COALESCE(SUM(CASE WHEN p.purchase_status IN ('completed','partially_returned','returned') THEN p.amount_paid ELSE 0 END),0) amount_paid,
                COALESCE(SUM(CASE WHEN p.purchase_status IN ('completed','partially_returned','returned') THEN p.balance_due ELSE 0 END),0) balance_due
             FROM purchases p JOIN suppliers s ON s.id=p.supplier_id" . $where,
            $params
        ) ?? [];
        $rows = $this->paged(
            'SELECT p.id,p.purchase_number,p.purchase_date,s.name supplier_name,p.supplier_invoice_number,p.grand_total,p.amount_paid,p.balance_due,p.payment_status,p.purchase_status
             FROM purchases p JOIN suppliers s ON s.id=p.supplier_id' . $where .
            ' ORDER BY p.purchase_date DESC,p.id DESC LIMIT :limit OFFSET :offset',
            $params,
            $filters
        );
        $chart = $this->all(
            "SELECT DATE_FORMAT(p.purchase_date,'%Y-%m') label,
                COALESCE(SUM(CASE WHEN p.purchase_status IN ('completed','partially_returned','returned') THEN p.grand_total ELSE 0 END),0) total
             FROM purchases p JOIN suppliers s ON s.id=p.supplier_id" . $where .
            ' GROUP BY label ORDER BY label',
            $params
        );
        return $this->pageResult($rows, $total, $filters, $summary, $chart);
    }

    private function supplierPurchases(array $filters): array
    {
        [$where, $params] = $this->purchaseWhere($filters, 'sp', true);
        $base = ' FROM purchases p JOIN suppliers s ON s.id=p.supplier_id' . $where;
        $group = ' GROUP BY s.id,s.name,s.phone,s.current_balance';
        $total = (int) $this->scalar('SELECT COUNT(*) FROM (SELECT s.id' . $base . $group . ') supplier_report', $params);
        $rows = $this->paged(
            "SELECT s.id supplier_id,s.name supplier_name,s.phone,COUNT(*) purchase_count,
                SUM(p.grand_total) total_purchases,SUM(p.amount_paid) amount_paid,SUM(p.balance_due) balance_due,s.current_balance
             " . $base . $group . ' ORDER BY total_purchases DESC,s.name LIMIT :limit OFFSET :offset',
            $params,
            $filters
        );
        $summary = $this->first(
            'SELECT COUNT(*) purchase_count,COALESCE(SUM(p.grand_total),0) total_purchases,COALESCE(SUM(p.amount_paid),0) amount_paid,COALESCE(SUM(p.balance_due),0) balance_due' . $base,
            $params
        ) ?? [];
        $chart = array_map(static fn (array $row): array => ['label' => $row['supplier_name'], 'total' => $row['total_purchases']], $rows);
        return $this->pageResult($rows, $total, $filters, $summary, $chart);
    }

    private function productPurchases(array $filters): array
    {
        [$where, $params] = $this->purchaseWhere($filters, 'pp', true);
        if ($filters['product_id'] !== null) {
            $where .= ' AND pi.product_id=:pp_product';
            $params['pp_product'] = $filters['product_id'];
        }
        $base = ' FROM purchase_items pi JOIN purchases p ON p.id=pi.purchase_id JOIN suppliers s ON s.id=p.supplier_id JOIN products pr ON pr.id=pi.product_id' . $where;
        $group = ' GROUP BY pi.product_id,pi.product_name,pi.product_code,pr.unit_type';
        $total = (int) $this->scalar('SELECT COUNT(*) FROM (SELECT pi.product_id' . $base . $group . ') product_report', $params);
        $rows = $this->paged(
            "SELECT pi.product_id,pi.product_name,pi.product_code,pr.unit_type,
                SUM(pi.quantity) purchased_quantity,SUM(pi.returned_quantity) returned_quantity,
                SUM(pi.quantity-pi.returned_quantity) net_quantity,
                SUM(pi.line_total) total_purchase_value,
                SUM(CASE WHEN pi.quantity>0 THEN pi.line_total*(pi.quantity-pi.returned_quantity)/pi.quantity ELSE 0 END) net_purchase_value,
                AVG(pi.unit_cost) average_unit_cost
             " . $base . $group . ' ORDER BY net_purchase_value DESC,pi.product_name LIMIT :limit OFFSET :offset',
            $params,
            $filters
        );
        $summary = $this->first(
            "SELECT COALESCE(SUM(pi.quantity),0) purchased_quantity,COALESCE(SUM(pi.returned_quantity),0) returned_quantity,
                COALESCE(SUM(pi.quantity-pi.returned_quantity),0) net_quantity,
                COALESCE(SUM(CASE WHEN pi.quantity>0 THEN pi.line_total*(pi.quantity-pi.returned_quantity)/pi.quantity ELSE 0 END),0) net_purchase_value" . $base,
            $params
        ) ?? [];
        $chart = array_map(static fn (array $row): array => ['label' => $row['product_name'], 'total' => $row['net_purchase_value']], array_slice($rows, 0, 12));
        return $this->pageResult($rows, $total, $filters, $summary, $chart);
    }

    private function monthlyPurchases(array $filters): array
    {
        [$where, $params] = $this->purchaseWhere($filters, 'mp', true);
        $allRows = $this->all(
            "SELECT DATE_FORMAT(p.purchase_date,'%Y-%m') period_key,DATE_FORMAT(p.purchase_date,'%b %Y') period,
                COUNT(*) purchase_count,SUM(p.grand_total) total_purchases,SUM(p.amount_paid) amount_paid,SUM(p.balance_due) balance_due
             FROM purchases p JOIN suppliers s ON s.id=p.supplier_id" . $where .
            ' GROUP BY period_key,period ORDER BY period_key',
            $params
        );
        $rows = array_slice($allRows, ($filters['page'] - 1) * $filters['limit'], $filters['limit']);
        $summary = [
            'purchase_count' => array_sum(array_map(static fn (array $row): int => (int) $row['purchase_count'], $allRows)),
            'total_purchases' => $this->sum($allRows, 'total_purchases'),
            'amount_paid' => $this->sum($allRows, 'amount_paid'),
            'balance_due' => $this->sum($allRows, 'balance_due'),
        ];
        $chart = array_map(static fn (array $row): array => ['label' => $row['period'], 'total' => $row['total_purchases']], $allRows);
        return $this->pageResult($rows, count($allRows), $filters, $summary, $chart);
    }

    private function supplierBalances(array $filters): array
    {
        $conditions = ["s.status<>'deleted'"];
        $params = [];
        if ($filters['supplier_id'] !== null) {
            $conditions[] = 's.id=:sb_supplier';
            $params['sb_supplier'] = $filters['supplier_id'];
        }
        if ($filters['search'] !== '') {
            $conditions[] = '(s.name LIKE :sb_search OR s.phone LIKE :sb_search OR s.email LIKE :sb_search)';
            $params['sb_search'] = '%' . $filters['search'] . '%';
        }
        $where = ' WHERE ' . implode(' AND ', $conditions);
        $total = (int) $this->scalar('SELECT COUNT(*) FROM suppliers s' . $where, $params);
        $rows = $this->paged(
            'SELECT s.id supplier_id,s.name supplier_name,s.phone,s.email,s.status,s.opening_balance,s.current_balance,
                (SELECT COUNT(*) FROM purchases p WHERE p.supplier_id=s.id AND p.purchase_status IN (\'completed\',\'partially_returned\',\'returned\')) purchase_count
             FROM suppliers s' . $where . ' ORDER BY s.current_balance DESC,s.name LIMIT :limit OFFSET :offset',
            $params,
            $filters
        );
        $summary = $this->first('SELECT COUNT(*) supplier_count,COALESCE(SUM(s.current_balance),0) total_supplier_balance,COALESCE(SUM(s.opening_balance),0) opening_balance FROM suppliers s' . $where, $params) ?? [];
        $chart = array_map(static fn (array $row): array => ['label' => $row['supplier_name'], 'total' => $row['current_balance']], array_slice($rows, 0, 12));
        return $this->pageResult($rows, $total, $filters, $summary, $chart);
    }

    private function purchasePayments(array $filters): array
    {
        [$where, $params] = $this->datedWhere($filters, 'pay.payment_date', 'py');
        $where .= " AND p.purchase_status<>'draft'";
        if ($filters['supplier_id'] !== null) {
            $where .= ' AND p.supplier_id=:py_supplier';
            $params['py_supplier'] = $filters['supplier_id'];
        }
        if ($filters['search'] !== '') {
            $where .= ' AND (p.purchase_number LIKE :py_search OR s.name LIKE :py_search OR pay.reference_number LIKE :py_search)';
            $params['py_search'] = '%' . $filters['search'] . '%';
        }
        $base = ' FROM purchase_payments pay JOIN purchases p ON p.id=pay.purchase_id JOIN suppliers s ON s.id=p.supplier_id' . $where;
        $total = (int) $this->scalar('SELECT COUNT(*)' . $base, $params);
        $rows = $this->paged(
            'SELECT pay.id,pay.payment_date,p.purchase_number,s.name supplier_name,pay.amount,pay.payment_method,pay.reference_number,pay.notes' . $base .
            ' ORDER BY pay.payment_date DESC,pay.id DESC LIMIT :limit OFFSET :offset',
            $params,
            $filters
        );
        $summary = $this->first('SELECT COUNT(*) payment_count,COALESCE(SUM(pay.amount),0) total_paid' . $base, $params) ?? [];
        $chart = $this->all('SELECT pay.payment_method label,SUM(pay.amount) total' . $base . ' GROUP BY pay.payment_method ORDER BY total DESC', $params);
        return $this->pageResult($rows, $total, $filters, $summary, $chart);
    }

    private function purchaseReturns(array $filters): array
    {
        [$where, $params] = $this->datedWhere($filters, 'r.return_date', 'pr');
        if ($filters['supplier_id'] !== null) {
            $where .= ' AND r.supplier_id=:pr_supplier';
            $params['pr_supplier'] = $filters['supplier_id'];
        }
        if ($filters['search'] !== '') {
            $where .= ' AND (r.return_number LIKE :pr_search OR p.purchase_number LIKE :pr_search OR s.name LIKE :pr_search)';
            $params['pr_search'] = '%' . $filters['search'] . '%';
        }
        $base = ' FROM purchase_returns r JOIN purchases p ON p.id=r.purchase_id JOIN suppliers s ON s.id=r.supplier_id' . $where;
        $total = (int) $this->scalar('SELECT COUNT(*)' . $base, $params);
        $rows = $this->paged(
            'SELECT r.id,r.return_number,r.return_date,p.purchase_number,s.name supplier_name,r.subtotal return_value,r.refund_amount,r.reason' . $base .
            ' ORDER BY r.return_date DESC,r.id DESC LIMIT :limit OFFSET :offset',
            $params,
            $filters
        );
        $summary = $this->first('SELECT COUNT(*) return_count,COALESCE(SUM(r.subtotal),0) total_returned,COALESCE(SUM(r.refund_amount),0) total_refunded' . $base, $params) ?? [];
        $chart = $this->all("SELECT DATE_FORMAT(r.return_date,'%Y-%m') label,SUM(r.subtotal) total" . $base . ' GROUP BY label ORDER BY label', $params);
        return $this->pageResult($rows, $total, $filters, $summary, $chart);
    }

    private function purchaseWhere(array $filters, string $prefix, bool $completedOnly = false): array
    {
        [$where, $params] = $this->datedWhere($filters, 'p.purchase_date', $prefix);
        $where .= $completedOnly
            ? " AND p.purchase_status IN ('completed','partially_returned','returned')"
            : " AND p.purchase_status<>'draft'";
        if ($filters['supplier_id'] !== null) {
            $where .= " AND p.supplier_id=:{$prefix}_supplier";
            $params[$prefix . '_supplier'] = $filters['supplier_id'];
        }
        if ($filters['search'] !== '') {
            $where .= " AND (p.purchase_number LIKE :{$prefix}_search OR p.supplier_invoice_number LIKE :{$prefix}_search OR s.name LIKE :{$prefix}_search)";
            $params[$prefix . '_search'] = '%' . $filters['search'] . '%';
        }
        return [$where, $params];
    }

    private function datedWhere(array $filters, string $column, string $prefix): array
    {
        return [
            " WHERE {$column} BETWEEN :{$prefix}_from AND :{$prefix}_to",
            [$prefix . '_from' => $filters['date_from'], $prefix . '_to' => $filters['date_to']],
        ];
    }

    private function pageResult(array $rows, int $total, array $filters, array $summary, array $chart): array
    {
        return [
            'summary' => $summary,
            'rows' => $rows,
            'chart' => $chart,
            'pagination' => [
                'page' => $filters['page'],
                'limit' => $filters['limit'],
                'total' => $total,
                'total_pages' => max(1, (int) ceil($total / $filters['limit'])),
            ],
            'filters' => $filters,
        ];
    }

    private function paged(string $sql, array $params, array $filters): array
    {
        $statement = $this->database->connection()->prepare($sql);
        $this->bind($statement, $params);
        $statement->bindValue(':limit', $filters['limit'], PDO::PARAM_INT);
        $statement->bindValue(':offset', ($filters['page'] - 1) * $filters['limit'], PDO::PARAM_INT);
        $statement->execute();
        return $statement->fetchAll();
    }

    private function all(string $sql, array $params): array
    {
        $statement = $this->database->connection()->prepare($sql);
        $statement->execute($params);
        return $statement->fetchAll();
    }

    private function first(string $sql, array $params): ?array
    {
        $statement = $this->database->connection()->prepare($sql);
        $statement->execute($params);
        $row = $statement->fetch();
        return $row ?: null;
    }

    private function scalar(string $sql, array $params): string
    {
        $statement = $this->database->connection()->prepare($sql);
        $statement->execute($params);
        return (string) $statement->fetchColumn();
    }

    private function bind(\PDOStatement $statement, array $params): void
    {
        foreach ($params as $key => $value) {
            $statement->bindValue(':' . $key, $value, is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR);
        }
    }

    private function sum(array $rows, string $key): string
    {
        return number_format(array_sum(array_map(static fn (array $row): float => (float) $row[$key], $rows)), 2, '.', '');
    }
}
