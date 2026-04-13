-- Migration 003: Ajout colonnes reset_token pour mot de passe oublié
-- @migration:split

ALTER TABLE users
  ADD COLUMN reset_token VARCHAR(255) DEFAULT NULL,
  ADD COLUMN reset_token_expires DATETIME DEFAULT NULL;

-- @migration:split

CREATE INDEX idx_users_reset_token ON users (reset_token);
