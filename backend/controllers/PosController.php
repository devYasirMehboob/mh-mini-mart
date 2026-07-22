<?php

declare(strict_types=1);
namespace App\Controllers;

use App\Http\HttpException;
use App\Http\JsonResponse;
use App\Http\Request;
use App\Services\PosService;

final class PosController
{
    public function __construct(
        private readonly Request $request,
        private readonly PosService $pos
    ) {}

    public function products(): void
    {
        JsonResponse::success('POS products retrieved successfully.', $this->pos->products($this->request->query()));
    }

    public function categories(): void
    {
        JsonResponse::success('POS categories retrieved successfully.', ['categories' => $this->pos->categories()]);
    }

    public function resolveBarcode(string $barcode): void
    {
        try {
            $result = $this->pos->resolveBarcode($barcode);
            JsonResponse::success('Barcode resolved successfully.', $result);
        } catch (HttpException $e) {
            JsonResponse::error($e->getMessage(), $e->getCode() ?: 404);
        } catch (\Exception $e) {
            JsonResponse::error('Unable to resolve barcode.', 500);
        }
    }
}

