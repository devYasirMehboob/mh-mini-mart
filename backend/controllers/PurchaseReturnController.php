<?php
declare(strict_types=1);
namespace App\Controllers;
use App\Http\JsonResponse;use App\Http\Request;use App\Security\SessionManager;use App\Services\PurchaseReturnService;
final class PurchaseReturnController{
 public function __construct(private readonly Request$q,private readonly PurchaseReturnService$s,private readonly SessionManager$session){}
 public function index():never{JsonResponse::success('Purchase returns retrieved successfully.',$this->s->list($this->q->query()));}public function show(int$id):never{JsonResponse::success('Purchase return retrieved successfully.',$this->s->get($id));}public function store(array$u):never{$this->session->verifyCsrfToken();JsonResponse::success('Purchase return completed and stock updated successfully.',['return'=>$this->s->create($this->q->json(),(int)$u['id'])],201);}
}
