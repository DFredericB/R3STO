// ════════════════════════════════════════════════════════════════════════════
//  Reservation Validation — anti-overbooking + business rules
//  Shared between POST /api/resas and POST /api/widget/:slug/book
// ════════════════════════════════════════════════════════════════════════════

import { row, rows } from '../db.js'

/**
 * Validate a reservation request against all business rules.
 * Returns { ok: true } or { ok: false, code: 4xx, message: '...' }
 *
 * @param {string} restaurantId
 * @param {object} params - { date, svc, c (covers), email?, tel?, t? (time) }
 */
export function validateResa(restaurantId, { date, svc, c, email, tel, t }) {
  const covers = parseInt(c)

  // ── 1. Options & service exist ──────────────────────────────────────────
  const options = row('SELECT * FROM options WHERE restaurantId = ?', restaurantId)
  const service = row(
    'SELECT * FROM services WHERE id = ? AND restaurantId = ? AND active = 1',
    svc, restaurantId
  )

  if (!service) {
    return { ok: false, code: 404, message: 'Service introuvable ou inactif' }
  }

  // ── 2. Restaurant closed? ──────────────────────────────────────────────
  const closure = row(
    `SELECT label FROM fermetures
     WHERE restaurantId = ? AND active = 1 AND type = 'restaurant'
     AND date = ? LIMIT 1`,
    restaurantId, date
  )
  if (closure) {
    return { ok: false, code: 409, message: closure.label || 'Restaurant fermé ce jour' }
  }

  // Service-level closure
  const svcClosure = row(
    `SELECT label FROM fermetures
     WHERE restaurantId = ? AND active = 1 AND type = 'service'
     AND date = ? AND serviceId = ? LIMIT 1`,
    restaurantId, date, svc
  )
  if (svcClosure) {
    return { ok: false, code: 409, message: svcClosure.label || 'Service fermé ce jour' }
  }

  // ── 3. Party size limits ───────────────────────────────────────────────
  if (options) {
    const minCovers = options.reservation_min || 1
    const maxCovers = options.reservation_max || 20

    if (covers < minCovers) {
      return { ok: false, code: 400, message: `Minimum ${minCovers} couvert(s) requis` }
    }
    if (covers > maxCovers) {
      return { ok: false, code: 400, message: `Maximum ${maxCovers} couverts autorisés` }
    }
  }

  // ── 4. Booking horizon ─────────────────────────────────────────────────
  if (options && options.booking_horizon_days) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const resaDate = new Date(date + 'T00:00:00')
    const diffDays = Math.floor((resaDate - today) / 86400000)

    if (diffDays > options.booking_horizon_days) {
      return {
        ok: false, code: 400,
        message: `Réservation possible jusqu'à ${options.booking_horizon_days} jours à l'avance`
      }
    }
  }

  // ── 5. No past booking (unless option allows it) ───────────────────────
  if (!options?.allow_past_booking) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const resaDate = new Date(date + 'T00:00:00')
    if (resaDate < today) {
      return { ok: false, code: 400, message: 'Impossible de réserver dans le passé' }
    }
  }

  // ── 6. Max covers per SERVICE (anti-overbooking) ───────────────────────
  const svcMaxCouverts = service.maxCouverts || 999
  const svcMaxParService = service.maxParService || 999

  const svcStats = row(
    `SELECT COUNT(*) as cnt, COALESCE(SUM(c), 0) as totalCovers
     FROM resas
     WHERE restaurantId = ? AND date = ? AND svc = ? AND s NOT IN ('cancelled', 'noshow', 'done')`,
    restaurantId, date, svc
  )

  const currentCovers = svcStats?.totalCovers || 0
  const currentCount = svcStats?.cnt || 0

  if (currentCovers + covers > svcMaxCouverts) {
    return {
      ok: false, code: 409,
      message: `Service complet : ${currentCovers}/${svcMaxCouverts} couverts déjà réservés`
    }
  }

  if (currentCount + 1 > svcMaxParService) {
    return {
      ok: false, code: 409,
      message: `Nombre maximum de réservations atteint pour ce service (${svcMaxParService})`
    }
  }

  // ── 7. Max covers per RESTAURANT per day ───────────────────────────────
  const resto = row('SELECT maxCvt FROM restaurants WHERE id = ?', restaurantId)
  if (resto?.maxCvt) {
    const dayStats = row(
      `SELECT COALESCE(SUM(c), 0) as totalCovers
       FROM resas
       WHERE restaurantId = ? AND date = ? AND s NOT IN ('cancelled', 'noshow', 'done')`,
      restaurantId, date
    )

    if ((dayStats?.totalCovers || 0) + covers > resto.maxCvt) {
      return {
        ok: false, code: 409,
        message: `Capacité journalière atteinte : ${dayStats.totalCovers}/${resto.maxCvt} couverts`
      }
    }
  }

  // ── 8. Group threshold check ───────────────────────────────────────────
  if (options && options.groupe_seuil && covers >= options.groupe_seuil) {
    const maxGroupes = options.groupe_max_par_service || 2
    const groupCount = row(
      `SELECT COUNT(*) as cnt FROM resas
       WHERE restaurantId = ? AND date = ? AND svc = ?
       AND c >= ? AND s NOT IN ('cancelled', 'noshow', 'done')`,
      restaurantId, date, svc, options.groupe_seuil
    )

    if ((groupCount?.cnt || 0) >= maxGroupes) {
      return {
        ok: false, code: 409,
        message: `Maximum ${maxGroupes} groupes (${options.groupe_seuil}+ pers.) par service atteint`
      }
    }
  }

  // ── 9. Blacklist check (by email or phone) ─────────────────────────────
  if (email || tel) {
    let blacklisted = null
    if (email) {
      blacklisted = row(
        `SELECT c.n, c.blacklistReason FROM clients c
         WHERE c.restaurantId = ? AND c.blacklisted = 1 AND LOWER(c.email) = LOWER(?)`,
        restaurantId, email
      )
    }
    if (!blacklisted && tel) {
      blacklisted = row(
        `SELECT c.n, c.blacklistReason FROM clients c
         WHERE c.restaurantId = ? AND c.blacklisted = 1 AND c.tel = ?`,
        restaurantId, tel
      )
    }
    if (blacklisted) {
      return {
        ok: false, code: 403,
        message: `Client en liste noire${blacklisted.blacklistReason ? ' : ' + blacklisted.blacklistReason : ''}`
      }
    }
  }

  // ── 10. Booking cutoff (service-level) ─────────────────────────────────
  if (t && service.bookingCutoffMins) {
    const now = new Date()
    const resaDateTime = new Date(`${date}T${t}:00`)
    const cutoffMs = service.bookingCutoffMins * 60 * 1000
    if (resaDateTime - now < cutoffMs) {
      return {
        ok: false, code: 400,
        message: `Réservation impossible moins de ${service.bookingCutoffMins} minutes avant l'heure`
      }
    }
  }

  // ── All checks passed ─────────────────────────────────────────────────
  return { ok: true }
}
