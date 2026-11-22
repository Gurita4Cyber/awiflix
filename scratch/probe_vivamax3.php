<?php
function postJson($url, $body) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($body),
        CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        CURLOPT_HTTPHEADER => ['Accept: application/json', 'Content-Type: application/json', 'Referer: https://moviebox.ph/', 'Origin: https://moviebox.ph'],
    ]);
    $b = curl_exec($ch); curl_close($ch);
    return json_decode((string)$b, true) ?: [];
}

$tests = [
    'PH+Adult' => ['page' => 1, 'perPage' => 30, 'channelId' => 1, 'country' => 'Philippines', 'genre' => 'Adult', 'sort' => 'Hottest'],
    'PH+Erotic' => ['page' => 1, 'perPage' => 30, 'channelId' => 1, 'country' => 'Philippines', 'genre' => 'Erotic', 'sort' => 'Hottest'],
    'All+Erotic' => ['page' => 1, 'perPage' => 30, 'channelId' => 1, 'genre' => 'Erotic', 'sort' => 'Hottest'],
    'All+Adult+p1' => ['page' => 1, 'perPage' => 30, 'channelId' => 1, 'genre' => 'Adult', 'sort' => 'Hottest'],
    'All+Adult+Latest' => ['page' => 1, 'perPage' => 30, 'channelId' => 1, 'genre' => 'Adult', 'sort' => 'Latest'],
    'All+Hot' => ['page' => 1, 'perPage' => 30, 'channelId' => 1, 'genre' => 'Hot', 'sort' => 'Hottest'],
    'uploadBy=Vivamax' => ['page' => 1, 'perPage' => 30, 'channelId' => 1, 'uploadBy' => 'Deborah Nzolani'],
    'TV+Adult' => ['page' => 1, 'perPage' => 30, 'channelId' => 2, 'genre' => 'Adult', 'sort' => 'Hottest'],
];
foreach ($tests as $k => $body) {
    $d = postJson('https://moviebox.ph/wefeed-h5api-bff/subject/filter', $body);
    $items = $d['data']['items'] ?? [];
    $sample = array_map(fn($x) => ($x['title'] ?? '') . ' [' . ($x['releaseDate'] ?? '') . ', ' . ($x['countryName'] ?? '') . ']', array_slice($items, 0, 5));
    echo "[$k] cnt=" . count($items) . " hasMore=" . (($d['data']['pager']['hasMore'] ?? false) ? '1' : '0') . " => " . implode(' | ', $sample) . "\n";
}
