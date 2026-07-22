<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Config\Database;
use PDO;

final class InventoryRepository
{
    public function __construct(private readonly Database $database)
    {
    }

    public function summary(): array
    {
        $statement = $this->database->connection()->prepare(
            'SELECT
                SUM(track_stock = 1) AS total_tracked,
                SUM(track_stock = 1 AND stock_quantity_base > minimum_stock) AS in_stock,
                SUM(track_stock = 1 AND stock_quantity_base > 0 AND stock_quantity_base <= minimum_stock) AS low_stock,
                SUM(track_stock = 1 AND stock_quantity_base <= 0) AS out_of_stock
             FROM products'
        );
        $statement->execute();
        $summary = $statement->fetch();

        return [
            'total_tracked' => (int) ($summary['total_tracked'] ?? 0),
            'in_stock' => (int) ($summary['in_stock'] ?? 0),
            'low_stock' => (int) ($summary['low_stock'] ?? 0),
            'out_of_stock' => (int) ($summary['out_of_stock'] ?? 0),
        ];
    }

    public function paginate(array $filters): array
    {
        $where = [];
        $parameters = [];

        if ($filters['search'] !== '') {
            $where[] = '(p.name LIKE :search OR p.product_code LIKE :search_code OR p.barcode LIKE :search_barcode)';
            $pattern = '%' . $filters['search'] . '%';
            $parameters['search'] = $pattern;
            $parameters['search_code'] = $pattern;
            $parameters['search_barcode'] = $pattern;
        }

        if ($filters['category_id'] !== null) {
            $where[] = 'p.category_id = :category_id';
            $parameters['category_id'] = $filters['category_id'];
        }

        if ($filters['stock_status'] === 'in_stock') {
            $where[] = 'p.track_stock = 1 AND p.stock_quantity_base > p.minimum_stock';
        } elseif ($filters['stock_status'] === 'low_stock') {
            $where[] = 'p.track_stock = 1 AND p.stock_quantity_base > 0 AND p.stock_quantity_base <= p.minimum_stock';
        } elseif ($filters['stock_status'] === 'out_of_stock') {
            $where[] = 'p.track_stock = 1 AND p.stock_quantity_base <= 0';
        } elseif ($filters['stock_status'] === 'tracking_disabled') {
            $where[] = 'p.track_stock = 0';
        }

        $whereSql = $where === [] ? '' : ' WHERE ' . implode(' AND ', $where);

        $count = $this->database->connection()->prepare(
            'SELECT COUNT(*) FROM products p' . $whereSql
        );
        $count->execute($parameters);
        $total = (int) $count->fetchColumn();

        $statement = $this->database->connection()->prepare(
            'SELECT p.id, p.category_id, c.name AS category_name, p.name,
                    p.product_code, p.barcode, p.stock_quantity_base AS quantity, p.minimum_stock,
                    COALESCE(u.name, \'piece\') AS unit_type, p.image, p.track_stock, p.status,
                    p.updated_at
             FROM products p
             INNER JOIN categories c ON c.id = p.category_id
             LEFT JOIN units u ON u.id = p.base_unit_id'
             . $whereSql .
            ' ORDER BY p.name ASC
              LIMIT :limit OFFSET :offset'
        );

        foreach ($parameters as $name => $value) {
            $statement->bindValue(':' . $name, $value);
        }

        $statement->bindValue(':limit', $filters['limit'], PDO::PARAM_INT);
        $statement->bindValue(':offset', ($filters['page'] - 1) * $filters['limit'], PDO::PARAM_INT);
        $statement->execute();

        return [
            'products' => $statement->fetchAll(),
            'pagination' => [
                'page' => $filters['page'],
                'limit' => $filters['limit'],
                'total' => $total,
                'total_pages' => $total===0?0:(int)ceil($total/$filters['limit']),
            ],
        ];
    }

    public function findForUpdate(int $productId): ?array
    {
        $statement = $this->database->connection()->prepare(
            'SELECT p.id, p.name, p.stock_quantity_base AS quantity, p.minimum_stock, 
                    COALESCE(u.name, \'piece\') AS unit_type, p.track_stock, p.status
             FROM products p
             LEFT JOIN units u ON u.id = p.base_unit_id
             WHERE p.id = :id
             FOR UPDATE'
        );
        $statement->execute(['id' => $productId]);
        $product = $statement->fetch();

        return $product === false ? null : $product;
    }

    public function updateQuantity(int $productId, string $newQuantity): void
    {
        $statement = $this->database->connection()->prepare(
            'UPDATE products SET stock_quantity_base = :quantity WHERE id = :id'
        );
        $statement->execute([
            'id' => $productId,
            'quantity' => $newQuantity,
        ]);
    }
}
