<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Http\HttpException;
use App\Http\JsonResponse;
use App\Http\Request;
use App\Services\StockContainerService;
use App\Services\BarcodeService;

class StockContainerController
{
    public function __construct(
        private readonly Request $request,
        private readonly StockContainerService $service,
        private readonly BarcodeService $barcodeService
    ) {}

    public function indexByProduct(int $productId): void
    {
        try {
            $containers = $this->service->getByProduct($productId);
            $summary    = $this->service->getSummary($productId);
            JsonResponse::success('Containers retrieved.', [
                'containers' => $containers,
                'summary'    => $summary,
            ]);
        } catch (\Exception $e) {
            JsonResponse::error('Unable to retrieve containers.', 500);
        }
    }

    public function show(int $containerId): void
    {
        try {
            $container = $this->service->findById($containerId);
            if (!$container) {
                JsonResponse::error('Container not found.', 404);
                return;
            }
            JsonResponse::success('Container retrieved.', ['container' => $container]);
        } catch (\Exception $e) {
            JsonResponse::error('Unable to retrieve container.', 500);
        }
    }

    public function regenerateBarcode(int $containerId, array $authenticatedUser): void
    {
        try {
            $container = $this->service->regenerateBarcode($containerId, (int)$authenticatedUser['id']);
            JsonResponse::success('Container barcode regenerated.', ['container' => $container]);
        } catch (HttpException $e) {
            JsonResponse::error($e->getMessage(), $e->getCode() ?: 404);
        } catch (\Exception $e) {
            JsonResponse::error('Unable to regenerate container barcode.', 500);
        }
    }

    public function updateBarcode(int $containerId, array $authenticatedUser): void
    {
        try {
            $data = $this->request->json();
            $barcode = trim($data['barcode'] ?? '');
            if (empty($barcode)) {
                JsonResponse::error('Barcode is required.', 422);
                return;
            }
            $container = $this->service->updateBarcode($containerId, $barcode, (int)$authenticatedUser['id']);
            JsonResponse::success('Container barcode updated.', ['container' => $container]);
        } catch (HttpException $e) {
            JsonResponse::error($e->getMessage(), $e->getCode() ?: 422);
        } catch (\Exception $e) {
            JsonResponse::error('Unable to update container barcode.', 500);
        }
    }

    public function previewBarcode(int $containerId): void
    {
        try {
            $container = $this->service->findById($containerId);
            if (!$container) {
                JsonResponse::error('Container not found.', 404);
                return;
            }
            $svg = $this->barcodeService->generateSvg($container['barcode'], 'C128');
            JsonResponse::success('Barcode preview.', [
                'barcode' => $container['barcode'],
                'barcode_source' => $container['barcode_source'],
                'svg' => $svg,
            ]);
        } catch (\Exception $e) {
            JsonResponse::error('Unable to generate barcode preview.', 500);
        }
    }
}
