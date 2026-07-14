<?php

declare(strict_types=1);
namespace App\Controllers;
use App\Http\JsonResponse;
use App\Http\Request;
use App\Security\SessionManager;
use App\Services\SaleService;
use App\Services\SalesExportService;
final class SaleController
{
    public function __construct(private readonly Request $request,private readonly SaleService $sales,private readonly SalesExportService $exporter,private readonly SessionManager $session) {}
    public function store(array$user): never {$this->session->verifyCsrfToken();$result=$this->sales->complete((int)$user['id'],$this->request->json(),in_array('sales.view_all',$user['permissions']??[],true));JsonResponse::success($result['already_completed']?'This sale was already completed.':'Sale completed successfully.',$result,$result['already_completed']?200:201);}
    public function index(array$user): never {JsonResponse::success('Sales retrieved successfully.',$this->sales->listing($user,$this->request->query()));}
    public function summary(array$user): never {JsonResponse::success('Sales summary retrieved successfully.',$this->sales->summary($user,$this->request->query()));}
    public function show(array$user,int$id): never {JsonResponse::success('Sale details retrieved successfully.',$this->sales->detail($user,$id));}
    public function receipt(array$user,int$id): never {JsonResponse::success('Receipt retrieved successfully.',$this->sales->receipt($user,$id));}
    public function cancel(array$user,int$id): never {$this->session->verifyCsrfToken();JsonResponse::success('Sale cancelled successfully.',$this->sales->cancel($user,$id,$this->request->json()));}
    public function refund(array$user,int$id): never {$this->session->verifyCsrfToken();JsonResponse::success('Sale refunded successfully.',$this->sales->refund($user,$id,$this->request->json()));}
    public function export(array$user): never {$file=$this->sales->export($user,$this->request->query(),$this->exporter);header('Content-Type: text/csv; charset=utf-8');header('Content-Disposition: attachment; filename="'.$file['filename'].'"');header('X-Content-Type-Options: nosniff');echo$file['content'];exit;}
}
