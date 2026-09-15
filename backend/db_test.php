<?php
// DB Test File - Upload to /public_html/store/api/db_test.php
// Open: https://store.mhminimart.com/api/db_test.php
// ⚠️ DELETE THIS FILE AFTER TESTING

$configFile = __DIR__ . '/config/database.local.php';
$exampleFile = __DIR__ . '/config/database.example.php';

echo "<h2>MH Mini Mart - DB Diagnostic</h2>";

if (file_exists($configFile)) {
    echo "<p style='color:green'>✅ database.local.php EXISTS</p>";
    $config = require $configFile;
} elseif (file_exists($exampleFile)) {
    echo "<p style='color:orange'>⚠️ database.local.php NOT FOUND — using example config</p>";
    $config = require $exampleFile;
} else {
    echo "<p style='color:red'>❌ NO config file found at all!</p>";
    exit;
}

echo "<p>Host: <strong>" . htmlspecialchars((string)($config['host'] ?? '?')) . "</strong></p>";
echo "<p>Port: <strong>" . htmlspecialchars((string)($config['port'] ?? '?')) . "</strong></p>";
echo "<p>Database: <strong>" . htmlspecialchars((string)($config['database'] ?? '?')) . "</strong></p>";
echo "<p>Username: <strong>" . htmlspecialchars((string)($config['username'] ?? '?')) . "</strong></p>";
echo "<p>Password: <strong>" . (empty($config['password'] ?? '') ? '(empty)' : '(set)') . "</strong></p>";

try {
    $host = $config['host'] ?? '127.0.0.1';
    $port = $config['port'] ?? 3306;
    $db   = $config['database'] ?? '';
    $user = $config['username'] ?? '';
    $pass = $config['password'] ?? '';

    $dsn = "mysql:host={$host};port={$port};dbname={$db};charset=utf8mb4";
    $pdo = new PDO($dsn, $user, $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    echo "<p style='color:green;font-size:1.3em'>✅ <strong>DATABASE CONNECTED!</strong></p>";

    $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    echo "<p>Tables found: <strong>" . count($tables) . "</strong></p>";
    if (count($tables) === 0) {
        echo "<p style='color:orange'>⚠️ No tables — import schema.sql into phpMyAdmin</p>";
    } else {
        echo "<ul>";
        foreach (array_slice($tables, 0, 15) as $t) {
            echo "<li>" . htmlspecialchars($t) . "</li>";
        }
        echo "</ul>";
    }
} catch (PDOException $e) {
    echo "<p style='color:red;font-size:1.1em'>❌ <strong>FAILED:</strong> " . htmlspecialchars($e->getMessage()) . "</p>";
}
