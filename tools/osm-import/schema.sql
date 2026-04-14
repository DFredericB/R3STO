-- R3STO Annuaire — Table directory_restaurants
-- Source : OpenStreetMap + claims utilisateurs
-- Cible  : MariaDB Infomaniak (api.r3sto.ch)

CREATE TABLE IF NOT EXISTS directory_restaurants (
  id             BIGINT       NOT NULL AUTO_INCREMENT,
  osm_id         VARCHAR(32)  NULL UNIQUE,              -- n12345, w67890, r22222
  slug           VARCHAR(160) NOT NULL UNIQUE,
  name           VARCHAR(200) NOT NULL,
  cuisine        VARCHAR(200) NULL,                     -- description libre
  cuisine_tag    VARCHAR(40)  NULL,                     -- filtre (italienne, gastronomique, …)
  amenity        VARCHAR(32)  NULL,                     -- restaurant, cafe, pub, fast_food
  address        VARCHAR(255) NULL,
  postcode       VARCHAR(10)  NULL,
  city           VARCHAR(120) NULL,
  canton         VARCHAR(60)  NULL,
  canton_iso     VARCHAR(6)   NULL,                     -- CH-VD, CH-GE…
  lat            DECIMAL(10,7) NULL,
  lon            DECIMAL(10,7) NULL,
  phone          VARCHAR(50)  NULL,
  website        VARCHAR(300) NULL,
  email          VARCHAR(120) NULL,
  opening_hours  VARCHAR(255) NULL,
  price_range    VARCHAR(8)   NULL,                     -- $, $$, $$$, $$$$
  avg_price      INT          NULL,                     -- CHF, estimation
  wheelchair     VARCHAR(20)  NULL,
  outdoor_seating TINYINT(1) NOT NULL DEFAULT 0,
  takeaway       TINYINT(1) NOT NULL DEFAULT 0,
  delivery       TINYINT(1) NOT NULL DEFAULT 0,
  reservation    VARCHAR(20)  NULL,
  wikidata       VARCHAR(20)  NULL,
  image          VARCHAR(500) NULL,
  photo_url      VARCHAR(500) NULL,                     -- photo finale (Unsplash/upload)
  rating         DECIMAL(2,1) NULL DEFAULT NULL,        -- 0.0-5.0
  reviews_count  INT          NOT NULL DEFAULT 0,
  -- R3STO specific
  claim_status   ENUM('unclaimed','pending','claimed','rejected') NOT NULL DEFAULT 'unclaimed',
  owner_user_id  BIGINT       NULL,                     -- FK users.id si claimed
  plan           ENUM('free','bistro','resto','gastro') NOT NULL DEFAULT 'free',
  boost_score    INT          NOT NULL DEFAULT 0,
  client_score   INT          NOT NULL DEFAULT 0,
  carat_level    ENUM('bronze','silver','gold') NULL,
  carat_awarded_at DATE       NULL,
  carat_valid_until DATE      NULL,
  status         ENUM('live','hidden','draft','spam') NOT NULL DEFAULT 'live',
  source         ENUM('osm','manual','import','user_submitted') NOT NULL DEFAULT 'osm',
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_synced_at DATETIME     NULL,
  PRIMARY KEY (id),
  KEY idx_canton (canton_iso),
  KEY idx_city (city),
  KEY idx_cuisine (cuisine_tag),
  KEY idx_status (status),
  KEY idx_carat (carat_level),
  KEY idx_claim (claim_status),
  KEY idx_coords (lat, lon),
  FULLTEXT KEY ft_search (name, cuisine, city)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Claims log (trace pour audit + anti-abus)
CREATE TABLE IF NOT EXISTS directory_claims (
  id              BIGINT NOT NULL AUTO_INCREMENT,
  restaurant_id   BIGINT NOT NULL,
  user_id         BIGINT NULL,
  email           VARCHAR(120) NOT NULL,
  phone           VARCHAR(50)  NULL,
  ide_number      VARCHAR(20)  NULL,       -- n° IDE suisse
  raison_sociale  VARCHAR(200) NULL,
  proof_type      ENUM('email','phone','postal','ide') NULL,
  proof_token     VARCHAR(64)  NULL,
  proof_verified  TINYINT(1)   NOT NULL DEFAULT 0,
  status          ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  notes           TEXT NULL,
  ip_address      VARCHAR(45)  NULL,
  user_agent      VARCHAR(255) NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at     DATETIME NULL,
  reviewed_by     BIGINT NULL,
  PRIMARY KEY (id),
  KEY idx_restaurant (restaurant_id),
  KEY idx_status (status),
  KEY idx_email (email),
  CONSTRAINT fk_claims_restaurant FOREIGN KEY (restaurant_id) REFERENCES directory_restaurants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Submissions log (nouveaux restos soumis par public avant modération)
CREATE TABLE IF NOT EXISTS directory_submissions (
  id              BIGINT NOT NULL AUTO_INCREMENT,
  name            VARCHAR(200) NOT NULL,
  city            VARCHAR(120) NULL,
  canton_iso      VARCHAR(6)   NULL,
  address         VARCHAR(255) NULL,
  phone           VARCHAR(50)  NULL,
  website         VARCHAR(300) NULL,
  email           VARCHAR(120) NULL,
  ide_number      VARCHAR(20)  NULL,
  submitter_name  VARCHAR(120) NULL,
  submitter_email VARCHAR(120) NOT NULL,
  notes           TEXT NULL,
  status          ENUM('pending','approved','rejected','duplicate') NOT NULL DEFAULT 'pending',
  restaurant_id   BIGINT NULL,             -- après création
  ip_address      VARCHAR(45)  NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at     DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_status (status),
  KEY idx_email (submitter_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
