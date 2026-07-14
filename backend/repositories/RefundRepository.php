<?php

declare(strict_types=1);
namespace App\Repositories;
use App\Config\Database;
final class RefundRepository
{
    public function __construct(private readonly Database $database) {}
    public function create(array $data): int {$s=$this->database->connection()->prepare("INSERT INTO refunds(sale_id,processed_by,refund_amount,refund_method,reason,status) VALUES(:sale_id,:processed_by,:refund_amount,:refund_method,:reason,'completed')");$s->execute($data);return(int)$this->database->connection()->lastInsertId();}
    public function findBySale(int $saleId): array {$s=$this->database->connection()->prepare('SELECT r.id,r.sale_id,r.processed_by,ac.name AS processed_by_name,ac.role AS processed_by_role,r.refund_amount,r.refund_method,r.reason,r.status,r.created_at,r.updated_at FROM refunds r INNER JOIN access_credentials ac ON ac.id=r.processed_by WHERE r.sale_id=:sale_id ORDER BY r.id');$s->execute(['sale_id'=>$saleId]);return$s->fetchAll();}
}
