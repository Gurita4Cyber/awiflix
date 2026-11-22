<?php
require_once __DIR__ . '/db.php';

function sendCorsHeaders(): void {
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

function jsonResponse(array $data, int $status = 200): void {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function jsonError(string $message, int $status = 400, array $extra = []): void {
    jsonResponse(array_merge(['ok' => false, 'error' => $message], $extra), $status);
}

function getJsonBody(): array {
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function getBearerToken(): ?string {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (!$header && function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        $header = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }
    if (preg_match('/Bearer\s+([a-f0-9]{64})/i', $header, $m)) {
        return $m[1];
    }
    if (!empty($_GET['token']) && preg_match('/^[a-f0-9]{64}$/i', $_GET['token'])) {
        return $_GET['token'];
    }
    return null;
}

function formatUserPayload(array $u): array {
    $now = new DateTime();
    $isExpired = false;
    $daysRemaining = null;

    if ($u['role'] !== 'super_admin' && !empty($u['expires_at'])) {
        $exp = new DateTime($u['expires_at']);
        $isExpired = $exp < $now;
        $diff = $now->diff($exp);
        $daysRemaining = $isExpired ? 0 : (int)$diff->days + 1;
    }

    return [
        'id' => (int)$u['id'],
        'username' => $u['username'],
        'fullName' => $u['full_name'],
        'email' => $u['email'],
        'role' => $u['role'],
        'durationMonths' => $u['duration_months'] !== null ? (int)$u['duration_months'] : null,
        'expiresAt' => $u['expires_at'],
        'isActive' => (bool)$u['is_active'],
        'isExpired' => $isExpired,
        'daysRemaining' => $daysRemaining,
        'lastLoginAt' => $u['last_login_at'],
        'createdAt' => $u['created_at'],
    ];
}

function requireAuth(PDO $pdo): array {
    $token = getBearerToken();
    if (!$token) {
        jsonError('Silakan login terlebih dahulu.', 401);
    }

    $stmt = $pdo->prepare(
        'SELECT u.*, s.expires_at AS session_expires_at
         FROM sessions s
         INNER JOIN users u ON u.id = s.user_id
         WHERE s.token = ? AND s.expires_at > NOW()
         LIMIT 1'
    );
    $stmt->execute([$token]);
    $user = $stmt->fetch();

    if (!$user) {
        jsonError('Sesi login tidak valid atau telah berakhir. Silakan login ulang.', 401);
    }

    if (!(int)$user['is_active']) {
        jsonError('Akun Anda dinonaktifkan oleh Super Admin.', 403);
    }

    if ($user['role'] !== 'super_admin' && !empty($user['expires_at'])) {
        $exp = new DateTime($user['expires_at']);
        if ($exp < new DateTime()) {
            jsonError(
                'Masa aktif akun Anda telah berakhir pada ' . $exp->format('d M Y H:i') . '. Hubungi Super Admin untuk perpanjangan.',
                403,
                ['expired' => true]
            );
        }
    }

    return $user;
}

function requireSuperAdmin(PDO $pdo): array {
    $user = requireAuth($pdo);
    if ($user['role'] !== 'super_admin') {
        jsonError('Akses ditolak. Hanya Super Admin yang diizinkan.', 403);
    }
    return $user;
}
