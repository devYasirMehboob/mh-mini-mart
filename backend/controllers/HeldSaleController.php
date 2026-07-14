<?php

declare(strict_types=1);
namespace App\Controllers;
use App\Http\JsonResponse;use App\Http\Request;use App\Security\SessionManager;use App\Services\HeldSaleService;
final class HeldSaleController
{
    public function __construct(private readonly Request$request,private readonly HeldSaleService$held,private readonly SessionManager$session){}
    public function index(array$user):never{JsonResponse::success('Held sales retrieved successfully.',$this->held->list($user));}
    public function show(array$user,int$id):never{JsonResponse::success('Held sale retrieved successfully.',$this->held->get($user,$id));}
    public function store(array$user):never{$this->session->verifyCsrfToken();JsonResponse::success('Sale held successfully.',$this->held->create($user,$this->request->json()),201);}
    public function update(array$user,int$id):never{$this->session->verifyCsrfToken();JsonResponse::success('Held sale updated successfully.',$this->held->update($user,$id,$this->request->json()));}
    public function destroy(array$user,int$id):never{$this->session->verifyCsrfToken();$this->held->delete($user,$id);JsonResponse::success('Held sale removed successfully.');}
}
