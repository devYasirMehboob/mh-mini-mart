<?php

declare(strict_types=1);
namespace App\Validators;
use App\Http\HttpException;

final class ExpenseValidator
{
    private const METHODS = ['cash','card','bank_transfer','mobile_wallet','other'];
    public function details(array $input): array
    {
        $categoryId=filter_var($input['expense_category_id']??null,FILTER_VALIDATE_INT,['options'=>['min_range'=>1]]);
        $title=trim((string)($input['title']??'')); $amount=trim((string)($input['amount']??''));
        $date=trim((string)($input['expense_date']??'')); $description=trim((string)($input['description']??''));
        $method=(string)($input['payment_method']??'cash'); $reference=trim((string)($input['reference_number']??'')); $errors=[];
        if($categoryId===false)$errors['expense_category_id']=['Select an expense category.'];
        if($title==='')$errors['title']=['Expense title is required.']; elseif(mb_strlen($title)>150)$errors['title']=['Title must not exceed 150 characters.'];
        if(!preg_match('/^\d{1,10}(\.\d{1,2})?$/',$amount)|| (float)$amount<=0)$errors['amount']=['Enter a valid amount greater than zero.'];
        $parsed=\DateTimeImmutable::createFromFormat('!Y-m-d',$date); if(!$parsed||$parsed->format('Y-m-d')!==$date)$errors['expense_date']=['Enter a valid expense date.']; elseif($date>date('Y-m-d'))$errors['expense_date']=['Expense date cannot be in the future.'];
        if(mb_strlen($description)>1000)$errors['description']=['Description must not exceed 1000 characters.'];
        if(!in_array($method,self::METHODS,true))$errors['payment_method']=['Select a valid payment method.'];
        if(mb_strlen($reference)>150)$errors['reference_number']=['Reference number must not exceed 150 characters.'];
        if($errors)throw new HttpException('Please correct the highlighted fields.',422,$errors);
        return ['expense_category_id'=>(int)$categoryId,'title'=>$title,'amount'=>number_format((float)$amount,2,'.',''),'expense_date'=>$date,'description'=>$description?:null,'payment_method'=>$method,'reference_number'=>$reference?:null,'remove_receipt'=>filter_var($input['remove_receipt']??false,FILTER_VALIDATE_BOOLEAN)];
    }
    public function filters(array $input): array
    {
        $out=['search'=>trim((string)($input['search']??'')),'date_from'=>trim((string)($input['date_from']??'')),'date_to'=>trim((string)($input['date_to']??'')),'category_id'=>(int)($input['category_id']??0),'added_by'=>(int)($input['added_by']??0),'status'=>((string)($input['status']??'active')==='all'?'':(string)($input['status']??'active')),'payment_method'=>(string)($input['payment_method']??''),'min_amount'=>trim((string)($input['min_amount']??'')),'max_amount'=>trim((string)($input['max_amount']??'')),'page'=>max(1,(int)($input['page']??1)),'limit'=>min(100,max(10,(int)($input['limit']??20))),'sort_by'=>(string)($input['sort_by']??'expense_date'),'sort_direction'=>strtolower((string)($input['sort_direction']??'desc'))];
        $errors=[]; if(mb_strlen($out['search'])>150)$errors['search']=['Search must not exceed 150 characters.'];
        foreach(['date_from','date_to'] as$key){if($out[$key]!==''&&!preg_match('/^\d{4}-\d{2}-\d{2}$/',$out[$key]))$errors[$key]=['Enter a valid date.'];}
        if($out['date_from']&&$out['date_to']&&$out['date_from']>$out['date_to'])$errors['date_to']=['End date must be on or after start date.'];
        if(!in_array($out['status'],['active','voided',''],true))$errors['status']=['Select a valid status.'];
        if($out['payment_method']!==''&&!in_array($out['payment_method'],self::METHODS,true))$errors['payment_method']=['Select a valid payment method.'];
        foreach(['min_amount','max_amount'] as$key){if($out[$key]!==''&&(!is_numeric($out[$key])||(float)$out[$key]<0))$errors[$key]=['Enter a valid amount.'];}
        if($out['min_amount']!==''&&$out['max_amount']!==''&&(float)$out['min_amount']>(float)$out['max_amount'])$errors['max_amount']=['Maximum must be at least the minimum.'];
        if(!in_array($out['sort_by'],['expense_date','created_at','amount','title','status'],true))$out['sort_by']='expense_date'; if(!in_array($out['sort_direction'],['asc','desc'],true))$out['sort_direction']='desc';
        if($errors)throw new HttpException('Some filters are invalid.',422,$errors); return $out;
    }
}

