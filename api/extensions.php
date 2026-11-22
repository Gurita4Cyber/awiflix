<?php
require_once __DIR__ . '/helpers.php';
sendCorsHeaders();

try {
    $pdo = getDB();
    $user = requireAuth($pdo);
    if (($user['role'] ?? '') !== 'super_admin') {
        jsonError('Akses ditolak. Hanya Super Admin yang dapat mengelola ekstensi.', 403);
    }
    $userId = (int)$user['id'];
    $method = $_SERVER['REQUEST_METHOD'];
    $action = $_GET['action'] ?? '';

    // Server-side fetch helper for repo.json / plugins.json / catalog.json / .m3u (avoids browser CORS issues)
    if ($method === 'GET' && $action === 'fetch_url') {
        $url = trim((string)($_GET['url'] ?? ''));
        if (!preg_match('/^https?:\/\//i', $url)) {
            jsonError('URL harus dimulai dengan http:// atau https://', 400);
        }

        $ctx = stream_context_create([
            'http' => [
                'method' => 'GET',
                'timeout' => 15,
                'header' => "User-Agent: CloudStream-Web/1.0\r\nAccept: */*\r\n",
            ],
            'ssl' => [
                'verify_peer' => false,
                'verify_peer_name' => false,
            ],
        ]);

        $content = @file_get_contents($url, false, $ctx);
        if ($content === false) {
            jsonError('Gagal mengunduh URL dari server remote.', 502);
        }

        jsonResponse([
            'ok' => true,
            'content' => $content,
        ]);
    }

    if ($method === 'POST') {
        $body = getJsonBody();

        // Save Repository & all its Extensions directly into MySQL!
        if ($action === 'add_repo') {
            $repo = $body['repo'] ?? null;
            if (!is_array($repo) || empty($repo['id']) || empty($repo['name'])) {
                jsonError('Data repositori tidak valid.', 400);
            }

            $pdo->beginTransaction();
            try {
                $insRepo = $pdo->prepare(
                    'INSERT INTO repositories (user_id, repo_key, name, short_code, url, icon_url, description, author, built_in, has_android_cs3)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE
                       name = VALUES(name),
                       url = VALUES(url),
                       icon_url = VALUES(icon_url),
                       description = VALUES(description),
                       has_android_cs3 = VALUES(has_android_cs3)'
                );
                $insRepo->execute([
                    $userId,
                    $repo['id'],
                    $repo['name'],
                    $repo['shortCode'] ?? null,
                    $repo['url'] ?? '',
                    $repo['iconUrl'] ?? null,
                    $repo['description'] ?? null,
                    $repo['author'] ?? null,
                    !empty($repo['builtIn']) ? 1 : 0,
                    !empty($repo['hasAndroidCs3']) ? 1 : 0,
                ]);

                $plugins = is_array($repo['plugins'] ?? null) ? $repo['plugins'] : [];
                $insExt = $pdo->prepare(
                    'INSERT INTO extensions
                     (user_id, repo_key, plugin_key, name, version, language, description, icon_url, icon_color, badge, runtime, url, catalog_url, m3u_url, categories_json, tv_types_json, inline_items_json, file_size, status, is_installed, is_enabled, installed_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE
                       name = VALUES(name),
                       version = VALUES(version),
                       language = VALUES(language),
                       description = VALUES(description),
                       icon_url = VALUES(icon_url),
                       runtime = VALUES(runtime),
                       url = VALUES(url),
                       catalog_url = VALUES(catalog_url),
                       m3u_url = VALUES(m3u_url),
                       categories_json = VALUES(categories_json),
                       tv_types_json = VALUES(tv_types_json),
                       inline_items_json = VALUES(inline_items_json),
                       file_size = VALUES(file_size),
                       status = VALUES(status)'
                );

                foreach ($plugins as $p) {
                    $autoInstall = !empty($body['autoInstallWeb']) && ($p['runtime'] ?? 'web') === 'web';
                    $insExt->execute([
                        $userId,
                        $repo['id'],
                        $p['id'],
                        $p['name'] ?? 'Plugin',
                        (string)($p['version'] ?? '1.0'),
                        $p['language'] ?? 'MULTI',
                        $p['description'] ?? null,
                        $p['iconUrl'] ?? null,
                        $p['iconColor'] ?? '#3d63ff',
                        $p['badge'] ?? 'EXT',
                        $p['runtime'] ?? 'web',
                        $p['url'] ?? null,
                        $p['catalogUrl'] ?? null,
                        $p['m3uUrl'] ?? null,
                        json_encode($p['categories'] ?? ['movie']),
                        json_encode($p['tvTypes'] ?? []),
                        isset($p['inlineItems']) ? json_encode($p['inlineItems']) : null,
                        (int)($p['fileSize'] ?? 0),
                        $p['status'] ?? 'active',
                        $autoInstall ? 1 : 0,
                        $autoInstall ? 1 : 0,
                        $autoInstall ? date('Y-m-d H:i:s') : null,
                    ]);
                }

                $pdo->commit();
                jsonResponse(['ok' => true, 'savedPlugins' => count($plugins)]);
            } catch (Throwable $e) {
                $pdo->rollBack();
                throw $e;
            }
        }

        // Remove Repository & its Extensions from MySQL
        if ($action === 'remove_repo') {
            $repoKey = (string)($body['repoId'] ?? '');
            if ($repoKey === '') jsonError('repoId wajib diisi.', 400);

            $pdo->prepare('DELETE FROM extensions WHERE user_id = ? AND repo_key = ?')->execute([$userId, $repoKey]);
            $pdo->prepare('DELETE FROM repositories WHERE user_id = ? AND repo_key = ?')->execute([$userId, $repoKey]);
            jsonResponse(['ok' => true]);
        }

        // Install plugin
        if ($action === 'install_plugin') {
            $pluginKey = (string)($body['pluginId'] ?? '');
            if ($pluginKey === '') jsonError('pluginId wajib diisi.', 400);
            $pdo->prepare(
                'UPDATE extensions SET is_installed = 1, is_enabled = 1, installed_at = NOW()
                 WHERE user_id = ? AND plugin_key = ?'
            )->execute([$userId, $pluginKey]);
            jsonResponse(['ok' => true]);
        }

        // Uninstall plugin
        if ($action === 'uninstall_plugin') {
            $pluginKey = (string)($body['pluginId'] ?? '');
            if ($pluginKey === '') jsonError('pluginId wajib diisi.', 400);
            $pdo->prepare(
                'UPDATE extensions SET is_installed = 0, is_enabled = 0, installed_at = NULL
                 WHERE user_id = ? AND plugin_key = ?'
            )->execute([$userId, $pluginKey]);
            jsonResponse(['ok' => true]);
        }

        // Toggle plugin enabled/disabled
        if ($action === 'toggle_plugin') {
            $pluginKey = (string)($body['pluginId'] ?? '');
            $enabled = !empty($body['enabled']) ? 1 : 0;
            if ($pluginKey === '') jsonError('pluginId wajib diisi.', 400);
            $pdo->prepare(
                'UPDATE extensions SET is_enabled = ? WHERE user_id = ? AND plugin_key = ?'
            )->execute([$enabled, $userId, $pluginKey]);
            jsonResponse(['ok' => true]);
        }

        // Add single or batch custom streams / M3U items into MySQL
        if ($action === 'add_streams') {
            $items = is_array($body['items'] ?? null) ? $body['items'] : [];
            if (empty($items)) jsonError('Daftar stream kosong.', 400);

            // Make sure custom-streams plugin is marked installed & enabled
            $pdo->prepare(
                'UPDATE extensions SET is_installed = 1, is_enabled = 1 WHERE user_id = ? AND plugin_key = "custom-streams"'
            )->execute([$userId]);

            $ins = $pdo->prepare(
                'INSERT INTO custom_streams (user_id, media_key, provider_id, title, media_type, stream_url, poster_url, quality, payload_json)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                   title = VALUES(title),
                   stream_url = VALUES(stream_url),
                   payload_json = VALUES(payload_json)'
            );

            foreach ($items as $item) {
                $streamUrl = $item['streams'][0]['url'] ?? '';
                $ins->execute([
                    $userId,
                    $item['id'],
                    $item['providerId'] ?? 'custom-streams',
                    $item['title'] ?? 'Custom Stream',
                    $item['type'] ?? 'movie',
                    $streamUrl,
                    $item['poster'] ?? null,
                    $item['quality'] ?? 'Auto HLS',
                    json_encode($item),
                ]);
            }

            jsonResponse(['ok' => true, 'saved' => count($items)]);
        }

        // Delete custom stream
        if ($action === 'delete_stream') {
            $mediaKey = (string)($body['mediaId'] ?? '');
            $pdo->prepare('DELETE FROM custom_streams WHERE user_id = ? AND media_key = ?')
                ->execute([$userId, $mediaKey]);
            jsonResponse(['ok' => true]);
        }
    }

    jsonError('Aksi ekstensi tidak dikenali.', 404);
} catch (Throwable $e) {
    jsonError('Kesalahan server: ' . $e->getMessage(), 500);
}
