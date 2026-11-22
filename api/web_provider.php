<?php
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/anime_scraper.php';
require_once __DIR__ . '/movie_scraper.php';
sendCorsHeaders();

function curlGet(string $url, int $timeout = 18): array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS => 5,
        CURLOPT_TIMEOUT => $timeout,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false,
        CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ]);
    $body = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    return ['body' => $body, 'status' => $status, 'error' => $err];
}

/**
 * Pure-PHP ZIP central directory & manifest.json reader (works even without ext-zip!)
 */
function inspectCs3Archive(string $binary): array {
    $files = [];
    $manifest = null;
    $dexSize = 0;

    $eocdPos = strrpos($binary, "\x50\x4b\x05\x06");
    if ($eocdPos === false) {
        return ['validZip' => false, 'files' => [], 'manifest' => null, 'dexSize' => 0];
    }

    $eocd = unpack('ventries/VcdSize/VcdOffset', substr($binary, $eocdPos + 10, 10));
    $offset = $eocd['cdOffset'];
    $count = $eocd['entries'];

    for ($i = 0; $i < $count; $i++) {
        if (substr($binary, $offset, 4) !== "\x50\x4b\x01\x02") break;
        $hdr = unpack(
            'vmethod/Vcrc/VcompSize/VuncompSize/vnameLen/vextraLen/vcommentLen',
            substr($binary, $offset + 10, 22)
        );
        $localOffset = unpack('Voff', substr($binary, $offset + 42, 4))['off'];
        $name = substr($binary, $offset + 46, $hdr['nameLen']);
        $files[] = ['name' => $name, 'size' => $hdr['uncompSize']];

        if ($name === 'classes.dex') {
            $dexSize = $hdr['uncompSize'];
        }

        if ($name === 'manifest.json' && substr($binary, $localOffset, 4) === "\x50\x4b\x03\x04") {
            $lh = unpack('vnameLen/vextraLen', substr($binary, $localOffset + 26, 4));
            $dataStart = $localOffset + 30 + $lh['nameLen'] + $lh['extraLen'];
            $rawData = substr($binary, $dataStart, $hdr['compSize']);
            $uncompressed = $hdr['method'] === 0 ? $rawData : @gzinflate($rawData);
            if ($uncompressed) {
                $decoded = json_decode($uncompressed, true);
                if (is_array($decoded)) $manifest = $decoded;
            }
        }

        $offset += 46 + $hdr['nameLen'] + $hdr['extraLen'] + $hdr['commentLen'];
    }

    return [
        'validZip' => true,
        'files' => $files,
        'manifest' => $manifest,
        'dexSize' => $dexSize,
    ];
}

try {
    $pdo = getDB();
    $user = requireAuth($pdo);
    $userId = (int)$user['id'];
    $action = $_GET['action'] ?? '';
    $method = $_SERVER['REQUEST_METHOD'];

    // 1. Inspect a real .cs3 plugin archive via PHP (Super Admin only)
    if ($action === 'inspect_cs3') {
        if (($user['role'] ?? '') !== 'super_admin') {
            jsonError('Akses ditolak. Hanya Super Admin yang dapat mengelola ekstensi.', 403);
        }
        $url = trim((string)($_GET['url'] ?? ''));
        if (!preg_match('/^https?:\/\//i', $url)) {
            jsonError('URL plugin .cs3 tidak valid.', 400);
        }

        $res = curlGet($url, 20);
        if (!$res['body'] || $res['status'] >= 400) {
            jsonError('Gagal mengunduh file .cs3 (HTTP ' . $res['status'] . ').', 502);
        }

        $info = inspectCs3Archive($res['body']);
        jsonResponse([
            'ok' => true,
            'archiveBytes' => strlen($res['body']),
            'validZip' => $info['validZip'],
            'manifest' => $info['manifest'],
            'dexSize' => $info['dexSize'],
            'files' => $info['files'],
            'explanation' => 'Arsip .cs3 siap dihubungkan langsung ke server asli anime Indonesia!',
        ]);
    }

    // 2. Bind extension directly to native anime / movie source (Super Admin only)
    if ($method === 'POST' && $action === 'bind_web_adapter') {
        if (($user['role'] ?? '') !== 'super_admin') {
            jsonError('Akses ditolak. Hanya Super Admin yang dapat mengelola ekstensi.', 403);
        }
        $body = getJsonBody();
        $pluginId = trim((string)($body['pluginId'] ?? ''));
        $adapter = trim((string)($body['adapter'] ?? 'native_anime'));
        $config = is_array($body['config'] ?? null) ? $body['config'] : [];

        if ($pluginId === '') jsonError('pluginId wajib diisi.', 400);

        $stmt = $pdo->prepare(
            'UPDATE extensions
             SET runtime = "web-bridge",
                 badge = "WEB",
                 web_adapter = ?,
                 adapter_config_json = ?,
                 is_installed = 1,
                 is_enabled = 1,
                 installed_at = NOW()
             WHERE user_id = ? AND plugin_key = ?'
        );
        $stmt->execute([$adapter, json_encode($config), $userId, $pluginId]);

        // Determine if plugin is anime or movie/series
        $cleanCheck = strtolower($pluginId . ' ' . $adapter);
        $isAnime = (str_contains($cleanCheck, 'samehadaku') || str_contains($cleanCheck, 'otakudesu') || str_contains($cleanCheck, 'kuramanime') || str_contains($cleanCheck, 'anime'));

        if ($isAnime) {
            $items = scrapeAnimeCatalog($pluginId, 60);
            $msg = 'Plugin anime berhasil diaktifkan!';
        } else {
            $pName = str_contains(strtolower($pluginId), 'idlix') ? 'Idlix' : 'Moviebox';
            $items = scrapeMovieCatalog($pluginId, $pName, 750);
            $msg = "Plugin {$pName} aktif! Koleksi film & series lengkap siap ditonton di Beranda!";
        }

        jsonResponse([
            'ok' => true,
            'pluginId' => $pluginId,
            'adapter' => $adapter,
            'items' => $items,
            'message' => $msg,
        ]);
    }

    // 3. Fetch live items for an extension (regular users inherit Super Admin's extensions)
    if ($action === 'fetch_provider_items') {
        $pluginId = trim((string)($_GET['pluginId'] ?? ''));
        $extOwnerId = $userId;
        if (($user['role'] ?? '') !== 'super_admin') {
            $adminId = (int)$pdo->query("SELECT id FROM users WHERE role = 'super_admin' ORDER BY id ASC LIMIT 1")->fetchColumn();
            if ($adminId > 0) $extOwnerId = $adminId;
        }
        $stmt = $pdo->prepare(
            'SELECT plugin_key, name, web_adapter, adapter_config_json FROM extensions WHERE user_id = ? AND plugin_key = ? LIMIT 1'
        );
        $stmt->execute([$extOwnerId, $pluginId]);
        $ext = $stmt->fetch();

        $pluginName = $ext['name'] ?? $pluginId;
        $cleanCheck = strtolower($pluginId . ' ' . $pluginName);
        $isAnime = (str_contains($cleanCheck, 'samehadaku') || str_contains($cleanCheck, 'otakudesu') || str_contains($cleanCheck, 'kuramanime') || str_contains($cleanCheck, 'anime'));

        if ($isAnime) {
            $items = scrapeAnimeCatalog($pluginId ?: $pluginName, 60);
            $adapterType = 'native_anime';
        } else {
            // Moviebox, LayarKaca, Idlix, Filmkita, etc.
            $items = scrapeMovieCatalog($pluginId, $pluginName, 750);
            $adapterType = 'movies';
        }

        jsonResponse([
            'ok' => true,
            'adapter' => $adapterType,
            'items' => $items
        ]);
    }

    // 4. Resolve direct playable stream for anime
    if ($action === 'resolve_anime_stream') {
        $sourceSite = (string)($_GET['site'] ?? 'samehadaku');
        $sourceUrl = (string)($_GET['url'] ?? '');

        if (!$sourceUrl) {
            jsonError('URL sumber tidak valid.', 400);
        }

        $streams = resolveAnimeStream($sourceSite, $sourceUrl);
        jsonResponse(['ok' => true, 'streams' => $streams]);
    }

    // 4b. Fetch full real episode list on-demand for an anime
    if ($action === 'fetch_anime_episodes') {
        $sourceSite = (string)($_GET['site'] ?? 'samehadaku');
        $sourceUrl = (string)($_GET['url'] ?? '');

        if (!$sourceUrl) {
            jsonError('URL anime tidak valid.', 400);
        }

        $episodes = [];
        $seasons = [];
        if ($sourceSite === 'moviebox') {
            $seasons = scrapeMovieboxEpisodes($sourceUrl);
            jsonResponse(['ok' => true, 'episodes' => $seasons[0]['episodes'] ?? [], 'seasons' => $seasons]);
        }
        $episodes = scrapeAnimeEpisodes($sourceUrl, $sourceSite);
        jsonResponse(['ok' => true, 'episodes' => $episodes]);
    }

    // 5. Media catalog CRUD
    if ($method === 'GET' && $action === 'media_list') {
        $rows = $pdo->query(
            'SELECT m.*, u.username AS creator_name
             FROM media_items m
             LEFT JOIN users u ON u.id = m.created_by
             ORDER BY m.created_at DESC'
        )->fetchAll();
        jsonResponse(['ok' => true, 'items' => $rows]);
    }

    if ($method === 'POST' && $action === 'media_create') {
        $body = getJsonBody();
        $title = trim((string)($body['title'] ?? ''));
        $providerId = trim((string)($body['providerId'] ?? 'custom-streams'));
        $streamUrl = trim((string)($body['streamUrl'] ?? ''));
        if ($title === '' || !preg_match('/^https?:\/\//i', $streamUrl)) {
            jsonError('Judul dan URL Stream (http/https) wajib diisi.', 400);
        }

        $mediaKey = 'dbm-' . time() . '-' . bin2hex(random_bytes(3));
        $type = trim((string)($body['type'] ?? 'anime'));
        $year = (int)($body['year'] ?? date('Y'));
        $rating = (float)($body['rating'] ?? 8.5);
        $quality = trim((string)($body['quality'] ?? '1080p'));
        $duration = trim((string)($body['duration'] ?? 'Episode 1'));
        $poster = trim((string)($body['poster'] ?? ''));
        $backdrop = trim((string)($body['backdrop'] ?? $poster));
        $synopsis = trim((string)($body['synopsis'] ?? ''));
        $genresRaw = trim((string)($body['genres'] ?? 'Anime, Sub Indo'));
        $genres = array_values(array_filter(array_map('trim', explode(',', $genresRaw))));

        $streamType = str_contains(strtolower($streamUrl), '.m3u8') ? 'hls' : 'mp4';
        $streams = [
            [
                'id' => 'db-s-' . time(),
                'label' => "Anime Server — {$quality} " . strtoupper($streamType),
                'quality' => $quality,
                'type' => $streamType,
                'url' => $streamUrl,
            ],
        ];

        $isGlobal = $user['role'] === 'super_admin' ? 1 : 0;

        $ins = $pdo->prepare(
            'INSERT INTO media_items
             (media_key, provider_id, title, original_title, media_type, year, rating, duration, quality, genres_json, poster_url, backdrop_url, synopsis, streams_json, created_by, is_global)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $ins->execute([
            $mediaKey,
            $providerId,
            $title,
            $title,
            $type,
            $year,
            $rating,
            $duration,
            $quality,
            json_encode($genres ?: ['Anime']),
            $poster ?: null,
            $backdrop ?: null,
            $synopsis ?: 'Anime tersimpan di database MySQL CloudStream Web.',
            json_encode($streams),
            $userId,
            $isGlobal,
        ]);

        jsonResponse([
            'ok' => true,
            'mediaKey' => $mediaKey,
            'message' => "Anime '{$title}' berhasil ditambahkan ke database MySQL!",
        ], 201);
    }

    if (($method === 'DELETE' || ($method === 'POST' && $action === 'media_delete'))) {
        $body = getJsonBody();
        $id = (int)($_GET['id'] ?? $body['id'] ?? 0);
        if ($user['role'] === 'super_admin') {
            $pdo->prepare('DELETE FROM media_items WHERE id = ?')->execute([$id]);
        } else {
            $pdo->prepare('DELETE FROM media_items WHERE id = ? AND created_by = ?')->execute([$id, $userId]);
        }
        jsonResponse(['ok' => true, 'message' => 'Item berhasil dihapus dari MySQL.']);
    }

    jsonError('Aksi web_provider tidak dikenali.', 404);
} catch (Throwable $e) {
    jsonError('Kesalahan server web_provider: ' . $e->getMessage(), 500);
}
