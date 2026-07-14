<?php

declare(strict_types=1);
namespace App\Middleware;
use App\Http\HttpException;use App\Security\SessionManager;use App\Services\AuthorizationService;
final class AuthMiddleware
{
 public function __construct(private readonly SessionManager$session,private readonly AuthorizationService$authorization){}
 public function requireUser():array{$sessionUser=$this->session->user();if($sessionUser===null)throw new HttpException('Authentication is required.',401);return$this->authorization->resolve($sessionUser);}
 public function requirePermission(string$permission):array{return$this->authorization->requirePermission($this->requireUser(),$permission);}
 public function requireAdmin():array{return$this->requirePermission('users.manage');}
}