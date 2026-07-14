<?php
declare(strict_types=1);
namespace App\Services;
use App\Repositories\ActivityLogRepository;use App\Repositories\SettingsRepository;use App\Validators\SettingsValidator;use Throwable;
final class SettingsService{
 public function __construct(private readonly SettingsRepository$repository,private readonly SettingsValidator$validator,private readonly SystemConfigurationService$configuration,private readonly LogoUploadService$logos,private readonly ActivityLogRepository$activity){}
 public function all():array{return$this->configuration->all();}public function public():array{return$this->configuration->public();}
 public function update(array$input,int$userId):array{$settings=$this->validator->validate($input);$this->repository->save($settings,$userId,$this->validator->definitions());$this->configuration->refresh();$this->configuration->applyTimezone();foreach(array_keys($settings)as$group)$this->activity->log($userId,'settings.updated',ucfirst($group).' settings updated.',null,['section'=>$group]);return$this->configuration->all();}
 public function uploadLogo(?array$file,int$userId):array{$old=(string)$this->configuration->get('shop','logo','');$new=$this->logos->store($file);try{$this->repository->save(['shop'=>['logo'=>$new]],$userId,$this->validator->definitions());}catch(Throwable$e){$this->logos->delete($new);throw$e;}$this->configuration->refresh();$this->logos->delete($old);$this->activity->log($userId,'settings.logo_uploaded','Shop logo updated.');return['path'=>$new,'url'=>$this->publicUrl($new)];}
 public function removeLogo(int$userId):void{$old=(string)$this->configuration->get('shop','logo','');$this->repository->save(['shop'=>['logo'=>'']],$userId,$this->validator->definitions());$this->configuration->refresh();$this->logos->delete($old);$this->activity->log($userId,'settings.logo_removed','Shop logo removed.');}
 public function withPublicUrls(array$settings):array{if(isset($settings['shop']['logo']))$settings['shop']['logo_url']=$this->publicUrl((string)$settings['shop']['logo']);return$settings;}
 private function publicUrl(string$path):string{if($path==='')return'';$script=str_replace('\\','/',$_SERVER['SCRIPT_NAME']??'/mh-mini-mart-api/api/index.php');$root=preg_replace('#/api(?:/index\.php)?$#','',$script);return rtrim((string)$root,'/').'/'.ltrim($path,'/');}
}