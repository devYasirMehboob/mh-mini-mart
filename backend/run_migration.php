<?php
// Simple script to run a specific migration on the live server.
// Once run successfully, you should delete this file for security.

declare(strict_types=1);

// Enable basic error reporting for this script
ini_set('display_errors', '1');
error_reporting(E_ALL);

try {
    // Load local database configuration
    $configFile = __DIR__ . '/config/database.local.php';
    if (!file_exists($configFile)) {
        throw new Exception("Configuration file not found: " . $configFile);
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
    
    // Execute the raw SQL
    $pdo->exec($sql);
    
    echo "<h3 style='color: green;'>Migration executed successfully!</h3>";
    echo "<p>You can now use the Products and Batches pages. <b>Please delete this run_migration.php file now for security.</b></p>";
    
} catch (PDOException $e) {
    echo "<h3 style='color: red;'>Database Error:</h3>";
    echo "<pre>" . htmlspecialchars($e->getMessage()) . "</pre>";
} catch (Exception $e) {
    echo "<h3 style='color: red;'>Error:</h3>";
    echo "<pre>" . htmlspecialchars($e->getMessage()) . "</pre>";
}
