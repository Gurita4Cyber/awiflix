<?php
function req($url) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER=>true, CURLOPT_FOLLOWLOCATION=>true, CURLOPT_TIMEOUT=>20, CURLOPT_SSL_VERIFYPEER=>false,
        CURLOPT_USERAGENT=>'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        CURLOPT_HTTPHEADER=>['Accept: application/json', 'Referer: https://moviebox.ph/']]);
    $b = curl_exec($ch); $s = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
    return [$s, (string)$b];
}
$base = 'https://moviebox.ph/wefeed-h5api-bff/';
$tests = [
  'ranking-list/content?id=5491236383496752264&page=1&perPage=20',
  'operating/more?opId=5491236383496752264&page=1&perPage=20',
  'home/more?opId=5491236383496752264&page=1&perPage=20',
  'subject/operating?opId=5491236383496752264&page=1&perPage=20',
  'home?host=moviebox.ph&platform=Vivamax',
  'home?host=moviebox.ph&page=2',
  'subject/filter?genre=Horror&page=1&perPage=20',
  'web/subject/filter?page=1&perPage=20&genre=Horror',
];
foreach ($tests as $t) {
    [$s,$b] = req($base.$t);
    $d = json_decode($b, true);
    $cnt = count($d['data']['subjectList'] ?? $d['data']['items'] ?? []);
    echo "$s len=".strlen($b)." cnt=$cnt $t => ".substr($b,0,120)."\n";
}
