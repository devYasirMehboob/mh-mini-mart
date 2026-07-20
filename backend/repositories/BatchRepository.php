<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Config\Database;
use PDO;

final class BatchRepository
{
    public function __construct(private readonly Database $database)
    {
    }

    public function paginate(array $filters): array
    {
        $where = [];
        $parameters = [];

        if ($filters['search'] !== '') {
            $where[] = '(p.name LIKE :search OR p.product_code LIKE :search_code OR b.batch_number LIKE :search_batch)';
            $pattern = '%' . $filters['search'] . '%';
            $parameters['search'] = $pattern;
            $parameters['search_code'] = $pattern;
            $parameters['search_batch'] = $pattern;
        }

        if ($filters['product_id'] !== null) {
            $where[] = 'b.product_id = :product_id';
            $parameters['product_id'] = $filters['product_id'];
        }

        if ($filters['status'] !== '') {
            $where[] = 'b.status = :status';
            $parameters['status'] = $filters['status'];
        }

        if ($filters['expiry_state'] !== '') {
            switch ($filters['expiry_state']) {
                case 'valid':
                    $where[] = 'b.status = "active" AND b.remaining_quantity > 0 AND (b.expiry_date IS NULL OR b.expiry_date >= CURRENT_DATE)';
                    break;
                case 'expired':
                    $where[] = 'b.remaining_quantity > 0 AND b.expiry_date < CURRENT_DATE';
                    break;
                case 'near_expiry':
                    $where[] = 'b.status = "active" AND b.remaining_quantity > 0 AND b.expiry_date >= CURRENT_DATE AND b.expiry_date <= DATE_ADD(CURRENT_DATE, INTERVAL :near_days DAY)';
                    $parameters['near_days'] = $filters['near_days'] ?? 30;
                    break;
            }
        }

        $whereSql = $where === [] ? '' : ' WHERE ' . implode(' AND ', $where);

        $countStatement = $this->database->connection()->prepare(
            'SELECT COUNT(*) FROM product_batches b INNER JOIN products p ON p.id = b.product_id' . $whereSql
        );
        $countStatement->execute($parameters);
        $total = (int) $countStatement->fetchColumn();

        $statement = $this->database->connection()->prepare(
            'SELECT b.*, p.name AS product_name, p.product_code, p.unit_type
             FROM product_batches b
             INNER JOIN products p ON p.id = b.product_id'
             . $whereSql .
            ' ORDER BY b.created_at DESC, b.id DESC
              LIMIT :limit OFFSET :offset'
        );

        foreach ($parameters as $name => $value) {
            $statement->bindValue(':' . $name, $value);
        }

        $statement->bindValue(':limit', $filters['limit'], PDO::PARAM_INT);
        $statement->bindValue(':offset', ($filters['page'] - 1) * $filters['limit'], PDO::PARAM_INT);
        $statement->execute();

        return [
            'batches' => $statement->fetchAll(),
            'pagination' => [
                'page' => $filters['page'],
                'limit' => $filters['limit'],
                'total' => $total,
                'total_pages' => $total === 0 ? 0 : (int)ceil($total / $filters['limit']),
            ],
        ];
    }

    public function find(int $id): ?array
    {
        $statement = $this->database->connection()->prepare(
            'SELECT b.*, p.name AS product_name, p.product_code, p.unit_type
             FROM product_batches b
             INNER JOIN products p ON p.id = b.product_id
             WHERE b.id = :id
             LIMIT 1'
        );
        $statement->execute(['id' => $id]);
        $batch = $statement->fetch();

        return $batch === false ? null : $batch;
    }

    public function getSellableBatches(int $productId): array
    {
        $statement = $this->database->connection()->prepare(
            'SELECT b.*
             FROM product_batches b
             WHERE b.product_id = :product_id
               AND b.status = \'active\'
               AND b.remaining_quantity > 0
               AND (b.expiry_date IS NULL OR b.expiry_date >= CURRENT_DATE)
             ORDER BY b.expiry_date ASC, b.received_at ASC, b.id ASC
             FOR UPDATE'
        );
        $statement->execute(['product_id' => $productId]);
        return $statement->fetchAll();
    }

    public function create(array $data): int
    {
        $statement = $this->database->connection()->prepare(
            'INSERT INTO product_batches (
                product_id, purchase_id, purchase_item_id, batch_number,
                manufacturing_date, expiry_date, received_quantity,
                remaining_quantity, reserved_quantity, unit_cost, status,
                received_at, created_by
             ) VALUES (
                :product_id, :purchase_id, :purchase_item_id, :batch_number,
                :manufacturing_date, :expiry_date, :received_quantity,
                :remaining_quantity, 0, :unit_cost, :status,
                :received_at, :created_by
             )'
        );
        $statement->execute([
            'product_id' => $data['product_id'],
            'purchase_id' => $data['purchase_id'] ?? null,
            'purchase_item_id' => $data['purchase_item_id'] ?? null,
            'batch_number' => $data['batch_number'],
            'manufacturing_date' => $data['manufacturing_date'] ?? null,
            'expiry_date' => $data['expiry_date'] ?? null,
            'received_quantity' => $data['received_quantity'],
            'remaining_quantity' => $data['received_quantity'],
            'unit_cost' => $data['unit_cost'] ?? 0,
            'status' => $data['status'] ?? 'active',
            'received_at' => $data['received_at'] ?? date('Y-m-d H:i:s'),
            'created_by' => $data['created_by'],
        ]);

        return (int) $this->database->connection()->lastInsertId();
    }

    public function updateQuantity(int $id, string $remainingQuantity): void
    {
        $statusUpdate = '';
        if ((float) $remainingQuantity <= 0) {
            $statusUpdate = ', status = \'depleted\'';
        }

        $statement = $this->database->connection()->prepare(
            'UPDATE product_batches SET remaining_quantity = :qty' . $statusUpdate . ' WHERE id = :id'
        );
        $statement->execute([
            'qty' => $remainingQuantity,
            'id' => $id
        ]);
    }

    public function updateStatus(int $id, string $status): void
    {
        $statement = $this->database->connection()->prepare(
            'UPDATE product_batches SET status = :status WHERE id = :id'
        );
        $statement->execute([
            'status' => $status,
            'id' => $id
        ]);
    }

    public function findManyForUpdate(array $ids): array
    {
        if ($ids === []) return [];
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $statement = $this->database->connection()->prepare(
            'SELECT * FROM product_batches WHERE id IN (' . $placeholders . ') ORDER BY id FOR UPDATE'
        );
        foreach (array_values($ids) as $index => $id) {
            $statement->bindValue($index + 1, $id, PDO::PARAM_INT);
        }
        $statement->execute();
        $batches = [];
        foreach ($statement->fetchAll() as $batch) {
            $batches[(int) $batch['id']] = $batch;
        }
        return $batches;
    }

    public function createDisposal(array $data): void
    {
        $statement = $this->database->connection()->prepare(
            'INSERT INTO batch_disposals (product_batch_id, quantity, reason, disposal_type, processed_by)
             VALUES (:product_batch_id, :quantity, :reason, :disposal_type, :processed_by)'
        );
        $statement->execute([
            'product_batch_id' => $data['product_batch_id'],
            'quantity' => $data['quantity'],
            'reason' => $data['reason'] ?? null,
            'disposal_type' => $data['disposal_type'],
            'processed_by' => $data['processed_by'],
        ]);
    }

    public function insertSaleItemBatch(array $data): void
    {
        $statement = $this->database->connection()->prepare(
            'INSERT INTO sale_item_batches (sale_item_id, product_batch_id, quantity)
             VALUES (:sale_item_id, :product_batch_id, :quantity)'
        );
        $statement->execute([
            'sale_item_id' => $data['sale_item_id'],
            'product_batch_id' => $data['product_batch_id'],
            'quantity' => $data['quantity']
        ]);
    }
}
