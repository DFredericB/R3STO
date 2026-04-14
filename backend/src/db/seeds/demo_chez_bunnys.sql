-- ═══════════════════════════════════════════════════════════════
--  SEED — tenant démo "Chez Bunny's" (slug: chez-bunnys)
--  Import via phpMyAdmin MariaDB Infomaniak.
--  Idempotent : purge préalable puis INSERT fresh.
--
--  Crée : 1 user démo + 1 restaurant + 2 salles + 12 tables +
--         3 combos + 2 services + options_restaurant
--  Les clients et réservations sont seedés par POST /public/demo/reset
-- ═══════════════════════════════════════════════════════════════

-- ─── 0) Purge des données démo existantes (cascade manuelle) ───
SET @rid = (SELECT id FROM restaurants WHERE slug = 'chez-bunnys' LIMIT 1);

DELETE FROM action_logs         WHERE restaurant_id = @rid;
DELETE FROM waitlist            WHERE restaurant_id = @rid;
DELETE FROM reservations        WHERE restaurant_id = @rid;
DELETE FROM clients             WHERE restaurant_id = @rid;
DELETE FROM combos              WHERE restaurant_id = @rid;
DELETE FROM tables              WHERE restaurant_id = @rid;
DELETE FROM services            WHERE restaurant_id = @rid;
DELETE FROM fermetures          WHERE restaurant_id = @rid;
DELETE FROM options_restaurant  WHERE restaurant_id = @rid;
DELETE FROM salles              WHERE restaurant_id = @rid;
DELETE FROM restaurants         WHERE slug = 'chez-bunnys';
DELETE FROM users               WHERE email = 'demo@r3sto.ch';

-- ─── 1) User démo (owner) ─────────────────────────────────────
-- Mot de passe non utilisé (bypass demo côté front), bcrypt placeholder.
INSERT INTO users (email, password, name, role, plan, status, email_verified, created_at)
VALUES ('demo@r3sto.ch',
        '$2b$10$DEMO_USER_NO_LOGIN_BYPASS_HANDLED_BY_FRONTEND',
        'Demo R3STO',
        'superadmin',
        'gastro',
        'active',
        1,
        NOW());
SET @uid = LAST_INSERT_ID();

-- ─── 2) Restaurant "Chez Bunny's" ─────────────────────────────
INSERT INTO restaurants (
  user_id, name, slug, type,
  address, city, postal_code, canton, country,
  phone, email, website,
  capacity, description,
  currency, timezone, status, created_at
) VALUES (
  @uid, 'Chez Bunny''s', 'chez-bunnys', 'restaurant',
  'Rue du Marché 12', 'Lausanne', '1003', 'VD', 'CH',
  '+41 21 555 00 00', 'contact@chez-bunnys.demo', 'https://chez-bunnys.demo',
  48, 'Bistro contemporain — carte de saison, vins locaux, terrasse ombragée. Démo R3STO.',
  'CHF', 'Europe/Zurich', 'active', NOW()
);
SET @rid = LAST_INSERT_ID();

-- ─── 3) Salles (2) ────────────────────────────────────────────
INSERT INTO salles (restaurant_id, nom, capacite, actif, position) VALUES
  (@rid, 'Intérieur', 36, 1, 1),
  (@rid, 'Terrasse',  12, 1, 2);
SET @salle_int = (SELECT id FROM salles WHERE restaurant_id = @rid AND nom = 'Intérieur' LIMIT 1);
SET @salle_ter = (SELECT id FROM salles WHERE restaurant_id = @rid AND nom = 'Terrasse'  LIMIT 1);

-- ─── 4) Tables (12) — 9 intérieur + 3 terrasse ────────────────
INSERT INTO tables (restaurant_id, salle_id, numero, couverts_min, couverts_max, forme, pos_x, pos_y, pos_w, pos_h, zone, priority) VALUES
  (@rid, @salle_int, '1',  1, 2, 'round',  10,  10,  8,  8, 'fenetre', 5),
  (@rid, @salle_int, '2',  2, 2, 'round',  22,  10,  8,  8, 'fenetre', 5),
  (@rid, @salle_int, '3',  2, 4, 'square', 10,  24, 10, 10, 'centre',  5),
  (@rid, @salle_int, '4',  2, 4, 'square', 26,  24, 10, 10, 'centre',  5),
  (@rid, @salle_int, '5',  2, 4, 'square', 42,  24, 10, 10, 'centre',  5),
  (@rid, @salle_int, '6',  4, 6, 'rect',   10,  40, 16, 10, 'centre',  5),
  (@rid, @salle_int, '7',  4, 6, 'rect',   32,  40, 16, 10, 'centre',  5),
  (@rid, @salle_int, '8',  2, 4, 'square', 54,  40, 10, 10, 'bar',     6),
  (@rid, @salle_int, '9',  2, 4, 'square', 54,  54, 10, 10, 'bar',     6),
  (@rid, @salle_ter, 'T1', 2, 4, 'round',  10,  10, 10, 10, 'terrasse', 5),
  (@rid, @salle_ter, 'T2', 2, 4, 'round',  24,  10, 10, 10, 'terrasse', 5),
  (@rid, @salle_ter, 'T3', 4, 6, 'rect',   10,  26, 16, 10, 'terrasse', 5);

-- ─── 5) Combos (3) — fusions pour gros groupes ────────────────
-- Note: table_ids est JSON d'array des IDs de tables (pas des numéros)
SET @t6 = (SELECT id FROM tables WHERE restaurant_id = @rid AND numero = '6' LIMIT 1);
SET @t7 = (SELECT id FROM tables WHERE restaurant_id = @rid AND numero = '7' LIMIT 1);
SET @t3 = (SELECT id FROM tables WHERE restaurant_id = @rid AND numero = '3' LIMIT 1);
SET @t4 = (SELECT id FROM tables WHERE restaurant_id = @rid AND numero = '4' LIMIT 1);
SET @t5 = (SELECT id FROM tables WHERE restaurant_id = @rid AND numero = '5' LIMIT 1);
SET @tT1 = (SELECT id FROM tables WHERE restaurant_id = @rid AND numero = 'T1' LIMIT 1);
SET @tT2 = (SELECT id FROM tables WHERE restaurant_id = @rid AND numero = 'T2' LIMIT 1);

INSERT INTO combos (restaurant_id, label, table_ids, couverts_min, couverts_max, align) VALUES
  (@rid, '6+7 (groupe 8-12)',    CONCAT('[', @t6, ',', @t7, ']'),              8, 12, 'C'),
  (@rid, '3+4+5 (groupe 10-14)', CONCAT('[', @t3, ',', @t4, ',', @t5, ']'),   10, 14, 'C'),
  (@rid, 'T1+T2 (terrasse 6-8)', CONCAT('[', @tT1, ',', @tT2, ']'),            6,  8, 'C');

-- ─── 6) Services (2) — midi + soir, 7j/7 ──────────────────────
INSERT INTO services (
  restaurant_id, nom, type, heure_debut, heure_fin, jours, actif,
  last_order, slot_interval, max_per_slot, max_cvt_per_slot, booking_cutoff_mins, icon
) VALUES
  (@rid, 'Midi', 'midi', '11:45:00', '14:30:00', '1,2,3,4,5,6,0', 1,
   '14:00:00', 15, 6, 18, 60, '🥗'),
  (@rid, 'Soir', 'soir', '18:30:00', '22:30:00', '2,3,4,5,6',     1,
   '21:30:00', 15, 8, 24, 60, '🍷');

-- ─── 7) Options restaurant ────────────────────────────────────
-- Backticks obligatoires sur `accessible` (mot reserve MariaDB)
INSERT INTO options_restaurant (
  `restaurant_id`, `wifi`, `parking`, `terrasse`, `accessible`, `animaux`,
  `langues`, `annulation_h`, `widget_couleur`, `widget_actif`
) VALUES (
  @rid, 1, 0, 1, 1, 1,
  'fr,de,en,it', 24, '#1c4f90', 1
);

-- ─── 8) Vérification ──────────────────────────────────────────
SELECT
  r.id AS restaurant_id, r.name, r.slug,
  (SELECT COUNT(*) FROM salles             WHERE restaurant_id = r.id) AS salles,
  (SELECT COUNT(*) FROM tables             WHERE restaurant_id = r.id) AS tables_count,
  (SELECT COUNT(*) FROM combos             WHERE restaurant_id = r.id) AS combos,
  (SELECT COUNT(*) FROM services           WHERE restaurant_id = r.id) AS services,
  (SELECT COUNT(*) FROM options_restaurant WHERE res