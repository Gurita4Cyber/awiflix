<?php
require_once __DIR__ . '/../api/anime_scraper.php';
$items = scrapeSamehadakuCatalog('cs-samehadakuprovider-15', 60);
$blackClover = null;
foreach ($items as $it) {
    if (str_contains($it['title'], 'Black Clover')) {
        $blackClover = $it;
        break;
    }
}

echo "Found Black Clover: " . $blackClover['title'] . "\n";
echo "Poster: " . $blackClover['poster'] . "\n\n";

$recs = array_filter($items, function($it) use ($blackClover) {
    return $it['id'] !== $blackClover['id'];
});
$recs = array_slice($recs, 0, 5);
foreach ($recs as $r) {
    echo "Rec: " . $r['title'] . " | Poster: " . $r['poster'] . "\n";
}
