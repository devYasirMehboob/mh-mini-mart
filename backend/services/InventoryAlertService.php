<?php

declare(strict_types=1);

namespace App\Services;

use App\Repositories\ProductRepository;

final class InventoryAlertService
{
    public function __construct(
        private readonly NotificationService $notifications,
        private readonly ProductRepository $products,
        private readonly SystemConfigurationService $configuration
    ) {
    }

    public function evaluate(): void
    {
        $lowStockEnabled = (bool) $this->configuration->get('notifications', 'low_stock_alerts_enabled', true);
        $outOfStockEnabled = (bool) $this->configuration->get('notifications', 'out_of_stock_alerts_enabled', true);

        if (!$lowStockEnabled && !$outOfStockEnabled) {
            return;
        }

        $allProducts = $this->products->paginate([
            'search' => '',
            'category_id' => null,
            'status' => '',
            'page' => 1,
            'limit' => 10000
        ]);

        foreach ($allProducts['products'] as $product) {
            if ((int) $product['track_stock'] === 0 || $product['status'] === 'inactive') {
                $this->notifications->resolveBySourceKey('low-stock:product:' . $product['id']);
                $this->notifications->resolveBySourceKey('out-of-stock:product:' . $product['id']);
                continue;
            }

            $qty = (float) $product['quantity'];
            $minStock = (float) $this->configuration->get('inventory', 'default_minimum_stock', 5);

            if ($qty <= 0 && $outOfStockEnabled) {
                $this->notifications->dispatch([
                    'notification_type' => 'inventory_out_of_stock',
                    'severity' => 'critical',
                    'title' => 'Out of Stock: ' . $product['name'],
                    'message' => "The product {$product['name']} is currently out of stock.",
                    'module' => 'Inventory',
                    'related_type' => 'product',
                    'related_id' => $product['id'],
                    'action_url' => '/products',
                    'source_key' => 'out-of-stock:product:' . $product['id']
                ], ['inventory.view']);
                $this->notifications->resolveBySourceKey('low-stock:product:' . $product['id']);
            } elseif ($qty <= $minStock && $lowStockEnabled) {
                $this->notifications->dispatch([
                    'notification_type' => 'inventory_low_stock',
                    'severity' => 'warning',
                    'title' => 'Low Stock: ' . $product['name'],
                    'message' => "The product {$product['name']} is low on stock ({$qty} remaining).",
                    'module' => 'Inventory',
                    'related_type' => 'product',
                    'related_id' => $product['id'],
                    'action_url' => '/products',
                    'source_key' => 'low-stock:product:' . $product['id']
                ], ['inventory.view']);
                $this->notifications->resolveBySourceKey('out-of-stock:product:' . $product['id']);
            } else {
                $this->notifications->resolveBySourceKey('low-stock:product:' . $product['id']);
                $this->notifications->resolveBySourceKey('out-of-stock:product:' . $product['id']);
            }
        }
    }
}
