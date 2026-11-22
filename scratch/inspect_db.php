<?php
require_once __DIR__ . '/../api/db.php';
$pdo = getDB();
$stmt = $pdo->query('SELECT id, user_id, repo_key, plugin_key, name, version, language, is_installed, is_enabled, web_adapter FROM extensions WHERE is_enabled = 1');
echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
