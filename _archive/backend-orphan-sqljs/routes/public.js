// ══════════════════════════════════════════════════
//  R3STO — Public API Routes (no auth required)
//  Endpoints pour le marketplace / annuaire public
// ══════════════════════════════════════════════════

import { Router } from 'express'
import { db, scheduleSave } from '../db.js'

const router = Router()

// ── GET /api/public/restaurants ─────────────────
// Liste tous les restaurants actifs pour le marketplace
// Filtre optionnel: ?region=&cuisine=&q=
router.get('/restaurants', (req, res) => {
  try {
    const { region, cuisine, q } = req.query

    // Récupérer tous les restaurants avec un abonnement actif (ou tous en dev)
    let rows = db.exec(`
      SELECT
        r.id, r.name, r.slug, r.logo, r.phone, r.email,
        r.address, r.city, r.zip, r.country,
        r.plan, r.subscriptionStatus,
        r.stripeCustomerId, r.createdAt
      FROM restaurants r
      WHERE r.name IS NOT NULL AND r.name != ''
      ORDER BY r.name ASC
    `)

    if (!rows.length || !rows[0].values.length) {
      return res.json({ restaurants: [], total: 0 })
    }

    const columns = rows[0].columns
    let restaurants = rows[0].values.map(row => {
      const obj = {}
      columns.forEach((col, i) => { obj[col] = row[i] })
      return obj
    })

    // Enrichir avec les options du restaurant (cuisine, features, etc.)
    restaurants = restaurants.map(r => {
      let options = {}
      try {
        const optRows = db.exec(`SELECT * FROM options WHERE restaurantId = ?`, [r.id])
        if (optRows.length && optRows[0].values.length) {
          const optCols = optRows[0].columns
          optCols.forEach((col, i) => { options[col] = optRows[0].values[0][i] })
        }
      } catch (_) {}

      // Récupérer les services (pour horaires)
      let services = []
      try {
        const svcRows = db.exec(`SELECT * FROM services WHERE restaurantId = ?`, [r.id])
        if (svcRows.length && svcRows[0].values.length) {
          const svcCols = svcRows[0].columns
          services = svcRows[0].values.map(row => {
            const obj = {}
            svcCols.forEach((col, i) => { obj[col] = row[i] })
            return obj
          })
        }
      } catch (_) {}

      // Compter les tables (capacité totale)
      let totalSeats = 0
      try {
        const tblRows = db.exec(`SELECT SUM(seats) as total FROM tables WHERE restaurantId = ?`, [r.id])
        if (tblRows.length && tblRows[0].values.length) {
          totalSeats = tblRows[0].values[0][0] || 0
        }
      } catch (_) {}

      return {
        id: r.id,
        name: r.name,
        slug: r.slug || r.id,
        logo: r.logo || null,
        city: r.city || null,
        address: r.address || null,
        zip: r.zip || null,
        phone: r.phone || null,
        cuisine: options.cuisineType || null,
        cuisineTag: options.cuisineTag || null,
        priceRange: options.priceRange || null,
        description: options.description || null,
        website: options.website || null,
        photo: options.coverPhoto || r.logo || null,
        features: (() => {
          const f = []
          if (options.terrasse) f.push('Terrasse')
          if (options.terrasse_couverte) f.push('Terrasse couverte')
          if (options.parking) f.push('Parking')
          if (options.pmr) f.push('Accès PMR')
          if (options.animaux) f.push('Animaux bienvenus')
          if (options.wifi) f.push('WiFi')
          if (options.climatisation) f.push('Climatisation')
          return f
        })(),
        plan: r.plan || 'bistro',
        totalSeats,
        services: services.map(s => ({
          name: s.name, start: s.start, end: s.end, days: s.days
        })),
        bookingUrl: `https://booking.r3sto.ch/?r=${encodeURIComponent(r.slug || r.name)}`,
        vitrineUrl: r.slug ? `https://${r.slug}.r3sto.ch` : null,
      }
    })

    // ── Filtres ──
    if (q) {
      const query = q.toLowerCase()
      restaurants = restaurants.filter(r =>
        (r.name && r.name.toLowerCase().includes(query)) ||
        (r.city && r.city.toLowerCase().includes(query)) ||
        (r.cuisine && r.cuisine.toLowerCase().includes(query)) ||
        (r.description && r.description.toLowerCase().includes(query))
      )
    }
    if (region) {
      const reg = region.toLowerCase()
      restaurants = restaurants.filter(r => r.city && r.city.toLowerCase().includes(reg))
    }
    if (cuisine) {
      const cui = cuisine.toLowerCase()
      restaurants = restaurants.filter(r => r.cuisineTag && r.cuisineTag.toLowerCase() === cui)
    }

    res.json({ restaurants, total: restaurants.length })
  } catch (err) {
    console.error('Error fetching public restaurants:', err.message)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// ── GET /api/public/restaurants/:slug ───────────
// Fiche détaillée d'un restaurant pour le marketplace
router.get('/restaurants/:slug', (req, res) => {
  try {
    const { slug } = req.params

    const rows = db.exec(`
      SELECT * FROM restaurants WHERE slug = ? OR id = ? LIMIT 1
    `, [slug, slug])

    if (!rows.length || !rows[0].values.length) {
      return res.status(404).json({ error: 'Restaurant introuvable' })
    }

    const columns = rows[0].columns
    const resto = {}
    columns.forEach((col, i) => { resto[col] = rows[0].values[0][i] })

    // Options
    let options = {}
    try {
      const optRows = db.exec(`SELECT * FROM options WHERE restaurantId = ?`, [resto.id])
      if (optRows.length && optRows[0].values.length) {
        const optCols = optRows[0].columns
        optCols.forEach((col, i) => { options[col] = optRows[0].values[0][i] })
      }
    } catch (_) {}

    // Services
    let services = []
    try {
      const svcRows = db.exec(`SELECT * FROM services WHERE restaurantId = ?`, [resto.id])
      if (svcRows.length && svcRows[0].values.length) {
        const svcCols = svcRows[0].columns
        services = svcRows[0].values.map(row => {
          const obj = {}
          svcCols.forEach((col, i) => { obj[col] = row[i] })
          return obj
        })
      }
    } catch (_) {}

    // Salles
    let salles = []
    try {
      const salRows = db.exec(`SELECT * FROM salles WHERE restaurantId = ?`, [resto.id])
      if (salRows.length && salRows[0].values.length) {
        const salCols = salRows[0].columns
        salles = salRows[0].values.map(row => {
          const obj = {}
          salCols.forEach((col, i) => { obj[col] = row[i] })
          return obj
        })
      }
    } catch (_) {}

    res.json({
      id: resto.id,
      name: resto.name,
      slug: resto.slug || resto.id,
      logo: resto.logo || null,
      city: resto.city || null,
      address: resto.address || null,
      zip: resto.zip || null,
      phone: resto.phone || null,
      email: resto.email || null,
      cuisine: options.cuisineType || null,
      priceRange: options.priceRange || null,
      description: options.description || null,
      website: options.website || null,
      photo: options.coverPhoto || resto.logo || null,
      features: (() => {
        const f = []
        if (options.terrasse) f.push('Terrasse')
        if (options.terrasse_couverte) f.push('Terrasse couverte')
        if (options.parking) f.push('Parking')
        if (options.pmr) f.push('Accès PMR')
        if (options.animaux) f.push('Animaux bienvenus')
        if (options.wifi) f.push('WiFi')
        if (options.climatisation) f.push('Climatisation')
        return f
      })(),
      services: services.map(s => ({
        name: s.name, start: s.start, end: s.end, days: s.days
      })),
      salles: salles.map(s => ({ name: s.name, capacity: s.capacity })),
      bookingUrl: `https://booking.r3sto.ch/?r=${encodeURIComponent(resto.slug || resto.name)}`,
      vitrineUrl: resto.slug ? `https://${resto.slug}.r3sto.ch` : null,
      plan: resto.plan || 'bistro',
    })
  } catch (err) {
    console.error('Error fetching restaurant detail:', err.message)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router
