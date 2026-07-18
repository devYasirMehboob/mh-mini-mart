<?php

declare(strict_types=1);

if (php_sapi_name() !== 'cli') {
    die('This script can only be run from the command line.');
}

require_once __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/../autoload.php';

use App\Config\Database;
use App\Repositories\ActivityLogRepository;
use App\Repositories\SettingsRepository;
use App\Validators\SettingsValidator;
use App\Services\SystemConfigurationService;
use App\Repositories\NotificationRepository;
use App\Repositories\NotificationPreferenceRepository;
use App\Repositories\UserRepository;
use App\Repositories\ProductRepository;
use App\Repositories\SupplierRepository;
use App\Repositories\PurchaseRepository;
use App\Repositories\HeldSaleRepository;
use App\Services\NotificationService;
use App\Services\InventoryAlertService;
use App\Services\SupplierAlertService;
use App\Services\BackupAlertService;
use App\Services\HeldSaleAlertService;
use App\Services\AlertEvaluationService;

$localConfig = __DIR__ . '/../config/database.local.php';
$configFile = is_file($localConfig)
    ? $localConfig
    : __DIR__ . '/../config/database.example.php';

try {
    $database = new Database(require $configFile);
    
    $activityRepository = new ActivityLogRepository($database);
    $settingsRepository = new SettingsRepository($database);
    $settingsValidator = new SettingsValidator();
    
    $configuration = new SystemConfigurationService($settingsRepository, $settingsValidator);
    $configuration->applyTimezone();

    $notificationRepository = new NotificationRepository($database);
    $notificationPreferenceRepository = new NotificationPreferenceRepository($database);
    $userRepository = new UserRepository($database);
    
    $notificationService = new NotificationService($notificationRepository, $notificationPreferenceRepository, $userRepository, $configuration);
    
    $inventoryAlertService = new InventoryAlertService($notificationService, new ProductRepository($database), $configuration);
    $supplierAlertService = new SupplierAlertService($notificationService, new SupplierRepository($database), new PurchaseRepository($database), $configuration);
    $backupAlertService = new BackupAlertService($notificationService, $activityRepository, $configuration);
    $heldSaleAlertService = new HeldSaleAlertService($notificationService, new HeldSaleRepository($database), $configuration);
    
    $alertEvaluationService = new AlertEvaluationService(
        $notificationService,
        $inventoryAlertService,
        $supplierAlertService,
        $backupAlertService,
        $heldSaleAlertService
    );
    
    echo "[" . date('Y-m-d H:i:s') . "] Starting alert evaluation...\n";
    $alertEvaluationService->evaluateAll();
    echo "[" . date('Y-m-d H:i:s') . "] Alert evaluation completed successfully.\n";
    
} catch (\Throwable $e) {
    echo "[" . date('Y-m-d H:i:s') . "] Error during alert evaluation:\n";
    echo $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
    exit(1);
}
