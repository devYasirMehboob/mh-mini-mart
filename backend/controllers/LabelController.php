<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Http\JsonResponse;
use App\Http\Request;
use App\Services\ProductService;
use App\Repositories\ProductRepository;
use App\Repositories\PurchaseRepository;
use App\Services\BarcodeService;

final class LabelController
{
    public function __construct(
        private readonly Request $request,
        private readonly ProductRepository $products,
        private readonly PurchaseRepository $purchases,
        private readonly ProductService $productService,
        private readonly BarcodeService $barcodes
    ) {
    }

    public function products(): never
    {
        $query = $this->request->query();
        $query['limit'] = 20; // Slightly smaller limit for the labels selection UI
        $result = $this->productService->list($query, false);
        JsonResponse::success('Products retrieved for labels.', $result);
    }

    public function generatePrintData(array $user): never
    {
        $input = $this->request->json();
        $items = $input['items'] ?? [];
        
        if (!is_array($items) || count($items) === 0) {
            \App\Http\HttpException::throw('No products provided for label printing.', 422);
        }

        $ids = array_column($items, 'product_id');
        $products = $this->products->findManyForUpdate($ids); // Get current product details
        
        $labels = [];
        $printIds = [];

        foreach ($items as $item) {
            $id = (int) ($item['product_id'] ?? 0);
            $qty = (int) ($item['quantity'] ?? 0);
            
            if ($qty > 0 && isset($products[$id])) {
                $product = $products[$id];
                $printIds[] = $id;
                
                // Only include products that have a barcode, or we generate SVG if they do
                if ($product['barcode']) {
                    $svg = $this->barcodes->generateSvg($product['barcode'], $product['barcode_type'] ?: 'C128');
                    for ($i = 0; $i < $qty; $i++) {
                        $labels[] = [
                            'product_name' => $product['name'],
                            'product_code' => $product['product_code'],
                            'barcode' => $product['barcode'],
                            'price' => $product['selling_price'],
                            'svg' => $svg
                        ];
                    }
                }
            }
        }
        
        if (count($printIds) > 0) {
            $this->productService->recordBarcodePrint(array_unique($printIds), (int) $user['id']);
        }

        JsonResponse::success('Print data generated.', ['labels' => $labels]);
    }
}
