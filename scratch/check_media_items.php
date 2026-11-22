<?php
require_once __DIR__ . '/../api/db.php';
$pdo = getDB();
$stmt = $pdo->query('SELECT id, provider_id, title, poster_url FROM media_items');
$rows = $stmt->fetchAll();
echo "media_items count: " . count($rows) . "\n";
foreach ($rows as $r) {
    echo $r['id'] . " | " . $r['provider_id'] . " | " . $r['title'] . " | " . substr($r['poster_url'], 0, 50) . "\n";
}
