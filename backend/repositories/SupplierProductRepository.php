<?php
declare(strict_types=1);

namespace App\Repositories;

use PDO;

final class SupplierProductRepository
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    public function findBySupplierAndProduct(int $supplierId, int $productId): ?array
    {
        $stmt = $this->pdo->prepare('
            SELECT sp.*, u.name AS last_unit_name, u.symbol AS last_unit_symbol
            FROM supplier_products sp
            LEFT JOIN units u ON sp.last_purchase_unit_id = u.id
            WHERE sp.supplier_id = :supplier_id AND sp.product_id = :product_id
            LIMIT 1
        ');
        $stmt->execute([
            'supplier_id' => $supplierId,
            'product_id' => $productId,
        ]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public function upsert(
        int $supplierId,
        int $productId,
        ?string $itemCode = null,
        ?string $itemName = null,
        ?string $barcode = null,
        ?string $lastCost = null,
        ?int $lastUnitId = null,
        ?string $lastDate = null
    ): void {
        $sql = '
            INSERT INTO supplier_products (
                supplier_id, product_id, supplier_item_code, supplier_item_name, supplier_barcode,
                last_purchase_cost, last_purchase_unit_id, last_purchase_date
            ) VALUES (
                :supplier_id, :product_id, :supplier_item_code, :supplier_item_name, :supplier_barcode,
                :last_purchase_cost, :last_purchase_unit_id, :last_purchase_date
            )
            ON DUPLICATE KEY UPDATE
                supplier_item_code = COALESCE(:supplier_item_code_upd, supplier_item_code),
                supplier_item_name = COALESCE(:supplier_item_name_upd, supplier_item_name),
                supplier_barcode = COALESCE(:supplier_barcode_upd, supplier_barcode),
                last_purchase_cost = COALESCE(:last_purchase_cost_upd, last_purchase_cost),
                last_purchase_unit_id = COALESCE(:last_purchase_unit_id_upd, last_purchase_unit_id),
                last_purchase_date = COALESCE(:last_purchase_date_upd, last_purchase_date),
                updated_at = CURRENT_TIMESTAMP
        ';

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            'supplier_id' => $supplierId,
            'product_id' => $productId,
            'supplier_item_code' => $itemCode,
            'supplier_item_name' => $itemName,
            'supplier_barcode' => $barcode,
            'last_purchase_cost' => $lastCost,
            'last_purchase_unit_id' => $lastUnitId,
            'last_purchase_date' => $lastDate,
            'supplier_item_code_upd' => $itemCode,
            'supplier_item_name_upd' => $itemName,
            'supplier_barcode_upd' => $barcode,
            'last_purchase_cost_upd' => $lastCost,
            'last_purchase_unit_id_upd' => $lastUnitId,
            'last_purchase_date_upd' => $lastDate,
        ]);
    }

    public function getSuggestionsBySupplier(int $supplierId, int $limit = 20): array
    {
        $stmt = $this->pdo->prepare('
            SELECT 
                p.id,
                p.name,
                p.product_code,
                p.barcode,
                p.stock_quantity_base,
                p.stock_mode,
                p.track_stock,
                p.track_batches,
                p.track_expiry,
                p.status,
                p.category_id,
                c.name AS category_name,
                bu.name AS base_unit_name,
                bu.symbol AS base_unit_symbol,
                pu.name AS default_purchase_unit_name,
                pu.symbol AS default_purchase_unit_symbol,
                p.base_unit_id,
                p.default_purchase_unit_id,
                sp.supplier_item_code,
                sp.supplier_item_name,
                sp.last_purchase_cost,
                sp.last_purchase_unit_id,
                sp.last_purchase_date,
                lpu.name AS last_purchase_unit_name,
                lpu.symbol AS last_purchase_unit_symbol
            FROM supplier_products sp
            JOIN products p ON sp.product_id = p.id
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN units bu ON p.base_unit_id = bu.id
            LEFT JOIN units pu ON p.default_purchase_unit_id = pu.id
            LEFT JOIN units lpu ON sp.last_purchase_unit_id = lpu.id
            WHERE sp.supplier_id = :supplier_id AND p.status = "active"
            ORDER BY sp.last_purchase_date DESC, sp.updated_at DESC
            LIMIT :limit_val
        ');
        $stmt->bindValue(':supplier_id', $supplierId, PDO::PARAM_INT);
        $stmt->bindValue(':limit_val', $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
