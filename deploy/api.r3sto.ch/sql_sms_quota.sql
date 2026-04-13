-- R3STO — Ajout quota SMS par restaurant
-- À exécuter sur pl7wy9_R3STO via phpMyAdmin

ALTER TABLE restaurants
  ADD COLUMN sms_quota INT NOT NULL DEFAULT 0 COMMENT 'Quota SMS mensuel selon plan (0=bistro, 200=resto, 500=gastro)',
  ADD COLUMN sms_used INT NOT NULL DEFAULT 0 COMMENT 'SMS envoyés ce mois',
  ADD COLUMN sms_reset_date DATE NOT NULL DEFAULT (CURDATE()) COMMENT 'Date du prochain reset mensuel';

-- Mettre à jour les quotas selon les plans existants
UPDATE restaurants SET sms_quota = 0 WHERE plan = 'bistro';
UPDATE restaurants SET sms_quota = 200 WHERE plan = 'resto';
UPDATE restaurants SET sms_quota = 500 WHERE plan = 'gastro';

-- Fixer la date de reset au 1er du mois prochain
UPDATE restaurants SET sms_reset_date = DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 1 MONTH), '%Y-%m-01');

-- Colonne rappel 24h sur les réservations
ALTER TABLE reservations
  ADD COLUMN reminded_24h TINYINT NOT NULL DEFAULT 0 COMMENT '1 = rappel 24h envoyé';
