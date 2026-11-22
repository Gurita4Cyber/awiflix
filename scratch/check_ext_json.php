<?php
require_once __DIR__ . '/../api/db.php';
$pdo = getDB();
$stmt = $pdo->query('SELECT id, plugin_key, name, inline_items_json, adapter_config_json FROM extensions WHERE is_installed = 1');
foreach ($stmt->fetchAll() as $r) {
    echo "ID: {$r['id']} | Key: {$r['plugin_key']} | Name: {$r['name']}\n";
    if (!empty($r['inline_items_json'])) {
        echo "  inline_items length: " . strlen($r['inline_items_json']) . "\n";
        $items = json_decode($r['inline_items_json'], true);
        if (is_array($items)) {
            foreach (array_slice($items, 0, 3) as $it) {
                echo "    - " . ($it['title'] ?? 'no title') . " | poster: " . substr($it['poster'] ?? ($it['posterUrl'] ?? ''), 0, 50) . "\n";
            }
        }
    }
}
