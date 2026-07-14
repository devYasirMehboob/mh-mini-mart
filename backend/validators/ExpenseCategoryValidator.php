<?php

declare(strict_types=1);
namespace App\Validators;
use App\Http\HttpException;
final class ExpenseCategoryValidator
{
 public function details(array $input): array {$name=trim((string)($input['name']??''));$description=trim((string)($input['description']??''));$errors=[];if($name==='')$errors['name']=['Category name is required.'];elseif(mb_strlen($name)>100)$errors['name']=['Name must not exceed 100 characters.'];if(mb_strlen($description)>500)$errors['description']=['Description must not exceed 500 characters.'];if($errors)throw new HttpException('Please correct the highlighted fields.',422,$errors);return['name'=>$name,'description'=>$description?:null];}
 public function status(array $input): string {$status=(string)($input['status']??'');if(!in_array($status,['active','inactive'],true))throw new HttpException('Select a valid category status.',422,['status'=>['Status must be active or inactive.']]);return$status;}
}
