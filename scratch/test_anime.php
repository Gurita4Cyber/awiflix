<?php
require_once __DIR__ . '/../api/anime_scraper.php';
$items = scrapeAnimeCatalog('cs-samehadakuprovider-15', 5);
echo json_encode(array_slice($items, 0, 3), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
