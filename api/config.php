<?php
// CloudStream Web — MySQL Database Configuration (Laragon / XAMPP phpMyAdmin)

define('DB_HOST', getenv('CS_DB_HOST') ?: '127.0.0.1');
define('DB_PORT', getenv('CS_DB_PORT') ?: '3306');
define('DB_NAME', getenv('CS_DB_NAME') ?: 'cloudstream_web');
define('DB_USER', getenv('CS_DB_USER') ?: 'root');
define('DB_PASS', getenv('CS_DB_PASS') !== false ? getenv('CS_DB_PASS') : '');

// Session lifetime in days
define('SESSION_LIFETIME_DAYS', 30);

date_default_timezone_set('Asia/Jakarta');
