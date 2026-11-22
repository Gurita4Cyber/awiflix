<?php
$ch = curl_init('https://raw.githubusercontent.com/Asm0d3usX/CloudX/builds/Moviebox.cs3');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$bin = curl_exec($ch);
curl_close($ch);

echo "Bin length: " . strlen($bin) . "\n";
preg_match_all('#[a-zA-Z0-9_\-\.]+\.(?:com|org|net|to|vip|pro|cc|me|app)[a-zA-Z0-9_\-\./]*#i', $bin, $m);
print_r(array_slice(array_unique($m[0]), 0, 30));
