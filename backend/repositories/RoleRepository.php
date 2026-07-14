<?php

declare(strict_types=1);
namespace App\Repositories;
use App\Config\Database;
final class RoleRepository
{
 public function __construct(private readonly Database $database){}
 public function all():array{$s=$this->database->connection()->prepare('SELECT r.id,r.name,r.slug,r.description,r.status,COUNT(rp.permission_id) permission_count FROM roles r LEFT JOIN role_permissions rp ON rp.role_id=r.id GROUP BY r.id ORDER BY r.id');$s->execute();return$s->fetchAll();}
 public function find(int$id):?array{$s=$this->database->connection()->prepare('SELECT id,name,slug,description,status FROM roles WHERE id=:id');$s->execute(['id'=>$id]);$r=$s->fetch();return$r===false?null:$r;}
 public function findBySlug(string$slug):?array{$s=$this->database->connection()->prepare('SELECT id,name,slug,description,status FROM roles WHERE slug=:slug');$s->execute(['slug'=>$slug]);$r=$s->fetch();return$r===false?null:$r;}
}