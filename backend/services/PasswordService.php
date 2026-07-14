<?php

declare(strict_types=1);
namespace App\Services;
use App\Http\HttpException;use App\Repositories\UserRepository;
final class PasswordService
{
 public function __construct(private readonly UserRepository$users){}
 public function hashUnique(string$password,?int$excludeUserId=null):string{$errors=[];$trimmed=trim($password);if(mb_strlen($password)<6)$errors['password']=['Password must contain at least 6 characters.'];elseif(mb_strlen($password)>255)$errors['password']=['Password must not exceed 255 characters.'];elseif($trimmed==='')$errors['password']=['Password cannot be blank.'];elseif(preg_match('/^(?:\d{6,}|(.)\1{5,})$/u',$password)===1||preg_match('/^(?:admin|cashier|password|welcome|default)\d*$/i',$password)===1)$errors['password']=['Choose a password that is not a common default.'];if($errors!==[])throw new HttpException('The password does not meet the security requirements.',422,$errors);foreach($this->users->passwordHashes($excludeUserId)as$row){if(password_verify($password,(string)$row['password_hash']))throw new HttpException('This password is already assigned to another user.',422,['password'=>['This password is already assigned to another user.']]);}$hash=password_hash($password,PASSWORD_DEFAULT);if($hash===false)throw new \RuntimeException('Unable to secure the password.');return$hash;}
}