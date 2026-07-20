<?php
// Simple script to run a specific migration on the live server.
// Once run successfully, you should delete this file for security.

declare(strict_types=1);

// Enable basic error reporting for this script
ini_set('display_errors', '1');
error_reporting(E_ALL);

try {
    // Load local database configuration (falling back to example just like index.php)
    $localConfig = __DIR__ . '/config/database.local.php';
    $configFile = is_file($localConfig)
        ? $localConfig
        : __DIR__ . '/config/database.example.php';
        
    if (!file_exists($configFile)) {
        throw new Exception("Database configuration file not found!");
    }
    
    $config = require $configFile;
    
    // Connect to database
    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', 
        $config['host'], 
        $config['port'], 
        $config['database']
    );
    
    $pdo = new PDO($dsn, $config['username'], $config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_EMULATE_PREPARES => false
    ]);
    
    echo "<h3>Connected to Database successfully!</h3>";

    // Specify the migration file to run
    $migrationFile = __DIR__ . '/../database/migrations/013_batch_and_expiry_management.sql';
    
    if (!file_exists($migrationFile)) {
        throw new Exception("Migration file not found: " . $migrationFile);
    }
    
    $sql = file_get_contents($migrationFile);
    
    if (empty(trim($sql))) {
        throw new Exception("Migration file is empty!");
    }
    
    echo "<p>Running migration...</p>";
    
    // Split SQL by semicolon and execute (basic parsing to avoid syntax issues if exec() fails on multiple queries)
    $queries = array_filter(array_map('trim', explode(';', $sql)));
    foreach ($queries as $query) {
        if (!empty($query)) {
            $pdo->exec($query);
        }
    }
    
    echo "<h3 style='color: green;'>Migration executed successfully!</h3>";
    echo "<p>You can now use the Products and Batches pages. <b>Please delete this run_migration.php file now for security.</b></p>";
    
} catch (PDOException $e) {
    echo "<h3 style='color: red;'>Database Error:</h3>";
    echo "<pre>" . htmlspecialchars($e->getMessage()) . "</pre>";
} catch (Exception $e) {
    echo "<h3 style='color: red;'>Error:</h3>";
    echo "<pre>" . htmlspecialchars($e->getMessage()) . "</pre>";
}
