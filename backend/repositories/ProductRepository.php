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
                    p.product_code, p.barcode, p.barcode_type, p.barcode_source, p.barcode_printed_at, p.barcode_print_count,
                    p.purchase_cost, p.selling_price,
                    p.stock_quantity_base AS quantity, p.minimum_stock, 
                    p.base_unit_id, p.default_purchase_unit_id, p.default_sale_unit_id,
                    p.stock_mode, p.stock_source_id, p.consumption_quantity, p.consumption_unit_id, p.consumption_quantity_base,
                    p.allow_custom_sale, p.default_custom_sale_unit_id,
                    COALESCE(u.name, \'piece\') AS unit_type, p.image,
                    p.track_stock, p.track_batches, p.track_expiry, p.track_containers, p.container_type, p.status, p.created_at, p.updated_at
             FROM products p
             INNER JOIN categories c ON c.id = p.category_id
             LEFT JOIN units u ON u.id = p.base_unit_id'
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
                    p.product_code, p.barcode, p.barcode_type, p.barcode_source, p.barcode_printed_at, p.barcode_print_count,
                    p.purchase_cost, p.selling_price,
                    p.stock_quantity_base AS quantity, p.minimum_stock, 
                    p.base_unit_id, p.default_purchase_unit_id, p.default_sale_unit_id,
                    p.stock_mode, p.stock_source_id, p.consumption_quantity, p.consumption_unit_id, p.consumption_quantity_base,
                    p.allow_custom_sale, p.default_custom_sale_unit_id,
                    COALESCE(u.name, \'piece\') AS unit_type, p.image,
                    p.track_stock, p.track_batches, p.track_expiry, p.track_containers, p.container_type, p.status, p.created_at, p.updated_at
             FROM products p
             INNER JOIN categories c ON c.id = p.category_id
             LEFT JOIN units u ON u.id = p.base_unit_id
             WHERE p.id = :id
             LIMIT 1'
        );
        $statement->execute(['id' => $id]);
        $product = $statement->fetch();

        return $product === false ? null : $product;
    }

    public function getSharedProducts(int $sourceId): array
    {
        $statement = $this->database->connection()->prepare(
            'SELECT p.id, p.category_id, c.name AS category_name, p.name,
                    p.product_code, p.barcode, p.barcode_type, p.barcode_source, p.barcode_printed_at, p.barcode_print_count,
                    p.purchase_cost, p.selling_price,
                    p.stock_quantity_base AS quantity, p.minimum_stock, 
                    p.base_unit_id, p.default_purchase_unit_id, p.default_sale_unit_id,
                    p.stock_mode, p.stock_source_id, p.consumption_quantity, p.consumption_unit_id, p.consumption_quantity_base,
                    p.allow_custom_sale, p.default_custom_sale_unit_id,
                    COALESCE(u.name, \'piece\') AS unit_type, p.image,
                    p.track_stock, p.track_batches, p.track_expiry, p.track_containers, p.container_type, p.status, p.created_at, p.updated_at
             FROM products p
             INNER JOIN categories c ON c.id = p.category_id
             LEFT JOIN units u ON u.id = p.base_unit_id
             WHERE p.stock_source_id = :source_id
             ORDER BY p.consumption_quantity_base ASC, p.id ASC'
        );
        $statement->execute(['source_id' => $sourceId]);
        return $statement->fetchAll();
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
                selling_price, stock_quantity_base, minimum_stock, base_unit_id, default_purchase_unit_id, default_sale_unit_id,
                stock_mode, stock_source_id, consumption_quantity, consumption_unit_id, consumption_quantity_base, allow_custom_sale, default_custom_sale_unit_id,
                image, track_stock, track_batches, track_expiry, track_containers, container_type, status
             ) VALUES (
                :category_id, :name, :product_code, :barcode, :purchase_cost,
                :selling_price, :quantity, :minimum_stock, :base_unit_id, :default_purchase_unit_id, :default_sale_unit_id,
                :stock_mode, :stock_source_id, :consumption_quantity, :consumption_unit_id, :consumption_quantity_base, :allow_custom_sale, :default_custom_sale_unit_id,
                :image, :track_stock, :track_batches, :track_expiry, :track_containers, :container_type, :status
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
                stock_quantity_base = :quantity,
                minimum_stock = :minimum_stock,
                base_unit_id = :base_unit_id,
                default_purchase_unit_id = :default_purchase_unit_id,
                default_sale_unit_id = :default_sale_unit_id,
                stock_mode = :stock_mode,
                stock_source_id = :stock_source_id,
                consumption_quantity = :consumption_quantity,
                consumption_unit_id = :consumption_unit_id,
                consumption_quantity_base = :consumption_quantity_base,
                allow_custom_sale = :allow_custom_sale,
                default_custom_sale_unit_id = :default_custom_sale_unit_id,
                image = :image,
                track_stock = :track_stock,
                track_batches = :track_batches,
                track_expiry = :track_expiry,
                track_containers = :track_containers,
                container_type = :container_type,
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

    public function syncUnits(int $productId, ?int $baseUnitId, ?int $purchaseUnitId, ?int $saleUnitId): void
    {
        $unitsToSync = [];
        if ($baseUnitId) $unitsToSync[$baseUnitId] = true;
        if ($purchaseUnitId && !isset($unitsToSync[$purchaseUnitId])) $unitsToSync[$purchaseUnitId] = false;
        if ($saleUnitId && !isset($unitsToSync[$saleUnitId])) $unitsToSync[$saleUnitId] = false;

        foreach ($unitsToSync as $unitId => $isBase) {
            $stmt = $this->database->connection()->prepare(
                'INSERT IGNORE INTO product_units (product_id, unit_id, conversion_to_base, is_base_unit, status)
                 VALUES (:product_id, :unit_id, 1.000000, :is_base_unit, \'active\')'
            );
            $stmt->execute([
                'product_id' => $productId,
                'unit_id' => $unitId,
                'is_base_unit' => $isBase ? 1 : 0
            ]);
        }
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
            'SELECT COUNT(*) FROM stock_transactions WHERE product_id = :product_id AND transaction_type != \'opening\''
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
            'SELECT id, name, product_code, barcode, barcode_type, barcode_source, selling_price, purchase_cost, stock_quantity_base AS quantity, base_unit_id, default_purchase_unit_id, default_sale_unit_id, stock_mode, stock_source_id, consumption_quantity, consumption_unit_id, consumption_quantity_base, allow_custom_sale, default_custom_sale_unit_id, track_stock, track_batches, track_expiry, track_containers, container_type, status FROM products WHERE id IN (' . $placeholders . ') ORDER BY id FOR UPDATE'
        );
        foreach (array_values($ids) as $index => $id) $statement->bindValue($index + 1, $id, PDO::PARAM_INT);
        $statement->execute();
        $products = [];
        foreach ($statement->fetchAll() as $product) $products[(int) $product['id']] = $product;
        return $products;
    }

    public function updateQuantity(int $id, string $quantity): void
    {
        $statement = $this->database->connection()->prepare('UPDATE products SET stock_quantity_base = :quantity WHERE id = :id');
        $statement->execute(['id' => $id, 'quantity' => $quantity]);
    }
    public function updatePurchaseCost(int $id, string $cost): void
    {
        $statement = $this->database->connection()->prepare('UPDATE products SET purchase_cost = :cost WHERE id = :id');
        $statement->execute(['id' => $id, 'cost' => $cost]);
    }

    public function updateBarcodeData(int $id, ?string $barcode, ?string $type, ?string $source): void
    {
        $statement = $this->database->connection()->prepare(
            'UPDATE products SET barcode = :barcode, barcode_type = :type, barcode_source = :source WHERE id = :id'
        );
        $statement->execute([
            'id' => $id,
            'barcode' => $barcode,
            'type' => $type,
            'source' => $source
        ]);
    }

    public function recordBarcodePrint(array $ids): void
    {
        if ($ids === []) return;
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $statement = $this->database->connection()->prepare(
            'UPDATE products SET barcode_printed_at = CURRENT_TIMESTAMP, barcode_print_count = barcode_print_count + 1 WHERE id IN (' . $placeholders . ')'
        );
        foreach (array_values($ids) as $index => $id) {
            $statement->bindValue($index + 1, $id, PDO::PARAM_INT);
        }
        $statement->execute();
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
            'base_unit_id' => $data['base_unit_id'] ?? null,
            'default_purchase_unit_id' => $data['default_purchase_unit_id'] ?? null,
            'default_sale_unit_id' => $data['default_sale_unit_id'] ?? null,
            'stock_mode' => $data['stock_mode'] ?? 'own',
            'stock_source_id' => $data['stock_source_id'] ?? null,
            'consumption_quantity' => $data['consumption_quantity'] ?? null,
            'consumption_unit_id' => $data['consumption_unit_id'] ?? null,
            'consumption_quantity_base' => $data['consumption_quantity_base'] ?? null,
            'allow_custom_sale' => $data['allow_custom_sale'] ? 1 : 0,
            'default_custom_sale_unit_id' => $data['default_custom_sale_unit_id'] ?? null,
            'image' => $data['image'] ?? null,
            'track_stock' => $data['track_stock'] ? 1 : 0,
            'track_batches' => ($data['track_batches'] ?? false) ? 1 : 0,
            'track_expiry' => ($data['track_expiry'] ?? false) ? 1 : 0,
            'track_containers' => ($data['track_containers'] ?? false) ? 1 : 0,
            'container_type' => $data['container_type'] ?? null,
            'status' => $data['status'] ?? 'active',
        ];
    }
}

