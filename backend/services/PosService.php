<?php

declare(strict_types=1);
namespace App\Services;
use App\Http\HttpException;
use App\Repositories\PosProductRepository;
use App\Repositories\StockContainerRepository;

final class PosService
{
    public function __construct(
        private readonly PosProductRepository $products,
        private readonly ?StockContainerRepository $containers = null
    ) {}

    public function products(array $query): array
    {
        $page     = max(1, (int)($query['page'] ?? 1));
        $limit    = min(100, max(1, (int)($query['limit'] ?? 60)));
        $category = ($query['category_id'] ?? '') === '' ? null : filter_var($query['category_id'], FILTER_VALIDATE_INT);
        if ($category === false || ($category !== null && $category < 1)) {
            throw new HttpException('Select a valid category.', 422);
        }
        $ids = [];
        $rawIds = trim((string)($query['ids'] ?? ''));
        if ($rawIds !== '') {
            foreach (explode(',', $rawIds) as $value) {
                $id = filter_var(trim($value), FILTER_VALIDATE_INT);
                if ($id === false || $id < 1) throw new HttpException('Select valid products.', 422);
                $ids[] = (int)$id;
            }
            $ids = array_values(array_unique(array_slice($ids, 0, 100)));
        }

        $barcode = trim((string)($query['barcode'] ?? ''));
        if ($barcode !== '') {
            if (mb_strlen($barcode) > 100) throw new HttpException('Barcode is too long.', 422);
            $product = $this->products->findByBarcode($barcode);
            if ($product === null) throw new HttpException('No product was found for this barcode.', 404);
            if ($product['status'] !== 'active') throw new HttpException($product['name'] . ' is inactive and cannot be sold.', 409);
            return ['products' => [$product], 'pagination' => ['page' => 1, 'limit' => 1, 'total' => 1, 'total_pages' => 1]];
        }

        return $this->products->paginate([
            'search'      => mb_substr(trim((string)($query['search'] ?? '')), 0, 150),
            'category_id' => $category === null ? null : (int)$category,
            'ids'         => $ids,
            'page'        => $page,
            'limit'       => $limit,
        ]);
    }

    public function categories(): array
    {
        return $this->products->activeCategories();
    }

    /**
     * Unified barcode resolution for POS scanner.
     * Returns normalized result regardless of whether it's a product, preset, or container.
     */
    public function resolveBarcode(string $barcode): array
    {
        $barcode = trim($barcode);
        if (empty($barcode)) {
            throw new HttpException('Barcode is required.', 422);
        }

        // 1. Try product barcode
        $product = $this->products->findByBarcode($barcode);
        if ($product !== null) {
            if ($product['status'] !== 'active') {
                throw new HttpException($product['name'] . ' is inactive.', 409);
            }
            return [
                'barcode_type'        => 'product',
                'product_id'          => (int)$product['id'],
                'product_name'        => $product['name'],
                'preset_id'           => null,
                'unit_id'             => $product['default_sale_unit_id'] ? (int)$product['default_sale_unit_id'] : null,
                'quantity_entered'    => '1.000',
                'quantity_base'       => number_format((float)($product['conversion_to_base'] ?? 1.0), 3, '.', ''),
                'selling_price'       => number_format((float)$product['selling_price'], 2, '.', ''),
                'sellable_stock_base' => number_format((float)$product['quantity'], 3, '.', ''),
                'unit_type'           => $product['unit_type'] ?? null,
                'image'               => $product['image'] ?? null,
                'stock_mode'          => $product['stock_mode'],
                'stock_source_id'     => $product['stock_source_id'] ? (int)$product['stock_source_id'] : null,
                'consumption_quantity'=> $product['consumption_quantity'] ? number_format((float)$product['consumption_quantity'], 3, '.', '') : null,
                'consumption_unit_id' => $product['consumption_unit_id'] ? (int)$product['consumption_unit_id'] : null,
                'consumption_quantity_base' => $product['consumption_quantity_base'] ? number_format((float)$product['consumption_quantity_base'], 3, '.', '') : null,
                'allow_custom_sale'   => (bool)($product['allow_custom_sale'] ?? false),
                'default_custom_sale_unit_id' => $product['default_custom_sale_unit_id'] ? (int)$product['default_custom_sale_unit_id'] : null,
            ];
        }



        // 3. Try container barcode
        if ($this->containers !== null) {
            $container = $this->containers->findByBarcode($barcode);
            if ($container !== null) {
                if ($container['product_status'] !== 'active') {
                    throw new HttpException($container['product_name'] . ' is inactive.', 409);
                }
                if (!in_array($container['status'], ['sealed', 'open'], true)) {
                    throw new HttpException(
                        'Container ' . $container['container_code'] . ' is ' . $container['status'] . ' and cannot be sold.',
                        409
                    );
                }
                return [
                    'barcode_type'        => 'container',
                    'product_id'          => (int)$container['product_id'],
                    'product_name'        => $container['product_name'],
                    'container_id'        => (int)$container['id'],
                    'container_code'      => $container['container_code'],
                    'container_status'    => $container['status'],
                    'preset_id'           => null,
                    'unit_id'             => $container['base_unit_id'] ? (int)$container['base_unit_id'] : null,
                    'quantity_entered'    => number_format((float)$container['remaining_quantity_base'], 3, '.', ''),
                    'quantity_base'       => number_format((float)$container['remaining_quantity_base'], 6, '.', ''),
                    'selling_price'       => number_format((float)$container['product_selling_price'] * (float)$container['remaining_quantity_base'], 2, '.', ''),
                    'sellable_stock_base' => number_format((float)$container['stock_quantity_base'], 3, '.', ''),
                ];
            }
        }

        throw new HttpException('No product, preset, or container was found for this barcode.', 404);
    }
}

