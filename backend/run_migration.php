<?php
// Script to run migration on live server.
declare(strict_types=1);
ini_set('display_errors', '1');
error_reporting(E_ALL);

try {
    $localConfig = __DIR__ . '/config/database.local.php';
    $configFile = is_file($localConfig) ? $localConfig : __DIR__ . '/config/database.example.php';
        
    if (!file_exists($configFile)) {
        die("Database configuration file not found!");
    }
    $config = require $configFile;
    
    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $config['host'], $config['port'], $config['database']);
    $pdo = new PDO($dsn, $config['username'], $config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_EMULATE_PREPARES => false
    ]);
    
    echo "<h3>Connected to Database successfully!</h3>";

    $migrationFile = __DIR__ . '/../database/migrations/013_batch_and_expiry_management.sql';
    if (!file_exists($migrationFile)) {
        die("Migration file not found: " . $migrationFile);
    }
    
    $sql = file_get_contents($migrationFile);
    $queries = array_filter(array_map('trim', explode(';', $sql)));
    
    echo "<ul>";
    foreach ($queries as $i => $query) {
        if (empty($query)) continue;
        try {
            $pdo->exec($query);
            echo "<li style='color:green;'>Query " . ($i + 1) . " ran successfully.</li>";
        } catch (PDOException $e) {
            // Check if it's just a "Duplicate column" or "Table exists" error
            $msg = $e->getMessage();
            if (str_contains($msg, 'Duplicate column') || str_contains($msg, 'already exists')) {
                echo "<li style='color:orange;'>Query " . ($i + 1) . " skipped (Already exists).</li>";
            } else {
                echo "<li style='color:red;'>Query " . ($i + 1) . " failed: " . htmlspecialchars($msg) . "</li>";
            }
        }
    }
    echo "</ul>";
    
    echo "<h3 style='color: green;'>Migration Process Finished!</h3>";
    echo "<p>Please check the list above. If tables were created successfully, your pages should work.</p>";
    
} catch (Exception $e) {
    echo "<h3 style='color: red;'>Error:</h3><pre>" . htmlspecialchars($e->getMessage()) . "</pre>";
}
