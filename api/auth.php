<?php
require_once __DIR__ . '/helpers.php';
sendCorsHeaders();

try {
    $pdo = getDB();
    $action = $_GET['action'] ?? '';
    $method = $_SERVER['REQUEST_METHOD'];

    // Health & DB Status check (public)
    if ($action === 'health') {
        $dbName = $pdo->query('SELECT DATABASE()')->fetchColumn();
        $userCount = (int)$pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
        jsonResponse([
            'ok' => true,
            'database' => $dbName,
            'usersCount' => $userCount,
            'phpVersion' => PHP_VERSION,
            'serverTime' => date('Y-m-d H:i:s'),
        ]);
    }

    // Login
    if ($method === 'POST' && $action === 'login') {
        $body = getJsonBody();
        $username = trim((string)($body['username'] ?? ''));
        $password = (string)($body['password'] ?? '');

        if ($username === '' || $password === '') {
            jsonError('Username dan password wajib diisi.', 400);
        }

        $stmt = $pdo->prepare('SELECT * FROM users WHERE username = ? OR email = ? LIMIT 1');
        $stmt->execute([$username, $username]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password_hash'])) {
            jsonError('Username atau password salah.', 401);
        }

        if (!(int)$user['is_active']) {
            jsonError('Akun Anda sedang dinonaktifkan. Hubungi Super Admin.', 403);
        }

        if ($user['role'] !== 'super_admin' && !empty($user['expires_at'])) {
            $exp = new DateTime($user['expires_at']);
            if ($exp < new DateTime()) {
                jsonError(
                    'Masa aktif akun Anda sudah habis sejak ' . $exp->format('d M Y H:i') . '. Hubungi Super Admin untuk perpanjangan durasi.',
                    403,
                    ['expired' => true]
                );
            }
        }

        // Create session token
        $token = bin2hex(random_bytes(32));
        $sessionExpiry = (new DateTime('+' . SESSION_LIFETIME_DAYS . ' days'))->format('Y-m-d H:i:s');

        $ins = $pdo->prepare('INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)');
        $ins->execute([(int)$user['id'], $token, $sessionExpiry]);

        $pdo->prepare('UPDATE users SET last_login_at = NOW() WHERE id = ?')->execute([(int)$user['id']]);
        seedDefaultUserWorkspace($pdo, (int)$user['id']);

        $user['last_login_at'] = date('Y-m-d H:i:s');
        jsonResponse([
            'ok' => true,
            'token' => $token,
            'user' => formatUserPayload($user),
        ]);
    }

    // Current user check
    if ($method === 'GET' && $action === 'me') {
        $user = requireAuth($pdo);
        jsonResponse([
            'ok' => true,
            'user' => formatUserPayload($user),
        ]);
    }

    // Logout
    if ($method === 'POST' && $action === 'logout') {
        $token = getBearerToken();
        if ($token) {
            $pdo->prepare('DELETE FROM sessions WHERE token = ?')->execute([$token]);
        }
        jsonResponse(['ok' => true]);
    }

    jsonError('Endpoint auth tidak ditemukan.', 404);
} catch (Throwable $e) {
    jsonError('Kesalahan server database: ' . $e->getMessage(), 500);
}
