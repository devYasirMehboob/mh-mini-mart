<?php

declare(strict_types=1);

require_once __DIR__ . '/autoload.php';

use App\Config\Database;
use App\Services\Logger;

$logger = new Logger();
$configFile = is_file(__DIR__ . '/config/database.local.php')
    ? __DIR__ . '/config/database.local.php'
    : __DIR__ . '/config/database.example.php';

$database = new Database(require $configFile, $logger);
$pdo = $database->connection();

$sql = file_get_contents(__DIR__ . '/../database/migrations/019_customers_khata.sql');
if ($sql === false) {
    echo "ERROR: Could not read migration file.\n";
    exit(1);
}

// Split on semicolons, skip empty statements
$statements = array_filter(
    array_map('trim', explode(';', $sql)),
    fn(string $s) => $s !== '' && !str_starts_with(ltrim($s), '--')
);

$pdo->beginTransaction();
try {
    foreach ($statements as $statement) {
        if (trim($statement) === '') continue;
        $pdo->exec($statement);
    }
    $pdo->commit();
    echo "Migration 019 applied successfully.\n";
} catch (Throwable $e) {
    $pdo->rollBack();
    echo "FAILED: " . $e->getMessage() . "\n";
    exit(1);
}
