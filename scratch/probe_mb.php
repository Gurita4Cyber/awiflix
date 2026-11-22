<?php
function get($url) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER=>true, CURLOPT_FOLLOWLOCATION=>true, CURLOPT_TIMEOUT=>15, CURLOPT_SSL_VERIFYPEER=>false,
        CURLOPT_USERAGENT=>'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        CURLOPT_HTTPHEADER=>['Accept: application/json', 'Referer: https://moviebox.ph/', 'X-Client-Info: {"timezone":"Asia/Jakarta"}']]);
    $b = curl_exec($ch); $s = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
    return [$s, (string)$b];
}
$hosts = ['https://h5-api.aoneroom.com', 'https://moviebox.ph', 'https://api3.aoneroom.com', 'https://h5.aoneroom.com'];
$paths = ['/wefeed-h5api-bff/home?host=moviebox.ph', '/wefeed-h5-bff/web/home', '/wefeed-h5api-bff/ranking-list/content?id=997144265920760504&page=1&perPage=12', '/wefeed-mobile-bff/tab-operating?page=0&tabId=0&version=2fe0d7ae4a7c9a0c0a2c5b2d8d0b9a11'];
foreach ($hosts as $h) foreach ($paths as $p) {
    [$s, $b] = get($h.$p);
    echo "$s ".strlen($b)." $h$p\n";
    if ($s == 200 && strlen($b) > 100) echo substr($b, 0, 400)."\n";
}
