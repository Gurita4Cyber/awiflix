<?php
require_once __DIR__ . '/../api/movie_scraper.php';
@unlink(sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'cs_moviebox_live_v2.json');
$items = scrapeMovieCatalog('cs-moviebox-10', 'Moviebox');
$series = array_values(array_filter($items, fn($i) => $i['type'] === 'series' && !empty($i['detailUrl'])));
echo "items=" . count($items) . " series=" . count($series) . "\n";
foreach (array_slice($series, 0, 3) as $s) {
    $seasons = scrapeMovieboxEpisodes($s['detailUrl']);
    $info = array_map(fn($x) => "S{$x['seasonNumber']}=" . count($x['episodes']) . 'ep', $seasons);
    echo $s['title'] . ' => ' . implode(', ', $info) . ' | streams/ep=' . count($seasons[0]['episodes'][0]['streams'] ?? []) . "\n";
}
