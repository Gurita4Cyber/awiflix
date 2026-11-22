<?php
function curlGet(string $url): string {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_SSL_VERIFYPEER => false,
    ]);
    $res = curl_exec($ch);
    curl_close($ch);
    return is_string($res) ? $res : '';
}

$bin = curlGet('https://raw.githubusercontent.com/Asm0d3usX/CloudX/builds/Moviebox.cs3');
echo "Downloaded: " . strlen($bin) . " bytes\n";

// Search for strings/urls in dex
preg_match_all('#https?://[a-zA-Z0-9_\-\.]+(:[0-9]+)?(/[a-zA-Z0-9_\-\./\?=%&]*)?#i', $bin, $urls);
$cleanUrls = array_unique($urls[0]);
foreach ($cleanUrls as $u) {
    if (str_contains($u, 'movie') || str_contains($u, 'api') || str_contains($u, 'box') || str_contains($u, 'stream') || str_contains($u, 'cloud')) {
        echo "URL: $u\n";
    }
}
