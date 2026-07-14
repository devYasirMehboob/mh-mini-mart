<?php

declare(strict_types=1);
namespace App\Repositories;
use App\Config\Database;
final class ActivityLogRepository
{
 public function __construct(private readonly Database $database){}
 public function log(?int$actorId,string$action,string$description,?int$subjectId=null,array$metadata=[]):void{$s=$this->database->connection()->prepare('INSERT INTO activity_logs (actor_user_id,subject_user_id,action,description,metadata) VALUES (:actor,:subject,:action,:description,:metadata)');$s->execute(['actor'=>$actorId,'subject'=>$subjectId,'action'=>$action,'description'=>$description,'metadata'=>$metadata===[]?null:json_encode($metadata,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE)]);}
 public function recentForUser(int$userId,int$limit=12):array{$s=$this->database->connection()->prepare('SELECT l.id,l.action,l.description,l.created_at,a.name actor_name FROM activity_logs l LEFT JOIN access_credentials a ON a.id=l.actor_user_id WHERE l.subject_user_id=:subject_id OR l.actor_user_id=:actor_id ORDER BY l.created_at DESC,l.id DESC LIMIT :limit');$s->bindValue(':subject_id',$userId,\PDO::PARAM_INT);$s->bindValue(':actor_id',$userId,\PDO::PARAM_INT);$s->bindValue(':limit',$limit,\PDO::PARAM_INT);$s->execute();return$s->fetchAll();}
}