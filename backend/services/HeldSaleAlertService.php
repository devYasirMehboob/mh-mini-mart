<?php

declare(strict_types=1);

namespace App\Services;

use App\Repositories\HeldSaleRepository;
use PDO;

final class HeldSaleAlertService
{
    public function __construct(
        private readonly NotificationService $notifications,
        private readonly HeldSaleRepository $heldSales,
        private readonly SystemConfigurationService $configuration
    ) {
    }

    public function evaluate(): void
    {
        $warningHours = (int) $this->configuration->get('notifications', 'held_sale_warning_hours', 24);
        
        $sales = $this->heldSales->list(null);
        
        foreach ($sales as $sale) {
            $heldTime = strtotime($sale['created_at']);
            $hoursSinceHeld = (time() - $heldTime) / 3600;

            if ($hoursSinceHeld >= $warningHours) {
                $this->notifications->dispatch([
                    'notification_type' => 'held_sale_pending',
                    'severity' => 'warning',
                    'title' => 'Pending Held Sale',
                    'message' => "A sale held by {$sale['held_by_name']} has been pending for " . round($hoursSinceHeld) . " hours.",
                    'module' => 'POS',
                    'related_type' => 'held_sale',
                    'related_id' => $sale['id'],
                    'action_url' => '/pos',
                    'source_key' => 'held-sale:' . $sale['id']
                ], ['pos.access']);
            }
        }
    }
}
