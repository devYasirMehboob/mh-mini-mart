<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Config\Database;
use PDO;

final class SaleRepository
{
    private const SORT_COLUMNS = ['created_at'=>'s.created_at','invoice_number'=>'s.invoice_number','grand_total'=>'s.grand_total','status'=>'s.status'];

    public function __construct(private readonly Database $database) {}

    public function findByToken(string $token): ?array
    {
        $statement=$this->database->connection()->prepare('SELECT id FROM sales WHERE request_token = :token LIMIT 1');
        $statement->execute(['token'=>$token]);$id=$statement->fetchColumn();
        return $id===false?null:$this->findReceipt((int)$id);
    }

    public function nextInvoiceNumber(): string
    {
        $date=date('Y-m-d');$statement=$this->database->connection()->prepare('INSERT INTO invoice_sequences (sequence_date,last_number) VALUES (:date,1) ON DUPLICATE KEY UPDATE last_number = LAST_INSERT_ID(last_number + 1)');$statement->execute(['date'=>$date]);$number=$statement->rowCount()===1?1:(int)$this->database->connection()->lastInsertId();
        return 'MH-'.date('Ymd').'-'.str_pad((string)$number,4,'0',STR_PAD_LEFT);
    }

    public function create(array $data): int
    {
        $statement=$this->database->connection()->prepare('INSERT INTO sales (invoice_number,request_token,cashier_id,customer_name,customer_phone,subtotal,discount_type,discount_value,discount_amount,tax_amount,grand_total,amount_received,change_returned,payment_method,payment_status,status,notes) VALUES (:invoice_number,:request_token,:cashier_id,:customer_name,:customer_phone,:subtotal,:discount_type,:discount_value,:discount_amount,:tax_amount,:grand_total,:amount_received,:change_returned,:payment_method,:payment_status,:status,:notes)');$statement->execute($data);
        return(int)$this->database->connection()->lastInsertId();
    }

    public function paginate(array $filters): array
    {
        [$where,$parameters]=$this->conditions($filters);
        $count=$this->database->connection()->prepare('SELECT COUNT(*) FROM sales s INNER JOIN access_credentials ac ON ac.id=s.cashier_id'.$where);$count->execute($parameters);$total=(int)$count->fetchColumn();
        $sort=self::SORT_COLUMNS[$filters['sort_by']]??self::SORT_COLUMNS['created_at'];$direction=$filters['sort_direction']==='asc'?'ASC':'DESC';
        $statement=$this->database->connection()->prepare(
            'SELECT s.id,s.invoice_number,s.cashier_id,ac.name AS cashier_name,ac.role AS cashier_role,
                    s.customer_name,s.customer_phone,s.subtotal,s.discount_amount,s.tax_amount,s.grand_total,
                    s.payment_method,s.payment_status,s.status,s.created_at,s.updated_at,
                    (SELECT COUNT(*) FROM sale_items si_count WHERE si_count.sale_id=s.id) AS item_count
             FROM sales s INNER JOIN access_credentials ac ON ac.id=s.cashier_id'.$where.
            ' ORDER BY '.$sort.' '.$direction.', s.id '.$direction.' LIMIT :limit OFFSET :offset'
        );
        $this->bind($statement,$parameters);$statement->bindValue(':limit',$filters['limit'],PDO::PARAM_INT);$statement->bindValue(':offset',($filters['page']-1)*$filters['limit'],PDO::PARAM_INT);$statement->execute();
        return ['sales'=>$statement->fetchAll(),'pagination'=>['page'=>$filters['page'],'limit'=>$filters['limit'],'total'=>$total,'total_pages'=>$total===0?0:(int)ceil($total/$filters['limit'])]];
    }

    public function summary(array $filters): array
    {
        [$where,$parameters]=$this->conditions($filters);
        $statement=$this->database->connection()->prepare(
            "SELECT COUNT(*) AS total_sales,
                    COALESCE(SUM(s.status='completed'),0) AS completed_sales,
                    COALESCE(SUM(s.status='cancelled'),0) AS cancelled_sales,
                    COALESCE(SUM(s.status='refunded'),0) AS refunded_sales,
                    COALESCE(SUM(CASE WHEN s.status='completed' THEN s.subtotal ELSE 0 END),0) AS gross_sales,
                    COALESCE(SUM(CASE WHEN s.status='completed' THEN s.discount_amount ELSE 0 END),0) AS total_discounts,
                    COALESCE(SUM(CASE WHEN s.status='completed' THEN s.tax_amount ELSE 0 END),0) AS tax_total,
                    COALESCE(SUM(CASE WHEN s.status='completed' THEN s.subtotal-s.discount_amount ELSE 0 END),0) AS net_sales,
                    COALESCE(SUM(CASE WHEN s.status='refunded' THEN s.grand_total ELSE 0 END),0) AS refunded_amount,
                    COALESCE(AVG(CASE WHEN s.status='completed' THEN s.grand_total END),0) AS average_sale_value
             FROM sales s INNER JOIN access_credentials ac ON ac.id=s.cashier_id".$where
        );$statement->execute($parameters);return $statement->fetch()?:[];
    }

    public function findDetail(int $id): ?array
    {
        $statement=$this->database->connection()->prepare(
            'SELECT s.*,ac.name AS cashier_name,ac.role AS cashier_role,
                    cancelled.role AS cancelled_by_role
             FROM sales s INNER JOIN access_credentials ac ON ac.id=s.cashier_id
             LEFT JOIN access_credentials cancelled ON cancelled.id=s.cancelled_by
             WHERE s.id=:id LIMIT 1'
        );$statement->execute(['id'=>$id]);$sale=$statement->fetch();return $sale===false?null:$sale;
    }

    public function findForUpdate(int $id): ?array
    {
        $statement=$this->database->connection()->prepare('SELECT * FROM sales WHERE id=:id FOR UPDATE');$statement->execute(['id'=>$id]);$sale=$statement->fetch();return $sale===false?null:$sale;
    }

    public function findReceipt(int $id): ?array
    {
        $sale=$this->findDetail($id);if($sale===null)return null;
        $items=$this->database->connection()->prepare('SELECT id,product_id,product_name,product_code,quantity,unit_price,discount_amount,line_total FROM sale_items WHERE sale_id=:id ORDER BY id');$items->execute(['id'=>$id]);$sale['items']=$items->fetchAll();return $sale;
    }

    public function cancel(int $id,int $userId,string $reason): void
    {
        $statement=$this->database->connection()->prepare("UPDATE sales SET status='cancelled',cancellation_reason=:reason,cancelled_by=:user_id,cancelled_at=CURRENT_TIMESTAMP WHERE id=:id");$statement->execute(['id'=>$id,'user_id'=>$userId,'reason'=>$reason]);
    }

    public function refund(int $id): void
    {
        $statement=$this->database->connection()->prepare("UPDATE sales SET status='refunded',payment_status='refunded',refunded_at=CURRENT_TIMESTAMP WHERE id=:id");$statement->execute(['id'=>$id]);
    }

    public function exportRows(array $filters,int $limit=5000): array
    {
        [$where,$parameters]=$this->conditions($filters);$statement=$this->database->connection()->prepare(
            'SELECT s.invoice_number,DATE(s.created_at) AS sale_date,TIME(s.created_at) AS sale_time,
                    ac.name AS cashier_name,ac.role AS cashier_role,s.customer_name,s.customer_phone,
                    s.subtotal,s.discount_amount,s.tax_amount,s.grand_total,s.payment_method,s.payment_status,s.status
             FROM sales s INNER JOIN access_credentials ac ON ac.id=s.cashier_id'.$where.' ORDER BY s.created_at DESC,s.id DESC LIMIT :limit'
        );$this->bind($statement,$parameters);$statement->bindValue(':limit',$limit,PDO::PARAM_INT);$statement->execute();return $statement->fetchAll();
    }

    public function cashiers(): array
    {
        $statement=$this->database->connection()->prepare('SELECT id,name,role FROM access_credentials WHERE is_active=1 ORDER BY id');$statement->execute();return $statement->fetchAll();
    }

    private function conditions(array $filters): array
    {
        $where=[];$parameters=[];
        if($filters['search']!==''){$pattern='%'.$filters['search'].'%';$where[]='(s.invoice_number LIKE :search_invoice OR s.customer_name LIKE :search_customer OR s.customer_phone LIKE :search_phone OR ac.role LIKE :search_role OR EXISTS (SELECT 1 FROM sale_items search_items WHERE search_items.sale_id=s.id AND (search_items.product_name LIKE :search_product OR search_items.product_code LIKE :search_code)))';foreach(['search_invoice','search_customer','search_phone','search_role','search_product','search_code']as$key)$parameters[$key]=$pattern;}
        if($filters['date_from']!==''){$where[]='s.created_at >= :date_from';$parameters['date_from']=$filters['date_from'].' 00:00:00';}
        if($filters['date_to']!==''){$where[]='s.created_at < DATE_ADD(:date_to, INTERVAL 1 DAY)';$parameters['date_to']=$filters['date_to'];}
        if($filters['cashier_id']!==null){$where[]='s.cashier_id=:cashier_id';$parameters['cashier_id']=$filters['cashier_id'];}
        if($filters['payment_method']!==''){$where[]='s.payment_method=:payment_method';$parameters['payment_method']=$filters['payment_method'];}
        if($filters['payment_status']!==''){$where[]='s.payment_status=:payment_status';$parameters['payment_status']=$filters['payment_status'];}
        if($filters['status']!==''){$where[]='s.status=:status';$parameters['status']=$filters['status'];}
        if($filters['customer']!==''){$where[]='(s.customer_name LIKE :customer_name OR s.customer_phone LIKE :customer_phone)';$pattern='%'.$filters['customer'].'%';$parameters['customer_name']=$pattern;$parameters['customer_phone']=$pattern;}
        if($filters['min_total']!==null){$where[]='s.grand_total>=:min_total';$parameters['min_total']=$filters['min_total'];}
        if($filters['max_total']!==null){$where[]='s.grand_total<=:max_total';$parameters['max_total']=$filters['max_total'];}
        return [$where===[]?'':' WHERE '.implode(' AND ',$where),$parameters];
    }

    private function bind(\PDOStatement $statement,array $parameters): void
    {
        foreach($parameters as$name=>$value)$statement->bindValue(':'.$name,$value,is_int($value)?PDO::PARAM_INT:PDO::PARAM_STR);
    }
}
