<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Http\JsonResponse;
use App\Http\Request;
use App\Services\ProductService;
use App\Services\BarcodeService;

final class BarcodeController
{
    public function __construct(
        private readonly Request $request,
        private readonly ProductService $products,
        private readonly BarcodeService $barcodes
    ) {
    }

    public function generate(int $id): never
    {
        $product = $this->products->generateBarcode($id, $this->request->userId());
        JsonResponse::success('Barcode generated successfully.', ['product' => $product], 201);
    }

    public function update(int $id): never
    {
        $input = $this->request->json();
        $barcode = (string) ($input['barcode'] ?? '');
        $product = $this->products->setBarcode($id, $barcode, $this->request->userId());
        
        $message = $barcode === '' ? 'Barcode removed successfully.' : 'Barcode updated successfully.';
        JsonResponse::success($message, ['product' => $product]);
    }

    public function image(string $barcode): never
    {
        // Simple fast endpoint to return an SVG directly, 
        // useful for rendering in `<img src="/api/barcode/image/MH0001">`
        $type = (string) ($this->request->query()['type'] ?? 'C128');
        $svg = $this->barcodes->generateSvg($barcode, $type);
        
        header('Content-Type: image/svg+xml');
        header('Cache-Control: public, max-age=86400');
        echo $svg;
        exit;
    }
}
