<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Config\Database;
use PDO;

final class ProductRepository
{
    public function __construct(private readonly Database $database)
    {
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

        if ($filters['status'] !== '') {
            $where[] = 'p.status = :status';
            $parameters['status'] = $filters['status'];
        }

        $whereSql = $where === [] ? '' : ' WHERE ' . implode(' AND ', $where);

        $countStatement = $this->database->connection()->prepare(
            'SELECT COUNT(*) FROM products p' . $whereSql
        );
        $countStatement->execute($parameters);
        $total = (int) $countStatement->fetchColumn();

        $statement = $this->database->connection()->prepare(
            'SELECT p.id, p.category_id, c.name AS category_name, p.name,
                    p.product_code, p.barcode, p.purchase_cost, p.selling_price,
                    p.quantity, p.minimum_stock, p.unit_type, p.image,
                    p.track_stock, p.status, p.created_at, p.updated_at
             FROM products p
             INNER JOIN categories c ON c.id = p.category_id'
             . $whereSql .
            ' ORDER BY p.created_at DESC, p.id DESC
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

    public function find(int $id): ?array
    {
        $statement = $this->database->connection()->prepare(
            'SELECT p.id, p.category_id, c.name AS category_name, p.name,
                    p.product_code, p.barcode, p.purchase_cost, p.selling_price,
                    p.quantity, p.minimum_stock, p.unit_type, p.image,
                    p.track_stock, p.status, p.created_at, p.updated_at
             FROM products p
             INNER JOIN categories c ON c.id = p.category_id
             WHERE p.id = :id
             LIMIT 1'
        );
        $statement->execute(['id' => $id]);
        $product = $statement->fetch();

        return $product === false ? null : $product;
    }

    public function categoryExists(int $categoryId): bool
    {
        $statement = $this->database->connection()->prepare(
            'SELECT COUNT(*) FROM categories WHERE id = :id'
        );
        $statement->execute(['id' => $categoryId]);

        return (int) $statement->fetchColumn() > 0;
    }

    public function codeExists(string $productCode, ?int $ignoreId = null): bool
    {
        return $this->valueExists('product_code', $productCode, $ignoreId);
    }

    public function barcodeExists(string $barcode, ?int $ignoreId = null): bool
    {
        return $this->valueExists('barcode', $barcode, $ignoreId);
    }

    public function create(array $data): array
    {
        $statement = $this->database->connection()->prepare(
            'INSERT INTO products (
                category_id, name, product_code, barcode, purchase_cost,
                selling_price, quantity, minimum_stock, unit_type, image,
                track_stock, status
             ) VALUES (
                :category_id, :name, :product_code, :barcode, :purchase_cost,
                :selling_price, :quantity, :minimum_stock, :unit_type, :image,
                :track_stock, :status
             )'
        );
        $statement->execute($this->writeParameters($data));

        return $this->find((int) $this->database->connection()->lastInsertId());
    }

    public function update(int $id, array $data): array
    {
        $parameters = $this->writeParameters($data);
        $parameters['id'] = $id;

        $statement = $this->database->connection()->prepare(
            'UPDATE products SET
                category_id = :category_id,
                name = :name,
                product_code = :product_code,
                barcode = :barcode,
                purchase_cost = :purchase_cost,
                selling_price = :selling_price,
                quantity = :quantity,
                minimum_stock = :minimum_stock,
                unit_type = :unit_type,
                image = :image,
                track_stock = :track_stock,
                status = :status
             WHERE id = :id'
        );
        $statement->execute($parameters);

        return $this->find($id);
    }

    public function updateStatus(int $id, string $status): array
    {
        $statement = $this->database->connection()->prepare(
            'UPDATE products SET status = :status WHERE id = :id'
        );
        $statement->execute(['id' => $id, 'status' => $status]);

        return $this->find($id);
    }

    public function isLinkedToSales(int $id): bool
    {
        $tableStatement = $this->database->connection()->prepare(
            'SELECT COUNT(*) FROM information_schema.tables
             WHERE table_schema = DATABASE() AND table_name = :table_name'
        );
        $tableStatement->execute(['table_name' => 'sale_items']);

        if ((int) $tableStatement->fetchColumn() === 0) {
            return false;
        }

        $statement = $this->database->connection()->prepare(
            'SELECT COUNT(*) FROM sale_items WHERE product_id = :product_id'
        );
        $statement->execute(['product_id' => $id]);

        return (int) $statement->fetchColumn() > 0;
    }

    public function isLinkedToPurchases(int $id): bool
    {
        $statement = $this->database->connection()->prepare(
            'SELECT COUNT(*) FROM purchase_items WHERE product_id = :product_id'
        );
        $statement->execute(['product_id' => $id]);

        return (int) $statement->fetchColumn() > 0;
    }

    public function isLinkedToStockTransactions(int $id): bool
    {
        $statement = $this->database->connection()->prepare(
            'SELECT COUNT(*) FROM stock_transactions WHERE product_id = :product_id'
        );
        $statement->execute(['product_id' => $id]);

        return (int) $statement->fetchColumn() > 0;
    }
    public function delete(int $id): void
    {
        $statement = $this->database->connection()->prepare(
            'DELETE FROM products WHERE id = :id'
        );
        $statement->execute(['id' => $id]);
    }

    public function findManyForUpdate(array $ids): array
    {
        if ($ids === []) return [];
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $statement = $this->database->connection()->prepare(
            'SELECT id, name, product_code, selling_price, purchase_cost, quantity, unit_type, track_stock, status FROM products WHERE id IN (' . $placeholders . ') ORDER BY id FOR UPDATE'
        );
        foreach (array_values($ids) as $index => $id) $statement->bindValue($index + 1, $id, PDO::PARAM_INT);
        $statement->execute();
        $products = [];
        foreach ($statement->fetchAll() as $product) $products[(int) $product['id']] = $product;
        return $products;
    }

    public function updateQuantity(int $id, string $quantity): void
    {
        $statement = $this->database->connection()->prepare('UPDATE products SET quantity = :quantity WHERE id = :id');
        $statement->execute(['id' => $id, 'quantity' => $quantity]);
    }
    public function updatePurchaseCost(int $id, string $cost): void
    {
        $statement = $this->database->connection()->prepare('UPDATE products SET purchase_cost = :cost WHERE id = :id');
        $statement->execute(['id' => $id, 'cost' => $cost]);
    }

    private function valueExists(string $column, string $value, ?int $ignoreId): bool
    {
        $allowedColumns = ['product_code', 'barcode'];

        if (!in_array($column, $allowedColumns, true)) {
            return false;
        }

        $statement = $this->database->connection()->prepare(
            'SELECT COUNT(*) FROM products
             WHERE ' . $column . ' = :value
               AND (:ignore_id IS NULL OR id <> :ignore_id_value)'
        );
        $statement->execute([
            'value' => $value,
            'ignore_id' => $ignoreId,
            'ignore_id_value' => $ignoreId ?? 0,
        ]);

        return (int) $statement->fetchColumn() > 0;
    }

    private function writeParameters(array $data): array
    {
        return [
            'category_id' => $data['category_id'],
            'name' => $data['name'],
            'product_code' => $data['product_code'],
            'barcode' => $data['barcode'],
            'purchase_cost' => $data['purchase_cost'],
            'selling_price' => $data['selling_price'],
            'quantity' => $data['quantity'],
            'minimum_stock' => $data['minimum_stock'],
            'unit_type' => $data['unit_type'],
            'image' => $data['image'],
            'track_stock' => $data['track_stock'] ? 1 : 0,
            'status' => $data['status'],
        ];
    }
}

