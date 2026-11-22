-- CloudStream Web MySQL Database Schema
-- Import via http://localhost/phpmyadmin/ or auto-initialized by api/db.php

CREATE DATABASE IF NOT EXISTS `cloudstream_web`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `cloudstream_web`;

CREATE TABLE IF NOT EXISTS `users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(60) NOT NULL,
  `full_name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(120) NULL DEFAULT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('super_admin', 'user') NOT NULL DEFAULT 'user',
  `duration_months` INT NULL DEFAULT NULL COMMENT 'NULL or 0 = Unlimited',
  `expires_at` DATETIME NULL DEFAULT NULL COMMENT 'NULL = Lifetime / Unlimited',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_by` INT UNSIGNED NULL DEFAULT NULL,
  `last_login_at` DATETIME NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_username` (`username`),
  UNIQUE KEY `uq_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sessions` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `token` CHAR(64) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sessions_token` (`token`),
  KEY `idx_sessions_user` (`user_id`),
  CONSTRAINT `fk_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `repositories` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `repo_key` VARCHAR(120) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `short_code` VARCHAR(60) NULL DEFAULT NULL,
  `url` TEXT NOT NULL,
  `icon_url` TEXT NULL DEFAULT NULL,
  `description` TEXT NULL DEFAULT NULL,
  `author` VARCHAR(120) NULL DEFAULT NULL,
  `built_in` TINYINT(1) NOT NULL DEFAULT 0,
  `has_android_cs3` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_repo` (`user_id`, `repo_key`),
  CONSTRAINT `fk_repos_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `extensions` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `repo_key` VARCHAR(120) NOT NULL,
  `plugin_key` VARCHAR(140) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `version` VARCHAR(40) NOT NULL DEFAULT '1.0.0',
  `language` VARCHAR(80) NOT NULL DEFAULT 'MULTI',
  `description` TEXT NULL DEFAULT NULL,
  `icon_url` TEXT NULL DEFAULT NULL,
  `icon_color` VARCHAR(25) NOT NULL DEFAULT '#3d63ff',
  `badge` VARCHAR(25) NOT NULL DEFAULT 'EXT',
  `runtime` VARCHAR(30) NOT NULL DEFAULT 'web',
  `url` TEXT NULL DEFAULT NULL,
  `catalog_url` TEXT NULL DEFAULT NULL,
  `m3u_url` TEXT NULL DEFAULT NULL,
  `categories_json` LONGTEXT NULL DEFAULT NULL,
  `tv_types_json` LONGTEXT NULL DEFAULT NULL,
  `inline_items_json` LONGTEXT NULL DEFAULT NULL,
  `file_size` BIGINT NOT NULL DEFAULT 0,
  `status` VARCHAR(25) NOT NULL DEFAULT 'active',
  `web_adapter` VARCHAR(40) NULL DEFAULT NULL COMMENT 'mysql_catalog | archive_org | m3u_url | json_catalog',
  `adapter_config_json` LONGTEXT NULL DEFAULT NULL,
  `is_installed` TINYINT(1) NOT NULL DEFAULT 0,
  `is_enabled` TINYINT(1) NOT NULL DEFAULT 0,
  `installed_at` DATETIME NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_plugin` (`user_id`, `repo_key`, `plugin_key`),
  KEY `idx_ext_user` (`user_id`),
  CONSTRAINT `fk_ext_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `custom_streams` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `media_key` VARCHAR(140) NOT NULL,
  `provider_id` VARCHAR(120) NOT NULL DEFAULT 'custom-streams',
  `title` VARCHAR(255) NOT NULL,
  `media_type` VARCHAR(30) NOT NULL DEFAULT 'movie',
  `stream_url` TEXT NOT NULL,
  `poster_url` TEXT NULL DEFAULT NULL,
  `quality` VARCHAR(40) NOT NULL DEFAULT 'Auto HLS',
  `payload_json` LONGTEXT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_stream` (`user_id`, `media_key`),
  CONSTRAINT `fk_streams_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `library_items` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `media_id` VARCHAR(140) NOT NULL,
  `status` VARCHAR(30) NOT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_library` (`user_id`, `media_id`),
  CONSTRAINT `fk_lib_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `watch_progress` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `media_id` VARCHAR(140) NOT NULL,
  `episode_id` VARCHAR(140) NULL DEFAULT NULL,
  `season_number` INT NULL DEFAULT NULL,
  `episode_number` INT NULL DEFAULT NULL,
  `current_time_sec` DOUBLE NOT NULL DEFAULT 0,
  `duration_sec` DOUBLE NOT NULL DEFAULT 0,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_progress` (`user_id`, `media_id`),
  CONSTRAINT `fk_prog_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `watched_episodes` (
  `user_id` INT UNSIGNED NOT NULL,
  `episode_id` VARCHAR(140) NOT NULL,
  `watched_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`, `episode_id`),
  CONSTRAINT `fk_wep_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `downloads` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `download_key` VARCHAR(180) NOT NULL,
  `media_id` VARCHAR(140) NOT NULL,
  `payload_json` LONGTEXT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_dl` (`user_id`, `download_key`),
  CONSTRAINT `fk_dl_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_settings` (
  `user_id` INT UNSIGNED NOT NULL,
  `settings_json` LONGTEXT NOT NULL,
  `search_history_json` LONGTEXT NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_settings_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
