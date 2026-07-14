<?php
declare(strict_types=1);
namespace App\Services;
use App\Repositories\SettingsRepository;use App\Validators\SettingsValidator;
final class SystemConfigurationService{
 private?array$cache=null;
 public function __construct(private readonly SettingsRepository$repository,private readonly SettingsValidator$validator){}
 public function all():array{if($this->cache===null)$this->cache=array_replace_recursive($this->validator->defaults(),$this->repository->grouped());return$this->cache;}
 public function public():array{return array_replace_recursive($this->validator->defaults(true),$this->repository->grouped(true));}
 public function get(string$group,string$key,mixed$fallback=null):mixed{return$this->all()[$group][$key]??$fallback;}
 public function refresh():void{$this->cache=null;}
 public function applyTimezone():void{$timezone=(string)$this->get('localization','timezone','Asia/Karachi');if(in_array($timezone,\DateTimeZone::listIdentifiers(),true))date_default_timezone_set($timezone);}
}