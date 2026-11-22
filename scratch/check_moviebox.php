<?php
require_once __DIR__ . '/../api/movie_scraper.php';
$mb = scrapeMovieCatalog('cs-moviebox-10', 'Moviebox', 200);
echo "Moviebox count: " . count($mb) . "\n";
$sections = [];
foreach ($mb as $m) {
    $s = $m['section'] ?? 'Uncategorized';
    $sections[$s] = ($sections[$s] ?? 0) + 1;
}
print_r($sections);

foreach ($mb as $i => $m) {
    echo "[$i] " . $m['title'] . " | " . $m['section'] . " | " . substr($m['poster'], 0, 50) . "...\n";
}
