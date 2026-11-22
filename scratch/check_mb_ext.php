<?php
require_once __DIR__ . '/../api/db.php';
$pdo = getDB();
$stmt = $pdo->prepare('SELECT id, plugin_key, name, url, catalog_url, m3u_url, categories_json, inline_items_json, description FROM extensions WHERE plugin_key LIKE "%moviebox%"');
$stmt->execute();
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
