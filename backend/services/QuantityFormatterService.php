<?php

declare(strict_types=1);

namespace App\Services;

use PDO;

class QuantityFormatterService
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    /**
     * Formats a base quantity into a readable string using all configured product units.
     * e.g., 100000 grams -> "2 bags"
     * 74750 grams -> "1 bag + 24 kg 750 g"
     */
    public function formatBaseQuantity(int $productId, float $baseQuantity): string
    {
        if ($baseQuantity == 0) {
            // Get base unit to show "0 base_unit"
            $stmt = $this->db->prepare("SELECT u.symbol FROM products p JOIN units u ON p.base_unit_id = u.id WHERE p.id = ?");
            $stmt->execute([$productId]);
            $baseSymbol = $stmt->fetchColumn() ?: '';
            return "0 " . $baseSymbol;
        }

        // Get all units for this product, ordered by conversion factor descending
        $stmt = $this->db->prepare("
            SELECT u.name, u.symbol, pu.conversion_to_base, u.precision
            FROM product_units pu
            JOIN units u ON pu.unit_id = u.id
            WHERE pu.product_id = ? AND pu.status = 'active'
            ORDER BY pu.conversion_to_base DESC
        ");
        $stmt->execute([$productId]);
        $units = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (empty($units)) {
            return (string)$baseQuantity;
        }

        $remaining = round($baseQuantity, 3);
        $parts = [];

        foreach ($units as $unit) {
            $conversion = (float)$unit['conversion_to_base'];
            if ($conversion <= 0) continue;
            
            // Check how many whole units fit
            $amount = floor($remaining / $conversion);
            
            // If it's the base unit (conversion == 1), we don't floor it if there's decimal remainder
            if ($conversion == 1) {
                $amount = round($remaining, (int)$unit['precision']);
            }

            if ($amount > 0) {
                // If amount has no decimal, format without decimals
                $displayAmount = (floor($amount) == $amount) ? (int)$amount : $amount;
                $parts[] = $displayAmount . ' ' . $unit['symbol'];
                $remaining = round($remaining - ($amount * $conversion), 3);
            }
            
            if ($remaining <= 0) break;
        }

        if (empty($parts)) {
             // Fallback
             return $baseQuantity . ' ' . $units[count($units)-1]['symbol'];
        }

        return implode(' + ', $parts);
    }
}
