<?php

declare(strict_types=1);
namespace App\Controllers;
use App\Http\JsonResponse;use App\Http\Request;use App\Security\SessionManager;use App\Services\ExpenseExportService;use App\Services\ExpenseService;
final class ExpenseController
{
 public function __construct(private readonly Request $request,private readonly ExpenseService $service,private readonly ExpenseExportService $exporter,private readonly SessionManager $session){}
 public function index(): never{JsonResponse::success('Expenses retrieved successfully.',$this->service->list($this->request->query()));}
 public function summary(): never{JsonResponse::success('Expense summary retrieved successfully.',$this->service->summary($this->request->query()));}
 public function show(int $id): never{JsonResponse::success('Expense retrieved successfully.',['expense'=>$this->service->get($id)]);}
 public function store(array $user): never{$this->session->verifyCsrfToken();JsonResponse::success('Expense added successfully.',['expense'=>$this->service->create($this->request->data(),$this->request->file('receipt'),(int)$user['id'])],201);}
 public function update(int $id): never{$this->session->verifyCsrfToken();JsonResponse::success('Expense updated successfully.',['expense'=>$this->service->update($id,$this->request->data(),$this->request->file('receipt'))]);}
 public function void(int $id,array $user): never{$this->session->verifyCsrfToken();JsonResponse::success('Expense voided successfully.',['expense'=>$this->service->void($id,(int)$user['id'])]);}
 public function export(): never{$file=$this->exporter->create($this->service->exportFilters($this->request->query()));header('Content-Type: text/csv; charset=utf-8');header('Content-Disposition: attachment; filename="'.$file['filename'].'"');echo$file['content'];exit;}
}
