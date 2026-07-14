<?php

declare(strict_types=1);
namespace App\Repositories;
use App\Config\Database;
final class PermissionRepository
{
 public function __construct(private readonly Database $database){}
 public function all():array{$s=$this->database->connection()->prepare('SELECT id,name,permission_key `key`,module,description FROM permissions ORDER BY module,name');$s->execute();return$s->fetchAll();}
 public function keysExist(array$keys):bool{if($keys===[])return true;$marks=implode(',',array_fill(0,count($keys),'?'));$s=$this->database->connection()->prepare("SELECT COUNT(*) FROM permissions WHERE permission_key IN ($marks)");$s->execute(array_values($keys));return(int)$s->fetchColumn()===count(array_unique($keys));}
 public function roleKeys(int$roleId):array{$s=$this->database->connection()->prepare('SELECT p.permission_key FROM role_permissions rp JOIN permissions p ON p.id=rp.permission_id WHERE rp.role_id=:id ORDER BY p.permission_key');$s->execute(['id'=>$roleId]);return array_column($s->fetchAll(),'permission_key');}
 public function overrides(int$userId):array{$s=$this->database->connection()->prepare('SELECT p.permission_key `key`,up.effect FROM user_permissions up JOIN permissions p ON p.id=up.permission_id WHERE up.user_id=:id ORDER BY p.permission_key');$s->execute(['id'=>$userId]);return$s->fetchAll();}
 public function effectiveKeys(int$userId,string$role):array{$role=$this->roleBySlug($role);if(!$role)return[];$keys=$this->roleKeys((int)$role['id']);foreach($this->overrides($userId)as$row){if($row['effect']==='allow')$keys[]=$row['key'];else$keys=array_values(array_diff($keys,[$row['key']]));}return array_values(array_unique($keys));}
 public function replaceRole(int$roleId,array$keys):void{$pdo=$this->database->connection();$pdo->beginTransaction();try{$delete=$pdo->prepare('DELETE FROM role_permissions WHERE role_id=:id');$delete->execute(['id'=>$roleId]);$insert=$pdo->prepare('INSERT INTO role_permissions (role_id,permission_id) SELECT :role_id,id FROM permissions WHERE permission_key=:permission_key');foreach($keys as$key)$insert->execute(['role_id'=>$roleId,'permission_key'=>$key]);$pdo->commit();}catch(\Throwable$e){if($pdo->inTransaction())$pdo->rollBack();throw$e;}}
 public function replaceOverrides(int$userId,array$overrides):void{$pdo=$this->database->connection();$pdo->beginTransaction();try{$delete=$pdo->prepare('DELETE FROM user_permissions WHERE user_id=:id');$delete->execute(['id'=>$userId]);$insert=$pdo->prepare('INSERT INTO user_permissions (user_id,permission_id,effect) SELECT :user_id,id,:effect FROM permissions WHERE permission_key=:permission_key');foreach($overrides as$key=>$effect)$insert->execute(['user_id'=>$userId,'effect'=>$effect,'permission_key'=>$key]);$pdo->commit();}catch(\Throwable$e){if($pdo->inTransaction())$pdo->rollBack();throw$e;}}
 private function roleBySlug(string$slug):?array{$s=$this->database->connection()->prepare('SELECT id FROM roles WHERE slug=:slug AND status=\'active\'');$s->execute(['slug'=>$slug]);$r=$s->fetch();return$r===false?null:$r;}
}