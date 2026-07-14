<?php

declare(strict_types=1);

use App\Config\Database;
use App\Repositories\AccessCredentialRepository;
use App\Services\AccessCredentialService;

require_once __DIR__ . '/../autoload.php';

$localConfig = __DIR__ . '/../config/database.local.php';
$configFile = is_file($localConfig)
    ? $localConfig
    : __DIR__ . '/../config/database.example.php';

$password = readline('New access password: ');
$confirmation = readline('Confirm access password: ');

if ($password !== $confirmation) {
    fwrite(STDERR, "The passwords do not match.\n");
    exit(1);
}

try {
    $service = new AccessCredentialService(
        new AccessCredentialRepository(new Database(require $configFile))
    );
    $service->setPassword($password);
    fwrite(STDOUT, "Access password saved securely.\n");
} catch (Throwable $exception) {
    fwrite(STDERR, $exception->getMessage() . "\n");
    exit(1);
}
