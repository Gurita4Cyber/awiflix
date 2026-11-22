<?php
require_once __DIR__ . '/helpers.php';
sendCorsHeaders();

try {
    $pdo = getDB();
    $user = requireAuth($pdo);
    $userId = (int)$user['id'];
    $method = $_SERVER['REQUEST_METHOD'];
    $action = $_GET['action'] ?? '';

    if ($method === 'GET') {
        seedDefaultUserWorkspace($pdo, $userId);

        // 1. Settings & Search history
        $setStmt = $pdo->prepare('SELECT settings_json, search_history_json FROM user_settings WHERE user_id = ?');
        $setStmt->execute([$userId]);
        $setRow = $setStmt->fetch();
        $settings = $setRow && $setRow['settings_json'] ? json_decode($setRow['settings_json'], true) : null;
        $searchHistory = $setRow && $setRow['search_history_json']
            ? json_decode($setRow['search_history_json'], true)
            : [];

        // 2. Repositories & Extensions (regular users inherit Super Admin's managed extensions)
        $extOwnerId = $userId;
        if (($user['role'] ?? '') !== 'super_admin') {
            $adminId = (int)$pdo->query("SELECT id FROM users WHERE role = 'super_admin' ORDER BY id ASC LIMIT 1")->fetchColumn();
            if ($adminId > 0) {
                $extOwnerId = $adminId;
            }
        }

        $repoStmt = $pdo->prepare('SELECT * FROM repositories WHERE user_id = ? ORDER BY built_in ASC, created_at DESC');
        $repoStmt->execute([$extOwnerId]);
        $repoRows = $repoStmt->fetchAll();

        $extStmt = $pdo->prepare('SELECT * FROM extensions WHERE user_id = ? ORDER BY id ASC');
        $extStmt->execute([$extOwnerId]);
        $extRows = $extStmt->fetchAll();

        $pluginsByRepo = [];
        $installedPlugins = [];

        foreach ($extRows as $e) {
            $pluginObj = [
                'id' => $e['plugin_key'],
                'name' => $e['name'],
                'version' => $e['version'],
                'language' => $e['language'],
                'description' => $e['description'] ?? '',
                'iconUrl' => $e['icon_url'] ?? '',
                'iconColor' => $e['icon_color'] ?? '#3d63ff',
                'badge' => $e['badge'] ?? 'EXT',
                'runtime' => $e['runtime'] ?? 'web',
                'url' => $e['url'] ?? '',
                'catalogUrl' => $e['catalog_url'] ?? '',
                'm3uUrl' => $e['m3u_url'] ?? '',
                'categories' => $e['categories_json'] ? json_decode($e['categories_json'], true) : ['movie'],
                'tvTypes' => $e['tv_types_json'] ? json_decode($e['tv_types_json'], true) : [],
                'inlineItems' => $e['inline_items_json'] ? json_decode($e['inline_items_json'], true) : null,
                'fileSize' => (int)$e['file_size'],
                'status' => $e['status'] ?? 'active',
                'webAdapter' => $e['web_adapter'] ?? null,
                'adapterConfig' => $e['adapter_config_json']
                    ? json_decode($e['adapter_config_json'], true)
                    : null,
            ];
            $pluginsByRepo[$e['repo_key']][] = $pluginObj;

            if ((int)$e['is_installed'] === 1) {
                $installedPlugins[$e['plugin_key']] = [
                    'enabled' => (int)$e['is_enabled'] === 1,
                    'installedAt' => $e['installed_at'] ?? $e['created_at'],
                ];
            }
        }

        $repositories = array_map(function ($r) use ($pluginsByRepo) {
            return [
                'id' => $r['repo_key'],
                'name' => $r['name'],
                'shortCode' => $r['short_code'] ?? '',
                'url' => $r['url'],
                'iconUrl' => $r['icon_url'] ?? '',
                'description' => $r['description'] ?? '',
                'author' => $r['author'] ?? '',
                'builtIn' => (bool)$r['built_in'],
                'hasAndroidCs3' => (bool)$r['has_android_cs3'],
                'plugins' => $pluginsByRepo[$r['repo_key']] ?? [],
            ];
        }, $repoRows);

        // 3. Custom Streams / M3U items (shared from Super Admin's managed extensions)
        $csStmt = $pdo->prepare('SELECT payload_json FROM custom_streams WHERE user_id = ? ORDER BY created_at DESC');
        $csStmt->execute([$extOwnerId]);
        $customItems = array_map(fn($row) => json_decode($row['payload_json'], true), $csStmt->fetchAll());

        // 4. Library
        $libStmt = $pdo->prepare('SELECT media_id, status, UNIX_TIMESTAMP(updated_at) * 1000 AS updated_ms FROM library_items WHERE user_id = ?');
        $libStmt->execute([$userId]);
        $library = [];
        foreach ($libStmt->fetchAll() as $row) {
            $library[$row['media_id']] = [
                'status' => $row['status'],
                'updatedAt' => (int)$row['updated_ms'],
            ];
        }

        // 5. Watch Progress
        $progStmt = $pdo->prepare('SELECT *, UNIX_TIMESTAMP(updated_at) * 1000 AS updated_ms FROM watch_progress WHERE user_id = ?');
        $progStmt->execute([$userId]);
        $watchProgress = [];
        foreach ($progStmt->fetchAll() as $row) {
            $watchProgress[$row['media_id']] = [
                'mediaId' => $row['media_id'],
                'episodeId' => $row['episode_id'],
                'seasonNumber' => $row['season_number'] !== null ? (int)$row['season_number'] : null,
                'episodeNumber' => $row['episode_number'] !== null ? (int)$row['episode_number'] : null,
                'currentTime' => (float)$row['current_time_sec'],
                'duration' => (float)$row['duration_sec'],
                'updatedAt' => (int)$row['updated_ms'],
            ];
        }

        // 6. Watched Episodes
        $wepStmt = $pdo->prepare('SELECT episode_id FROM watched_episodes WHERE user_id = ?');
        $wepStmt->execute([$userId]);
        $watchedEpisodes = [];
        foreach ($wepStmt->fetchAll() as $row) {
            $watchedEpisodes[$row['episode_id']] = true;
        }

        // 7. Downloads
        $dlStmt = $pdo->prepare('SELECT payload_json FROM downloads WHERE user_id = ? ORDER BY created_at DESC');
        $dlStmt->execute([$userId]);
        $downloads = array_map(fn($row) => json_decode($row['payload_json'], true), $dlStmt->fetchAll());

        // 8. MySQL Media Items (Global + User-created)
        $mediaStmt = $pdo->prepare(
            'SELECT * FROM media_items WHERE is_global = 1 OR created_by = ? ORDER BY created_at DESC'
        );
        $mediaStmt->execute([$userId]);
        $dbMediaItems = array_map(function ($m) {
            return [
                'id' => $m['media_key'],
                'dbId' => (int)$m['id'],
                'providerId' => $m['provider_id'],
                'title' => $m['title'],
                'originalTitle' => $m['original_title'] ?? '',
                'type' => $m['media_type'] ?? 'movie',
                'year' => (int)$m['year'],
                'rating' => (float)$m['rating'],
                'duration' => $m['duration'] ?? 'HD',
                'status' => $m['media_type'] === 'live' ? 'Live' : 'Released',
                'quality' => $m['quality'] ?? '1080p',
                'genres' => $m['genres_json'] ? json_decode($m['genres_json'], true) : ['MySQL'],
                'director' => 'MySQL Catalog',
                'cast' => [],
                'featured' => false,
                'poster' => $m['poster_url'] ?? '',
                'backdrop' => $m['backdrop_url'] ?: ($m['poster_url'] ?? ''),
                'accentGradient' => 'from-blue-950 via-indigo-950 to-slate-950',
                'synopsis' => $m['synopsis'] ?? '',
                'streams' => $m['streams_json'] ? json_decode($m['streams_json'], true) : [],
                'seasons' => $m['seasons_json'] ? json_decode($m['seasons_json'], true) : null,
                'fromDb' => true,
            ];
        }, $mediaStmt->fetchAll());

        jsonResponse([
            'ok' => true,
            'user' => formatUserPayload($user),
            'state' => [
                'settings' => $settings,
                'searchHistory' => $searchHistory,
                'repositories' => $repositories,
                'installedPlugins' => $installedPlugins,
                'customItems' => $customItems,
                'dbMediaItems' => $dbMediaItems,
                'library' => $library,
                'watchProgress' => $watchProgress,
                'watchedEpisodes' => $watchedEpisodes,
                'downloads' => $downloads,
            ],
        ]);
    }

    if ($method === 'POST') {
        $body = getJsonBody();

        if ($action === 'settings') {
            $settingsJson = json_encode($body['settings'] ?? []);
            $stmt = $pdo->prepare(
                'INSERT INTO user_settings (user_id, settings_json) VALUES (?, ?)
                 ON DUPLICATE KEY UPDATE settings_json = VALUES(settings_json)'
            );
            $stmt->execute([$userId, $settingsJson]);
            jsonResponse(['ok' => true]);
        }

        if ($action === 'search_history') {
            $histJson = json_encode($body['searchHistory'] ?? []);
            $stmt = $pdo->prepare(
                'INSERT INTO user_settings (user_id, settings_json, search_history_json) VALUES (?, "{}", ?)
                 ON DUPLICATE KEY UPDATE search_history_json = VALUES(search_history_json)'
            );
            $stmt->execute([$userId, $histJson]);
            jsonResponse(['ok' => true]);
        }

        if ($action === 'reset') {
            $pdo->prepare('DELETE FROM repositories WHERE user_id = ?')->execute([$userId]);
            $pdo->prepare('DELETE FROM extensions WHERE user_id = ?')->execute([$userId]);
            $pdo->prepare('DELETE FROM custom_streams WHERE user_id = ?')->execute([$userId]);
            $pdo->prepare('DELETE FROM library_items WHERE user_id = ?')->execute([$userId]);
            $pdo->prepare('DELETE FROM watch_progress WHERE user_id = ?')->execute([$userId]);
            $pdo->prepare('DELETE FROM watched_episodes WHERE user_id = ?')->execute([$userId]);
            $pdo->prepare('DELETE FROM downloads WHERE user_id = ?')->execute([$userId]);
            $pdo->prepare('DELETE FROM user_settings WHERE user_id = ?')->execute([$userId]);
            seedDefaultUserWorkspace($pdo, $userId);
            jsonResponse(['ok' => true]);
        }
    }

    jsonError('Aksi state tidak dikenali.', 404);
} catch (Throwable $e) {
    jsonError('Kesalahan server: ' . $e->getMessage(), 500);
}
