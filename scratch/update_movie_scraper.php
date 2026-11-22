<?php
$json = file_get_contents(__DIR__ . '/all_moviebox_catalog.json');
$movieboxList = json_decode($json, true);

// Read current movie_scraper.php to preserve Idlix catalog and trailer maps
$current = file_get_contents(__DIR__ . '/../api/movie_scraper.php');

// Extract Idlix catalog function
if (!preg_match('/function getIdlixCatalog\(.*?^}/ms', $current, $idlixMatch)) {
    die("Could not find getIdlixCatalog\n");
}
$idlixFunction = $idlixMatch[0];

// Extract getTrailerEmbed function
if (!preg_match('/function getTrailerEmbed\(.*?^}/ms', $current, $trailerMatch)) {
    die("Could not find getTrailerEmbed\n");
}
$trailerFunction = $trailerMatch[0];

// Extract buildPlayableStreams function
if (!preg_match('/function buildPlayableStreams\(.*?^}/ms', $current, $streamMatch)) {
    die("Could not find buildPlayableStreams\n");
}
$streamFunction = $streamMatch[0];

// Generate new getMovieboxCatalog function with all 92 items
$code = "function getMovieboxCatalog(string \$providerId, int \$limit = 180): array {\n";
$code .= "    \$brand = 'Moviebox';\n";
$code .= "    \$catalogFile = __DIR__ . '/../scratch/all_moviebox_catalog.json';\n";
$code .= "    if (file_exists(\$catalogFile)) {\n";
$code .= "        \$rawItems = json_decode(file_get_contents(\$catalogFile), true) ?: [];\n";
$code .= "    } else {\n";
$code .= "        \$rawItems = [];\n";
$code .= "    }\n\n";
$code .= "    \$results = [];\n";
$code .= "    foreach (array_slice(\$rawItems, 0, \$limit) as \$m) {\n";
$code .= "        \$imdbId = \$m['imdb'] ?? null;\n";
$code .= "        \$id = 'mb-' . md5(\$m['title']);\n";
$code .= "        \$m['id'] = \$id;\n";
$code .= "        \$m['providerId'] = \$providerId;\n";
$code .= "        \$m['sourceSite'] = 'moviebox';\n";
$code .= "        \$m['poster'] = \$imdbId ? \"https://images.metahub.space/poster/medium/{\$imdbId}/img\" : (\$m['poster'] ?? '');\n";
$code .= "        \$m['backdrop'] = \$imdbId ? \"https://images.metahub.space/poster/medium/{\$imdbId}/img\" : (\$m['backdrop'] ?? \$m['poster']);\n";
$code .= "        \$isSeries = (\$m['type'] ?? '') === 'series';\n";
$code .= "        \$m['streams'] = buildPlayableStreams(\$brand, \$m['title'], \$imdbId, 1, 1, \$isSeries);\n\n";
$code .= "        if (!empty(\$m['seasons'])) {\n";
$code .= "            foreach (\$m['seasons'] as &\$season) {\n";
$code .= "                \$sNum = (int)(\$season['seasonNumber'] ?? 1);\n";
$code .= "                if (!empty(\$season['episodes'])) {\n";
$code .= "                    foreach (\$season['episodes'] as &\$ep) {\n";
$code .= "                        \$eNum = (int)(\$ep['number'] ?? 1);\n";
$code .= "                        \$ep['streams'] = buildPlayableStreams(\$brand, \$m['title'] . ' ' . (\$ep['title'] ?? ''), \$imdbId, \$sNum, \$eNum, true);\n";
$code .= "                    }\n";
$code .= "                }\n";
$code .= "            }\n";
$code .= "        }\n";
$code .= "        \$results[] = \$m;\n";
$code .= "    }\n\n";
$code .= "    return \$results;\n";
$code .= "}\n";

// Reassemble complete file
$newFile = "<?php\n";
$newFile .= "// Distinct Movie & Series Catalog Scraper Bridge for CloudStream:\n";
$newFile .= "// 1. Idlix: Indonesian Cinema, Drama, Killer, Horor (2026 Hits)\n";
$newFile .= "// 2. Moviebox: 92+ Movies (Box Office, Animation, Series, Vivamax 2026, Asian Hits, Action, Horror)\n\n";
$newFile .= "function scrapeMovieCatalog(string \$providerId, string \$providerName = 'Moviebox', int \$limit = 180): array {\n";
$newFile .= "    \$cleanName = strtolower(preg_replace('/[^a-z0-9]/i', '', \$providerName . ' ' . \$providerId));\n";
$newFile .= "    \$isIdlix = str_contains(\$cleanName, 'idlix');\n\n";
$newFile .= "    if (\$isIdlix) {\n";
$newFile .= "        return getIdlixCatalog(\$providerId, \$limit);\n";
$newFile .= "    }\n\n";
$newFile .= "    return getMovieboxCatalog(\$providerId, \$limit);\n";
$newFile .= "}\n\n";
$newFile .= $trailerFunction . "\n\n";
$newFile .= $streamFunction . "\n\n";
$newFile .= $idlixFunction . "\n\n";
$newFile .= $code . "\n";

file_put_contents(__DIR__ . '/../api/movie_scraper.php', $newFile);
echo "Successfully updated api/movie_scraper.php!\n";
