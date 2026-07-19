<?php

declare(strict_types=1);
namespace App\Repositories;
use App\Config\Database;use PDO;
final class PosProductRepository
{
    public function __construct(private readonly Database $database){}
    public function paginate(array$filters):array
    {
        $where=["p.status='active'","p.deleted_at IS NULL"];$parameters=[];
        if($filters['search']!==''){$pattern='%'.$filters['search'].'%';$where[]='(p.name LIKE :name OR p.product_code LIKE :code OR p.barcode LIKE :barcode)';$parameters=['name'=>$pattern,'code'=>$pattern,'barcode'=>$pattern];}
        if($filters['category_id']!==null){$where[]='p.category_id=:category_id';$parameters['category_id']=$filters['category_id'];}
        if($filters['ids']!==[]){$holders=[];foreach($filters['ids']as$index=>$id){$key='product_id_'.$index;$holders[]=':'.$key;$parameters[$key]=$id;}$where[]='p.id IN ('.implode(',',$holders).')';}
        $whereSql=' WHERE '.implode(' AND ',$where);$count=$this->database->connection()->prepare('SELECT COUNT(*) FROM products p'.$whereSql);$count->execute($parameters);$total=(int)$count->fetchColumn();
        $statement=$this->database->connection()->prepare('SELECT p.id,p.category_id,c.name AS category_name,p.name,p.product_code,p.barcode,p.selling_price,p.quantity,p.minimum_stock,p.unit_type,p.image,p.track_stock,p.status,p.updated_at FROM products p INNER JOIN categories c ON c.id=p.category_id'.$whereSql.' ORDER BY p.name ASC,p.id ASC LIMIT :limit OFFSET :offset');foreach($parameters as$key=>$value)$statement->bindValue(':'.$key,$value,is_int($value)?PDO::PARAM_INT:PDO::PARAM_STR);$statement->bindValue(':limit',$filters['limit'],PDO::PARAM_INT);$statement->bindValue(':offset',($filters['page']-1)*$filters['limit'],PDO::PARAM_INT);$statement->execute();return['products'=>$statement->fetchAll(),'pagination'=>['page'=>$filters['page'],'limit'=>$filters['limit'],'total'=>$total,'total_pages'=>$total===0?0:(int)ceil($total/$filters['limit'])]];
    }
    public function findByBarcode(string $barcode): ?array { $s = $this->database->connection()->prepare('SELECT p.id,p.category_id,c.name AS category_name,p.name,p.product_code,p.barcode,p.selling_price,p.quantity,p.minimum_stock,p.unit_type,p.image,p.track_stock,p.status,p.updated_at FROM products p INNER JOIN categories c ON c.id=p.category_id WHERE LOWER(p.barcode)=LOWER(:barcode) AND p.deleted_at IS NULL LIMIT 1'); $s->execute(['barcode' => $barcode]); $product = $s->fetch(); return $product === false ? null : $product; }
    public function findMany(array$ids):array{if($ids===[])return[];$holders=implode(',',array_fill(0,count($ids),'?'));$s=$this->database->connection()->prepare('SELECT p.id,p.category_id,c.name AS category_name,p.name,p.product_code,p.barcode,p.selling_price,p.quantity,p.minimum_stock,p.unit_type,p.image,p.track_stock,p.status,p.updated_at FROM products p INNER JOIN categories c ON c.id=p.category_id WHERE p.id IN ('.$holders.') AND p.deleted_at IS NULL ORDER BY p.id');foreach(array_values($ids)as$i=>$id)$s->bindValue($i+1,$id,PDO::PARAM_INT);$s->execute();$result=[];foreach($s->fetchAll()as$product)$result[(int)$product['id']]=$product;return$result;}
    public function activeCategories():array{$s=$this->database->connection()->prepare("SELECT id,name FROM categories WHERE status='active' ORDER BY name");$s->execute();return$s->fetchAll();}
}
