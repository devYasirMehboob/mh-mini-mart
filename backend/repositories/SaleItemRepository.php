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
        $s=$this->database->connection()->prepare('SELECT '.$columns.' FROM sale_items WHERE sale_id=:sale_id ORDER BY id');$s->execute(['sale_id'=>$saleId]);return$s->fetchAll();
    }
}
