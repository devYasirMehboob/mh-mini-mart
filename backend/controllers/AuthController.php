<?php

declare(strict_types=1);
namespace App\Controllers;
use App\Http\HttpException;use App\Http\JsonResponse;use App\Http\Request;use App\Middleware\AuthMiddleware;use App\Security\SessionManager;use App\Services\AuthService;
final class AuthController
{
 public function __construct(private readonly Request$request,private readonly AuthService$authService,private readonly AuthMiddleware$authMiddleware,private readonly SessionManager$session){}
 public function login():never{$this->session->verifyCsrfToken();$password=(string)($this->request->json()['password']??'');if($password==='')throw new HttpException('Enter the access password.',422,['password'=>['Password is required.']]);JsonResponse::success('Logged in successfully.',$this->authService->login($password));}
 public function currentUser():never{JsonResponse::success('Current session retrieved.',['user'=>$this->authMiddleware->requireUser()]);}
 public function logout():never{$user=$this->authMiddleware->requireUser();$this->session->verifyCsrfToken();$this->authService->logout($user);JsonResponse::success('Logged out successfully.');}
}