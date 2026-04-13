-- ═══════════════════════════════════════════════════════════════
--  Migration 002 — CRM + Newsletter
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS crm_contacts (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  email        VARCHAR(255) NOT NULL,
  first_name   VARCHAR(120) DEFAULT NULL,
  last_name    VARCHAR(120) DEFAULT NULL,
  company      VARCHAR(255) DEFAULT NULL,
  phone        VARCHAR(50)  DEFAULT NULL,
  city         VARCHAR(120) DEFAULT NULL,
  country      VARCHAR(4)   DEFAULT 'CH',
  source       VARCHAR(40)  DEFAULT 'manual',
  status       VARCHAR(30)  DEFAULT 'lead',
  tags         JSON         DEFAULT NULL,
  notes        TEXT         DEFAULT NULL,
  consent      TINYINT(1)   DEFAULT 0,
  unsubscribed TINYINT(1)   DEFAULT 0,
  unsub_token  VARCHAR(64)  DEFAULT NULL,
  last_seen_at DATETIME     DEFAULT NULL,
  created_at   DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_email (email),
  KEY idx_status (status),
  KEY idx_source (source)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS crm_campaigns (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  subject       VARCHAR(255) NOT NULL,
  from_name     VARCHAR(120) DEFAULT 'R3STO',
  from_email    VARCHAR(255) NOT NULL,
  html_body     MEDIUMTEXT   NOT NULL,
  text_body     MEDIUMTEXT   DEFAULT NULL,
  segment_json  JSON         DEFAULT NULL,
  status        VARCHAR(20)  DEFAULT 'draft',
  scheduled_at  DATETIME     DEFAULT NULL,
  sent_at       DATETIME     DEFAULT NULL,
  recipients_ct INT          DEFAULT 0,
  sent_ct       INT          DEFAULT 0,
  failed_ct     INT          DEFAULT 0,
  created_by    INT          DEFAULT NULL,
  created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS crm_sends (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  campaign_id  INT NOT NULL,
  contact_id   INT NOT NULL,
  email        VARCHAR(255) NOT NULL,
  status       VARCHAR(20) DEFAULT 'pending',
  error        TEXT DEFAULT NULL,
  message_id   VARCHAR(255) DEFAULT NULL,
  sent_at      DATETIME DEFAULT NULL,
  opened_at    DATETIME DEFAULT NULL,
  clicked_at   DATETIME DEFAULT NULL,
  KEY idx_campaign (campaign_id),
  KEY idx_contact (contact_id),
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS crm_interactions (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  contact_id   INT NOT NULL,
  type         VARCHAR(40) NOT NULL,
  subject      VARCHAR(255) DEFAULT NULL,
  body         TEXT DEFAULT NULL,
  metadata     JSON DEFAULT NULL,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_contact (contact_id),
  KEY idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
