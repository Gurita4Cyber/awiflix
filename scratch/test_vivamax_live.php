<?php
require_once __DIR__ . '/../api/movie_scraper.php';
@unlink(sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'cs_moviebox_live_v3.json');
$items = scrapeMovieCatalog('cs-moviebox-10', 'Moviebox', 750);
$vivamax = array_values(array_filter($items, fn($i) => ($i['section'] ?? '') === 'Vivamax 18+'));
$adult = array_values(array_filter($items, fn($i) => ($i['section'] ?? '') === 'Dewasa 18+ (NSFW)'));
$nsfwAll = array_values(array_filter($items, fn($i) => !empty($i['isNsfw'])));
echo "Total Moviebox: " . count($items) . "\n";
echo "Vivamax 18+: " . count($vivamax) . "\n";
echo "Dewasa 18+ (NSFW): " . count($adult) . "\n";
echo "Total NSFW flagged: " . count($nsfwAll) . "\n";
echo "Sample Vivamax:\n";
foreach (array_slice($vivamax, 0, 5) as $v) {
    echo "  - {$v['title']} ({$v['year']}) | isNsfw=" . ($v['isNsfw'] ? 'true' : 'false') . " | poster=" . substr($v['poster'], 0, 55) . "\n";
}
echo "Sample Dewasa 18+:\n";
foreach (array_slice($adult, 0, 5) as $a) {
    echo "  - {$a['title']} ({$a['year']}, {$a['type']}) | isNsfw=" . ($a['isNsfw'] ? 'true' : 'false') . "\n";
}
