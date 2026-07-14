<?php

declare(strict_types=1);
namespace App\Repositories;
use App\Config\Database;
final class PaymentRepository
{
    public function __construct(private readonly Database $database) {}
    public function create(array $data): void {$s=$this->database->connection()->prepare('INSERT INTO payments (sale_id,payment_method,amount,status,reference) VALUES (:sale_id,:payment_method,:amount,:status,:reference)');$s->execute($data);}
    public function findBySale(int $saleId): array {$s=$this->database->connection()->prepare('SELECT id,payment_method,amount,status,reference,created_at FROM payments WHERE sale_id=:sale_id ORDER BY id');$s->execute(['sale_id'=>$saleId]);return$s->fetchAll();}
    public function markRefunded(int $saleId): void {$s=$this->database->connection()->prepare("UPDATE payments SET status='refunded' WHERE sale_id=:sale_id AND status='paid'");$s->execute(['sale_id'=>$saleId]);}
}
