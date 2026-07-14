<?php

declare(strict_types=1);
namespace App\Controllers;
use App\Http\JsonResponse;
use App\Http\Request;
use App\Services\ReportExportService;
use App\Services\ReportService;
final class ReportController
{
    public function __construct(private readonly Request $request,private readonly ReportService $reports,private readonly ReportExportService $exports){}
    public function show(string $type,array $user): never{JsonResponse::success('Report retrieved successfully.',$this->reports->report($type,$this->request->query(),$user));}
    public function options(array $user): never{JsonResponse::success('Report filters retrieved successfully.',$this->reports->options($user));}
    public function export(array $user): never{$query=$this->request->query();$file=$this->exports->create((string)($query['report_type']??''),$query,$user);header('Content-Type: text/csv; charset=utf-8');header('Content-Disposition: attachment; filename="'.$file['filename'].'"');header('X-Content-Type-Options: nosniff');echo$file['content'];exit;}
}
