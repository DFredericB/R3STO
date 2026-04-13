-- ═══════════════════════════════════════════════════════════════
--  R3STO — Migration 002 : CRM Contacts étendu
--  Table crm_contacts : création + colonnes étendues pour
--  le CRM unifié (Minotel, LinkedIn, Users, emails, prospects)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS `crm_contacts` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `email` varchar(255) DEFAULT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `company` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `country` varchar(10) DEFAULT 'CH',
  `source` varchar(100) DEFAULT 'manual',
  `status` varchar(50) DEFAULT 'lead',
  `tags` longtext DEFAULT NULL CHECK (json_valid(`tags`)),
  `notes` text DEFAULT NULL,
  `consent` tinyint(1) DEFAULT 0,
  `unsub_token` varchar(64) DEFAULT NULL,
  `unsubscribed` tinyint(1) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_crm_email` (`email`),
  KEY `idx_crm_status` (`status`),
  KEY `idx_crm_source` (`source`),
  KEY `idx_crm_city` (`city`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- @migration:split
-- Colonnes étendues pour le CRM unifié R3STO
ALTER TABLE `crm_contacts`
  ADD COLUMN IF NOT EXISTS `raison_sociale` varchar(255) DEFAULT NULL AFTER `company`,
  ADD COLUMN IF NOT EXISTS `address` varchar(500) DEFAULT NULL AFTER `phone`,
  ADD COLUMN IF NOT EXISTS `postal_code` varchar(10) DEFAULT NULL AFTER `address`,
  ADD COLUMN IF NOT EXISTS `canton` varchar(5) DEFAULT NULL AFTER `city`,
  ADD COLUMN IF NOT EXISTS `website` varchar(500) DEFAULT NULL AFTER `country`,
  ADD COLUMN IF NOT EXISTS `couverts` varchar(20) DEFAULT NULL AFTER `website`,
  ADD COLUMN IF NOT EXISTS `type_cuisine` varchar(255) DEFAULT NULL AFTER `couverts`,
  ADD COLUMN IF NOT EXISTS `concurrence` varchar(100) DEFAULT NULL AFTER `type_cuisine`,
  ADD COLUMN IF NOT EXISTS `date_contact` date DEFAULT NULL AFTER `notes`,
  ADD COLUMN IF NOT EXISTS `interest` tinyint(3) UNSIGNED DEFAULT NULL AFTER `date_contact`;

-- @migration:split
-- Index fulltext pour recherche rapide
ALTER TABLE `crm_contacts`
  ADD FULLTEXT INDEX IF NOT EXISTS `ft_crm_search` (`company`, `first_name`, `last_name`, `email`, `city`);

-- @migration:split
-- Tables campagnes + envois (si pas encore créées)
CREATE TABLE IF NOT EXISTS `crm_campaigns` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` varchar(200) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `from_name` varchar(100) DEFAULT 'R3STO',
  `from_email` varchar(255) DEFAULT 'contact@r3sto.ch',
  `html_body` longtext NOT NULL,
  `text_body` text DEFAULT NULL,
  `segment_json` longtext DEFAULT NULL CHECK (json_valid(`segment_json`)),
  `status` enum('draft','sending','sent','cancelled') DEFAULT 'draft',
  `recipients_ct` int(10) UNSIGNED DEFAULT 0,
  `sent_ct` int(10) UNSIGNED DEFAULT 0,
  `failed_ct` int(10) UNSIGNED DEFAULT 0,
  `sent_at` datetime DEFAULT NULL,
  `created_by` int(10) UNSIGNED DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- @migration:split
CREATE TABLE IF NOT EXISTS `crm_sends` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `campaign_id` int(10) UNSIGNED NOT NULL,
  `contact_id` int(10) UNSIGNED NOT NULL,
  `email` varchar(255) NOT NULL,
  `status` enum('sent','failed','bounced') DEFAULT 'sent',
  `error` text DEFAULT NULL,
  `message_id` varchar(255) DEFAULT NULL,
  `opened_at` datetime DEFAULT NULL,
  `clicked_at` datetime DEFAULT NULL,
  `sent_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_sends_campaign` (`campaign_id`),
  KEY `idx_sends_contact` (`contact_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
