-- ═══════════════════════════════════════════════════════════════
--  SEED — tenant démo "Chez Bunny's" (slug: chez-bunnys)
--  Import via phpMyAdmin MariaDB Infomaniak.
--  Idempotent : purge préalable puis INSERT fresh.
--
--  Crée : 1 user démo + 1 restaurant + 2 salles + 12 tables +
--         3 combos + 2 services + options_restaurant
--  Les clients et réservations sont seedés par POST /public/demo/reset
-- ═══════════════════════════════════════════════════════════════

-- ─── 0) Purge des 3 tenants démo (Lausanne, Bern, Zürich) ───
-- On purge en boucle via une table temporaire des IDs concernés.
DROP TEMPORARY TABLE IF EXISTS _demo_rids;
CREATE TEMPORARY TABLE _demo_rids AS
  SELECT id FROM restaurants WHERE slug IN ('chez-bunnys', 'chez-bunnys-bern', 'chez-bunnys-zurich');

DELETE FROM action_logs         WHERE restaurant_id IN (SELECT id FROM _demo_rids);
DELETE FROM waitlist            WHERE restaurant_id IN (SELECT id FROM _demo_rids);
DELETE FROM reservations        WHERE restaurant_id IN (SELECT id FROM _demo_rids);
DELETE FROM clients             WHERE restaurant_id IN (SELECT id FROM _demo_rids);
DELETE FROM combos              WHERE restaurant_id IN (SELECT id FROM _demo_rids);
DELETE FROM tables              WHERE restaurant_id IN (SELECT id FROM _demo_rids);
DELETE FROM services            WHERE restaurant_id IN (SELECT id FROM _demo_rids);
DELETE FROM fermetures          WHERE restaurant_id IN (SELECT id FROM _demo_rids);
DELETE FROM options_restaurant  WHERE restaurant_id IN (SELECT id FROM _demo_rids);
DELETE FROM salles              WHERE restaurant_id IN (SELECT id FROM _demo_rids);
DELETE FROM restaurants         WHERE slug IN ('chez-bunnys', 'chez-bunnys-bern', 'chez-bunnys-zurich');
DELETE FROM users               WHERE email IN ('demo@r3sto.ch', 'demo-bern@r3sto.ch', 'demo-zurich@r3sto.ch');
DROP TEMPORARY TABLE _demo_rids;

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

-- ═══════════════════════════════════════════════════════════════
-- ─── TENANT 2 : Chez Bunny's Bern (brasserie tradition) ───────
-- ═══════════════════════════════════════════════════════════════
INSERT INTO users (email, password, name, role, plan, status, email_verified, created_at)
VALUES ('demo-bern@r3sto.ch', '$2b$10$DEMO_USER_NO_LOGIN_BYPASS_HANDLED_BY_FRONTEND',
        'Demo R3STO Bern', 'superadmin', 'gastro', 'active', 1, NOW());
SET @uid2 = LAST_INSERT_ID();

INSERT INTO restaurants (
  user_id, name, slug, type, address, city, postal_code, canton, country,
  phone, email, website, capacity, description, currency, timezone, status, created_at
) VALUES (
  @uid2, 'Chez Bunny''s', 'chez-bunnys-bern', 'restaurant',
  'Kramgasse 45', 'Bern', '3011', 'BE', 'CH',
  '+41 31 555 00 00', 'bern@chez-bunnys.demo', 'https://chez-bunnys-bern.demo',
  54, 'Brasserie tradition — spécialités bernoises, bières locales, atmosphère chaleureuse. Démo R3STO.',
  'CHF', 'Europe/Zurich', 'active', NOW()
);
SET @rid2 = LAST_INSERT_ID();

INSERT INTO salles (restaurant_id, nom, capacite, actif, position) VALUES
  (@rid2, 'Comptoir', 22, 1, 1),
  (@rid2, 'Stübli',   32, 1, 2);
SET @sb1 = (SELECT id FROM salles WHERE restaurant_id = @rid2 AND nom = 'Comptoir' LIMIT 1);
SET @sb2 = (SELECT id FROM salles WHERE restaurant_id = @rid2 AND nom = 'Stübli'   LIMIT 1);

INSERT INTO tables (restaurant_id, salle_id, numero, couverts_min, couverts_max, forme, pos_x, pos_y, pos_w, pos_h, zone, priority) VALUES
  (@rid2, @sb1, 'C1', 2, 2, 'round', 10, 10,  8,  8, 'bar',       6),
  (@rid2, @sb1, 'C2', 2, 2, 'round', 22, 10,  8,  8, 'bar',       6),
  (@rid2, @sb1, 'C3', 2, 4, 'square',10, 24, 10, 10, 'comptoir',  5),
  (@rid2, @sb1, 'C4', 2, 4, 'square',24, 24, 10, 10, 'comptoir',  5),
  (@rid2, @sb2, 'S1', 2, 4, 'square',10, 10, 10, 10, 'stuebli',   5),
  (@rid2, @sb2, 'S2', 4, 6, 'rect',  24, 10, 16, 10, 'stuebli',   5),
  (@rid2, @sb2, 'S3', 4, 6, 'rect',  10, 24, 16, 10, 'stuebli',   5),
  (@rid2, @sb2, 'S4', 6, 8, 'rect',  30, 24, 20, 12, 'stuebli',   5),
  (@rid2, @sb2, 'S5', 2, 4, 'round', 10, 40, 10, 10, 'fenetre',   5),
  (@rid2, @sb2, 'S6', 2, 4, 'round', 24, 40, 10, 10, 'fenetre',   5);

SET @bS2 = (SELECT id FROM tables WHERE restaurant_id = @rid2 AND numero = 'S2' LIMIT 1);
SET @bS3 = (SELECT id FROM tables WHERE restaurant_id = @rid2 AND numero = 'S3' LIMIT 1);
SET @bS4 = (SELECT id FROM tables WHERE restaurant_id = @rid2 AND numero = 'S4' LIMIT 1);

INSERT INTO combos (restaurant_id, label, table_ids, couverts_min, couverts_max, align) VALUES
  (@rid2, 'S2+S3 (groupe 8-10)', CONCAT('[', @bS2, ',', @bS3, ']'),         8, 10, 'C'),
  (@rid2, 'S3+S4 (groupe 10-14)',CONCAT('[', @bS3, ',', @bS4, ']'),        10, 14, 'C');

-- Bern : service continu 11h30 → 22h30 (brasserie), fermé lundi
INSERT INTO services (
  restaurant_id, nom, type, heure_debut, heure_fin, jours, actif,
  last_order, slot_interval, max_per_slot, max_cvt_per_slot, booking_cutoff_mins, icon
) VALUES
  (@rid2, 'Midi', 'midi', '11:30:00', '14:30:00', '2,3,4,5,6,0', 1, '14:00:00', 15, 5, 16, 60, '🥨'),
  (@rid2, 'Soir', 'soir', '18:00:00', '22:30:00', '2,3,4,5,6',   1, '21:30:00', 15, 7, 22, 60, '🍺');

INSERT INTO options_restaurant (
  `restaurant_id`, `wifi`, `parking`, `terrasse`, `accessible`, `animaux`,
  `langues`, `annulation_h`, `widget_couleur`, `widget_actif`
) VALUES (@rid2, 1, 1, 0, 1, 1, 'de,fr,en,it', 24, '#b85a3c', 1);

-- ═══════════════════════════════════════════════════════════════
-- ─── TENANT 3 : Chez Bunny's Zürich (gastronomique moderne) ───
-- ═══════════════════════════════════════════════════════════════
INSERT INTO users (email, password, name, role, plan, status, email_verified, created_at)
VALUES ('demo-zurich@r3sto.ch', '$2b$10$DEMO_USER_NO_LOGIN_BYPASS_HANDLED_BY_FRONTEND',
        'Demo R3STO Zürich', 'superadmin', 'gastro', 'active', 1, NOW());
SET @uid3 = LAST_INSERT_ID();

INSERT INTO restaurants (
  user_id, name, slug, type, address, city, postal_code, canton, country,
  phone, email, website, capacity, description, currency, timezone, status, created_at
) VALUES (
  @uid3, 'Chez Bunny''s', 'chez-bunnys-zurich', 'restaurant',
  'Bahnhofstrasse 88', 'Zürich', '8001', 'ZH', 'CH',
  '+41 44 555 00 00', 'zurich@chez-bunnys.demo', 'https://chez-bunnys-zurich.demo',
  62, 'Gastronomique moderne — carte signature, cave exceptionnelle, design contemporain. Démo R3STO.',
  'CHF', 'Europe/Zurich', 'active', NOW()
);
SET @rid3 = LAST_INSERT_ID();

INSERT INTO salles (restaurant_id, nom, capacite, actif, position) VALUES
  (@rid3, 'Salon principal', 48, 1, 1),
  (@rid3, 'Salle privée',    14, 1, 2);
SET @sz1 = (SELECT id FROM salles WHERE restaurant_id = @rid3 AND nom = 'Salon principal' LIMIT 1);
SET @sz2 = (SELECT id FROM salles WHERE restaurant_id = @rid3 AND nom = 'Salle privée'    LIMIT 1);

INSERT INTO tables (restaurant_id, salle_id, numero, couverts_min, couverts_max, forme, pos_x, pos_y, pos_w, pos_h, zone, priority) VALUES
  (@rid3, @sz1, 'A1', 2, 2, 'round',  10, 10,  8,  8, 'fenetre',  5),
  (@rid3, @sz1, 'A2', 2, 2, 'round',  22, 10,  8,  8, 'fenetre',  5),
  (@rid3, @sz1, 'A3', 2, 4, 'square', 10, 22, 10, 10, 'centre',   5),
  (@rid3, @sz1, 'A4', 2, 4, 'square', 24, 22, 10, 10, 'centre',   5),
  (@rid3, @sz1, 'A5', 2, 4, 'square', 38, 22, 10, 10, 'centre',   5),
  (@rid3, @sz1, 'A6', 4, 6, 'rect',   10, 36, 16, 10, 'centre',   5),
  (@rid3, @sz1, 'A7', 4, 6, 'rect',   30, 36, 16, 10, 'centre',   5),
  (@rid3, @sz1, 'A8', 4, 6, 'rect',   10, 50, 16, 10, 'centre',   5),
  (@rid3, @sz1, 'A9', 2, 2, 'round',  32, 50,  8,  8, 'bar',      6),
  (@rid3, @sz1, 'A10',2, 4, 'square', 44, 50, 10, 10, 'bar',      6),
  (@rid3, @sz2, 'P1', 6, 8, 'rect',   10, 10, 20, 12, 'prive',    4),
  (@rid3, @sz2, 'P2', 6, 8, 'rect',   10, 26, 20, 12, 'prive',    4),
  (@rid3, @sz2, 'P3', 8,12, 'rect',   10, 42, 28, 12, 'prive',    3),
  (@rid3, @sz2, 'P4', 2, 4, 'round',  44, 10, 10, 10, 'prive',    5);

SET @zA6 = (SELECT id FROM tables WHERE restaurant_id = @rid3 AND numero = 'A6' LIMIT 1);
SET @zA7 = (SELECT id FROM tables WHERE restaurant_id = @rid3 AND numero = 'A7' LIMIT 1);
SET @zA8 = (SELECT id FROM tables WHERE restaurant_id = @rid3 AND numero = 'A8' LIMIT 1);
SET @zP1 = (SELECT id FROM tables WHERE restaurant_id = @rid3 AND numero = 'P1' LIMIT 1);
SET @zP2 = (SELECT id FROM tables WHERE restaurant_id = @rid3 AND numero = 'P2' LIMIT 1);

INSERT INTO combos (restaurant_id, label, table_ids, couverts_min, couverts_max, align) VALUES
  (@rid3, 'A6+A7 (8-12)',  CONCAT('[', @zA6, ',', @zA7, ']'),         8, 12, 'C'),
  (@rid3, 'A7+A8 (8-12)',  CONCAT('[', @zA7, ',', @zA8, ']'),         8, 12, 'C'),
  (@rid3, 'P1+P2 (priv.)', CONCAT('[', @zP1, ',', @zP2, ']'),        12, 16, 'C');

-- Zürich : midi business court + soir gastronomique long, fermé dim/lun
INSERT INTO services (
  restaurant_id, nom, type, heure_debut, heure_fin, jours, actif,
  last_order, slot_interval, max_per_slot, max_cvt_per_slot, booking_cutoff_mins, icon
) VALUES
  (@rid3, 'Lunch',  'midi', '12:00:00', '14:00:00', '2,3,4,5,6', 1, '13:30:00', 15, 4, 14, 120, '🥗'),
  (@rid3, 'Dîner',  'soir', '19:00:00', '23:00:00', '2,3,4,5,6', 1, '22:00:00', 30, 5, 18, 180, '🍷');

INSERT INTO options_restaurant (
  `restaurant_id`, `wifi`, `parking`, `terrasse`, `accessible`, `animaux`,
  `langues`, `annulation_h`, `widget_couleur`, `widget_actif`
) VALUES (@rid3, 1, 1, 0, 1, 0, 'de,fr,en,it', 48, '#3b7ca8', 1);

-- ═══════════════════════════════════════════════════════════════
-- ─── 7bis) Fermetures pour les 3 tenants ──────────────────────
-- Mix : jours fériés CH, vacances annuelles, fermeture exceptionnelle
-- (jours hebdo récurrents = gérés via services.jours, pas ici)
-- ═══════════════════════════════════════════════════════════════

-- Lausanne (@rid) — Bistro contemporain
INSERT INTO fermetures (restaurant_id, label, date_debut, date_fin, type, note, actif) VALUES
  (@rid, 'Pâques',              '2026-04-03', '2026-04-06', 'ferie',    'Vendredi saint + lundi de Pâques', 1),
  (@rid, 'Fête du Travail',     '2026-05-01', '2026-05-01', 'ferie',    NULL, 1),
  (@rid, 'Vacances été',        '2026-08-10', '2026-08-24', 'vacances', 'Fermeture annuelle 2 semaines', 1),
  (@rid, 'Jeûne fédéral',       '2026-09-21', '2026-09-21', 'ferie',    NULL, 1),
  (@rid, 'Noël',                '2026-12-24', '2026-12-26', 'ferie',    'Veille + 25 + 26', 1),
  (@rid, 'Nouvel An',           '2026-12-31', '2027-01-02', 'ferie',    'Réveillon + 1er + 2 janvier', 1),
  (@rid, 'Privatisation',       '2026-05-23', '2026-05-23', 'exception','Mariage privé — soir uniquement', 1);

-- Bern (@rid2) — Brasserie tradition
INSERT INTO fermetures (restaurant_id, label, date_debut, date_fin, type, note, actif) VALUES
  (@rid2, 'Pâques',             '2026-04-03', '2026-04-06', 'ferie',    NULL, 1),
  (@rid2, 'Fête nationale',     '2026-08-01', '2026-08-01', 'ferie',    '1er août — fermé', 1),
  (@rid2, 'Vacances été',       '2026-07-13', '2026-07-26', 'vacances', '2 semaines de fermeture', 1),
  (@rid2, 'Zibelemärit',        '2026-11-23', '2026-11-23', 'exception','Service midi uniquement (foire oignons)', 1),
  (@rid2, 'Noël',               '2026-12-24', '2026-12-26', 'ferie',    NULL, 1),
  (@rid2, 'Nouvel An',          '2026-12-31', '2027-01-02', 'ferie',    NULL, 1);

-- Zürich (@rid3) — Gastronomique
INSERT INTO fermetures (restaurant_id, label, date_debut, date_fin, type, note, actif) VALUES
  (@rid3, 'Sechseläuten',       '2026-04-20', '2026-04-20', 'exception','Soir fermé (cortège)', 1),
  (@rid3, 'Pâques',             '2026-04-03', '2026-04-06', 'ferie',    NULL, 1),
  (@rid3, 'Fête nationale',     '2026-08-01', '2026-08-01', 'ferie',    NULL, 1),
  (@rid3, 'Vacances été',       '2026-08-03', '2026-08-23', 'vacances', '3 semaines (gastronomie = pause longue)', 1),
  (@rid3, 'Knabenschiessen',    '2026-09-14', '2026-09-14', 'ferie',    NULL, 1),
  (@rid3, 'Noël',               '2026-12-24', '2026-12-27', 'ferie',    NULL, 1),
  (@rid3, 'Nouvel An',          '2026-12-31', '2027-01-04', 'ferie',    'Réveillon + 1er → 4 janvier', 1);

-- ─── 8) Vérification ──────────────────────────────────────────
SELECT
  r.id AS restaurant_id, r.name, r.slug, r.city,
  (SELECT COUNT(*) FROM salles             WHERE restaurant_id = r.id) AS salles,
  (SELECT COUNT(*) FROM tables             WHERE restaurant_id = r.id) AS tables_count,
  (SELECT COUNT(*) FROM combos             WHERE restaurant_id = r.id) AS combos,
  (SELECT COUNT(*) FROM services           WHERE restaurant_id = r.id) AS services,
  (SELECT COUNT(*) FROM fermetures         WHERE restaurant_id = r.id) AS fermetures,
  (SELECT COUNT(*) FROM options_restaurant WHERE restaurant_id = r.id) AS options
FROM restaurants r
WHERE r.slug IN ('chez-bunnys', 'chez-bunnys-bern', 'chez-bunnys-zurich')
ORDER BY r.slug;