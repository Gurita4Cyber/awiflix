<?php
function req($url, $post = null) {
    $ch = curl_init($url);
    $h = [
        'Accept: application/json',
        'Referer: https://moviebox.ph/',
        'Origin: https://moviebox.ph',
        'X-Client-Info: {"timezone":"Asia/Jakarta"}',
    ];
    $o = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ];
    if ($post !== null) {
        $h[] = 'Content-Type: application/json';
        $o[CURLOPT_POST] = true;
        $o[CURLOPT_POSTFIELDS] = json_encode($post);
    }
    $o[CURLOPT_HTTPHEADER] = $h;
    curl_setopt_array($ch, $o);
    $b = curl_exec($ch);
    $s = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return [$s, (string)$b];
}

// Check platformList & filters in mb_home.json
$home = json_decode(file_get_contents(__DIR__ . '/mb_home.json'), true);
echo "platformList:\n" . json_encode($home['data']['platformList'] ?? [], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";
foreach (($home['data']['operatingList'] ?? []) as $sec) {
    if (($sec['type'] ?? '') === 'FILTER') {
        echo "FILTER section:\n" . json_encode($sec, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";
    }
}

// Probe web-bff / h5api-bff endpoints for Vivamax platform
$base = 'https://moviebox.ph/wefeed-h5api-bff/';
$endpoints = [
    ['GET', $base . 'subject/filter?page=1&perPage=20&platform=Vivamax', null],
    ['POST', $base . 'subject/filter', ['page' => 1, 'perPage' => 20, 'channelId' => 1, 'platform' => 'Vivamax']],
    ['POST', $base . 'subject/filter', ['page' => 1, 'perPage' => 20, 'classify' => 'Vivamax']],
    ['POST', 'https://moviebox.ph/wefeed-h5-bff/web/subject/filter', ['page' => 1, 'perPage' => 20, 'platform' => 'Vivamax']],
    ['POST', 'https://moviebox.ph/wefeed-h5-bff/web/subject/search', ['keyword' => 'Vivamax', 'page' => 1, 'perPage' => 20, 'subjectType' => 0]],
    ['GET', 'https://moviebox.ph/wefeed-h5-bff/web/ranking-list/content?id=997144265920760504&page=1&perPage=12', null],
    ['GET', $base . 'subject/list?platform=Vivamax&page=1&perPage=20', null],
    ['GET', $base . 'platform/list?platform=Vivamax&page=1&perPage=20', null],
    ['GET', $base . 'platform/content?platform=Vivamax&page=1&perPage=20', null],
];
foreach ($endpoints as [$m, $u, $p]) {
    [$s, $b] = req($u, $p);
    echo "[$m $s len=" . strlen($b) . "] $u => " . substr($b, 0, 200) . "\n";
}
