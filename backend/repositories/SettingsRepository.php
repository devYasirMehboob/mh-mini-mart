<?php
declare(strict_types=1);
namespace App\Repositories;
use App\Config\Database;use Throwable;
final class SettingsRepository{
 public function __construct(private readonly Database $database){}
 public function grouped(bool $publicOnly=false):array{$sql='SELECT setting_group,setting_key,setting_value,value_type FROM settings'.($publicOnly?' WHERE is_public=1':'').' ORDER BY setting_group,setting_key';$s=$this->database->connection()->prepare($sql);$s->execute();$result=[];foreach($s->fetchAll()as$row)$result[$row['setting_group']][$row['setting_key']]=$this->decode($row['setting_value'],$row['value_type']);return$result;}
 public function save(array$settings,int$userId,array$definitions):void{$pdo=$this->database->connection();$s=$pdo->prepare('INSERT INTO settings (setting_group,setting_key,setting_value,value_type,is_public,updated_by) VALUES (:g,:k,:v,:t,:p,:u) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value),value_type=VALUES(value_type),is_public=VALUES(is_public),updated_by=VALUES(updated_by)');$pdo->beginTransaction();try{foreach($settings as$group=>$values)foreach($values as$key=>$value){$d=$definitions[$group][$key];$s->execute(['g'=>$group,'k'=>$key,'v'=>$this->encode($value,$d['type']),'t'=>$d['type'],'p'=>$d['public']?1:0,'u'=>$userId]);}$pdo->commit();}catch(Throwable$e){if($pdo->inTransaction())$pdo->rollBack();throw$e;}}
 private function decode(?string$v,string$t):mixed{return match($t){'boolean'=>$v==='1','integer'=>(int)$v,'decimal'=>(float)$v,'json'=>json_decode($v??'null',true),default=>$v??''};}
 private function encode(mixed$v,string$t):string{return match($t){'boolean'=>$v?'1':'0','json'=>(string)json_encode($v,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE),default=>(string)$v};}
}