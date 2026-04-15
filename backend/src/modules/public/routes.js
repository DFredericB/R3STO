// ═══════════════════════════════════════════════════════════════
//  Public — routes publiques SANS authentification
//  Accessible depuis r3sto.ch (marketplace + annuaire)
// ═══════════════════════════════════════════════════════════════

const express = require('express');
const db = require('../../config/db');

const router = express.Router();

// ─── GET /public/restaurants ─────────────────────────────────
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
      open: true,
      features: tryParse(r.features) || [],
      promos: tryParse(r.promos) || [],
      bookingUrl: r.booking_url || `https://booking.r3sto.ch/?r=${encodeURIComponent(r.name)}`,
      vitrineUrl: r.vitrine_url || null,
      plan: r.plan || 'resto',
      boostScore: r.boost_score || 0,
      clientScore: r.client_score || 0,
    }));

    res.json({ ok: true, restaurants });
  } catch (e) { next(e); }
});

// ─── GET /public/booking/:slug ───────────────────────────────
router.get('/booking/:slug', async (req, res, next) => {
  try {
    const slug = req.params.slug;
    const [rows] = await db.query(
      `SELECT r.id, r.name, r.slug, r.logo_url, r.cover_url, r.phone, r.email,
              r.address, r.city, r.description, r.type, r.capacity
       FROM restaurants r
       WHERE (r.slug = ? OR r.id = ? OR r.name = ?) AND r.status = 'active'
       LIMIT 1`,
      [slug, slug, decodeURIComponent(slug)]
    );
    if (!rows[0]) return res.status(404).json({ ok: false, message: 'Restaurant non trouve' });

    const resto = rows[0];
    const [services] = await db.query(
      `SELECT id, nom, type, heure_debut, heure_fin, jours, slot_interval,
              max_per_slot, max_cvt_per_slot, max_resas, last_order, buffer_mins,
              booking_cutoff_mins
       FROM services WHERE restaurant_id = ? AND actif = 1
       ORDER BY heure_debut`,
      [resto.id]
    );
    const [opts] = await db.query(
      `SELECT * FROM options_restaurant WHERE restaurant_id = ? LIMIT 1`,
      [resto.id]
    );
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
router.get('/availability/:restoId', async (req, res, next) => {
  try {
    const { restoId } = req.params;
    const { date, guests } = req.query;
    if (!date) return res.status(400).json({ ok: false, message: 'date requise' });
    const partySize = parseInt(guests) || 2;

    const [restoRows] = await db.query(
      'SELECT id, capacity FROM restaurants WHERE (id = ? OR slug = ?) AND status = ?',
      [restoId, restoId, 'active']
    );
    if (!restoRows[0]) return res.status(404).json({ ok: false, message: 'Restaurant non trouve' });
    const rId = restoRows[0].id;

    const d = new Date(date);
    let dow = d.getDay();
    if (dow === 0) dow = 7;

    const [services] = await db.query(
      `SELECT id, nom, type, heure_debut, heure_fin, jours, slot_interval,
              max_per_slot, max_cvt_per_slot, max_resas, last_order,
              buffer_mins, booking_cutoff_mins
       FROM services WHERE restaurant_id = ? AND actif = 1`,
      [rId]
    );
    const [fermetures] = await db.query(
      `SELECT type, salle_id, service_id FROM fermetures
       WHERE restaurant_id = ? AND actif = 1
         AND date_debut <= ? AND (date_fin IS NULL OR date_fin >= ?)`,
      [rId, date, date]
    );
    const closedRestaurant = fermetures.some(f => f.type === 'restaurant' || f.type === 'vacances');
    if (closedRestaurant) return res.json({ ok: true, slots: [], closed: true });

    const closedServiceIds = new Set(fermetures.filter(f => f.service_id).map(f => f.service_id));

    const [resas] = await db.query(
      `SELECT time, party_size, status FROM reservations
       WHERE restaurant_id = ? AND date = ? AND status NOT IN ('cancelled','noshow')`,
      [rId, date]
    );
    const [tables] = await db.query(
      `SELECT id, couverts_min, couverts_max FROM tables
       WHERE restaurant_id = ? AND actif = 1 AND blocked = 0`,
      [rId]
    );
    const fittingTables = tables.filter(t => partySize >= t.couverts_min && partySize <= t.couverts_max);

    const now = new Date();
    const isToday = date === now.toISOString().slice(0, 10);
    const slots = [];

    for (const svc of services) {
      const jours = svc.jours ? svc.jours.split(',').map(Number) : [];
      if (!jours.includes(dow)) continue;
      if (closedServiceIds.has(svc.id)) continue;

      const interval = svc.slot_interval || 15;
      const [dH, dM] = svc.heure_debut.split(':').map(Number);
      const [fH, fM] = (svc.last_order || svc.heure_fin).split(':').map(Number);
      const cutoff = svc.booking_cutoff_mins || 0;

      let h = dH, m = dM;
      while (h * 60 + m <= fH * 60 + fM) {
        const timeStr = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
        if (isToday) {
          const slotTime = new Date(date + 'T' + timeStr + ':00');
          slotTime.setMinutes(slotTime.getMinutes() - cutoff);
          if (slotTime <= now) { m += interval; if (m >= 60) { h++; m -= 60; } continue; }
        }
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

        slots.push({ time: timeStr, service: svc.nom, serviceType: svc.type, available });
        m += interval;
        if (m >= 60) { h++; m -= 60; }
      }
    }

    res.json({ ok: true, date, guests: partySize, slots });
  } catch (e) { next(e); }
});

// ─── POST /public/book ──────────────────────────────────────
router.post('/book', async (req, res, next) => {
  try {
    const { restaurantId, restaurantSlug, date, time, guests, firstName, lastName, email, phone, notes, lang } = req.body;
    let rId = restaurantId;
    if (!rId && restaurantSlug) {
      const [rows] = await db.query(
        'SELECT id FROM restaurants WHERE (slug = ? OR name = ?) AND status = ?',
        [restaurantSlug, decodeURIComponent(restaurantSlug), 'active']
      );
      if (rows[0]) rId = rows[0].id;
    }
    if (!rId) return res.status(404).json({ ok: false, message: 'Restaurant non trouve' });

    if (email || phone) {
      const [bl] = await db.query(
        `SELECT id FROM clients
         WHERE restaurant_id = ? AND blacklist = 1
           AND (email = ? OR telephone = ?)
         LIMIT 1`,
        [rId, email || '', phone || '']
      );
      if (bl[0]) {
        return res.status(403).json({ ok: false, message: 'Reservation non disponible', code: 'BLACKLISTED' });
      }
    }

    const guestName = `${firstName || ''} ${lastName || ''}`.trim() || 'Client';
    const [result] = await db.query(
      `INSERT INTO reservations
        (restaurant_id, guest_name, guest_email, guest_phone, party_size, date, time, notes, source, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'widget', 'reserved')`,
      [rId, guestName, email || '', phone || '', parseInt(guests) || 2, date, time, notes || '']
    );

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

    await db.query(
      `INSERT INTO action_logs (restaurant_id, reservation_id, action, detail, type, icon)
       VALUES (?, ?, 'Reservation widget', ?, 'resa', 'W')`,
      [rId, result.insertId, `${guestName} - ${guests} pers. - ${date} ${time}`]
    ).catch(() => {});

    res.json({
      ok: true,
      reservation: { id: result.insertId, date, time, guests: parseInt(guests) || 2, name: guestName },
    });
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════════════════════
//  DEMO — endpoints publics pour les tenants de demonstration
//  3 slugs : chez-bunnys (Lausanne) | chez-bunnys-bern | chez-bunnys-zurich
//  Pas d'auth, donnees regenerables et evolutives.
// ═══════════════════════════════════════════════════════════════

const DEMO_SLUGS = ['chez-bunnys', 'chez-bunnys-bern', 'chez-bunnys-zurich'];
const DEFAULT_DEMO_SLUG = 'chez-bunnys';

function resolveDemoSlug(raw) {
  if (!raw) return DEFAULT_DEMO_SLUG;
  return DEMO_SLUGS.includes(raw) ? raw : DEFAULT_DEMO_SLUG;
}

async function getRestaurantIdBySlug(slug) {
  const [rows] = await db.query(
    'SELECT id FROM restaurants WHERE slug = ? LIMIT 1',
    [slug]
  );
  return rows[0]?.id || null;
}

// ─── GET /public/demo/status?slug=... ───────────────────────
router.get('/demo/status', async (req, res, next) => {
  try {
    const slug = resolveDemoSlug(req.query.slug);
    const id = await getRestaurantIdBySlug(slug);
    if (!id) {
      return res.json({ ok: true, exists: false, slug });
    }
    const [[r]] = await db.query(
      `SELECT
         (SELECT COUNT(*) FROM reservations WHERE restaurant_id = ?) AS reservations,
         (SELECT COUNT(*) FROM clients      WHERE restaurant_id = ?) AS clients,
         (SELECT COUNT(*) FROM tables       WHERE restaurant_id = ?) AS tables_count,
         (SELECT COUNT(*) FROM services     WHERE restaurant_id = ?) AS services`,
      [id, id, id, id]
    );
    res.json({ ok: true, exists: true, slug, restaurantId: id, counts: r });
  } catch (e) { next(e); }
});

// ─── GET /public/demo/list ──────────────────────────────────
// Liste les 3 tenants démo avec leur statut
router.get('/demo/list', async (_req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT r.id, r.slug, r.name, r.city, r.canton,
              (SELECT COUNT(*) FROM reservations WHERE restaurant_id = r.id) AS reservations,
              (SELECT COUNT(*) FROM clients      WHERE restaurant_id = r.id) AS clients
         FROM restaurants r
        WHERE r.slug IN (?, ?, ?)
        ORDER BY FIELD(r.slug, ?, ?, ?)`,
      [...DEMO_SLUGS, ...DEMO_SLUGS]
    );
    res.json({ ok: true, tenants: rows });
  } catch (e) { next(e); }
});

// ─── POST /public/demo/reset?slug=... ───────────────────────
// Purge reservations/clients/logs/waitlist du tenant demo, reseed un dataset
// riche et evolutif (dates glissantes a partir d'aujourd'hui).
// Chaque slug a son propre profil de donnees :
//   - chez-bunnys          : bistro moyen, mix midi/soir, 40 resas ~7j
//   - chez-bunnys-bern     : brasserie grosse volumetrie, 60 resas, 2 groupes
//   - chez-bunnys-zurich   : gastro faible volume/gros panier, 28 resas
router.post('/demo/reset', async (req, res, next) => {
  try {
    const slug = resolveDemoSlug(req.query.slug);
    const id = await getRestaurantIdBySlug(slug);
    if (!id) {
      return res.status(404).json({
        ok: false, message: `Tenant demo "${slug}" introuvable - run seed SQL first`,
      });
    }

    // 1) Purge
    await db.query('DELETE FROM action_logs WHERE restaurant_id = ?', [id]).catch(() => {});
    await db.query('DELETE FROM reservations WHERE restaurant_id = ?', [id]);
    await db.query('DELETE FROM clients WHERE restaurant_id = ?', [id]);
    await db.query('DELETE FROM waitlist WHERE restaurant_id = ?', [id]).catch(() => {});

    // 2) Helpers dates glissantes
    const today = new Date();
    const fmt = (d) => d.toISOString().slice(0, 10);
    const day = (offset) => fmt(new Date(today.getTime() + offset * 86400000));

    // 3) Profil par tenant (pour que chaque resto ait un "caractere" different)
    const profile = {
      'chez-bunnys': {
        clients: [
          { p: 'Marie',    n: 'Dupont',   e: 'marie.dupont@demo.ch',  t: '+41 79 111 22 33', vip: 1, allerg: 'Gluten' },
          { p: 'Lucas',    n: 'Bernard',  e: 'lucas.bernard@demo.ch', t: '+41 79 222 33 44', vip: 0, allerg: null },
          { p: 'Sophie',   n: 'Rossi',    e: 'sophie.rossi@demo.ch',  t: '+41 79 333 44 55', vip: 1, allerg: 'Lactose' },
          { p: 'Thomas',   n: 'Moreau',   e: 'thomas.moreau@demo.ch', t: '+41 79 444 55 66', vip: 0, allerg: null },
          { p: 'Julie',    n: 'Favre',    e: 'julie.favre@demo.ch',   t: '+41 79 555 66 77', vip: 0, allerg: 'Fruits de mer' },
          { p: 'Alexandre',n: 'Meier',    e: 'alex.meier@demo.ch',    t: '+41 79 666 77 88', vip: 1, allerg: null },
          { p: 'Camille',  n: 'Laurent',  e: 'camille.l@demo.ch',     t: '+41 79 777 88 99', vip: 0, allerg: null },
          { p: 'Bob',      n: 'Spammer',  e: 'spam@demo.ch',          t: '+41 79 000 00 00', vip: 0, allerg: null, blacklist: 1 },
        ],
        volumes: { base: 6, span: 11 },  // base resas/jour + variance
      },
      'chez-bunnys-bern': {
        clients: [
          { p: 'Hans',    n: 'Müller',    e: 'hans.mueller@demo.ch',    t: '+41 79 210 30 40', vip: 1, allerg: null },
          { p: 'Andrea',  n: 'Brunner',   e: 'andrea.b@demo.ch',        t: '+41 79 211 31 41', vip: 0, allerg: 'Arachides' },
          { p: 'Peter',   n: 'Zimmermann',e: 'peter.z@demo.ch',         t: '+41 79 212 32 42', vip: 0, allerg: null },
          { p: 'Sandra',  n: 'Keller',    e: 'sandra.k@demo.ch',        t: '+41 79 213 33 43', vip: 1, allerg: null },
          { p: 'Markus',  n: 'Schmid',    e: 'markus.s@demo.ch',        t: '+41 79 214 34 44', vip: 0, allerg: 'Gluten' },
          { p: 'Laura',   n: 'Huber',     e: 'laura.h@demo.ch',         t: '+41 79 215 35 45', vip: 0, allerg: null },
          { p: 'Reto',    n: 'Baumann',   e: 'reto.b@demo.ch',          t: '+41 79 216 36 46', vip: 1, allerg: null },
          { p: 'Nadia',   n: 'Frei',      e: 'nadia.f@demo.ch',         t: '+41 79 217 37 47', vip: 0, allerg: null },
          { p: 'Urs',     n: 'Weber',     e: 'urs.w@demo.ch',           t: '+41 79 218 38 48', vip: 0, allerg: null },
          { p: 'Désirée', n: 'Problème',  e: 'probleme@demo.ch',        t: '+41 79 000 11 11', vip: 0, allerg: null, blacklist: 1 },
        ],
        volumes: { base: 9, span: 16 },
      },
      'chez-bunnys-zurich': {
        clients: [
          { p: 'Dr. Martin',n: 'Keller',   e: 'dr.keller@demo.ch',     t: '+41 79 910 20 30', vip: 1, allerg: null },
          { p: 'Claudia',  n: 'Weber',    e: 'claudia.w@demo.ch',      t: '+41 79 911 21 31', vip: 1, allerg: 'Lactose' },
          { p: 'Stefan',   n: 'Brunner',  e: 'stefan.b@demo.ch',       t: '+41 79 912 22 32', vip: 0, allerg: null },
          { p: 'Nathalie', n: 'Rochat',   e: 'nathalie.r@demo.ch',     t: '+41 79 913 23 33', vip: 1, allerg: null },
          { p: 'Olivier',  n: 'Fontaine', e: 'olivier.f@demo.ch',      t: '+41 79 914 24 34', vip: 1, allerg: 'Crustaces' },
          { p: 'Isabelle', n: 'Grand',    e: 'isabelle.g@demo.ch',     t: '+41 79 915 25 35', vip: 0, allerg: null },
        ],
        volumes: { base: 3, span: 6 },
      },
    };
    const P = profile[slug];

    // 4) Seed clients
    const clientIds = [];
    for (const c of P.clients) {
      const [r] = await db.query(
        `INSERT INTO clients (restaurant_id, prenom, nom, email, telephone, nb_visites, vip, allergies, blacklist, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [id, c.p, c.n, c.e, c.t, Math.floor(Math.random() * 8) + 1,
         c.vip || 0, c.allerg || null, c.blacklist || 0]
      ).catch(async () => {
        // Fallback si colonnes vip/allergies/blacklist absentes
        return await db.query(
          `INSERT INTO clients (restaurant_id, prenom, nom, email, telephone, nb_visites)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [id, c.p, c.n, c.e, c.t, Math.floor(Math.random() * 8) + 1]
        );
      });
      clientIds.push({ id: r.insertId, ...c });
    }

    // 5) Genere des resas sur -3j (historique) a +14j (futur)
    // Mix de sources, statuts, couverts, avec no-shows et annulations dans le passe
    const SOURCES = ['widget', 'app', 'telephone', 'walkin', 'email'];
    const STATUSES_PAST = ['honored', 'honored', 'honored', 'honored', 'noshow', 'cancelled'];
    const STATUS_FUTURE = 'reserved';
    const SLOTS_MIDI = ['11:45', '12:00', '12:15', '12:30', '12:45', '13:00', '13:15', '13:30', '14:00'];
    const SLOTS_SOIR = ['18:30', '19:00', '19:15', '19:30', '19:45', '20:00', '20:15', '20:30', '21:00', '21:30'];

    const resas = [];
    const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

    for (let off = -3; off <= 14; off++) {
      const nResas = rand(P.volumes.base, P.volumes.base + P.volumes.span);
      const d = day(off);
      for (let i = 0; i < nResas; i++) {
        const isMidi = Math.random() < 0.45;
        const time = pick(isMidi ? SLOTS_MIDI : SLOTS_SOIR);
        const guests = Math.random() < 0.1 ? rand(6, 10) : rand(2, 5);
        const c = pick(clientIds.filter(c => !c.blacklist));
        resas.push({
          date: d, time, guests,
          name: `${c.p} ${c.n}`, email: c.e, phone: c.t,
          source: pick(SOURCES),
          status: off < 0 ? pick(STATUSES_PAST) : STATUS_FUTURE,
          notes: c.allerg ? `Allergie : ${c.allerg}` : '',
        });
      }
    }

    for (const r of resas) {
      await db.query(
        `INSERT INTO reservations
          (restaurant_id, guest_name, guest_email, guest_phone, party_size, date, time, notes, source, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, r.name, r.email, r.phone, r.guests, r.date, r.time, r.notes, r.source, r.status]
      );
    }

    // 6) Waitlist : 2 entrees ce soir pour tester
    const waitlistCount = 2;
    for (let i = 0; i < waitlistCount; i++) {
      const c = pick(clientIds.filter(c => !c.blacklist));
      await db.query(
        `INSERT INTO waitlist (restaurant_id, guest_name, guest_phone, party_size, date, time_pref, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'waiting', NOW())`,
        [id, `${c.p} ${c.n}`, c.t, rand(2, 4), day(0), i === 0 ? '19:30' : '20:00']
      ).catch(() => {});
    }

    res.json({
      ok: true, message: 'Demo reset OK',
      restaurantId: id, slug,
      seeded: {
        clients: clientIds.length,
        reservations: resas.length,
        waitlist: waitlistCount,
        range: `${day(-3)} → ${day(14)}`,
      },
    });
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════════════════════
//  ANNUAIRE — directory_restaurants (OSM + claims)
// ═══════════════════════════════════════════════════════════════

// ─── GET /public/directory ─────────────────────────────────
router.get('/directory', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;
    const { canton, cuisine, city, q, carat, claimed, near } = req.query;

    // Parse ?near=lat,lon (geolocation sort, Haversine in km)
    let nearLat = null, nearLon = null;
    if (near && typeof near === 'string') {
      const parts = near.split(',').map(s => parseFloat(s.trim()));
      if (parts.length === 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
        nearLat = parts[0];
        nearLon = parts[1];
      }
    }

    const where = ["status = 'live'"];
    const params = [];

    if (canton) {
      where.push('canton_iso = ?');
      params.push(canton.startsWith('CH-') ? canton : 'CH-' + canton);
    }
    if (cuisine) { where.push('cuisine_tag = ?'); params.push(cuisine.toLowerCase()); }
    if (city) { where.push('city = ?'); params.push(city); }
    if (carat) { where.push('carat_level = ?'); params.push(carat.toLowerCase()); }
    if (claimed === '1') { where.push("claim_status = 'claimed'"); }
    if (claimed === '0') { where.push("claim_status = 'unclaimed'"); }
    if (q) {
      where.push('(name LIKE ? OR cuisine LIKE ? OR city LIKE ?)');
      const pat = '%' + q + '%';
      params.push(pat, pat, pat);
    }
    // When sorting by distance, restrict to rows that actually have coordinates.
    if (nearLat !== null) {
      where.push('lat IS NOT NULL AND lon IS NOT NULL');
    }

    const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total FROM directory_restaurants ${whereSql}`,
      params
    );
    const total = countRows[0] ? countRows[0].total : 0;

    // Optional Haversine distance projection + ORDER BY
    // Formula: 6371 * acos( cos(rad(lat1)) * cos(rad(lat2)) * cos(rad(lon2)-rad(lon1)) + sin(rad(lat1)) * sin(rad(lat2)) )
    let selectExtra = '';
    let orderSql = 'ORDER BY boost_score DESC, rating DESC, name ASC';
    let queryParams = [...params];
    if (nearLat !== null) {
      selectExtra = `,
              ( 6371 * ACOS(
                  COS(RADIANS(?)) * COS(RADIANS(lat)) *
                  COS(RADIANS(lon) - RADIANS(?)) +
                  SIN(RADIANS(?)) * SIN(RADIANS(lat))
              ) ) AS distance_km`;
      // distance_km params (3 of them) come AFTER the WHERE params and BEFORE limit/offset.
      // We'll place them at the very front of the SELECT — so prepend in the correct order.
      queryParams = [nearLat, nearLon, nearLat, ...params];
      orderSql = 'ORDER BY distance_km ASC, boost_score DESC, rating DESC';
    }

    const [rows] = await db.query(
      `SELECT id, osm_id, slug, name, cuisine, cuisine_tag, amenity,
              address, postcode, city, canton, canton_iso,
              lat, lon, phone, website, email, opening_hours,
              price_range, avg_price, photo_url, image,
              rating, reviews_count,
              claim_status, plan, carat_level, boost_score, client_score
              ${selectExtra}
         FROM directory_restaurants
         ${whereSql}
         ${orderSql}
         LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );

    res.json({
      ok: true,
      total,
      limit,
      offset,
      count: rows.length,
      restaurants: rows.map(r => ({
        id: r.id,
        slug: r.slug,
        osmId: r.osm_id,
        name: r.name,
        cuisine: r.cuisine || '',
        cuisineTag: (r.cuisine_tag || '').toLowerCase(),
        amenity: r.amenity || 'restaurant',
        address: r.address || '',
        postcode: r.postcode || '',
        city: r.city || '',
        canton: r.canton || '',
        cantonIso: r.canton_iso || '',
        lat: r.lat != null ? parseFloat(r.lat) : null,
        lon: r.lon != null ? parseFloat(r.lon) : null,
        phone: r.phone || '',
        website: r.website || '',
        email: r.email || '',
        openingHours: r.opening_hours || '',
        priceRange: r.price_range || '',
        avgPrice: r.avg_price || null,
        photo: r.photo_url || r.image || '',
        rating: r.rating != null ? parseFloat(r.rating) : null,
        reviewsCount: r.reviews_count || 0,
        claimStatus: r.claim_status || 'unclaimed',
        plan: r.plan || 'free',
        caratLevel: r.carat_level || null,
        boostScore: r.boost_score || 0,
        clientScore: r.client_score || 0,
        distanceKm: r.distance_km != null ? Math.round(parseFloat(r.distance_km) * 100) / 100 : null,
      })),
    });
  } catch (e) { next(e); }
});

// ─── GET /public/directory/stats ─────────────────────────────
router.get('/directory/stats', async (req, res, next) => {
  try {
    const [totalRow] = await db.query(
      `SELECT COUNT(*) AS total FROM directory_restaurants WHERE status = 'live'`
    );
    const [claimedRow] = await db.query(
      `SELECT
         SUM(claim_status = 'claimed') AS claimed,
         SUM(claim_status = 'unclaimed') AS unclaimed,
         SUM(claim_status = 'pending') AS pending
       FROM directory_restaurants WHERE status = 'live'`
    );
    const [byCanton] = await db.query(
      `SELECT canton_iso, canton, COUNT(*) AS n
         FROM directory_restaurants
         WHERE status = 'live' AND canton_iso IS NOT NULL
         GROUP BY canton_iso, canton
         ORDER BY n DESC`
    );
    const [byCuisine] = await db.query(
      `SELECT cuisine_tag, COUNT(*) AS n
         FROM directory_restaurants
         WHERE status = 'live' AND cuisine_tag IS NOT NULL AND cuisine_tag <> ''
         GROUP BY cuisine_tag
         ORDER BY n DESC
         LIMIT 40`
    );
    const [byCarat] = await db.query(
      `SELECT carat_level, COUNT(*) AS n
         FROM directory_restaurants
         WHERE status = 'live' AND carat_level IS NOT NULL
         GROUP BY carat_level`
    );

    res.json({
      ok: true,
      total: totalRow[0] ? totalRow[0].total : 0,
      claimed: claimedRow[0] ? Number(claimedRow[0].claimed) || 0 : 0,
      unclaimed: claimedRow[0] ? Number(claimedRow[0].unclaimed) || 0 : 0,
      pending: claimedRow[0] ? Number(claimedRow[0].pending) || 0 : 0,
      byCanton: byCanton.map(r => ({ iso: r.canton_iso, name: r.canton, count: r.n })),
      byCuisine: byCuisine.map(r => ({ tag: r.cuisine_tag, count: r.n })),
      byCarat: byCarat.map(r => ({ level: r.carat_level, count: r.n })),
    });
  } catch (e) { next(e); }
});

// ─── GET /public/directory/cities ────────────────────────────
router.get('/directory/cities', async (req, res, next) => {
  try {
    const canton = req.query.canton;
    const params = [];
    let cantonSql = '';
    if (canton) {
      cantonSql = ' AND canton_iso = ?';
      params.push(canton.startsWith('CH-') ? canton : 'CH-' + canton);
    }
    const [rows] = await db.query(
      `SELECT city, canton_iso, canton, COUNT(*) AS n
         FROM directory_restaurants
         WHERE status = 'live' AND city IS NOT NULL AND city <> ''${cantonSql}
         GROUP BY city, canton_iso, canton
         ORDER BY n DESC, city ASC`,
      params
    );
    res.json({
      ok: true,
      count: rows.length,
      cities: rows.map(r => ({
        city: r.city,
        cantonIso: r.canton_iso || '',
        canton: r.canton || '',
        count: r.n,
      })),
    });
  } catch (e) { next(e); }
});

// ─── GET /public/directory/:slug ─────────────────────────────
router.get('/directory/:slug', async (req, res, next) => {
  try {
    const slug = req.params.slug;
    const [rows] = await db.query(
      `SELECT * FROM directory_restaurants
         WHERE (slug = ? OR id = ?) AND status = 'live'
         LIMIT 1`,
      [slug, slug]
    );
    if (!rows[0]) {
      return res.status(404).json({ ok: false, error: 'Restaurant introuvable' });
    }
    const r = rows[0];
    res.json({
      ok: true,
      restaurant: {
        id: r.id,
        slug: r.slug,
        osmId: r.osm_id,
        name: r.name,
        cuisine: r.cuisine || '',
        cuisineTag: (r.cuisine_tag || '').toLowerCase(),
        amenity: r.amenity || 'restaurant',
        address: r.address || '',
        postcode: r.postcode || '',
        city: r.city || '',
        canton: r.canton || '',
        cantonIso: r.canton_iso || '',
        lat: r.lat != null ? parseFloat(r.lat) : null,
        lon: r.lon != null ? parseFloat(r.lon) : null,
        phone: r.phone || '',
        website: r.website || '',
        email: r.email || '',
        openingHours: r.opening_hours || '',
        priceRange: r.price_range || '',
        avgPrice: r.avg_price || null,
        photo: r.photo_url || r.image || '',
        rating: r.rating != null ? parseFloat(r.rating) : null,
        reviewsCount: r.reviews_count || 0,
        claimStatus: r.claim_status || 'unclaimed',
        plan: r.plan || 'free',
        caratLevel: r.carat_level || null,
        caratScore: r.carat_score || null,
        boostScore: r.boost_score || 0,
        clientScore: r.client_score || 0,
        description: r.description || '',
        tags: tryParse(r.tags) || [],
        photos: tryParse(r.photos) || [],
        socials: tryParse(r.socials) || {},
      },
    });
  } catch (e) { next(e); }
});

// helper: tolerant JSON parse for TEXT columns that may store JSON or scalar
function tryParse(v) {
  if (v == null) return null;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch (_) { return v; }
}

// ─── GET /public/places/search?q=... ──────────────────────────
//   Proxy Google Places Text Search — utilisé par Profil pour
//   pré-remplir nom/adr/tel/web/lat/lng depuis Google.
//   Nécessite GOOGLE_PLACES_KEY dans backend/.env
router.get('/places/search', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q || q.length < 2) {
      return res.json({ ok: true, results: [] });
    }

    const key = process.env.GOOGLE_PLACES_KEY;
    if (!key) {
      return res.status(503).json({
        ok: false,
        error: 'GOOGLE_PLACES_KEY non configurée côté backend',
        results: [],
      });
    }

    // Places API (New) — Text Search
    // Biasé sur la Suisse pour de meilleurs résultats
    const url = 'https://places.googleapis.com/v1/places:searchText';
    const body = {
      textQuery: q,
      regionCode: 'CH',
      languageCode: 'fr',
      maxResultCount: 10,
    };
    const fieldMask = [
      'places.displayName',
      'places.formattedAddress',
      'places.location',
      'places.internationalPhoneNumber',
      'places.websiteUri',
      'places.id',
      'places.types',
    ].join(',');

    const gRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': fieldMask,
      },
      body: JSON.stringify(body),
    });

    if (!gRes.ok) {
      const txt = await gRes.text().catch(() => '');
      return res.status(502).json({
        ok: false,
        error: `Google Places ${gRes.status}`,
        detail: txt.slice(0, 200),
        results: [],
      });
    }

    const data = await gRes.json();
    const results = (data.places || []).map(p => ({
      id: p.id,
      name: p.displayName?.text || '',
      addr: p.formattedAddress || '',
      tel: p.internationalPhoneNumber || '',
      web: p.websiteUri || '',
      lat: p.location?.latitude || null,
      lng: p.location?.longitude || null,
      types: p.types || [],
    }));

    res.json({ ok: true, results });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
