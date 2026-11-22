<?php
require_once __DIR__ . '/helpers.php';
sendCorsHeaders();

try {
    $pdo = getDB();
    $admin = requireSuperAdmin($pdo);
    $action = $_GET['action'] ?? 'list';
    $method = $_SERVER['REQUEST_METHOD'];

    // List all accounts & DB stats
    if ($method === 'GET' && $action === 'list') {
        $rows = $pdo->query(
            'SELECT u.*,
                    (SELECT COUNT(*) FROM repositories r WHERE r.user_id = u.id) AS repo_count,
                    (SELECT COUNT(*) FROM extensions e WHERE e.user_id = u.id AND e.is_installed = 1) AS plugin_count,
                    (SELECT COUNT(*) FROM custom_streams c WHERE c.user_id = u.id) AS stream_count
             FROM users u
             ORDER BY u.role = "super_admin" DESC, u.created_at DESC'
        )->fetchAll();

        $users = array_map(function ($row) {
            $base = formatUserPayload($row);
            $base['repoCount'] = (int)$row['repo_count'];
            $base['pluginCount'] = (int)$row['plugin_count'];
            $base['streamCount'] = (int)$row['stream_count'];
            return $base;
        }, $rows);

        $totalRepos = (int)$pdo->query('SELECT COUNT(*) FROM repositories')->fetchColumn();
        $totalPlugins = (int)$pdo->query('SELECT COUNT(*) FROM extensions')->fetchColumn();
        $totalStreams = (int)$pdo->query('SELECT COUNT(*) FROM custom_streams')->fetchColumn();

        $activeCount = 0;
        $expiredCount = 0;
        foreach ($users as $u) {
            if ($u['isActive'] && !$u['isExpired']) $activeCount++;
            else $expiredCount++;
        }

        jsonResponse([
            'ok' => true,
            'users' => $users,
            'stats' => [
                'totalUsers' => count($users),
                'activeUsers' => $activeCount,
                'expiredOrDisabledUsers' => $expiredCount,
                'totalRepositories' => $totalRepos,
                'totalExtensions' => $totalPlugins,
                'totalCustomStreams' => $totalStreams,
            ],
        ]);
    }

    // Create new account with duration in months (0 or null = unlimited)
    if ($method === 'POST' && $action === 'create') {
        $body = getJsonBody();
        $username = trim((string)($body['username'] ?? ''));
        $fullName = trim((string)($body['fullName'] ?? $username));
        $email = trim((string)($body['email'] ?? ''));
        $password = (string)($body['password'] ?? '');
        $role = ($body['role'] ?? 'user') === 'super_admin' ? 'super_admin' : 'user';
        $durationMonths = isset($body['durationMonths']) && $body['durationMonths'] !== ''
            ? (int)$body['durationMonths']
            : 1;

        if ($username === '' || strlen($username) < 3) {
            jsonError('Username minimal 3 karakter.', 400);
        }
        if (!preg_match('/^[a-zA-Z0-9._-]+$/', $username)) {
            jsonError('Username hanya boleh huruf, angka, titik, garis bawah, atau strip.', 400);
        }
        if (strlen($password) < 4) {
            jsonError('Password minimal 4 karakter.', 400);
        }

        // Check duplicate username/email
        $dup = $pdo->prepare('SELECT id FROM users WHERE username = ? OR (? <> "" AND email = ?) LIMIT 1');
        $dup->execute([$username, $email, $email]);
        if ($dup->fetch()) {
            jsonError('Username atau email sudah digunakan.', 409);
        }

        $expiresAt = null;
        $storedMonths = null;
        if ($role !== 'super_admin' && $durationMonths > 0) {
            $storedMonths = $durationMonths;
            $expiresAt = (new DateTime("+{$durationMonths} months"))->format('Y-m-d H:i:s');
        }

        $ins = $pdo->prepare(
            'INSERT INTO users (username, full_name, email, password_hash, role, duration_months, expires_at, is_active, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)'
        );
        $ins->execute([
            $username,
            $fullName ?: $username,
            $email !== '' ? $email : null,
            password_hash($password, PASSWORD_BCRYPT),
            $role,
            $storedMonths,
            $expiresAt,
            (int)$admin['id'],
        ]);

        $newId = (int)$pdo->lastInsertId();
        seedDefaultUserWorkspace($pdo, $newId);

        $created = $pdo->prepare('SELECT * FROM users WHERE id = ?');
        $created->execute([$newId]);

        jsonResponse([
            'ok' => true,
            'message' => "Akun '{$username}' berhasil dibuat!",
            'user' => formatUserPayload($created->fetch()),
        ], 201);
    }

    // Extend user subscription duration by X months (or set unlimited if months === 0)
    if ($method === 'POST' && $action === 'extend') {
        $body = getJsonBody();
        $userId = (int)($body['userId'] ?? 0);
        $addMonths = isset($body['months']) ? (int)$body['months'] : 1;
        $mode = $body['mode'] ?? 'add'; // 'add' | 'unlimited'

        if ($userId <= 0) {
            jsonError('ID akun tidak valid.', 400);
        }

        $stmt = $pdo->prepare('SELECT * FROM users WHERE id = ?');
        $stmt->execute([$userId]);
        $target = $stmt->fetch();
        if (!$target) {
            jsonError('Akun tidak ditemukan.', 404);
        }

        if ($mode === 'unlimited' || $addMonths <= 0) {
            $pdo->prepare('UPDATE users SET duration_months = NULL, expires_at = NULL, is_active = 1 WHERE id = ?')
                ->execute([$userId]);
        } else {
            // If currently active and not expired, extend from current expires_at; otherwise extend from NOW
            $base = new DateTime();
            if (!empty($target['expires_at'])) {
                $existing = new DateTime($target['expires_at']);
                if ($existing > $base) {
                    $base = $existing;
                }
            }
            $base->modify("+{$addMonths} months");
            $newMonths = (int)($target['duration_months'] ?? 0) + $addMonths;

            $pdo->prepare('UPDATE users SET duration_months = ?, expires_at = ?, is_active = 1 WHERE id = ?')
                ->execute([$newMonths, $base->format('Y-m-d H:i:s'), $userId]);
        }

        $stmt->execute([$userId]);
        jsonResponse([
            'ok' => true,
            'message' => 'Durasi akun berhasil diperbarui!',
            'user' => formatUserPayload($stmt->fetch()),
        ]);
    }

    // Toggle active / suspend
    if ($method === 'POST' && $action === 'toggle') {
        $body = getJsonBody();
        $userId = (int)($body['userId'] ?? 0);
        if ($userId === (int)$admin['id']) {
            jsonError('Tidak dapat menonaktifkan akun Super Admin sendiri.', 400);
        }

        $stmt = $pdo->prepare('SELECT * FROM users WHERE id = ?');
        $stmt->execute([$userId]);
        $target = $stmt->fetch();
        if (!$target) jsonError('Akun tidak ditemukan.', 404);

        $nextActive = (int)$target['is_active'] ? 0 : 1;
        $pdo->prepare('UPDATE users SET is_active = ? WHERE id = ?')->execute([$nextActive, $userId]);
        if ($nextActive === 0) {
            $pdo->prepare('DELETE FROM sessions WHERE user_id = ?')->execute([$userId]);
        }

        $stmt->execute([$userId]);
        jsonResponse([
            'ok' => true,
            'user' => formatUserPayload($stmt->fetch()),
        ]);
    }

    // Reset password
    if ($method === 'POST' && $action === 'reset_password') {
        $body = getJsonBody();
        $userId = (int)($body['userId'] ?? 0);
        $newPassword = (string)($body['password'] ?? '');
        if ($userId <= 0 || strlen($newPassword) < 4) {
            jsonError('Password baru minimal 4 karakter.', 400);
        }

        $pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?')
            ->execute([password_hash($newPassword, PASSWORD_BCRYPT), $userId]);
        jsonResponse(['ok' => true, 'message' => 'Password berhasil direset!']);
    }

    // Delete account
    if (($method === 'DELETE' || ($method === 'POST' && $action === 'delete'))) {
        $body = getJsonBody();
        $userId = (int)($_GET['id'] ?? $body['userId'] ?? 0);
        if ($userId === (int)$admin['id']) {
            jsonError('Tidak dapat menghapus akun Super Admin yang sedang aktif.', 400);
        }
        $pdo->prepare('DELETE FROM users WHERE id = ?')->execute([$userId]);
        jsonResponse(['ok' => true, 'message' => 'Akun berhasil dihapus dari database.']);
    }

    jsonError('Aksi admin tidak dikenali.', 404);
} catch (Throwable $e) {
    jsonError('Kesalahan server: ' . $e->getMessage(), 500);
}
