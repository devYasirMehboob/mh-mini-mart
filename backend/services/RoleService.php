<?php

declare(strict_types=1);
namespace App\Services;
use App\Http\HttpException;use App\Repositories\ActivityLogRepository;use App\Repositories\PermissionRepository;use App\Repositories\RoleRepository;
final class RoleService
{
 public function __construct(private readonly RoleRepository$roles,private readonly PermissionRepository$permissions,private readonly ActivityLogRepository$activity){}
 public function roles():array{return['roles'=>$this->roles->all()];}
 public function permissions():array{return['permissions'=>$this->permissions->all()];}
 public function rolePermissions(int$id):array{$role=$this->required($id);return['role'=>$role,'permission_keys'=>$this->permissions->roleKeys($id)];}
 public function updatePermissions(int$id,array$input,array$actor):array{$role=$this->required($id);if($role['slug']==='admin')throw new HttpException('The Admin role permissions are protected to prevent system lockout.',409);$keys=$input['permission_keys']??null;if(!is_array($keys)||array_filter($keys,fn($key)=>!is_string($key))!==[])throw new HttpException('Select valid role permissions.',422,['permission_keys'=>['Permissions must be a list of keys.']]);$keys=array_values(array_unique($keys));if(!$this->permissions->keysExist($keys))throw new HttpException('One or more permissions are invalid.',422,['permission_keys'=>['Select valid permissions.']]);$this->permissions->replaceRole($id,$keys);$this->activity->log((int)$actor['id'],'role.permissions_changed','Role permissions updated.',null,['role'=>$role['slug']]);return$this->rolePermissions($id);}
 private function required(int$id):array{$role=$this->roles->find($id);if($role===null)throw new HttpException('Role not found.',404);return$role;}
}