<?php
require_once __DIR__ . '/../api/movie_scraper.php';
$t = microtime(true);
$items = scrapeMovieCatalog('cs-moviebox-10', 'Moviebox');
echo "count=" . count($items) . " time=" . round(microtime(true) - $t, 1) . "s\n";
$sec = []; $imdb = 0; $trailer = 0;
foreach ($items as $i) {
    $sec[$i['section']] = ($sec[$i['section']] ?? 0) + 1;
    if (!empty($i['moviebox']['imdb'])) $imdb++;
    foreach ($i['streams'] as $s) if ($s['type'] === 'mp4') { $trailer++; break; }
}
print_r($sec);
echo "with imdb embed: $imdb | with trailer mp4: $trailer\n";
echo json_encode(array_slice(array_map(fn($i) => [$i['title'], $i['year'], $i['poster'], count($i['streams'])], $items), 0, 3), JSON_UNESCAPED_SLASHES) . "\n";
