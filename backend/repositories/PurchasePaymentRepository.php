<?php
declare(strict_types=1);
namespace App\Repositories;
use App\Config\Database;
final class PurchasePaymentRepository{
 public function __construct(private readonly Database$db){}
 public function create(array$d):int{$s=$this->db->connection()->prepare('INSERT INTO purchase_payments (purchase_id,supplier_id,amount,payment_method,reference_number,payment_date,notes,paid_by) VALUES (:purchase_id,:supplier_id,:amount,:payment_method,:reference_number,:payment_date,:notes,:paid_by)');$s->execute($d);return(int)$this->db->connection()->lastInsertId();}
 public function byPurchase(int$id):array{$s=$this->db->connection()->prepare('SELECT pp.*,u.name paid_by_name FROM purchase_payments pp JOIN access_credentials u ON u.id=pp.paid_by WHERE pp.purchase_id=:id ORDER BY pp.payment_date,pp.id');$s->execute(['id'=>$id]);return$s->fetchAll();}
}
