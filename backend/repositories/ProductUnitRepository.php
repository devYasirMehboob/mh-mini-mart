<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Config\Database;
use PDO;

class ProductUnitRepository
{
    private Database $db;

    public function __construct(Database $db)
    {
        $this->db = $db;
    }

    public function getUnitsForProduct(int $productId): array
    {
        $stmt = $this->db->connection()->prepare("
            SELECT pu.*, u.name as unit_name, u.symbol as unit_symbol, u.unit_type, u.precision
            FROM product_units pu
            JOIN units u ON pu.unit_id = u.id
            WHERE pu.product_id = ?
            ORDER BY pu.is_base_unit DESC, pu.conversion_to_base DESC
        ");
        $stmt->execute([$productId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function addProductUnit(int $productId, array $data): int
    {
        $stmt = $this->db->connection()->prepare("
            INSERT INTO product_units 
            (product_id, unit_id, conversion_to_base, is_base_unit, is_purchase_unit, is_sale_unit, selling_price, barcode, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $productId,
            $data['unit_id'],
            $data['conversion_to_base'],
            $data['is_base_unit'] ?? 0,
            $data['is_purchase_unit'] ?? 1,
            $data['is_sale_unit'] ?? 1,
            $data['selling_price'] ?? null,
            $data['barcode'] ?? null,
            $data['status'] ?? 'active'
        ]);
        return (int)$this->db->connection()->lastInsertId();
    }

    public function updateProductUnit(int $id, array $data): bool
    {
        $stmt = $this->db->connection()->prepare("
            UPDATE product_units 
            SET conversion_to_base = ?, is_purchase_unit = ?, is_sale_unit = ?, selling_price = ?, barcode = ?, status = ?
            WHERE id = ?
        ");
        return $stmt->execute([
            $data['conversion_to_base'],
            $data['is_purchase_unit'] ?? 1,
            $data['is_sale_unit'] ?? 1,
            $data['selling_price'] ?? null,
            $data['barcode'] ?? null,
            $data['status'] ?? 'active',
            $id
        ]);
    }
    
    public function deleteProductUnit(int $id): bool
    {
        $stmt = $this->db->connection()->prepare("DELETE FROM product_units WHERE id = ? AND is_base_unit = 0");
        return $stmt->execute([$id]);
    }
}
