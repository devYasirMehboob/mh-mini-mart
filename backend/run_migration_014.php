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
    
    echo "<h3>Migration Script (014)</h3>";
    
    $migrationFile = __DIR__ . '/../database/migrations/014_create_units_and_conversions.sql';
    if (!file_exists($migrationFile)) die("Migration file missing.");
    
    $sql = file_get_contents($migrationFile);
    $queries = array_filter(array_map('trim', explode(';', $sql)));
    
    echo "<ul>";
    foreach ($queries as $i => $query) {
        if (empty($query)) continue;
        try {
            $pdo->exec($query);
            echo "<li style='color:green;'>Query " . ($i + 1) . " ran successfully.</li>";
        } catch (PDOException $e) {
            $msg = $e->getMessage();
            if (str_contains($msg, 'Duplicate column') || str_contains($msg, 'already exists') || str_contains($msg, 'Duplicate key')) {
                echo "<li style='color:orange;'>Query " . ($i + 1) . " skipped (Already exists).</li>";
            } else {
                echo "<li style='color:red;'>Query " . ($i + 1) . " failed: " . htmlspecialchars($msg) . "</li>";
            }
        }
    }
    echo "</ul>";

} catch (Exception $e) {
    echo "Error: " . htmlspecialchars($e->getMessage());
}
