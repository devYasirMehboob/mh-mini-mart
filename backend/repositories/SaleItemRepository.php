<?php

declare(strict_types=1);
namespace App\Repositories;
use App\Config\Database;
final class SaleItemRepository
{
    public function __construct(private readonly Database $database) {}
    public function create(array $data): int { $s=$this->database->connection()->prepare('INSERT INTO sale_items (sale_id,product_id,product_name,product_code,unit_id,unit_name_snapshot,unit_symbol_snapshot,quantity_entered,conversion_to_base_snapshot,quantity_base,unit_price,purchase_cost,discount_amount,line_total) VALUES (:sale_id,:product_id,:product_name,:product_code,:unit_id,:unit_name_snapshot,:unit_symbol_snapshot,:quantity_entered,:conversion_to_base_snapshot,:quantity_base,:unit_price,:purchase_cost,:discount_amount,:line_total)');$s->execute($data); return (int) $this->database->connection()->lastInsertId(); }
    public function findBySale(int $saleId,bool $includePurchaseCost=true): array
    {
        $columns='id,product_id,product_name,product_code,unit_id,unit_name_snapshot,unit_symbol_snapshot,quantity_entered,conversion_to_base_snapshot,quantity_base AS quantity,unit_price,discount_amount,line_total';
        if($includePurchaseCost)$columns.=',purchase_cost';
        $s=$this->database->connection()->prepare(
            'SELECT '.$columns.',
                    EXISTS(
                        SELECT 1 FROM stock_transactions st
                        WHERE st.reference_type = \'sale\'
                          AND st.reference_id = si.sale_id
                          AND st.product_id = si.product_id
                    ) AS stock_was_posted
             FROM sale_items si
             WHERE si.sale_id=:sale_id
             ORDER BY si.id'
        );$s->execute(['sale_id'=>$saleId]);return$s->fetchAll();
    }
}
