<?php

declare(strict_types=1);
namespace App\Services;
use App\Http\HttpException;use App\Repositories\ExpenseCategoryRepository;use App\Validators\ExpenseCategoryValidator;
final class ExpenseCategoryService
{
 public function __construct(private readonly ExpenseCategoryRepository $repo,private readonly ExpenseCategoryValidator $validator){}
 public function list(string $search='',bool $activeOnly=false): array{return$this->repo->all(trim($search),$activeOnly);}
 public function get(int $id): array{return$this->required($id);}
 public function create(array $input): array{$data=$this->validator->details($input);$this->unique($data['name']);return$this->repo->create($data);}
 public function update(int $id,array $input): array{$this->required($id);$data=$this->validator->details($input);$this->unique($data['name'],$id);return$this->repo->update($id,$data);}
 public function status(int $id,array $input): array{$this->required($id);return$this->repo->updateStatus($id,$this->validator->status($input));}
 public function delete(int $id): void{$this->required($id);if($this->repo->used($id))throw new HttpException('This category is used by one or more expenses and cannot be deleted.',409);$this->repo->delete($id);}
 private function required(int $id): array{$row=$this->repo->find($id);if(!$row)throw new HttpException('Expense category not found.',404);return$row;}
 private function unique(string $name,?int $id=null): void{if($this->repo->nameExists($name,$id))throw new HttpException('An expense category with this name already exists.',409,['name'=>['Category name must be unique.']]);}
}
