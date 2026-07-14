<?php
declare(strict_types=1);
namespace App\Repositories;
use App\Config\Database;use PDO;
final class PurchaseItemRepository{
 public function __construct(private readonly Database$db){}
 public function create(int$purchase,array$d):int{$s=$this->db->connection()->prepare('INSERT INTO purchase_items (purchase_id,product_id,product_name,product_code,quantity,unit_cost,line_discount,tax_amount,line_total) VALUES (:purchase_id,:product_id,:product_name,:product_code,:quantity,:unit_cost,:line_discount,:tax_amount,:line_total)');$s->execute(['purchase_id'=>$purchase]+$d);return(int)$this->db->connection()->lastInsertId();}
 public function byPurchase(int$id,bool$lock=false):array{$s=$this->db->connection()->prepare('SELECT pi.*,p.unit_type,p.track_stock,p.quantity current_stock,EXISTS(SELECT 1 FROM stock_transactions st WHERE st.reference_type=\'purchase\' AND st.reference_id=pi.purchase_id AND st.product_id=pi.product_id) stock_posted FROM purchase_items pi JOIN products p ON p.id=pi.product_id WHERE pi.purchase_id=:id ORDER BY pi.id'.($lock?' FOR UPDATE':''));$s->execute(['id'=>$id]);return$s->fetchAll();}
 public function deleteByPurchase(int$id):void{$s=$this->db->connection()->prepare('DELETE FROM purchase_items WHERE purchase_id=:id');$s->execute(['id'=>$id]);}
 public function returnable(int$purchase):array{$s=$this->db->connection()->prepare('SELECT pi.*,p.name current_product_name,p.quantity current_stock,p.track_stock,p.unit_type,EXISTS(SELECT 1 FROM stock_transactions st WHERE st.reference_type=\'purchase\' AND st.reference_id=pi.purchase_id AND st.product_id=pi.product_id) stock_posted FROM purchase_items pi JOIN products p ON p.id=pi.product_id WHERE pi.purchase_id=:id ORDER BY pi.id FOR UPDATE');$s->execute(['id'=>$purchase]);$r=[];foreach($s->fetchAll()as$row)$r[(int)$row['id']]=$row;return$r;}
 public function addReturned(int$id,string$q):void{$s=$this->db->connection()->prepare('UPDATE purchase_items SET returned_quantity=returned_quantity+:q WHERE id=:id');$s->execute(compact('id','q'));}
 public function remainingCount(int$purchase):int{$s=$this->db->connection()->prepare('SELECT COUNT(*) FROM purchase_items WHERE purchase_id=:id AND returned_quantity<quantity');$s->execute(['id'=>$purchase]);return(int)$s->fetchColumn();}
}
