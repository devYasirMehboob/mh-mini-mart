<?php

declare(strict_types=1);
namespace App\Repositories;
use App\Config\Database;
final class ExpenseCategoryRepository
{
 public function __construct(private readonly Database $database){}
 public function all(string $search='',bool $activeOnly=false): array {$sql='SELECT c.*, (SELECT COUNT(*) FROM expenses e WHERE e.expense_category_id=c.id) expense_count FROM expense_categories c WHERE (:search="" OR c.name LIKE :pattern)'.($activeOnly?' AND c.status="active"':'').' ORDER BY c.name';$s=$this->database->connection()->prepare($sql);$s->execute(['search'=>$search,'pattern'=>'%'.$search.'%']);return$s->fetchAll();}
 public function find(int $id): ?array {$s=$this->database->connection()->prepare('SELECT * FROM expense_categories WHERE id=:id');$s->execute(['id'=>$id]);$row=$s->fetch();return$row?:null;}
 public function nameExists(string $name,?int $ignore=null): bool {$s=$this->database->connection()->prepare('SELECT COUNT(*) FROM expense_categories WHERE LOWER(name)=LOWER(:name) AND (:ignore IS NULL OR id<>:id)');$s->execute(['name'=>$name,'ignore'=>$ignore,'id'=>$ignore??0]);return(int)$s->fetchColumn()>0;}
 public function create(array $data): array {$s=$this->database->connection()->prepare('INSERT INTO expense_categories(name,description) VALUES(:name,:description)');$s->execute($data);return$this->find((int)$this->database->connection()->lastInsertId());}
 public function update(int $id,array $data): array {$s=$this->database->connection()->prepare('UPDATE expense_categories SET name=:name,description=:description WHERE id=:id');$s->execute($data+['id'=>$id]);return$this->find($id);}
 public function updateStatus(int $id,string $status): array {$s=$this->database->connection()->prepare('UPDATE expense_categories SET status=:status WHERE id=:id');$s->execute(['id'=>$id,'status'=>$status]);return$this->find($id);}
 public function used(int $id): bool {$s=$this->database->connection()->prepare('SELECT COUNT(*) FROM expenses WHERE expense_category_id=:id');$s->execute(['id'=>$id]);return(int)$s->fetchColumn()>0;}
 public function delete(int $id): void {$s=$this->database->connection()->prepare('DELETE FROM expense_categories WHERE id=:id');$s->execute(['id'=>$id]);}
}
