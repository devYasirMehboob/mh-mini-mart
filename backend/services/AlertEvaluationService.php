<?php

declare(strict_types=1);

namespace App\Services;

final class AlertEvaluationService
{
    public function __construct(
        private readonly NotificationService $notifications,
        private readonly InventoryAlertService $inventoryAlerts,
        private readonly SupplierAlertService $supplierAlerts,
        private readonly BackupAlertService $backupAlerts,
        private readonly HeldSaleAlertService $heldSaleAlerts
    ) {
    }

    public function evaluateAll(): void
    {
        // Resolve expired announcements/notifications
        $this->notifications->resolveExpired();
        
        $this->inventoryAlerts->evaluate();
        $this->supplierAlerts->evaluate();
        $this->backupAlerts->evaluate();
        $this->heldSaleAlerts->evaluate();
    }
}
