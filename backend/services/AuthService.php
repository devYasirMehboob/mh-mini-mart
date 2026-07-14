<?php

declare(strict_types=1);
namespace App\Services;
use App\Http\HttpException;use App\Repositories\ActivityLogRepository;use App\Repositories\PermissionRepository;use App\Repositories\UserRepository;use App\Security\SessionManager;
final class AuthService
{
 public function __construct(private readonly UserRepository$users,private readonly PermissionRepository$permissions,private readonly ActivityLogRepository$activity,private readonly SessionManager$session){}
 public function login(string$password):array{$matches=[];foreach($this->users->activeLoginCandidates()as$candidate){$valid=password_verify($password,(string)$candidate['password_hash']);if($valid)$matches[]=(int)$candidate['id'];}if(count($matches)!==1){$this->activity->log(null,'auth.login_failed','Password-only login failed.');throw new HttpException('The access password is incorrect.',401);}$id=$matches[0];$this->users->recordLogin($id);$identity=$this->users->sessionIdentity($id);if($identity===null||(int)$identity['is_active']!==1)throw new HttpException('The access password is incorrect.',401);$user=['id'=>(int)$identity['id'],'name'=>(string)$identity['name'],'role'=>(string)$identity['role'],'status'=>'active','last_login_at'=>$identity['last_login_at'],'permissions'=>$this->permissions->effectiveKeys($id,(string)$identity['role'])];$this->activity->log($id,'auth.login','User logged in.',$id);return['user'=>$user,'csrfToken'=>$this->session->authenticate(['id'=>$id,'session_version'=>(int)$identity['session_version']])];}
 public function logout(array$user):void{$this->activity->log((int)$user['id'],'auth.logout','User logged out.',(int)$user['id']);$this->session->destroy();}
}