<?php

declare(strict_types=1);
namespace App\Controllers;
use App\Http\JsonResponse;use App\Http\Request;use App\Security\SessionManager;use App\Services\UserService;
final class UserController
{
 public function __construct(private readonly Request$request,private readonly UserService$users,private readonly SessionManager$session){}
 public function index():never{JsonResponse::success('Users retrieved successfully.',$this->users->list($this->request->query()));}
 public function show(int$id):never{JsonResponse::success('User retrieved successfully.',$this->users->get($id));}
 public function store(array$actor):never{$this->session->verifyCsrfToken();JsonResponse::success('User created successfully.',['user'=>$this->users->create($this->request->json(),$actor)],201);}
 public function update(int$id,array$actor):never{$this->session->verifyCsrfToken();JsonResponse::success('User updated successfully.',['user'=>$this->users->update($id,$this->request->json(),$actor)]);}
 public function status(int$id,array$actor):never{$this->session->verifyCsrfToken();$user=$this->users->status($id,$this->request->json(),$actor);JsonResponse::success($user['status']==='active'?'User activated successfully.':'User deactivated successfully.',['user'=>$user]);}
 public function resetPassword(int$id,array$actor):never{$this->session->verifyCsrfToken();$this->users->resetPassword($id,$this->request->json(),$actor);JsonResponse::success('Password reset successfully.');}
 public function permissions(int$id):never{JsonResponse::success('User permissions retrieved successfully.',$this->users->get($id));}
 public function updatePermissions(int$id,array$actor):never{$this->session->verifyCsrfToken();JsonResponse::success('User permissions updated successfully.',$this->users->updatePermissions($id,$this->request->json(),$actor));}
 public function destroy(int$id,array$actor):never{$this->session->verifyCsrfToken();$this->users->delete($id,$actor);JsonResponse::success('User deleted successfully.');}
}