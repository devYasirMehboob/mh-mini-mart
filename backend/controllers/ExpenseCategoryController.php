<?php

declare(strict_types=1);
namespace App\Controllers;
use App\Http\JsonResponse;use App\Http\Request;use App\Security\SessionManager;use App\Services\ExpenseCategoryService;
final class ExpenseCategoryController
{
 public function __construct(private readonly Request $request,private readonly ExpenseCategoryService $service,private readonly SessionManager $session){}
 public function index(): never{JsonResponse::success('Expense categories retrieved successfully.',['categories'=>$this->service->list((string)($this->request->query()['search']??''))]);}
 public function store(): never{$this->session->verifyCsrfToken();JsonResponse::success('Expense category created successfully.',['category'=>$this->service->create($this->request->json())],201);}
 public function show(int $id): never{JsonResponse::success('Expense category retrieved successfully.',['category'=>$this->service->get($id)]);}
 public function update(int $id): never{$this->session->verifyCsrfToken();JsonResponse::success('Expense category updated successfully.',['category'=>$this->service->update($id,$this->request->json())]);}
 public function status(int $id): never{$this->session->verifyCsrfToken();JsonResponse::success('Expense category status updated successfully.',['category'=>$this->service->status($id,$this->request->json())]);}
 public function destroy(int $id): never{$this->session->verifyCsrfToken();$this->service->delete($id);JsonResponse::success('Expense category deleted successfully.');}
}
