<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Config\Database;
use PDO;

final class CustomerRepository
{
    public function __construct(private readonly Database $database) {}

    // -------------------------------------------------------------------------
    // Customer code generation (race-safe via AUTO_INCREMENT)
    // -------------------------------------------------------------------------
    public function getGlobalMetrics(): array
    {
        $outstanding = $this->database->connection()->query(
            "SELECT COALESCE(SUM(current_balance), 0) FROM customers WHERE status = 'active' AND khata_enabled = 1 AND is_system_walk_in = 0"
        )->fetchColumn();

        $totalSales = $this->database->connection()->query(
            "SELECT COALESCE(SUM(grand_total), 0) FROM sales WHERE status = 'completed'"
        )->fetchColumn();

        $totalCredit = $this->database->connection()->query(
            "SELECT COALESCE(SUM(credit_amount), 0) FROM sales WHERE status = 'completed'"
        )->fetchColumn();

        $outstanding = (float) $outstanding;
        $totalSales = (float) $totalSales;
        $totalCredit = (float) $totalCredit;

        $recovered = max(0, $totalCredit - $outstanding);
        $recoveryPercentage = $totalCredit > 0 ? round(($recovered / $totalCredit) * 100, 1) : 0;

        return [
            'total_outstanding' => $outstanding,
            'total_sales' => $totalSales,
            'recovery_percentage' => $recoveryPercentage,
            'total_recovered' => $recovered,
        ];
    }
    public function generateCustomerCode(): string
    {
        $pdo = $this->database->connection();
        $stmt = $pdo->prepare(
            'INSERT INTO customer_sequences (placeholder) VALUES (1)'
        );
        $stmt->execute();
        $id = (int) $pdo->lastInsertId();
        return 'CUS-' . str_pad((string) $id, 6, '0', STR_PAD_LEFT);
    }

    // -------------------------------------------------------------------------
    // Create
    // -------------------------------------------------------------------------
    public function create(array $data): int
    {
        $stmt = $this->database->connection()->prepare(
            'INSERT INTO customers
                (customer_code, name, phone, email, address, notes,
                 customer_type, khata_enabled, credit_limit, status, created_by)
             VALUES
                (:customer_code, :name, :phone, :email, :address, :notes,
                 :customer_type, :khata_enabled, :credit_limit, :status, :created_by)'
        );
        $stmt->execute([
            'customer_code'  => $data['customer_code'],
            'name'           => $data['name'],
            'phone'          => $data['phone'] ?? null,
            'email'          => $data['email'] ?? null,
            'address'        => $data['address'] ?? null,
            'notes'          => $data['notes'] ?? null,
            'customer_type'  => $data['customer_type'] ?? 'regular',
            'khata_enabled'  => (int) ($data['khata_enabled'] ?? 0),
            'credit_limit'   => $data['credit_limit'] ?? '0.00',
            'status'         => $data['status'] ?? 'active',
            'created_by'     => $data['created_by'] ?? null,
        ]);
        return (int) $this->database->connection()->lastInsertId();
    }

    // -------------------------------------------------------------------------
    // Find by ID
    // -------------------------------------------------------------------------
    public function findById(int $id): ?array
    {
        $stmt = $this->database->connection()->prepare(
            'SELECT c.*,
                    ac.name AS created_by_name
             FROM customers c
             LEFT JOIN access_credentials ac ON ac.id = c.created_by
             WHERE c.id = :id
             LIMIT 1'
        );
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function findByIdForUpdate(int $id): ?array
    {
        $stmt = $this->database->connection()->prepare(
            'SELECT * FROM customers WHERE id = :id LIMIT 1 FOR UPDATE'
        );
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function findByCode(string $code): ?array
    {
        $stmt = $this->database->connection()->prepare(
            'SELECT * FROM customers WHERE customer_code = :code LIMIT 1'
        );
        $stmt->execute(['code' => $code]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function findByPhone(string $phone): ?array
    {
        $stmt = $this->database->connection()->prepare(
            'SELECT * FROM customers WHERE phone = :phone LIMIT 1'
        );
        $stmt->execute(['phone' => $phone]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function findSystemWalkIn(): ?array
    {
        $stmt = $this->database->connection()->prepare(
            'SELECT * FROM customers WHERE is_system_walk_in = 1 LIMIT 1'
        );
        $stmt->execute();
        $row = $stmt->fetch();
        return $row ?: null;
    }

    // -------------------------------------------------------------------------
    // Update
    // -------------------------------------------------------------------------
    public function update(int $id, array $data): void
    {
        $stmt = $this->database->connection()->prepare(
            'UPDATE customers
             SET name = :name, phone = :phone, email = :email,
                 address = :address, notes = :notes,
                 khata_enabled = :khata_enabled, credit_limit = :credit_limit
             WHERE id = :id'
        );
        $stmt->execute([
            'id'            => $id,
            'name'          => $data['name'],
            'phone'         => $data['phone'] ?? null,
            'email'         => $data['email'] ?? null,
            'address'       => $data['address'] ?? null,
            'notes'         => $data['notes'] ?? null,
            'khata_enabled' => (int) ($data['khata_enabled'] ?? 0),
            'credit_limit'  => $data['credit_limit'] ?? '0.00',
        ]);
    }

    public function updateStatus(int $id, string $status): void
    {
        $stmt = $this->database->connection()->prepare(
            'UPDATE customers SET status = :status WHERE id = :id AND is_system_walk_in = 0'
        );
        $stmt->execute(['id' => $id, 'status' => $status]);
    }

    public function updateBalance(int $id, string $balance, string $advance): void
    {
        $stmt = $this->database->connection()->prepare(
            'UPDATE customers SET current_balance = :balance, advance_balance = :advance WHERE id = :id'
        );
        $stmt->execute(['id' => $id, 'balance' => $balance, 'advance' => $advance]);
    }

    // -------------------------------------------------------------------------
    // Search / Paginate
    // -------------------------------------------------------------------------
    public function search(string $query, int $limit = 10): array
    {
        $like = '%' . $query . '%';
        $stmt = $this->database->connection()->prepare(
            'SELECT id, customer_code, name, phone, customer_type,
                    khata_enabled, current_balance, advance_balance, credit_limit, status
             FROM customers
             WHERE status = \'active\'
               AND is_system_walk_in = 0
               AND (name LIKE :like OR phone LIKE :like2 OR customer_code LIKE :like3)
             ORDER BY name ASC
             LIMIT :limit'
        );
        $stmt->bindValue(':like',  $like);
        $stmt->bindValue(':like2', $like);
        $stmt->bindValue(':like3', $like);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function paginate(array $filters): array
    {
        [$where, $params] = $this->buildConditions($filters);
        $sort      = $this->safeSort($filters['sort_by'] ?? 'name');
        $direction = ($filters['sort_direction'] ?? 'asc') === 'desc' ? 'DESC' : 'ASC';

        $countStmt = $this->database->connection()->prepare(
            'SELECT COUNT(*) FROM customers c ' . $where
        );
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        $stmt = $this->database->connection()->prepare(
            'SELECT c.id, c.customer_code, c.name, c.phone, c.email,
                    c.customer_type, c.khata_enabled, c.credit_limit,
                    c.current_balance, c.advance_balance, c.status,
                    c.created_at,
                    (SELECT MAX(s.created_at) FROM sales s WHERE s.customer_id = c.id AND s.status = \'completed\') AS last_purchase_at,
                    (SELECT MAX(cp.payment_date) FROM customer_payments cp WHERE cp.customer_id = c.id AND cp.status = \'active\') AS last_payment_at,
                    (SELECT COUNT(*) FROM sales s WHERE s.customer_id = c.id AND s.status = \'completed\') AS purchase_count
             FROM customers c ' . $where .
            ' ORDER BY ' . $sort . ' ' . $direction .
            ' LIMIT :limit OFFSET :offset'
        );
        foreach ($params as $key => $value) {
            $stmt->bindValue(':' . ltrim($key, ':'), $value);
        }
        $stmt->bindValue(':limit',  $filters['limit'],  PDO::PARAM_INT);
        $stmt->bindValue(':offset', ($filters['page'] - 1) * $filters['limit'], PDO::PARAM_INT);
        $stmt->execute();

        return [
            'customers'  => $stmt->fetchAll(),
            'pagination' => [
                'page'        => $filters['page'],
                'limit'       => $filters['limit'],
                'total'       => $total,
                'total_pages' => $total === 0 ? 0 : (int) ceil($total / $filters['limit']),
            ],
        ];
    }

    // -------------------------------------------------------------------------
    // Summary for customer profile
    // -------------------------------------------------------------------------
    public function getSummary(int $id): array
    {
        $stmt = $this->database->connection()->prepare(
            'SELECT
                c.*,
                ac.name AS created_by_name,
                (SELECT COUNT(*) FROM sales s WHERE s.customer_id = c.id AND s.status = \'completed\') AS purchase_count,
                (SELECT COALESCE(SUM(s.grand_total),0) FROM sales s WHERE s.customer_id = c.id AND s.status = \'completed\') AS total_purchase_value,
                (SELECT COALESCE(SUM(s.credit_amount),0) FROM sales s WHERE s.customer_id = c.id AND s.status = \'completed\') AS total_credit,
                (SELECT COALESCE(SUM(cp.amount),0) FROM customer_payments cp WHERE cp.customer_id = c.id AND cp.status = \'active\') AS total_payments,
                (SELECT MAX(s.created_at) FROM sales s WHERE s.customer_id = c.id AND s.status = \'completed\') AS last_purchase_at,
                (SELECT MAX(cp.payment_date) FROM customer_payments cp WHERE cp.customer_id = c.id AND cp.status = \'active\') AS last_payment_at
             FROM customers c
             LEFT JOIN access_credentials ac ON ac.id = c.created_by
             WHERE c.id = :id
             LIMIT 1'
        );
        $stmt->execute(['id' => $id]);
        return $stmt->fetch() ?: [];
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------
    private function buildConditions(array $filters): array
    {
        $where  = 'WHERE 1=1';
        $params = [];

        if (!empty($filters['search'])) {
            $where .= ' AND (c.name LIKE :search OR c.phone LIKE :search2 OR c.customer_code LIKE :search3)';
            $like = '%' . $filters['search'] . '%';
            $params['search']  = $like;
            $params['search2'] = $like;
            $params['search3'] = $like;
        }
        if (!empty($filters['customer_type'])) {
            $where .= ' AND c.customer_type = :customer_type';
            $params['customer_type'] = $filters['customer_type'];
        }
        if (!empty($filters['status'])) {
            $where .= ' AND c.status = :status';
            $params['status'] = $filters['status'];
        }
        if (!empty($filters['has_outstanding'])) {
            $where .= ' AND c.current_balance > 0';
        }
        if (!empty($filters['has_advance'])) {
            $where .= ' AND c.advance_balance > 0';
        }
        if (isset($filters['khata_enabled']) && $filters['khata_enabled'] !== '') {
            $where .= ' AND c.khata_enabled = :khata_enabled';
            $params['khata_enabled'] = (int) $filters['khata_enabled'];
        }
        if (empty($filters['include_system_walk_in'])) {
            $where .= ' AND c.is_system_walk_in = 0';
        }
        return [$where, $params];
    }

    private function safeSort(string $col): string
    {
        $allowed = ['name' => 'c.name', 'created_at' => 'c.created_at', 'current_balance' => 'c.current_balance'];
        return $allowed[$col] ?? 'c.name';
    }
}
