<?php
require_once __DIR__ . '/../api/movie_scraper.php';
require_once __DIR__ . '/../api/anime_scraper.php';

$idlix = scrapeMovieCatalog('cs-idlix-3', 'Idlix');
$moviebox = scrapeMovieCatalog('cs-moviebox-10', 'Moviebox');
$anime = scrapeAnimeCatalog('cs-samehadakuprovider-15');

echo "Idlix count: " . count($idlix) . "\n";
echo "Moviebox count: " . count($moviebox) . "\n";
echo "Samehadaku count: " . count($anime) . "\n";

$vivamaxCount = 0;
foreach ($moviebox as $m) {
    if ($m['section'] === 'Vivamax Premiere (2026)') $vivamaxCount++;
}
echo "Vivamax 2026 in Moviebox: " . $vivamaxCount . " titles\n";
