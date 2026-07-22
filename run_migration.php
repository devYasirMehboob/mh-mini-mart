<?php
$pdo = new PDO('mysql:host=localhost;dbname=mh_mini_mart;charset=utf8mb4', 'root', '');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// Clean up any partial migration artifacts
$pdo->exec("DELETE FROM products WHERE stock_mode = 'shared'");

$sql = file_get_contents(__DIR__ . '/database/migrations/017_shared_stock_variants.sql');

try {
    $pdo->exec($sql);
    echo "Migration completed successfully.\n";
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
