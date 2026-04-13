// ═══════════════════════════════════════════════════════════════
//  Public — routes publiques SANS authentification
//  Accessible depuis r3sto.ch/restaurants (marketplace)
// ═══════════════════════════════════════════════════════════════

const express = require('express');
const db = require('../../config/db');

const router = express.Router();

// ─── GET /public/restaurants ─────────────────────────────────
// Retourne les restaurants actifs avec marketplace = 1
// Utilisé par r3sto.ch/restaurants pour le listing public
router.get('/restaurants', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT
         r.id, r.name, r.slug, r.type, r.cuisine_tag, r.description,
         r.city, r.canton, r.postal_code,
         r.photo, r.cover_url, r.logo_url,
         r.avg_price, r.price_range, r.rating, r.reviews_count,
         r.features, r.promos,
         r.boost_score, r.client_score,
         r.booking_url, r.vitrine_url,
         u.plan
       FROM restaurants r
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.status = 'active' AND r.marketplace = 1
       ORDER BY r.boost_score DESC, r.rating DESC`
    );

    // Formater pour le frontend marketplace
    const restaurants = rows.map(r => ({
      id: r.slug || r.id,
      name: r.name,
      cuisine: r.description || r.type || 'Restaurant',
      cuisineTag: (r.cuisine_tag || '').toLowerCase(),
      city: r.city || '',
      photo: r.photo || r.cover_url || '',
      rating: parseFloat(r.rating) || 0,
      reviews: r.reviews_count || 0,
      priceRange: r.price_range || '$$',
      avgPrice: r.avg_price || 40,
      open: true, // TODO: calculer via services + fermetures
      features: tryParse(r.features) || [],
      promos: tryParse(r.promos) || [],
      bookingUrl: r.booking_url || `https://booking.r3sto.ch/?r=${encodeURIComponent(r.name)}`,
      vitrineUrl: r.vitrine_url || null,
      plan: r.plan || 'resto',
      boostScore: r.boost_score || 0,
      clientScore: r.client_score || 0,
    }));

    res.json({ ok: true, restaurants });
  } catch (e) {
    next(e);
  }
});

// ─── GET /public/booking/:slug ───────────────────────────────
// Config du restaurant pour le widget booking
// Retourne : nom, logo, services, options, fermetures actives
router.get('/booking/:slug', async (req, res, next) => {
  try {
    const slug = req.params.slug;
    // Chercher par slug, par id, ou par nom (URL-encoded)
    const [rows] = await db.query(
      `SELECT r.id, r.name, r.slug, r.logo_url, r.cover_url, r.phone, r.email,
              r.address, r.city, r.description, r.type, r.capacity
       FROM restaurants r
       WHERE (r.slug = ? OR r.id = ? OR r.name = ?) AND r.status = 'active'
       LIMIT 1`,
      [slug, slug, decodeURIComponent(slug)]
    );
    if (!rows[0]) return res.status(404).json({ ok: false, message: 'Restaurant non trouvé' });

    const resto = rows[0];

    // Services actifs
    const [services] = await db.query(
      `SELECT id, nom, type, heure_debut, heure_fin, jours, slot_interval,
              max_per_slot, max_cvt_per_slot, max_resas, last_order, buffer_mins,
              booking_cutoff_mins
       FROM services WHERE restaurant_id = ? AND actif = 1
       ORDER BY heure_debut`,
      [resto.id]
    );

    // Options
    const [opts] = await db.query(
      `SELECT * FROM options_restaurant WHERE restaurant_id = ? LIMIT 1`,
      [resto.id]
    );

    // Fermetures actives (à venir)
    const [fermetures] = await db.query(
      `SELECT id, label, date_debut, date_fin, type, salle_id, service_id
       FROM fermetures
       WHERE restaurant_id = ? AND actif = 1
         AND (date_fin IS NULL OR date_fin >= CURDATE())
       ORDER BY date_debut`,
      [resto.id]
    );

    res.json({
      ok: true,
      restaurant: {
        id: resto.id, name: resto.name, slug: resto.slug,
        logo: resto.logo_url || '', cover: resto.cover_url || '',
        phone: resto.phone, email: resto.email,
        address: resto.address, city: resto.city,
        description: resto.description, type: resto.type,
        capacity: resto.capacity,
      },
      services: services.map(s => ({
        id: s.id, nom: s.nom, type: s.type,
        debut: s.heure_debut, fin: s.heure_fin,
        jours: s.jours ? s.jours.split(',').map(Number) : [],
        slotInterval: s.slot_interval || 15,
        maxPerSlot: s.max_per_slot, maxCvtPerSlot: s.max_cvt_per_slot,
        maxResas: s.max_resas, lastOrder: s.last_order,
        bufferMins: s.buffer_mins || 0,
        cutoffMins: s.booking_cutoff_mins || 0,
      })),
      options: opts[0] ? {
        wifi: opts[0].wifi, parking: opts[0].parking,
        terrasse: opts[0].terrasse, accessible: opts[0].accessible,
        animaux: opts[0].animaux, langues: opts[0].langues,
        annulationH: opts[0].annulation_h,
        widgetCouleur: opts[0].widget_couleur || '#1c4f90',
        widgetActif: opts[0].widget_actif,
      } : {},
      fermetures: fermetures.map(f => ({
        id: f.id, label: f.label,
        debut: f.date_debut, fin: f.date_fin,
        type: f.type, salleId: f.salle_id, serviceId: f.service_id,
      })),
    });
  } catch (e) { next(e); }
});

// ─── GET /public/availability/:restoId ──────────────────────
// Créneaux disponibles pour une date + nombre de couverts
// ?date=2026-04-12&guests=2
router.get('/availability/:restoId', async (req, res, next) => {
  try {
    const { restoId } = req.params;
    const { date, guests } = req.query;
    if (!date) return res.status(400).json({ ok: false, message: 'date requise' });
    const partySize = parseInt(guests) || 2;

    // Restaurant exists?
    const [restoRows] = await db.query(
      'SELECT id, capacity FROM restaurants WHERE (id = ? OR slug = ?) AND status = ?',
      [restoId, restoId, 'active']
    );
    if (!restoRows[0]) return res.status(404).json({ ok: false, message: 'Restaurant non trouvé' });
    const rId = restoRows[0].id;

    // Quel jour de la semaine ? (1=lundi...7=dimanche)
    const d = new Date(date);
    let dow = d.getDay(); // 0=dimanche
    if (dow === 0) dow = 7;

    // Services pour ce jour
    const [services] = await db.query(
      `SELECT id, nom, type, heure_debut, heure_fin, jours, slot_interval,
              max_per_slot, max_cvt_per_slot, max_resas, last_order,
              buffer_mins, booking_cutoff_mins
       FROM services WHERE restaurant_id = ? AND actif = 1`,
      [rId]
    );

    // Fermetures ce jour
    const [fermetures] = await db.query(
      `SELECT type, salle_id, service_id FROM fermetures
       WHERE restaurant_id = ? AND actif = 1
         AND date_debut <= ? AND (date_fin IS NULL OR date_fin >= ?)`,
      [rId, date, date]
    );
    const closedRestaurant = fermetures.some(f => f.type === 'restaurant' || f.type === 'vacances');
    if (closedRestaurant) return res.json({ ok: true, slots: [], closed: true });

    const closedServiceIds = new Set(fermetures.filter(f => f.service_id).map(f => f.service_id));

    // Réservations existantes ce jour
    const [resas] = await db.query(
      `SELECT time, party_size, status FROM reservations
       WHERE restaurant_id = ? AND date = ? AND status NOT IN ('cancelled','noshow')`,
      [rId, date]
    );

    // Tables disponibles pour ce nombre de couverts
    const [tables] = await db.query(
      `SELECT id, couverts_min, couverts_max FROM tables
       WHERE restaurant_id = ? AND actif = 1 AND blocked = 0`,
      [rId]
    );
    const fittingTables = tables.filter(t => partySize >= t.couverts_min && partySize <= t.couverts_max);

    // Générer les créneaux
    const now = new Date();
    const isToday = date === now.toISOString().slice(0, 10);
    const slots = [];

    for (const svc of services) {
      // Check jour
      const jours = svc.jours ? svc.jours.split(',').map(Number) : [];
      if (!jours.includes(dow)) continue;
      // Check fermeture service
      if (closedServiceIds.has(svc.id)) continue;

      const interval = svc.slot_interval || 15;
      const [dH, dM] = svc.heure_debut.split(':').map(Number);
      const [fH, fM] = (svc.last_order || svc.heure_fin).split(':').map(Number);
      const cutoff = svc.booking_cutoff_mins || 0;

      let h = dH, m = dM;
      while (h * 60 + m <= fH * 60 + fM) {
        const timeStr = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');

        // Filtrer les créneaux passés (aujourd'hui)
        if (isToday) {
          const slotTime = new Date(date + 'T' + timeStr + ':00');
          slotTime.setMinutes(slotTime.getMinutes() - cutoff);
          if (slotTime <= now) { m += interval; if (m >= 60) { h++; m -= 60; } continue; }
        }

        // Compter les resas à ce créneau
        const resasAtSlot = resas.filter(r => {
          const rt = r.time.slice(0, 5);
          return rt === timeStr;
        });
        const resaCount = resasAtSlot.length;
        const cvtCount = resasAtSlot.reduce((s, r) => s + r.party_size, 0);

        let available = true;
        if (svc.max_per_slot && resaCount >= svc.max_per_slot) available = false;
        if (svc.max_cvt_per_slot && cvtCount + partySize > svc.max_cvt_per_slot) available = false;
        if (svc.max_resas) {
          const totalSvcResas = resas.filter(r => {
            const rt = r.time.slice(0, 5);
            const rtMin = parseInt(rt.split(':')[0]) * 60 + parseInt(rt.split(':')[1]);
            return rtMin >= dH * 60 + dM && rtMin <= fH * 60 + fM;
          }).length;
          if (totalSvcResas >= svc.max_resas) available = false;
        }

        slots.push({
          time: timeStr,
          service: svc.nom,
          serviceType: svc.type,
          available,
        });

        m += interval;
        if (m >= 60) { h++; m -= 60; }
      }
    }

    res.json({ ok: true, date, guests: partySize, slots });
  } catch (e) { next(e); }
});

// ─── POST /public/book ──────────────────────────────────────
// Créer une réservation publique (depuis le widget booking)
router.post('/book', async (req, res, next) => {
  try {
    const { restaurantId, restaurantSlug, date, time, guests, firstName, lastName, email, phone, notes, lang } = req.body;

    // Trouver le restaurant
    let rId = restaurantId;
    if (!rId && restaurantSlug) {
      const [rows] = await db.query(
        'SELECT id FROM restaurants WHERE (slug = ? OR name = ?) AND status = ?',
        [restaurantSlug, decodeURIComponent(restaurantSlug), 'active']
      );
      if (rows[0]) rId = rows[0].id;
    }
    if (!rId) return res.status(404).json({ ok: false, message: 'Restaurant non trouvé' });

    // Vérifier blacklist (email + tel)
    if (email || phone) {
      const [bl] = await db.query(
        `SELECT id FROM clients
         WHERE restaurant_id = ? AND blacklist = 1
           AND (email = ? OR telephone = ?)
         LIMIT 1`,
        [rId, email || '', phone || '']
      );
      if (bl[0]) {
        return res.status(403).json({ ok: false, message: 'Réservation non disponible', code: 'BLACKLISTED' });
      }
    }

    // Créer la réservation
    const guestName = `${firstName || ''} ${lastName || ''}`.trim() || 'Client';
    const [result] = await db.query(
      `INSERT INTO reservations
        (restaurant_id, guest_name, guest_email, guest_phone, party_size, date, time, notes, source, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'widget', 'reserved')`,
      [rId, guestName, email || '', phone || '', parseInt(guests) || 2, date, time, notes || '']
    );

    // Mettre à jour / créer le client CRM
    if (email || phone) {
      const [existing] = await db.query(
        `SELECT id, nb_visites FROM clients
         WHERE restaurant_id = ? AND (email = ? OR telephone = ?)
         LIMIT 1`,
        [rId, email || '___none', phone || '___none']
      );
      if (existing[0]) {
        await db.query(
          'UPDATE clients SET nb_visites = nb_visites + 1 WHERE id = ?',
          [existing[0].id]
        );
      } else {
        await db.query(
          `INSERT INTO clients (restaurant_id, prenom, nom, email, telephone, nb_visites)
           VALUES (?, ?, ?, ?, ?, 1)`,
          [rId, firstName || '', lastName || '', email || '', phone || '']
        );
      }
    }

    // Log action
    await db.query(
      `INSERT INTO action_logs (restaurant_id, reservation_id, action, detail, type, icon)
       VALUES (?, ?, 'Réservation widget', ?, 'resa', '🌐')`,
      [rId, result.insertId, `${guestName} — ${guests} pers. — ${date} ${time}`]
    ).catch(() => {});

    res.json({
      ok: true,
      reservation: {
        id: result.insertId,
        date, time, guests: parseInt(guests) || 2,
        name: guestName,
      },
    });
  } catch (e) { next(e); }
});

function tryParse(val) {
  if (!val) return null;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return null; }
}

module.exports = router;
