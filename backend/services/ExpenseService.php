<?php

declare(strict_types=1);
namespace App\Services;
use App\Http\HttpException;use App\Repositories\ExpenseCategoryRepository;use App\Repositories\ExpenseRepository;use App\Validators\ExpenseValidator;
final class ExpenseService
{
 public function __construct(private readonly ExpenseRepository $repo,private readonly ExpenseCategoryRepository $categories,private readonly ExpenseValidator $validator,private readonly ExpenseReceiptService $receipts){}
 public function list(array $query): array{$f=$this->validator->filters($query);return$this->repo->paginate($f)+['filters'=>$f,'categories'=>$this->categories->all('',false),'users'=>$this->repo->users(),'permissions'=>['can_manage'=>true,'can_export'=>true]];}
 public function get(int $id): array{return$this->required($id);}
 public function create(array $input,?array $file,int $userId): array{$d=$this->validator->details($input);$this->validCategory($d['expense_category_id']);$new=$this->receipts->store($file);try{return$this->repo->create($d,$userId,$new);}catch(\Throwable $e){$this->receipts->delete($new);throw$e;}}
 public function update(int $id,array $input,?array $file): array{$old=$this->required($id);if($old['status']!=='active')throw new HttpException('Voided expenses cannot be edited.',409);$d=$this->validator->details($input);$this->validCategory($d['expense_category_id']);$new=$this->receipts->store($file);$receipt=$new??($d['remove_receipt']?null:$old['receipt_image']);try{$row=$this->repo->update($id,$d,$receipt);}catch(\Throwable $e){$this->receipts->delete($new);throw$e;}if($new||$d['remove_receipt'])$this->receipts->delete($old['receipt_image']);return$row;}
 public function void(int $id,int $userId): array{$row=$this->required($id);if($row['status']==='voided')throw new HttpException('This expense has already been voided.',409);return$this->repo->void($id,$userId);}
 public function summary(array $query): array{return$this->repo->summary($this->validator->filters($query));}
 public function exportFilters(array $query): array{return$this->validator->filters($query);}
 private function required(int $id): array{$row=$this->repo->find($id);if(!$row)throw new HttpException('Expense not found.',404);return$row;}
 private function validCategory(int $id): void{$row=$this->categories->find($id);if(!$row)throw new HttpException('Expense category not found.',422,['expense_category_id'=>['Select a valid category.']]);if($row['status']!=='active')throw new HttpException('Inactive categories cannot be used for new expenses.',422,['expense_category_id'=>['Select an active category.']]);}
}
