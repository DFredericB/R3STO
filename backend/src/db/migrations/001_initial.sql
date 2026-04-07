-- ═══════════════════════════════════════════════════════════════
--  R3STO — Baseline migration (idempotente)
--  Reflète la structure RÉELLE de pl7wy9_R3STO (13 tables prod).
--  CREATE TABLE IF NOT EXISTS → safe sur la base existante.
-- ═══════════════════════════════════════════════════════════════

-- ─── users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `name` varchar(255) DEFAULT '',
  `phone` varchar(50) DEFAULT '',
  `role` enum('owner','manager','staff','superadmin','admin') DEFAULT 'owner',
  `plan` enum('free','bistro','resto','gastro') DEFAULT 'free',
  `stripe_customer_id` varchar(255) DEFAULT NULL,
  `stripe_subscription_id` varchar(255) DEFAULT NULL,
  `status` enum('active','suspended','deleted') DEFAULT 'active',
  `email_verified` tinyint(1) DEFAULT 0,
  `last_login` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── restaurants ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `restaurants` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `slug` varchar(255) DEFAULT NULL,
  `type` enum('restaurant','cafe','bar','brasserie','pizzeria','other') DEFAULT 'restaurant',
  `address` varchar(500) DEFAULT '',
  `city` varchar(100) DEFAULT '',
  `postal_code` varchar(20) DEFAULT '',
  `canton` varchar(50) DEFAULT '',
  `country` varchar(50) DEFAULT 'CH',
  `phone` varchar(50) DEFAULT '',
  `email` varchar(255) DEFAULT '',
  `website` varchar(500) DEFAULT '',
  `capacity` int(11) DEFAULT 0,
  `logo_url` varchar(500) DEFAULT '',
  `cover_url` varchar(500) DEFAULT '',
  `description` text DEFAULT NULL,
  `currency` varchar(10) DEFAULT 'CHF',
  `timezone` varchar(50) DEFAULT 'Europe/Zurich',
  `status` enum('active','inactive','setup','suspended') DEFAULT 'setup',
  `settings` longtext DEFAULT NULL CHECK (json_valid(`settings`)),
  `sms_quota` int(11) NOT NULL DEFAULT 0,
  `sms_used` int(11) NOT NULL DEFAULT 0,
  `sms_reset_date` date NOT NULL DEFAULT curdate(),
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_restaurants_user` (`user_id`),
  KEY `idx_restaurants_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── reservations ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `reservations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `restaurant_id` int(11) NOT NULL,
  `guest_name` varchar(255) NOT NULL,
  `guest_email` varchar(255) DEFAULT '',
  `guest_phone` varchar(50) DEFAULT '',
  `party_size` int(11) DEFAULT 2,
  `date` date NOT NULL,
  `time` time NOT NULL,
  `status` enum('reserved','confirmed','arrived','seated','done','noshow','cancelled') DEFAULT 'reserved',
  `notes` text DEFAULT NULL,
  `source` enum('app','widget','phone','walkin','admin') DEFAULT 'app',
  `table_id` int(11) DEFAULT NULL,
  `reminded_24h` tinyint(4) NOT NULL DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_resa_restaurant` (`restaurant_id`),
  KEY `idx_resa_date` (`restaurant_id`,`date`),
  KEY `idx_resa_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── sessions ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `sessions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `token` varchar(500) NOT NULL,
  `ip` varchar(50) DEFAULT '',
  `user_agent` varchar(500) DEFAULT '',
  `expires_at` datetime NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_sessions_user` (`user_id`),
  KEY `idx_sessions_expires` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── salles ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `salles` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `restaurant_id` int(10) UNSIGNED NOT NULL,
  `nom` varchar(100) NOT NULL,
  `capacite` int(10) UNSIGNED DEFAULT 0,
  `actif` tinyint(1) DEFAULT 1,
  `position` int(10) UNSIGNED DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_salles_restaurant` (`restaurant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ─── tables ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `tables` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `restaurant_id` int(10) UNSIGNED NOT NULL,
  `salle_id` int(10) UNSIGNED DEFAULT NULL,
  `numero` varchar(20) NOT NULL,
  `nom` varchar(60) DEFAULT NULL,
  `couverts_min` int(10) UNSIGNED DEFAULT 1,
  `couverts_max` int(10) UNSIGNED DEFAULT 4,
  `forme` enum('round','rect','square','oval','banquette','bar') DEFAULT 'square',
  `pos_x` decimal(6,2) DEFAULT 0.00,
  `pos_y` decimal(6,2) DEFAULT 0.00,
  `pos_w` decimal(6,2) DEFAULT 9.00,
  `pos_h` decimal(6,2) DEFAULT 9.00,
  `actif` tinyint(1) DEFAULT 1,
  `blocked` tinyint(1) DEFAULT 0,
  `blocked_reason` varchar(120) DEFAULT NULL,
  `held` tinyint(1) DEFAULT 0,
  `priority` tinyint(4) DEFAULT 5,
  `zone` enum('fenetre','bar','cuisine','terrasse','centre','privee','autre') DEFAULT 'autre',
  `layer_pos` longtext DEFAULT NULL CHECK (json_valid(`layer_pos`)),
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_tables_restaurant` (`restaurant_id`),
  KEY `idx_tables_salle` (`salle_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ─── combos ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `combos` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `restaurant_id` int(10) UNSIGNED NOT NULL,
  `label` varchar(60) NOT NULL,
  `table_ids` longtext NOT NULL CHECK (json_valid(`table_ids`)),
  `couverts_min` tinyint(3) UNSIGNED NOT NULL DEFAULT 2,
  `couverts_max` tinyint(3) UNSIGNED NOT NULL,
  `cap_override` tinyint(3) UNSIGNED DEFAULT NULL,
  `align` enum('L','C','R') NOT NULL DEFAULT 'C',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_combos_restaurant` (`restaurant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── services ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `services` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `restaurant_id` int(10) UNSIGNED NOT NULL,
  `salle_id` int(10) UNSIGNED DEFAULT NULL,
  `nom` varchar(100) NOT NULL,
  `type` enum('midi','soir','brunch','autre') DEFAULT 'midi',
  `heure_debut` time NOT NULL,
  `heure_fin` time NOT NULL,
  `jours` varchar(20) DEFAULT '1,2,3,4,5',
  `actif` tinyint(1) DEFAULT 1,
  `last_order` time DEFAULT NULL,
  `buffer_mins` smallint(6) DEFAULT 0,
  `booking_cutoff_mins` smallint(6) DEFAULT 0,
  `slot_interval` tinyint(4) DEFAULT 15,
  `max_per_slot` tinyint(4) DEFAULT NULL,
  `max_cvt_per_slot` smallint(6) DEFAULT NULL,
  `max_resas` smallint(6) DEFAULT NULL,
  `icon` varchar(4) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_services_restaurant` (`restaurant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ─── fermetures ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `fermetures` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `restaurant_id` int(10) UNSIGNED NOT NULL,
  `label` varchar(80) NOT NULL,
  `date_debut` date NOT NULL,
  `date_fin` date DEFAULT NULL,
  `type` enum('restaurant','salle','service','vacances','ferie','exception') NOT NULL DEFAULT 'restaurant',
  `salle_id` int(10) UNSIGNED DEFAULT NULL,
  `service_id` int(10) UNSIGNED DEFAULT NULL,
  `note` varchar(200) DEFAULT NULL,
  `actif` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_ferm_restaurant` (`restaurant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── options_restaurant ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS `options_restaurant` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `restaurant_id` int(10) UNSIGNED NOT NULL,
  `wifi` tinyint(1) DEFAULT 0,
  `parking` tinyint(1) DEFAULT 0,
  `terrasse` tinyint(1) DEFAULT 0,
  `accessible` tinyint(1) DEFAULT 0,
  `animaux` tinyint(1) DEFAULT 0,
  `langues` varchar(50) DEFAULT 'fr',
  `annulation_h` int(10) UNSIGNED DEFAULT 24,
  `widget_couleur` varchar(7) DEFAULT '#1c4f90',
  `widget_actif` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_opts_restaurant` (`restaurant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ─── clients (CRM) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `clients` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `restaurant_id` int(10) UNSIGNED NOT NULL,
  `prenom` varchar(80) DEFAULT NULL,
  `nom` varchar(80) NOT NULL,
  `email` varchar(160) DEFAULT NULL,
  `telephone` varchar(30) DEFAULT NULL,
  `note` text DEFAULT NULL,
  `nb_visites` int(10) UNSIGNED DEFAULT 0,
  `nb_noshows` int(10) UNSIGNED DEFAULT 0,
  `blacklist` tinyint(1) DEFAULT 0,
  `blacklist_raison` varchar(255) DEFAULT NULL,
  `dateNaissance` varchar(10) DEFAULT NULL,
  `menuDuJourOptin` tinyint(1) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_clients_restaurant` (`restaurant_id`),
  KEY `idx_clients_email` (`email`),
  KEY `idx_clients_tel` (`telephone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ─── waitlist ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `waitlist` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `restaurant_id` int(10) UNSIGNED NOT NULL,
  `client_nom` varchar(160) NOT NULL,
  `client_email` varchar(160) DEFAULT NULL,
  `client_tel` varchar(30) DEFAULT NULL,
  `couverts` int(10) UNSIGNED DEFAULT 2,
  `date_souhaitee` date DEFAULT NULL,
  `service_id` int(10) UNSIGNED DEFAULT NULL,
  `statut` enum('waiting','notified','confirmed','expired') DEFAULT 'waiting',
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_waitlist_restaurant` (`restaurant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ─── action_logs (audit trail) ────────────────────────────────
CREATE TABLE IF NOT EXISTS `action_logs` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `restaurant_id` int(10) UNSIGNED NOT NULL,
  `reservation_id` int(10) UNSIGNED DEFAULT NULL,
  `ts` datetime NOT NULL DEFAULT current_timestamp(),
  `action` varchar(80) NOT NULL,
  `detail` varchar(200) DEFAULT NULL,
  `type` varchar(20) NOT NULL,
  `icon` varchar(4) DEFAULT NULL,
  `user_name` varchar(60) DEFAULT 'Système',
  `user_role` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_logs_restaurant` (`restaurant_id`),
  KEY `idx_logs_ts` (`restaurant_id`,`ts`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
