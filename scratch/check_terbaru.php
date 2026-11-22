<?php
require_once __DIR__ . '/../api/anime_scraper.php';
$html = curlScrape('https://v2.samehadaku.how/anime-terbaru/');
preg_match_all('#<li[^>]*itemtype="http://schema\.org/CreativeWork"[^>]*>(.*?)</li>#is', $html, $items);
echo "Count: " . count($items[1]) . "\n";
foreach (array_slice($items[1], 0, 5) as $i => $itemHtml) {
    preg_match('#<h2[^>]*class="entry-title"[^>]*>(.*?)</h2>#is', $itemHtml, $tm);
    preg_match('#<img[^>]*src="([^"]+)"#is', $itemHtml, $im);
    echo "[$i] " . strip_tags($tm[1] ?? '') . " | img: " . ($im[1] ?? 'NONE') . "\n";
}
