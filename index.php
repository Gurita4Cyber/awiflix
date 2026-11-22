<?php
// Universal Entry Point for CloudStream Web:
// Routes /api/* to the backend API, and serves production dist/ assets for frontend.

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// 1. Backend API routes: /api/...
if (str_starts_with($uri, '/api/')) {
    $script = __DIR__ . $uri;
    if (file_exists($script) && is_file($script)) {
        require $script;
        exit;
    }
}

// 2. Static assets in /dist/assets/... or /dist/...
$distPath = __DIR__ . '/dist' . $uri;
if (file_exists($distPath) && is_file($distPath)) {
    $ext = strtolower(pathinfo($distPath, PATHINFO_EXTENSION));
    $mimes = [
        'js' => 'text/javascript; charset=utf-8',
        'mjs' => 'text/javascript; charset=utf-8',
        'css' => 'text/css; charset=utf-8',
        'svg' => 'image/svg+xml',
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'webp' => 'image/webp',
        'mp4' => 'video/mp4',
        'json' => 'application/json',
        'woff' => 'font/woff',
        'woff2' => 'font/woff2',
    ];

    if (isset($mimes[$ext])) {
        header('Content-Type: ' . $mimes[$ext]);
    }
    header('Cache-Control: public, max-age=31536000, immutable');
    readfile($distPath);
    exit;
}

// 3. SPA Fallback: serve compiled dist/index.html
$indexFile = __DIR__ . '/dist/index.html';
if (file_exists($indexFile)) {
    header('Content-Type: text/html; charset=utf-8');
    readfile($indexFile);
    exit;
}

// 4. Vite Dev Fallback if dist doesn't exist
$rootIndex = __DIR__ . '/index.html';
if (file_exists($rootIndex)) {
    header('Content-Type: text/html; charset=utf-8');
    readfile($rootIndex);
    exit;
}
