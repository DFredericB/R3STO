-- ═══════════════════════════════════════════════════
--  R3STO — table bookings (réservations clients)
--  À exécuter dans phpMyAdmin Infomaniak sur la DB pl7wy9_R3STO
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS `bookings` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ref` VARCHAR(32) NOT NULL UNIQUE,
  `resto_slug` VARCHAR(128) NOT NULL,
  `client_name` VARCHAR(180) NOT NULL,
  `client_email` VARCHAR(180) NOT NULL,
  `client_phone` VARCHAR(40) NULL,
  `date` DATE NOT NULL,
  `time` TIME NOT NULL,
  `pax` TINYINT UNSIGNED NOT NULL,
  `notes` TEXT NULL,
  `status` ENUM('pending','confirmed','cancelled','no_show','honored') NOT NULL DEFAULT 'pending',
  `confirm_token` VARCHAR(64) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_slug_date` (`resto_slug`, `date`),
  KEY `idx_email` (`client_email`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
