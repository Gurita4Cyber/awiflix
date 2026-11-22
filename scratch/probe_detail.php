<?php
function req($url) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER=>true, CURLOPT_FOLLOWLOCATION=>true, CURLOPT_TIMEOUT=>20, CURLOPT_SSL_VERIFYPEER=>false,
        CURLOPT_USERAGENT=>'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        CURLOPT_HTTPHEADER=>['Accept: application/json', 'Referer: https://moviebox.ph/']]);
    $b = curl_exec($ch); $s = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
    return [$s, (string)$b];
}
$items = json_decode(file_get_contents(sys_get_temp_dir().'/cs_moviebox_live_v1.json'), true);
$series = array_values(array_filter($items, fn($i) => $i['type']==='series'));
echo "series count: ".count($series)."\n";
$s = $series[0];
echo $s['title']." | ".$s['moviebox']['detailPath']." | ".$s['moviebox']['subjectId']."\n";
foreach (['detail?detailPath='.$s['moviebox']['detailPath'], 'subject/detail?subjectId='.$s['moviebox']['subjectId']] as $p) {
    [$st,$b] = req('https://moviebox.ph/wefeed-h5api-bff/'.$p);
    echo "$st len=".strlen($b)." $p\n";
    $d = json_decode($b, true);
    if ($d) {
        echo "keys: ".implode(',', array_keys($d['data'] ?? []))."\n";
        echo "resource: ".json_encode($d['data']['resource'] ?? null, JSON_UNESCAPED_SLASHES)."\n";
    }
}
