<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Config\Database;
use PDO;

final class UserRepository
{
    public function __construct(private readonly Database $database) {}

    public function paginate(array $filters): array
    {
        $where=[];$params=[];
        if($filters['search']!==''){$where[]='u.name LIKE :search';$params['search']='%'.$filters['search'].'%';}
        if($filters['role']!==''){$where[]='u.role=:role';$params['role']=$filters['role'];}
        if($filters['status']!==''){$where[]='u.is_active=:active';$params['active']=$filters['status']==='active'?1:0;}
        $clause=$where===[]?'':' WHERE '.implode(' AND ',$where);
        $count=$this->database->connection()->prepare('SELECT COUNT(*) FROM access_credentials u'.$clause);$count->execute($params);$total=(int)$count->fetchColumn();
        $sort=['name'=>'u.name','role'=>'u.role','status'=>'u.is_active','last_login_at'=>'u.last_login_at','created_at'=>'u.created_at'][$filters['sort_by']];
        $direction=$filters['sort_direction']==='asc'?'ASC':'DESC';$offset=($filters['page']-1)*$filters['limit'];
        $sql="SELECT u.id,u.name,u.role,IF(u.is_active=1,'active','inactive') status,u.last_login_at,u.created_at,u.updated_at FROM access_credentials u$clause ORDER BY $sort $direction,u.id $direction LIMIT :limit OFFSET :offset";
        $statement=$this->database->connection()->prepare($sql);foreach($params as$key=>$value)$statement->bindValue(':'.$key,$value);$statement->bindValue(':limit',$filters['limit'],PDO::PARAM_INT);$statement->bindValue(':offset',$offset,PDO::PARAM_INT);$statement->execute();
        return ['users'=>$statement->fetchAll(),'pagination'=>['page'=>$filters['page'],'limit'=>$filters['limit'],'total'=>$total,'total_pages'=>max(1,(int)ceil($total/$filters['limit']))]];
    }

    public function find(int $id): ?array
    {
        $statement=$this->database->connection()->prepare("SELECT id,name,role,IF(is_active=1,'active','inactive') status,last_login_at,created_at,updated_at FROM access_credentials WHERE id=:id");$statement->execute(['id'=>$id]);$row=$statement->fetch();return$row===false?null:$row;
    }

    public function sessionIdentity(int $id): ?array
    {
        $statement=$this->database->connection()->prepare('SELECT id,name,role,is_active,last_login_at,session_version FROM access_credentials WHERE id=:id');$statement->execute(['id'=>$id]);$row=$statement->fetch();return$row===false?null:$row;
    }

    public function activeLoginCandidates(): array
    {
        $statement=$this->database->connection()->prepare('SELECT id,password_hash FROM access_credentials WHERE is_active=1 ORDER BY id');$statement->execute();return$statement->fetchAll();
    }

    public function passwordHashes(?int $excludeUserId=null): array
    {
        $sql='SELECT id,password_hash FROM access_credentials WHERE 1=1';$params=[];if($excludeUserId!==null){$sql.=' AND id<>:id';$params['id']=$excludeUserId;}$statement=$this->database->connection()->prepare($sql);$statement->execute($params);return$statement->fetchAll();
    }

    public function create(array $data,string $hash): array
    {
        $statement=$this->database->connection()->prepare('INSERT INTO access_credentials (name,password_hash,role,is_active) VALUES (:name,:password_hash,:role,:is_active)');$statement->execute(['name'=>$data['name'],'password_hash'=>$hash,'role'=>$data['role'],'is_active'=>$data['status']==='active'?1:0]);return$this->find((int)$this->database->connection()->lastInsertId());
    }

    public function update(int $id,array $data,bool $invalidateSession): array
    {
        $statement=$this->database->connection()->prepare('UPDATE access_credentials SET name=:name,role=:role,is_active=:is_active,session_version=session_version+:bump WHERE id=:id');$active=$data['status']==='active'?1:0;$statement->execute(['name'=>$data['name'],'role'=>$data['role'],'is_active'=>$active,'bump'=>$invalidateSession?1:0,'id'=>$id]);return$this->find($id);
    }

    public function updateStatus(int $id,string $status): array
    {
        $statement=$this->database->connection()->prepare('UPDATE access_credentials SET is_active=:active,session_version=session_version+1 WHERE id=:id');$statement->execute(['active'=>$status==='active'?1:0,'id'=>$id]);return$this->find($id);
    }

    public function resetPassword(int $id,string $hash): void
    {
        $statement=$this->database->connection()->prepare('UPDATE access_credentials SET password_hash=:hash,session_version=session_version+1 WHERE id=:id');$statement->execute(['hash'=>$hash,'id'=>$id]);
    }

    public function recordLogin(int $id): void
    {
        $statement=$this->database->connection()->prepare('UPDATE access_credentials SET last_login_at=NOW() WHERE id=:id');$statement->execute(['id'=>$id]);
    }

    public function countActiveAdmins(?int $excludeId=null): int
    {
        $sql="SELECT COUNT(*) FROM access_credentials WHERE role='admin' AND is_active=1";$params=[];if($excludeId!==null){$sql.=' AND id<>:id';$params['id']=$excludeId;}$statement=$this->database->connection()->prepare($sql);$statement->execute($params);return(int)$statement->fetchColumn();
    }

    public function historyCounts(int $id): array
    {
        $queries=['sales'=>['SELECT COUNT(*) FROM sales WHERE cashier_id=? OR cancelled_by=?',2],'expenses'=>['SELECT COUNT(*) FROM expenses WHERE added_by=? OR voided_by=?',2],'refunds'=>['SELECT COUNT(*) FROM refunds WHERE processed_by=?',1],'stock'=>['SELECT COUNT(*) FROM stock_transactions WHERE user_id=?',1],'held_sales'=>['SELECT COUNT(*) FROM held_sales WHERE held_by=?',1],'activity'=>['SELECT COUNT(*) FROM activity_logs WHERE actor_user_id=? OR subject_user_id=?',2]];$counts=[];foreach($queries as$key=>[$sql,$bindings]){$statement=$this->database->connection()->prepare($sql);$statement->execute(array_fill(0,$bindings,$id));$counts[$key]=(int)$statement->fetchColumn();}return$counts;
    }

    public function delete(int $id): void
    {
        $statement=$this->database->connection()->prepare('DELETE FROM access_credentials WHERE id=:id');$statement->execute(['id'=>$id]);
    }
}