<?php

declare(strict_types=1);

namespace App\Services;

use App\Repositories\SupplierRepository;
use App\Repositories\PurchaseRepository;
use PDO;

final class SupplierAlertService
{
    public function __construct(
        private readonly NotificationService $notifications,
        private readonly SupplierRepository $suppliers,
        private readonly PurchaseRepository $purchases,
        private readonly SystemConfigurationService $configuration
    ) {
    }

    public function evaluate(): void
    {
        $threshold = (float) $this->configuration->get('notifications', 'supplier_balance_threshold', 0);
        
        $suppliers = $this->suppliers->paginate([
            'search' => '',
            'status' => 'active',
            'page' => 1,
            'limit' => 1000
        ]);

        foreach ($suppliers['suppliers'] as $supplier) {
            $balance = (float) $supplier['current_balance'];
            
            if ($balance > $threshold) {
                $this->notifications->dispatch([
                    'notification_type' => 'supplier_balance_due',
                    'severity' => 'warning',
                    'title' => 'Supplier Balance Due',
                    'message' => "Outstanding balance for {$supplier['name']} is " . number_format($balance, 2) . ".",
                    'module' => 'Suppliers',
                    'related_type' => 'supplier',
                    'related_id' => $supplier['id'],
                    'action_url' => '/suppliers',
                    'source_key' => 'supplier-balance:supplier:' . $supplier['id']
                ], ['suppliers.view']);
            } else {
                $this->notifications->resolveBySourceKey('supplier-balance:supplier:' . $supplier['id']);
            }
        }
    }
}
