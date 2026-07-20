<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Config\Database;
use PDO;

final class StockTransactionRepository
{
    public function __construct(private readonly Database $database)
    {
    }

    public function create(array $data): array
    {
        $data['batch_id'] = $data['batch_id'] ?? null;
        $statement = $this->database->connection()->prepare(
            'INSERT INTO stock_transactions (
                product_id, user_id, transaction_type, quantity,
                previous_stock, new_stock, reason, reference_type, reference_id, batch_id
             ) VALUES (
                :product_id, :user_id, :transaction_type, :quantity,
                :previous_stock, :new_stock, :reason, :reference_type, :reference_id, :batch_id
             )'
        );
        $statement->execute($data);

        return $this->find((int) $this->database->connection()->lastInsertId());
    }

    public function find(int $id): ?array
    {
        $statement = $this->database->connection()->prepare(
            'SELECT st.id, st.product_id, p.name AS product_name,
                    p.product_code, p.unit_type, st.user_id,
                    u.name AS user_name, st.transaction_type,
                    st.quantity, st.previous_stock, st.new_stock,
                    st.reason, st.reference_type, st.reference_id,
                    st.created_at
             FROM stock_transactions st
             INNER JOIN products p ON p.id = st.product_id
             INNER JOIN access_credentials u ON u.id = st.user_id
             WHERE st.id = :id'
        );
        $statement->execute(['id' => $id]);
        $transaction = $statement->fetch();

        return $transaction === false ? null : $transaction;
    }

    public function countToday(): int
    {
        $statement = $this->database->connection()->prepare(
            'SELECT COUNT(*) FROM stock_transactions
             WHERE created_at >= CURRENT_DATE()
               AND created_at < CURRENT_DATE() + INTERVAL 1 DAY'
        );
        $statement->execute();

        return (int) $statement->fetchColumn();
    }

    public function paginate(array $filters): array
    {
        $where = [];
        $parameters = [];

        if ($filters['product_id'] !== null) {
            $where[] = 'st.product_id = :product_id';
            $parameters['product_id'] = $filters['product_id'];
        }

        if ($filters['user_id'] !== null) {
            $where[] = 'st.user_id = :user_id';
            $parameters['user_id'] = $filters['user_id'];
        }

        if ($filters['transaction_type'] !== '') {
            $where[] = 'st.transaction_type = :transaction_type';
            $parameters['transaction_type'] = $filters['transaction_type'];
        }

        if ($filters['date_from'] !== '') {
            $where[] = 'st.created_at >= :date_from';
            $parameters['date_from'] = $filters['date_from'] . ' 00:00:00';
        }

        if ($filters['date_to'] !== '') {
            $where[] = 'st.created_at <= :date_to';
            $parameters['date_to'] = $filters['date_to'] . ' 23:59:59';
        }

        $whereSql = $where === [] ? '' : ' WHERE ' . implode(' AND ', $where);

        $count = $this->database->connection()->prepare(
            'SELECT COUNT(*) FROM stock_transactions st' . $whereSql
        );
        $count->execute($parameters);
        $total = (int) $count->fetchColumn();

        $statement = $this->database->connection()->prepare(
            'SELECT st.id, st.product_id, p.name AS product_name,
                    p.product_code, p.unit_type, st.user_id,
                    u.name AS user_name, st.transaction_type,
                    st.quantity, st.previous_stock, st.new_stock,
                    st.reason, st.reference_type, st.reference_id,
                    st.created_at
             FROM stock_transactions st
             INNER JOIN products p ON p.id = st.product_id
             INNER JOIN access_credentials u ON u.id = st.user_id'
             . $whereSql .
            ' ORDER BY st.created_at DESC, st.id DESC
              LIMIT :limit OFFSET :offset'
        );

        foreach ($parameters as $name => $value) {
            $statement->bindValue(':' . $name, $value);
        }

        $statement->bindValue(':limit', $filters['limit'], PDO::PARAM_INT);
        $statement->bindValue(':offset', ($filters['page'] - 1) * $filters['limit'], PDO::PARAM_INT);
        $statement->execute();

        return [
            'transactions' => $statement->fetchAll(),
            'pagination' => [
                'page' => $filters['page'],
                'limit' => $filters['limit'],
                'total' => $total,
                'total_pages' => $total === 0 ? 0 : (int) ceil($total / $filters['limit']),
            ],
        ];
    }

    public function deleteByProduct(int $productId): void
    {
        $statement = $this->database->connection()->prepare(
            'DELETE FROM stock_transactions WHERE product_id = :product_id'
        );
        $statement->execute(['product_id' => $productId]);
    }
}
