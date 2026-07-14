<?php

declare(strict_types=1);
namespace App\Repositories;
use App\Config\Database;
final class SaleItemRepository
{
    public function __construct(private readonly Database $database) {}
    public function create(array $data): void { $s=$this->database->connection()->prepare('INSERT INTO sale_items (sale_id,product_id,product_name,product_code,quantity,unit_price,purchase_cost,discount_amount,line_total) VALUES (:sale_id,:product_id,:product_name,:product_code,:quantity,:unit_price,:purchase_cost,:discount_amount,:line_total)');$s->execute($data); }
    public function findBySale(int $saleId,bool $includePurchaseCost=true): array
    {
        $columns='id,product_id,product_name,product_code,quantity,unit_price,discount_amount,line_total';
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
