<?php

declare(strict_types=1);
namespace App\Controllers;
use App\Http\JsonResponse;use App\Http\Request;use App\Security\SessionManager;use App\Services\RoleService;
final class RoleController
{
 public function __construct(private readonly Request$request,private readonly RoleService$roles,private readonly SessionManager$session){}
 public function index():never{JsonResponse::success('Roles retrieved successfully.',$this->roles->roles());}
 public function permissions():never{JsonResponse::success('Permissions retrieved successfully.',$this->roles->permissions());}
 public function showPermissions(int$id):never{JsonResponse::success('Role permissions retrieved successfully.',$this->roles->rolePermissions($id));}
 public function updatePermissions(int$id,array$actor):never{$this->session->verifyCsrfToken();JsonResponse::success('Role permissions updated successfully.',$this->roles->updatePermissions($id,$this->request->json(),$actor));}
}