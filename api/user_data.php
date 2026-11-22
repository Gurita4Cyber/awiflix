<?php
require_once __DIR__ . '/helpers.php';
sendCorsHeaders();

try {
    $pdo = getDB();
    $user = requireAuth($pdo);
    $userId = (int)$user['id'];
    $action = $_GET['action'] ?? '';
    $body = getJsonBody();

    // Update or remove Library bookmark
    if ($action === 'library') {
        $mediaId = trim((string)($body['mediaId'] ?? ''));
        $status = trim((string)($body['status'] ?? 'none'));
        if ($mediaId === '') jsonError('mediaId wajib diisi.', 400);

        if ($status === '' || $status === 'none') {
            $pdo->prepare('DELETE FROM library_items WHERE user_id = ? AND media_id = ?')
                ->execute([$userId, $mediaId]);
        } else {
            $pdo->prepare(
                'INSERT INTO library_items (user_id, media_id, status) VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE status = VALUES(status)'
            )->execute([$userId, $mediaId, $status]);
        }
        jsonResponse(['ok' => true]);
    }

    // Save watch progress + mark episode watched
    if ($action === 'progress') {
        $mediaId = trim((string)($body['mediaId'] ?? ''));
        $episodeId = $body['episodeId'] ?? null;
        $seasonNumber = isset($body['seasonNumber']) ? (int)$body['seasonNumber'] : null;
        $episodeNumber = isset($body['episodeNumber']) ? (int)$body['episodeNumber'] : null;
        $currentTime = (float)($body['currentTime'] ?? 0);
        $duration = (float)($body['duration'] ?? 0);

        if ($mediaId === '') jsonError('mediaId wajib diisi.', 400);

        $pdo->prepare(
            'INSERT INTO watch_progress (user_id, media_id, episode_id, season_number, episode_number, current_time_sec, duration_sec)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               episode_id = VALUES(episode_id),
               season_number = VALUES(season_number),
               episode_number = VALUES(episode_number),
               current_time_sec = VALUES(current_time_sec),
               duration_sec = VALUES(duration_sec)'
        )->execute([$userId, $mediaId, $episodeId, $seasonNumber, $episodeNumber, $currentTime, $duration]);

        if ($episodeId && $duration > 0 && ($currentTime / $duration) >= 0.85) {
            $pdo->prepare('INSERT IGNORE INTO watched_episodes (user_id, episode_id) VALUES (?, ?)')
                ->execute([$userId, $episodeId]);
        }

        jsonResponse(['ok' => true]);
    }

    // Remove from Continue Watching
    if ($action === 'remove_progress') {
        $mediaId = trim((string)($body['mediaId'] ?? ''));
        $pdo->prepare('DELETE FROM watch_progress WHERE user_id = ? AND media_id = ?')
            ->execute([$userId, $mediaId]);
        jsonResponse(['ok' => true]);
    }

    // Save/update download item
    if ($action === 'download_save') {
        $item = $body['item'] ?? null;
        if (!is_array($item) || empty($item['id'])) jsonError('Data unduhan tidak valid.', 400);

        $pdo->prepare(
            'INSERT INTO downloads (user_id, download_key, media_id, payload_json) VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE payload_json = VALUES(payload_json)'
        )->execute([$userId, $item['id'], $item['mediaId'] ?? '', json_encode($item)]);
        jsonResponse(['ok' => true]);
    }

    // Delete single download
    if ($action === 'download_remove') {
        $dlId = trim((string)($body['id'] ?? ''));
        $pdo->prepare('DELETE FROM downloads WHERE user_id = ? AND download_key = ?')
            ->execute([$userId, $dlId]);
        jsonResponse(['ok' => true]);
    }

    // Clear completed downloads
    if ($action === 'download_clear_completed') {
        $rows = $pdo->prepare('SELECT id, payload_json FROM downloads WHERE user_id = ?');
        $rows->execute([$userId]);
        $del = $pdo->prepare('DELETE FROM downloads WHERE id = ?');
        foreach ($rows->fetchAll() as $r) {
            $p = json_decode($r['payload_json'], true);
            if (($p['status'] ?? '') === 'completed') {
                $del->execute([(int)$r['id']]);
            }
        }
        jsonResponse(['ok' => true]);
    }

    jsonError('Aksi user_data tidak dikenali.', 404);
} catch (Throwable $e) {
    jsonError('Kesalahan server: ' . $e->getMessage(), 500);
}
