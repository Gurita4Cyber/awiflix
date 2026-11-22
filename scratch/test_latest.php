<?php
require_once __DIR__ . '/../api/anime_scraper.php';
$items = scrapeSamehadakuCatalog('cs-samehadakuprovider-15', 60);
echo "Total items: " . count($items) . "\n";
foreach ($items as $idx => $it) {
    echo "[$idx] " . $it['title'] . " | " . substr($it['poster'], 0, 60) . " | " . $it['section'] . "\n";
}
