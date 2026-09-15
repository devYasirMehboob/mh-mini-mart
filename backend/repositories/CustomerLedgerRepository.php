<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Config\Database;
use PDO;

final class CustomerLedgerRepository
{
    public function __construct(private readonly Database $database) {}

    // -------------------------------------------------------------------------
    // Entry number generation (race-safe)
    // -------------------------------------------------------------------------
    public function nextEntryNumber(): string
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
        return 'KLE-' . date('Ymd') . '-' . str_pad((string) $number, 4, '0', STR_PAD_LEFT);
    }

    // -------------------------------------------------------------------------
    // Create ledger entry
    // -------------------------------------------------------------------------
    public function create(array $data): int
    {
        $stmt = $this->database->connection()->prepare(
            'INSERT INTO customer_ledger_entries
                (customer_id, entry_number, entry_type, reference_type, reference_id,
                 sale_id, payment_id, debit_amount, credit_amount, balance_after,
                 advance_debit, advance_credit, advance_balance_after,
                 description, entry_date, status, reversal_of, request_token, created_by)
             VALUES
                (:customer_id, :entry_number, :entry_type, :reference_type, :reference_id,
                 :sale_id, :payment_id, :debit_amount, :credit_amount, :balance_after,
                 :advance_debit, :advance_credit, :advance_balance_after,
                 :description, :entry_date, :status, :reversal_of, :request_token, :created_by)'
        );
        $stmt->execute([
            'customer_id'          => $data['customer_id'],
            'entry_number'         => $data['entry_number'],
            'entry_type'           => $data['entry_type'],
            'reference_type'       => $data['reference_type'] ?? null,
            'reference_id'         => $data['reference_id'] ?? null,
            'sale_id'              => $data['sale_id'] ?? null,
            'payment_id'           => $data['payment_id'] ?? null,
            'debit_amount'         => $data['debit_amount'] ?? '0.00',
            'credit_amount'        => $data['credit_amount'] ?? '0.00',
            'balance_after'        => $data['balance_after'],
            'advance_debit'        => $data['advance_debit'] ?? '0.00',
            'advance_credit'       => $data['advance_credit'] ?? '0.00',
            'advance_balance_after'=> $data['advance_balance_after'] ?? '0.00',
            'description'          => $data['description'],
            'entry_date'           => $data['entry_date'] ?? date('Y-m-d'),
            'status'               => $data['status'] ?? 'active',
            'reversal_of'          => $data['reversal_of'] ?? null,
            'request_token'        => $data['request_token'] ?? null,
            'created_by'           => $data['created_by'] ?? null,
        ]);
        return (int) $this->database->connection()->lastInsertId();
    }

    // -------------------------------------------------------------------------
    // Find by token (idempotency)
    // -------------------------------------------------------------------------
    public function findByToken(string $token): ?array
    {
        $stmt = $this->database->connection()->prepare(
            'SELECT * FROM customer_ledger_entries WHERE request_token = :token LIMIT 1'
        );
        $stmt->execute(['token' => $token]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    // -------------------------------------------------------------------------
    // Cancel entries by sale ID
    // -------------------------------------------------------------------------
    public function cancelEntriesForSale(int $saleId): void
    {
        $stmt = $this->database->connection()->prepare(
            'UPDATE customer_ledger_entries SET status = \'cancelled\' WHERE sale_id = :sale_id AND status = \'active\''
        );
        $stmt->execute(['sale_id' => $saleId]);
    }

    // -------------------------------------------------------------------------
    // Customer statement
    // -------------------------------------------------------------------------
    public function getStatement(int $customerId, array $filters): array
    {
        $where  = 'WHERE cle.customer_id = :customer_id AND cle.status = \'active\'';
        $params = ['customer_id' => $customerId];

        if (!empty($filters['date_from'])) {
            $where .= ' AND cle.entry_date >= :date_from';
            $params['date_from'] = $filters['date_from'];
        }
        if (!empty($filters['date_to'])) {
            $where .= ' AND cle.entry_date <= :date_to';
            $params['date_to'] = $filters['date_to'];
        }

        $stmt = $this->database->connection()->prepare(
            'SELECT cle.*,
                    ac.name AS created_by_name
             FROM customer_ledger_entries cle
             LEFT JOIN access_credentials ac ON ac.id = cle.created_by
             ' . $where . '
             ORDER BY cle.created_at ASC, cle.id ASC'
        );
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    // -------------------------------------------------------------------------
    // Opening balance for statement (balance before date range)
    // -------------------------------------------------------------------------
    public function getBalanceBeforeDate(int $customerId, string $date): string
    {
        $stmt = $this->database->connection()->prepare(
            'SELECT balance_after
             FROM customer_ledger_entries
             WHERE customer_id = :customer_id
               AND status = \'active\'
               AND entry_date < :date
             ORDER BY created_at DESC, id DESC
             LIMIT 1'
        );
        $stmt->execute(['customer_id' => $customerId, 'date' => $date]);
        return (string) ($stmt->fetchColumn() ?: '0.00');
    }

    // -------------------------------------------------------------------------
    // Paginate ledger for customer detail view
    // -------------------------------------------------------------------------
    public function paginateByCustomer(int $customerId, int $page, int $limit): array
    {
        $offset = ($page - 1) * $limit;

        $countStmt = $this->database->connection()->prepare(
            'SELECT COUNT(*) FROM customer_ledger_entries WHERE customer_id = :cid'
        );
        $countStmt->execute(['cid' => $customerId]);
        $total = (int) $countStmt->fetchColumn();

        $stmt = $this->database->connection()->prepare(
            'SELECT cle.*, ac.name AS created_by_name
             FROM customer_ledger_entries cle
             LEFT JOIN access_credentials ac ON ac.id = cle.created_by
             WHERE cle.customer_id = :cid
             ORDER BY cle.entry_date DESC, cle.id DESC
             LIMIT :limit OFFSET :offset'
        );
        $stmt->bindValue(':cid', $customerId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return [
            'entries'    => $stmt->fetchAll(),
            'pagination' => [
                'page'        => $page,
                'limit'       => $limit,
                'total'       => $total,
                'total_pages' => $total === 0 ? 0 : (int) ceil($total / $limit),
            ],
        ];
    }

    // -------------------------------------------------------------------------
    // Balance reconciliation (admin diagnostic)
    // -------------------------------------------------------------------------
    public function reconcile(int $customerId): array
    {
        $stmt = $this->database->connection()->prepare(
            'SELECT
                COALESCE(SUM(debit_amount), 0) AS total_debit,
                COALESCE(SUM(credit_amount), 0) AS total_credit,
                COALESCE(SUM(debit_amount), 0) - COALESCE(SUM(credit_amount), 0) AS calculated_balance
             FROM customer_ledger_entries
             WHERE customer_id = :id AND status = \'active\''
        );
        $stmt->execute(['id' => $customerId]);
        $ledger = $stmt->fetch();

        $custStmt = $this->database->connection()->prepare(
            'SELECT current_balance FROM customers WHERE id = :id'
        );
        $custStmt->execute(['id' => $customerId]);
        $cached = (string) ($custStmt->fetchColumn() ?: '0.00');

        return [
            'calculated_balance' => number_format((float) ($ledger['calculated_balance'] ?? 0), 2, '.', ''),
            'cached_balance'     => $cached,
            'in_sync'            => abs((float) ($ledger['calculated_balance'] ?? 0) - (float) $cached) < 0.005,
            'total_debit'        => number_format((float) ($ledger['total_debit'] ?? 0), 2, '.', ''),
            'total_credit'       => number_format((float) ($ledger['total_credit'] ?? 0), 2, '.', ''),
        ];
    }
}
