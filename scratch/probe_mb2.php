<?php
function req($url, $post = null) {
    $ch = curl_init($url);
    $h = ['Accept: application/json', 'Referer: https://moviebox.ph/', 'Origin: https://moviebox.ph'];
    $o = [CURLOPT_RETURNTRANSFER=>true, CURLOPT_FOLLOWLOCATION=>true, CURLOPT_TIMEOUT=>20, CURLOPT_SSL_VERIFYPEER=>false,
        CURLOPT_USERAGENT=>'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'];
    if ($post !== null) { $h[] = 'Content-Type: application/json'; $o[CURLOPT_POST] = true; $o[CURLOPT_POSTFIELDS] = json_encode($post); }
    $o[CURLOPT_HTTPHEADER] = $h;
    curl_setopt_array($ch, $o);
    $b = curl_exec($ch); $s = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
    return [$s, (string)$b];
}
$j = json_decode(file_get_contents(__DIR__.'/mb_home.json'), true);
$sec = $j['data']['operatingList'][6];
echo "Section 6: ".json_encode(array_diff_key($sec, ['subjects'=>1,'banner'=>1]), JSON_UNESCAPED_SLASHES)."\n";

[$s,$b] = req('https://moviebox.ph/wefeed-h5api-bff/subject/search', ['keyword'=>'Vivamax','page'=>1,'perPage'=>20,'subjectType'=>0]);
echo "search $s ".strlen($b)." ".substr($b,0,300)."\n";
$d = json_decode($b, true);
echo "search items: ".count($d['data']['items'] ?? [])."\n";

[$s,$b] = req('https://moviebox.ph/wefeed-h5api-bff/subject/trending?page=0&perPage=18');
echo "trending $s ".strlen($b)." ".substr($b,0,200)."\n";

[$s,$b] = req('https://moviebox.ph/wefeed-h5api-bff/ranking-list/content?id=997144265920760504&page=2&perPage=12');
$d = json_decode($b, true);
echo "ranking p2: ".count($d['data']['subjectList'] ?? [])." pager=".json_encode($d['data']['pager'] ?? null)."\n";
