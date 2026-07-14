<?php
declare(strict_types=1);
namespace App\Controllers;
use App\Http\JsonResponse;use App\Http\Request;use App\Security\SessionManager;use App\Services\SupplierService;
final class SupplierController{
 public function __construct(private readonly Request$q,private readonly SupplierService$s,private readonly SessionManager$session){}
 public function index():never{JsonResponse::success('Suppliers retrieved successfully.',$this->s->list($this->q->query()));}public function options():never{JsonResponse::success('Supplier options retrieved successfully.',['suppliers'=>$this->s->options()]);}public function show(int$id):never{JsonResponse::success('Supplier retrieved successfully.',$this->s->get($id));}
 public function store(array$u):never{$this->session->verifyCsrfToken();JsonResponse::success('Supplier created successfully.',['supplier'=>$this->s->create($this->q->json(),(int)$u['id'])],201);}public function update(int$id,array$u):never{$this->session->verifyCsrfToken();JsonResponse::success('Supplier updated successfully.',['supplier'=>$this->s->update($id,$this->q->json(),(int)$u['id'])]);}public function status(int$id,array$u):never{$this->session->verifyCsrfToken();JsonResponse::success('Supplier status updated successfully.',['supplier'=>$this->s->status($id,$this->q->json(),(int)$u['id'])]);}public function destroy(int$id,array$u):never{$this->session->verifyCsrfToken();$this->s->delete($id,(int)$u['id']);JsonResponse::success('Supplier deleted successfully.');}
 public function purchases(int$id):never{JsonResponse::success('Supplier purchases retrieved successfully.',['purchases'=>$this->s->purchases($id)]);}public function payments(int$id):never{JsonResponse::success('Supplier payments retrieved successfully.',['payments'=>$this->s->payments($id)]);}public function statement(int$id):never{JsonResponse::success('Supplier statement retrieved successfully.',$this->s->statement($id,$this->q->query()));}
}
