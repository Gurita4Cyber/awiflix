<?php
require_once __DIR__ . '/../api/db.php';
$pdo = getDB();
$stmt = $pdo->query("SELECT * FROM user_settings");
print_r($stmt->fetchAll());
