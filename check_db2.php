<?php
$pdo = new PDO('mysql:host=localhost;dbname=mh_mini_mart;charset=utf8mb4', 'root', '');
$pdo->exec('UPDATE products SET track_batches = 0 WHERE id IN (2, 3)');
echo "Updated track_batches to 0 for products 2 and 3.\n";
