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
    $b = curl_exec($ch); $s = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
    return [$s, (string)$b];
}

// Check what fields Vivamax uses in subject/filter
$tests = [
    'channelId=1,country=Philippines,genre=Romance' => ['page' => 1, 'perPage' => 20, 'channelId' => 1, 'country' => 'Philippines', 'genre' => 'Romance', 'sort' => 'ForYou'],
    'channelId=1,country=Philippines,classify=Vivamax' => ['page' => 1, 'perPage' => 20, 'channelId' => 1, 'country' => 'Philippines'],
    'channelId=1,platform=Vivamax' => ['page' => 1, 'perPage' => 20, 'channelId' => 1, 'platform' => 'Vivamax'],
    'channelId=1,tag=Vivamax' => ['page' => 1, 'perPage' => 20, 'channelId' => 1, 'tag' => 'Vivamax'],
    'channelId=1,genre=Adult' => ['page' => 1, 'perPage' => 20, 'channelId' => 1, 'genre' => 'Adult'],
    'channelId=1,genre=Erotic' => ['page' => 1, 'perPage' => 20, 'channelId' => 1, 'genre' => 'Erotic'],
    'channelId=1,genre=18+' => ['page' => 1, 'perPage' => 20, 'channelId' => 1, 'genre' => '18+'],
    'channelId=1,channel=Vivamax' => ['page' => 1, 'perPage' => 20, 'channelId' => 1, 'channel' => 'Vivamax'],
];
foreach ($tests as $label => $body) {
    [$s, $b] = postJson('https://moviebox.ph/wefeed-h5api-bff/subject/filter', $body);
    $d = json_decode($b, true);
    $items = $d['data']['items'] ?? [];
    $titles = array_map(fn($x) => ($x['title'] ?? '') . ' (' . ($x['countryName'] ?? '') . ', ' . ($x['genre'] ?? '') . ')', array_slice($items, 0, 4));
    echo "[$label] count=" . count($items) . " => " . implode(' | ', $titles) . "\n";
}
