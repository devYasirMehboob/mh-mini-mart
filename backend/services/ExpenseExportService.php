<?php

declare(strict_types=1);
namespace App\Services;
use App\Repositories\ExpenseRepository;
final class ExpenseExportService
{
 public function __construct(private readonly ExpenseRepository $repo){}
 public function create(array $filters): array{$stream=fopen('php://temp','w+');if(!$stream)throw new \RuntimeException('Unable to create expense export.');fputcsv($stream,['Date','Title','Category','Amount','Payment method','Reference','Status','Added by','Description']);foreach($this->repo->exportRows($filters)as$r)fputcsv($stream,array_map([$this,'cell'],[$r['expense_date'],$r['title'],$r['category_name'],$r['amount'],$r['payment_method'],$r['reference_number']??'',$r['status'],$r['added_by_role'],$r['description']??'']));rewind($stream);$content=stream_get_contents($stream);fclose($stream);if($content===false)throw new \RuntimeException('Unable to create expense export.');return['filename'=>'mh-mini-mart-expenses-'.date('Y-m-d-His').'.csv','content'=>$content];}
 private function cell(mixed $v): string{$s=(string)$v;return preg_match('/^[=+\-@]/',$s)?"'".$s:$s;}
}
