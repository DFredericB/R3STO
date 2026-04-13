-- ═══════════════════════════════════════════════════════════════
--  004 — Colonnes Marketplace pour la table restaurants
--  Ajoute les champs nécessaires à la page publique r3sto.ch/restaurants
-- ═══════════════════════════════════════════════════════════════

-- @migration:split
ALTER TABLE `restaurants`
  ADD COLUMN IF NOT EXISTS `cuisine_tag`     VARCHAR(60)   DEFAULT NULL AFTER `description`,
  ADD COLUMN IF NOT EXISTS `photo`           VARCHAR(500)  DEFAULT ''   AFTER `cuisine_tag`,
  ADD COLUMN IF NOT EXISTS `avg_price`       SMALLINT      DEFAULT 0    AFTER `photo`,
  ADD COLUMN IF NOT EXISTS `price_range`     VARCHAR(5)    DEFAULT '$$' AFTER `avg_price`,
  ADD COLUMN IF NOT EXISTS `rating`          DECIMAL(2,1)  DEFAULT 0    AFTER `price_range`,
  ADD COLUMN IF NOT EXISTS `reviews_count`   INT           DEFAULT 0    AFTER `rating`,
  ADD COLUMN IF NOT EXISTS `features`        JSON          DEFAULT NULL AFTER `reviews_count`,
  ADD COLUMN IF NOT EXISTS `promos`          JSON          DEFAULT NULL AFTER `features`,
  ADD COLUMN IF NOT EXISTS `boost_score`     TINYINT UNSIGNED DEFAULT 0 AFTER `promos`,
  ADD COLUMN IF NOT EXISTS `client_score`    TINYINT UNSIGNED DEFAULT 0 AFTER `boost_score`,
  ADD COLUMN IF NOT EXISTS `marketplace`     TINYINT(1)    DEFAULT 0    AFTER `client_score`,
  ADD COLUMN IF NOT EXISTS `booking_url`     VARCHAR(500)  DEFAULT ''   AFTER `marketplace`,
  ADD COLUMN IF NOT EXISTS `vitrine_url`     VARCHAR(500)  DEFAULT ''   AFTER `booking_url`;

-- @migration:split
-- Index pour les requêtes publiques marketplace
CREATE INDEX IF NOT EXISTS `idx_restaurants_marketplace` ON `restaurants` (`marketplace`, `status`);
