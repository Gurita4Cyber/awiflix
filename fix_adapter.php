<?php
require_once __DIR__ . '/api/db.php';
$pdo = getDB();
$pdo->exec("UPDATE extensions SET web_adapter = 'native_anime', is_installed = 1, is_enabled = 1 WHERE plugin_key IN ('cs-samehadakuprovider-15', 'cs-kuramanimeprovider-9')");
echo "DB Updated to native_anime\n";
