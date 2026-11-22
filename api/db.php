<?php
require_once __DIR__ . '/config.php';

/**
 * Returns a shared PDO instance connected to `cloudstream_web`.
 * Automatically creates the database, all tables, and default Super Admin / Demo User if not yet initialized.
 */
function getDB(): PDO {
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    try {
        $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', DB_HOST, DB_PORT, DB_NAME);
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
        ensureSchemaAndSeed($pdo);
        return $pdo;
    } catch (PDOException $e) {
        // Error 1049 = Unknown database -> create it automatically
        if ((int)$e->getCode() === 1049 || str_contains($e->getMessage(), 'Unknown database')) {
            $rootDsn = sprintf('mysql:host=%s;port=%s;charset=utf8mb4', DB_HOST, DB_PORT);
            $rootPdo = new PDO($rootDsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            ]);
            $rootPdo->exec(sprintf(
                'CREATE DATABASE IF NOT EXISTS `%s` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
                DB_NAME
            ));

            $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', DB_HOST, DB_PORT, DB_NAME);
            $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
            ensureSchemaAndSeed($pdo);
            return $pdo;
        }
        throw $e;
    }
}

function ensureSchemaAndSeed(PDO $pdo): void {
    // Check if users table exists
    $stmt = $pdo->query("SHOW TABLES LIKE 'users'");
    if ($stmt->rowCount() === 0) {
        $sqlFile = dirname(__DIR__) . '/database/cloudstream_web.sql';
        if (file_exists($sqlFile)) {
            $sql = file_get_contents($sqlFile);
            // Strip SQL comments, CREATE DATABASE, and USE statements
            $sql = preg_replace('/^\s*--.*$/m', '', $sql);
            $sql = preg_replace('/CREATE DATABASE.*?;/is', '', $sql);
            $sql = preg_replace('/USE\s+`?[^;`]+`?;/is', '', $sql);
            $statements = array_filter(array_map('trim', explode(';', $sql)));
            foreach ($statements as $query) {
                if ($query !== '') {
                    $pdo->exec($query);
                }
            }
        }
    }

    // Incremental migration for existing DBs: add web_adapter columns & media_items table if missing
    $colCheck = $pdo->query("SHOW COLUMNS FROM extensions LIKE 'web_adapter'");
    if ($colCheck->rowCount() === 0) {
        $pdo->exec("ALTER TABLE extensions ADD COLUMN web_adapter VARCHAR(40) NULL DEFAULT NULL AFTER status");
        $pdo->exec("ALTER TABLE extensions ADD COLUMN adapter_config_json LONGTEXT NULL DEFAULT NULL AFTER web_adapter");
    }

    $mediaTbl = $pdo->query("SHOW TABLES LIKE 'media_items'");
    if ($mediaTbl->rowCount() === 0) {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS `media_items` (
              `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
              `media_key` VARCHAR(140) NOT NULL,
              `provider_id` VARCHAR(140) NOT NULL,
              `title` VARCHAR(255) NOT NULL,
              `original_title` VARCHAR(255) NULL DEFAULT NULL,
              `media_type` VARCHAR(30) NOT NULL DEFAULT 'movie',
              `year` INT NOT NULL DEFAULT 2026,
              `rating` DECIMAL(3,1) NOT NULL DEFAULT 8.0,
              `duration` VARCHAR(60) NOT NULL DEFAULT 'HD',
              `quality` VARCHAR(40) NOT NULL DEFAULT '1080p',
              `genres_json` TEXT NULL DEFAULT NULL,
              `poster_url` TEXT NULL DEFAULT NULL,
              `backdrop_url` TEXT NULL DEFAULT NULL,
              `synopsis` TEXT NULL DEFAULT NULL,
              `streams_json` LONGTEXT NOT NULL,
              `seasons_json` LONGTEXT NULL DEFAULT NULL,
              `created_by` INT UNSIGNED NULL DEFAULT NULL,
              `is_global` TINYINT(1) NOT NULL DEFAULT 1,
              `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              PRIMARY KEY (`id`),
              UNIQUE KEY `uq_media_key` (`media_key`),
              KEY `idx_media_provider` (`provider_id`),
              CONSTRAINT `fk_media_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
    }

    // Seed default Super Admin if none exists
    $adminCount = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role = 'super_admin'")->fetchColumn();
    if ($adminCount === 0) {
        $insert = $pdo->prepare(
            "INSERT INTO users (username, full_name, email, password_hash, role, duration_months, expires_at, is_active)
             VALUES (:username, :full_name, :email, :password_hash, :role, :duration_months, :expires_at, 1)"
        );

        // Default Super Admin: superadmin / admin123
        $insert->execute([
            ':username' => 'superadmin',
            ':full_name' => 'Super Administrator',
            ':email' => 'admin@cloudstream.local',
            ':password_hash' => password_hash('admin123', PASSWORD_BCRYPT),
            ':role' => 'super_admin',
            ':duration_months' => null,
            ':expires_at' => null,
        ]);
        $adminId = (int)$pdo->lastInsertId();
        seedDefaultUserWorkspace($pdo, $adminId);

        // Default Demo Subscriber (1 month): demo / demo123
        $demoExpiry = (new DateTime('+1 month'))->format('Y-m-d H:i:s');
        $insert->execute([
            ':username' => 'demo',
            ':full_name' => 'Demo User (1 Bulan)',
            ':email' => 'demo@cloudstream.local',
            ':password_hash' => password_hash('demo123', PASSWORD_BCRYPT),
            ':role' => 'user',
            ':duration_months' => 1,
            ':expires_at' => $demoExpiry,
        ]);
        $demoId = (int)$pdo->lastInsertId();
        seedDefaultUserWorkspace($pdo, $demoId);
    }
}

/**
 * Seeds default built-in repositories, plugins, and settings in MySQL for a newly created user.
 */
function seedDefaultUserWorkspace(PDO $pdo, int $userId): void {
    $checkRepo = $pdo->prepare('SELECT COUNT(*) FROM repositories WHERE user_id = ?');
    $checkRepo->execute([$userId]);
    if ((int)$checkRepo->fetchColumn() > 0) {
        return;
    }

    $defaultRepos = [
        [
            'repo_key' => 'repo-official',
            'name' => 'CloudStream Web Official Repo',
            'short_code' => 'official',
            'url' => 'https://raw.githubusercontent.com/recloudstream/cloudstream/master/repo-web-official.json',
            'description' => 'Official open-source cinema, Blender Studio releases, and adaptive HLS demo providers.',
            'author' => 'reCloudStream Web',
            'built_in' => 1,
            'has_android_cs3' => 0,
            'plugins' => [
                [
                    'plugin_key' => 'blender-open',
                    'name' => 'Blender Open Cinema',
                    'version' => '2.4.0',
                    'language' => 'EN / ID',
                    'categories' => ['movie', 'anime'],
                    'description' => 'High-definition Creative Commons Open Movies & animated shorts by Blender Studio.',
                    'icon_color' => '#f59e0b',
                    'badge' => '4K / HD',
                    'runtime' => 'web',
                ],
                [
                    'plugin_key' => 'hls-theater',
                    'name' => 'Adaptive HLS Theater',
                    'version' => '1.9.2',
                    'language' => 'MULTI',
                    'categories' => ['movie', 'series', 'documentary'],
                    'description' => 'Adaptive bitrate .m3u8 streams powered by HLS.js with multi-quality switching.',
                    'icon_color' => '#3d63ff',
                    'badge' => 'HLS',
                    'runtime' => 'web',
                ],
            ],
        ],
        [
            'repo_key' => 'repo-community',
            'name' => 'Open Archive & Live Streams Repo',
            'short_code' => 'archive',
            'url' => 'https://cloudstream-web.community/repos/archive-live.json',
            'description' => 'Public domain documentaries, sci-fi anthologies, and live HLS streaming channels.',
            'author' => 'CS Community',
            'built_in' => 1,
            'has_android_cs3' => 0,
            'plugins' => [
                [
                    'plugin_key' => 'archive-classics',
                    'name' => 'Public Domain Vault',
                    'version' => '1.5.1',
                    'language' => 'EN',
                    'categories' => ['movie', 'documentary', 'series'],
                    'description' => 'Curated open-license features, automotive docs, and classic anthology reels.',
                    'icon_color' => '#10b981',
                    'badge' => 'FREE',
                    'runtime' => 'web',
                ],
                [
                    'plugin_key' => 'live-hls',
                    'name' => 'Live HLS & Test Streams',
                    'version' => '1.3.0',
                    'language' => 'MULTI',
                    'categories' => ['live'],
                    'description' => 'Live adaptive HLS feeds and broadcast streams compatible with CloudStream Player.',
                    'icon_color' => '#f43f5e',
                    'badge' => 'LIVE',
                    'runtime' => 'web',
                ],
                [
                    'plugin_key' => 'custom-streams',
                    'name' => 'Direct Stream & M3U Provider',
                    'version' => '1.0.0',
                    'language' => 'USER',
                    'categories' => ['movie', 'live', 'series'],
                    'description' => 'Play your own .m3u8, .mp4, or imported #EXTM3U IPTV playlists inside CloudStream Web.',
                    'icon_color' => '#8b5cf6',
                    'badge' => 'M3U',
                    'runtime' => 'web',
                ],
            ],
        ],
    ];

    $insRepo = $pdo->prepare(
        'INSERT IGNORE INTO repositories (user_id, repo_key, name, short_code, url, description, author, built_in, has_android_cs3)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $insExt = $pdo->prepare(
        'INSERT IGNORE INTO extensions
         (user_id, repo_key, plugin_key, name, version, language, description, icon_color, badge, runtime, categories_json, status, is_installed, is_enabled, installed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, "active", 1, 1, NOW())'
    );

    foreach ($defaultRepos as $repo) {
        $insRepo->execute([
            $userId,
            $repo['repo_key'],
            $repo['name'],
            $repo['short_code'],
            $repo['url'],
            $repo['description'],
            $repo['author'],
            $repo['built_in'],
            $repo['has_android_cs3'],
        ]);
        foreach ($repo['plugins'] as $p) {
            $insExt->execute([
                $userId,
                $repo['repo_key'],
                $p['plugin_key'],
                $p['name'],
                $p['version'],
                $p['language'],
                $p['description'],
                $p['icon_color'],
                $p['badge'],
                $p['runtime'],
                json_encode($p['categories']),
            ]);
        }
    }

    $defaultSettings = [
        'language' => 'id',
        'theme' => 'dark',
        'accent' => 'blue',
        'showClockInPlayer' => true,
        'autoPlayNext' => true,
        'skipSeconds' => 10,
        'introSkipSeconds' => 85,
        'subtitleSize' => 18,
        'subtitleBgOpacity' => 0.65,
        'defaultProvider' => 'all',
    ];
    $insSet = $pdo->prepare(
        'INSERT IGNORE INTO user_settings (user_id, settings_json, search_history_json) VALUES (?, ?, ?)'
    );
    $insSet->execute([
        $userId,
        json_encode($defaultSettings),
        json_encode(['Sintel', 'Tears of Steel', 'HLS', 'Horizon']),
    ]);
}
