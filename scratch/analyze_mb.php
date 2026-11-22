<?php
$ch = curl_init('https://moviebox.ph/wefeed-h5api-bff/home?host=moviebox.ph');
curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER=>true, CURLOPT_FOLLOWLOCATION=>true, CURLOPT_TIMEOUT=>20, CURLOPT_SSL_VERIFYPEER=>false,
    CURLOPT_USERAGENT=>'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
    CURLOPT_HTTPHEADER=>['Accept: application/json', 'Referer: https://moviebox.ph/']]);
$b = curl_exec($ch); curl_close($ch);
file_put_contents(__DIR__.'/mb_home.json', $b);
$j = json_decode($b, true);
echo "keys: ".implode(',', array_keys($j['data']))."\n";
foreach ($j['data'] as $k => $v) {
    if (is_array($v)) echo "$k => array(".count($v).")\n";
}
$ol = $j['data']['operatingList'] ?? [];
foreach ($ol as $i => $sec) {
    echo "[$i] type=".($sec['type']??'')." title=".($sec['title']??'')." subjects=".count($sec['subjects']??[])." keys=".implode(',', array_keys($sec))."\n";
}
$first = null;
foreach ($ol as $sec) { if (!empty($sec['subjects'])) { $first = $sec['subjects'][0]; break; } }
echo json_encode($first, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES)."\n";
