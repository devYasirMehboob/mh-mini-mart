<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Http\HttpException;
use App\Http\JsonResponse;
use App\Http\Request;
use App\Repositories\ProductRepository;
use App\Repositories\SupplierProductRepository;
use App\Security\SessionManager;
use App\Services\ProductService;
use App\Services\PurchaseExportService;
use App\Services\PurchaseService;

final class PurchaseController
{
    public function __construct(
        private readonly Request $q,
        private readonly PurchaseService $s,
        private readonly PurchaseExportService $export,
        private readonly SessionManager $session,
        private readonly ?ProductRepository $productRepo = null,
        private readonly ?SupplierProductRepository $supplierProductRepo = null,
        private readonly ?ProductService $productService = null
    ) {
    }

    public function index(): never
    {
        JsonResponse::success('Purchases retrieved successfully.', $this->s->list($this->q->query()));
    }

    public function show(int $id): never
    {
        JsonResponse::success('Purchase retrieved successfully.', $this->s->detail($id));
    }

    public function store(array $u, bool $draft = false): never
    {
        $this->session->verifyCsrfToken();
        JsonResponse::success($draft ? 'Draft purchase saved successfully.' : 'Purchase completed successfully.', ['purchase' => $this->s->create($this->q->json(), (int)$u['id'], $draft)], 201);
    }

    public function update(int $id, array $u): never
    {
        $this->session->verifyCsrfToken();
        JsonResponse::success('Draft purchase updated successfully.', ['purchase' => $this->s->updateDraft($id, $this->q->json(), (int)$u['id'])]);
    }

    public function complete(int $id, array $u): never
    {
        $this->session->verifyCsrfToken();
        JsonResponse::success('Purchase completed and stock updated successfully.', ['purchase' => $this->s->completeDraft($id, $this->q->json(), (int)$u['id'])]);
    }

    public function payment(int $id, array $u): never
    {
        $this->session->verifyCsrfToken();
        JsonResponse::success('Supplier payment recorded successfully.', ['purchase' => $this->s->addPayment($id, $this->q->json(), (int)$u['id'])], 201);
    }

    public function payments(int $id): never
    {
        JsonResponse::success('Purchase payments retrieved successfully.', ['payments' => $this->s->detail($id)['payments']]);
    }

    public function cancel(int $id, array $u): never
    {
        $this->session->verifyCsrfToken();
        JsonResponse::success('Purchase cancelled and stock reversed successfully.', ['purchase' => $this->s->cancel($id, $this->q->json(), (int)$u['id'])]);
    }

    public function returnable(int $id): never
    {
        JsonResponse::success('Returnable purchase items retrieved successfully.', $this->s->returnable($id));
    }

    public function export(): never
    {
        $file = $this->export->create($this->s->export($this->q->query()));
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="' . $file['filename'] . '"');
        echo $file['content'];
        exit;
    }

    public function purchaseProducts(): never
    {
        if (!$this->productRepo) {
            throw new HttpException('Product repository not initialized.', 500);
        }
        $products = $this->productRepo->searchForPurchase($this->q->query());
        JsonResponse::success('Purchase products retrieved successfully.', ['products' => $products]);
    }

    public function barcodeLookup(string $barcode): never
    {
        if (!$this->productRepo) {
            throw new HttpException('Product repository not initialized.', 500);
        }
        $products = $this->productRepo->searchForPurchase([
            'barcode' => $barcode,
            'supplier_id' => $this->q->query()['supplier_id'] ?? null
        ]);
        if (empty($products)) {
            throw new HttpException('No active product found matching barcode: ' . $barcode, 404);
        }
        JsonResponse::success('Product found successfully.', ['product' => $products[0]]);
    }

    public function supplierSuggestions(int $supplierId): never
    {
        if (!$this->supplierProductRepo) {
            throw new HttpException('Supplier product repository not initialized.', 500);
        }
        $suggestions = $this->supplierProductRepo->getSuggestionsBySupplier($supplierId);
        JsonResponse::success('Supplier suggestions retrieved successfully.', ['suggestions' => $suggestions]);
    }

    public function quickAddProduct(array $user): never
    {
        $this->session->verifyCsrfToken();
        if (!$this->productService) {
            throw new HttpException('Product service not initialized.', 500);
        }
        $json = $this->q->json();
        $product = $this->productService->create($json, (int)$user['id']);

        if (!empty($json['supplier_id']) && $this->supplierProductRepo) {
            $this->supplierProductRepo->upsert(
                (int)$json['supplier_id'],
                (int)$product['id'],
                $json['supplier_item_code'] ?? null,
                $json['supplier_item_name'] ?? null,
                null,
                isset($json['purchase_cost']) ? (string)$json['purchase_cost'] : null,
                isset($json['default_purchase_unit_id']) ? (int)$json['default_purchase_unit_id'] : null,
                date('Y-m-d')
            );
        }

        JsonResponse::success('Product created successfully.', ['product' => $product], 201);
    }
}
