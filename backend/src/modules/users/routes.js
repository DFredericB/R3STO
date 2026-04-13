// ═══════════════════════════════════════════════════════════════
//  Users (platform) — module admin pour gérer les comptes R3STO
//  Préfixe : /users (monté dans app.js)
//  Accès : superadmin uniquement (sauf /me qui est déjà dans /auth)
// ═══════════════════════════════════════════════════════════════
const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../../config/db');
const { authMiddleware, requireRole } = require('../../middleware/auth');
const { ok, created, badRequest, notFound } = require('../../utils/responses');

const router = express.Router();

// Toutes les routes exigent un token superadmin
router.use(authMiddleware);
router.use(requireRole('superadmin'));

// ─── GET /users — liste tous les utilisateurs plateforme ─────
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await query(
      `SELECT u.id, u.email, u.name, u.phone, u.role, u.plan, u.status,
              u.email_verified, u.last_login, u.created_at,
              (SELECT COUNT(*) FROM restaurants r WHERE r.user_id = u.id) AS restaurant_count
       FROM users u
       ORDER BY u.id DESC`
    );
    return ok(res, { users: rows, items: rows });
  } catch (e) { next(e); }
});

// ─── GET /users/sessions — comptes actifs (last_login < 30 min) ─────
router.get('/sessions', async (req, res, next) => {
  try {
    const [rows] = await query(
      `SELECT id, email, name, role, plan, last_login,
              TIMESTAMPDIFF(MINUTE, last_login, NOW()) AS minutes_ago
       FROM users
       WHERE last_login IS NOT NULL
         AND last_login >= DATE_SUB(NOW(), INTERVAL 30 MINUTE)
       ORDER BY last_login DESC`
    );
    return ok(res, { sessions: rows, count: rows.length });
  } catch (e) { next(e); }
});

// ─── GET /users/:id — un user ─────
router.get('/:id', async (req, res, next) => {
  try {
    const [rows] = await query(
      `SELECT id, email, name, phone, role, plan, status, email_verified, last_login, created_at
       FROM users WHERE id = ? LIMIT 1`,
      [req.params.id]
    );
    if (!rows.length) return notFound(res, 'Utilisateur introuvable');
    return ok(res, { user: rows[0] });
  } catch (e) { next(e); }
});

// ─── POST /users — créer un compte (ou demo) ─────
router.post('/', async (req, res, next) => {
  try {
    const { email, password, name, phone, role, plan, is_demo } = req.body || {};
    if (!email || !password) return badRequest(res, 'email et password requis');
    if (password.length < 6) return badRequest(res, 'password trop court (min 6)');

    const [existing] = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    if (existing.length) return badRequest(res, 'Email déjà utilisé');

    const hash = bcrypt.hashSync(password, 10);
    const finalRole = role || (is_demo ? 'owner' : 'owner');
    const finalPlan = plan || (is_demo ? 'gastro' : 'free');
    const finalName = name || (is_demo ? 'Compte Démo' : email.split('@')[0]);

    const [result] = await query(
      `INSERT INTO users (email, password, name, phone, role, plan, status, email_verified, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'active', 1, NOW())`,
      [email, hash, finalName, phone || null, finalRole, finalPlan]
    );

    const [rows] = await query(
      `SELECT id, email, name, phone, role, plan, status, created_at FROM users WHERE id = ?`,
      [result.insertId]
    );
    return created(res, { user: rows[0] });
  } catch (e) { next(e); }
});

// ─── PATCH /users/:id — update (name, phone, role, plan, status) ─────
router.patch('/:id', async (req, res, next) => {
  try {
    const allowed = ['name', 'phone', 'role', 'plan', 'status', 'email_verified'];
    const updates = [];
    const values = [];
    for (const k of allowed) {
      if (k in (req.body || {})) { updates.push(`${k} = ?`); values.push(req.body[k]); }
    }
    if (!updates.length) return badRequest(res, 'Aucun champ à mettre à jour');
    values.push(req.params.id);
    await query(`UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, values);
    const [rows] = await query(
      `SELECT id, email, name, phone, role, plan, status, email_verified FROM users WHERE id = ?`,
      [req.params.id]
    );
    if (!rows.length) return notFound(res, 'Utilisateur introuvable');
    return ok(res, { user: rows[0] });
  } catch (e) { next(e); }
});

// ─── PATCH /users/:id/password — reset mot de passe ─────
router.patch('/:id/password', async (req, res, next) => {
  try {
    const { password } = req.body || {};
    if (!password || password.length < 6) return badRequest(res, 'password trop court (min 6)');
    const hash = bcrypt.hashSync(password, 10);
    const [r] = await query(`UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?`, [hash, req.params.id]);
    if (!r.affectedRows) return notFound(res, 'Utilisateur introuvable');
    return ok(res, { ok: true, message: 'Mot de passe mis à jour' });
  } catch (e) { next(e); }
});

// ─── DELETE /users/:id — soft delete (status = deleted) ─────
router.delete('/:id', async (req, res, next) => {
  try {
    if (Number(req.params.id) === Number(req.user.id)) {
      return badRequest(res, 'Impossible de supprimer son propre compte');
    }
    const [r] = await query(`UPDATE users SET status = 'deleted', updated_at = NOW() WHERE id = ?`, [req.params.id]);
    if (!r.affectedRows) return notFound(res, 'Utilisateur introuvable');
    return ok(res, { ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
