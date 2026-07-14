<?php

declare(strict_types=1);
namespace App\Controllers;
use App\Http\JsonResponse;use App\Http\Request;use App\Services\PosService;
final class PosController
{
    public function __construct(private readonly Request$request,private readonly PosService$pos){}
    public function products():never{JsonResponse::success('POS products retrieved successfully.',$this->pos->products($this->request->query()));}
    public function categories():never{JsonResponse::success('POS categories retrieved successfully.',['categories'=>$this->pos->categories()]);}
}
