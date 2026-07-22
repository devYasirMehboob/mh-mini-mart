<?php
declare(strict_types=1);
ini_set('display_errors', '1');
error_reporting(E_ALL);

try {
    $localConfig = __DIR__ . '/config/database.local.php';
    $configFile = is_file($localConfig) ? $localConfig : __DIR__ . '/config/database.example.php';
    
    $config = require $configFile;
    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $config['host'], $config['port'], $config['database']);
    $pdo = new PDO($dsn, $config['username'], $config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
    
    echo "Running migration 018...\n";
    $sql = file_get_contents(__DIR__ . '/../database/migrations/018_offline_emergency_mode.sql');
    $queries = array_filter(array_map('trim', explode(';', $sql)));
    
    foreach ($queries as $query) {
        if (empty($query)) continue;
        try {
            $pdo->exec($query);
            echo "Success: " . $query . "\n";
        } catch (PDOException $e) {
            $msg = $e->getMessage();
            if (str_contains($msg, 'Duplicate column') || str_contains($msg, 'already exists') || str_contains($msg, 'Duplicate key')) {
                echo "Skipped (already exists): " . $msg . "\n";
            } else {
                echo "Error: " . $msg . "\n";
            }
        }
    }
} catch (Exception $e) {
    echo "Fatal Error: " . $e->getMessage() . "\n";
}
