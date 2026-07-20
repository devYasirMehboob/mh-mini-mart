<?php
declare(strict_types=1);
namespace App\Services;
use App\Http\HttpException;use App\Repositories\PermissionRepository;use App\Repositories\UserRepository;use App\Security\SessionManager;
final class AuthorizationService{
 public function __construct(private readonly UserRepository$users,private readonly PermissionRepository$permissions,private readonly SessionManager$session,private readonly SystemConfigurationService$configuration){}
 public function resolve(array$sessionUser):array{$this->session->enforceInactivity((bool)$this->configuration->get('security','automatic_logout',true),(int)$this->configuration->get('security','inactivity_timeout_minutes',30));$id=(int)($sessionUser['id']??0);$version=(int)($sessionUser['session_version']??0);$user=$id>0?$this->users->sessionIdentity($id):null;if($user===null||(int)$user['is_active']!==1||(int)$user['session_version']!==$version){$this->session->destroy();throw new HttpException('Your session has expired. Please log in again.',401);}return['id'=>(int)$user['id'],'name'=>(string)$user['name'],'role'=>(string)$user['role'],'status'=>'active','last_login_at'=>$user['last_login_at'],'permissions'=>$this->permissions->effectiveKeys((int)$user['id'],(string)$user['role'])];}
 public function can(array$user,string$permission):bool{if(($user['role']??'')==='admin')return true;return in_array($permission,$user['permissions']??[],true);}
 public function requirePermission(array$user,string$permission):array{if(!$this->can($user,$permission))throw new HttpException('You do not have permission to perform this action.',403);return$user;}
}