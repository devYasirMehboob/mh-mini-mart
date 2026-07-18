<?php

declare(strict_types=1);

namespace App\Services;

use App\Repositories\ActivityLogRepository;

final class BackupAlertService
{
    public function __construct(
        private readonly NotificationService $notifications,
        private readonly ActivityLogRepository $activity,
        private readonly SystemConfigurationService $configuration
    ) {
    }

    public function evaluate(): void
    {
        $warningHours = (int) $this->configuration->get('notifications', 'missing_backup_warning_hours', 24);
        $criticalHours = (int) $this->configuration->get('notifications', 'missing_backup_critical_hours', 72);

        // Find the most recent successful backup
        $log = $this->activity->getLatestAction('backup.created');
        
        if ($log === null) {
            $this->notifications->dispatch([
                'notification_type' => 'backup_missing',
                'severity' => 'warning',
                'title' => 'No Backups Found',
                'message' => 'No successful system backups exist.',
                'module' => 'System',
                'source_key' => 'backup-missing',
                'action_url' => '/backups'
            ], ['backups.create']);
            return;
        }

        $lastBackupTime = strtotime($log['created_at']);
        $hoursSinceLastBackup = (time() - $lastBackupTime) / 3600;

        if ($hoursSinceLastBackup >= $criticalHours) {
            $this->notifications->dispatch([
                'notification_type' => 'backup_missing',
                'severity' => 'critical',
                'title' => 'Critical: Missing Recent Backup',
                'message' => 'The last successful backup was ' . round($hoursSinceLastBackup) . ' hours ago.',
                'module' => 'System',
                'source_key' => 'backup-missing',
                'action_url' => '/backups'
            ], ['backups.create']);
        } elseif ($hoursSinceLastBackup >= $warningHours) {
            $this->notifications->dispatch([
                'notification_type' => 'backup_missing',
                'severity' => 'warning',
                'title' => 'Warning: Missing Recent Backup',
                'message' => 'The last successful backup was ' . round($hoursSinceLastBackup) . ' hours ago.',
                'module' => 'System',
                'source_key' => 'backup-missing',
                'action_url' => '/backups'
            ], ['backups.create']);
        } else {
            $this->notifications->resolveBySourceKey('backup-missing');
        }
    }
}
