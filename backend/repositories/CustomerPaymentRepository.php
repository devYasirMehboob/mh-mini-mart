<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Config\Database;
use PDO;

final class CustomerPaymentRepository
{
    public function __construct(private readonly Database $database) {}

    public function nextPaymentNumber(): string
    {
        $date = date('Y-m-d');
        $stmt = $this->database->connection()->prepare(
            'INSERT INTO customer_payment_sequences (sequence_date, last_number)
             VALUES (:date, 1)
             ON DUPLICATE KEY UPDATE last_number = LAST_INSERT_ID(last_number + 1)'
        );
        $stmt->execute(['date' => $date]);
        $rowCount = $stmt->rowCount();
        $number   = $rowCount === 1 ? 1 : (int) $this->database->connection()->lastInsertId();
        return 'KPY-' . date('Ymd') . '-' . str_pad((string) $number, 4, '0', STR_PAD_LEFT);
    }

    public function create(array $data): int
    {
        $stmt = $this->database->connection()->prepare(
            'INSERT INTO customer_payments
                (payment_number, customer_id, sale_id, amount, payment_method,
                 reference_number, payment_date, notes, status, request_token,
                 previous_balance, balance_after, received_by)
             VALUES
                (:payment_number, :customer_id, :sale_id, :amount, :payment_method,
                 :reference_number, :payment_date, :notes, :status, :request_token,
                 :previous_balance, :balance_after, :received_by)'
        );
        $stmt->execute([
            'payment_number'   => $data['payment_number'],
            'customer_id'      => $data['customer_id'],
            'sale_id'          => $data['sale_id'] ?? null,
            'amount'           => $data['amount'],
            'payment_method'   => $data['payment_method'],
            'reference_number' => $data['reference_number'] ?? null,
            'payment_date'     => $data['payment_date'],
            'notes'            => $data['notes'] ?? null,
            'status'           => 'active',
            'request_token'    => $data['request_token'],
            'previous_balance' => $data['previous_balance'],
            'balance_after'    => $data['balance_after'],
            'received_by'      => $data['received_by'],
        ]);
        return (int) $this->database->connection()->lastInsertId();
    }

    public function findByToken(string $token): ?array
    {
        $stmt = $this->database->connection()->prepare(
            'SELECT * FROM customer_payments WHERE request_token = :token LIMIT 1'
        );
        $stmt->execute(['token' => $token]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->database->connection()->prepare(
            'SELECT cp.*,
                    c.name AS customer_name, c.customer_code, c.phone AS customer_phone,
                    ac.name AS received_by_name
             FROM customer_payments cp
             JOIN customers c ON c.id = cp.customer_id
             JOIN access_credentials ac ON ac.id = cp.received_by
             WHERE cp.id = :id
             LIMIT 1'
        );
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function paginateByCustomer(int $customerId, int $page, int $limit): array
    {
        $offset = ($page - 1) * $limit;

        $countStmt = $this->database->connection()->prepare(
            'SELECT COUNT(*) FROM customer_payments WHERE customer_id = :cid'
        );
        $countStmt->execute(['cid' => $customerId]);
        $total = (int) $countStmt->fetchColumn();

        $stmt = $this->database->connection()->prepare(
            'SELECT cp.*, ac.name AS received_by_name
             FROM customer_payments cp
             JOIN access_credentials ac ON ac.id = cp.received_by
             WHERE cp.customer_id = :cid
             ORDER BY cp.payment_date DESC, cp.id DESC
             LIMIT :limit OFFSET :offset'
        );
        $stmt->bindValue(':cid', $customerId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return [
            'payments'   => $stmt->fetchAll(),
            'pagination' => [
                'page'        => $page,
                'limit'       => $limit,
                'total'       => $total,
                'total_pages' => $total === 0 ? 0 : (int) ceil($total / $limit),
            ],
        ];
    }
}
