<?php

declare(strict_types=1);

namespace App\Services;

use App\Config\Database;
use PDO;
use Exception;

class UnitConversionService
{
    private Database $db;

    public function __construct(Database $db)
    {
        $this->db = $db;
    }

    /**
     * Convert entered quantity to base quantity
     */
    public function convertToBase(float $enteredQuantity, float $conversionFactor): float
    {
        return round($enteredQuantity * $conversionFactor, 3);
    }

    /**
     * Get conversion details for a product unit
     */
    public function getConversionDetails(int $productId, int $unitId): array
    {
        $stmt = $this->db->connection()->prepare("
            SELECT pu.conversion_to_base, u.name as unit_name, u.symbol as unit_symbol,
                   pu.is_base_unit, u.precision, pu.selling_price
            FROM product_units pu
            JOIN units u ON pu.unit_id = u.id
            WHERE pu.product_id = ? AND pu.unit_id = ? AND pu.status = 'active'
        ");
        $stmt->execute([$productId, $unitId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$result) {
            throw new Exception("Unit not found or inactive for this product.");
        }

        return $result;
    }

    /**
     * Get base unit details for a product
     */
    public function getBaseUnit(int $productId): array
    {
        $stmt = $this->db->connection()->prepare("
            SELECT u.id, u.name, u.symbol, u.precision
            FROM products p
            JOIN units u ON p.base_unit_id = u.id
            WHERE p.id = ?
        ");
        $stmt->execute([$productId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$result) {
            throw new Exception("Base unit not configured for this product.");
        }

        return $result;
    }
}
