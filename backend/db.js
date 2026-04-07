import initSqlJs from 'sql.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbDir = path.join(__dirname, 'data')
const dbPath = process.env.DB_PATH || path.join(dbDir, 'r3sto.db')

// Ensure data directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

// Initialize sql.js
const SQL = await initSqlJs()

// Load existing database or create new one
let dbBuffer = null
if (fs.existsSync(dbPath)) {
  try {
    dbBuffer = fs.readFileSync(dbPath)
  } catch (e) {
    console.log('No existing database found, creating new one')
  }
}

const db = dbBuffer ? new SQL.Database(dbBuffer) : new SQL.Database()

// Enable WAL-like behavior and foreign keys
db.run('PRAGMA foreign_keys = ON')

// Auto-save to disk every 30 seconds and on changes
let saveTimer = null
function scheduleSave() {
  if (saveTimer) return
  saveTimer = setTimeout(() => {
    saveToDisk()
    saveTimer = null
  }, 5000)
}

function saveToDisk() {
  try {
    const data = db.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(dbPath, buffer)
  } catch (e) {
    console.error('Error saving database:', e.message)
  }
}

// Save on exit
process.on('exit', saveToDisk)
process.on('SIGINT', () => { saveToDisk(); process.exit(0) })
process.on('SIGTERM', () => { saveToDisk(); process.exit(0) })

// ════════════════════════════════════════════════════════════════════════════
//  Helper Functions (same API as better-sqlite3 wrappers)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Get a single row
 * @param {string} query - SQL query
 * @param {...any} params - Query parameters
 * @returns {object|undefined} Single row or undefined
 */
function row(query, ...params) {
  try {
    const stmt = db.prepare(query)
    if (params.length > 0) {
      stmt.bind(params)
    }
    if (stmt.step()) {
      const columns = stmt.getColumnNames()
      const values = stmt.get()
      const result = {}
      for (let i = 0; i < columns.length; i++) {
        result[columns[i]] = values[i]
      }
      stmt.free()
      return result
    }
    stmt.free()
    return undefined
  } catch (e) {
    console.error('DB row error:', e.message, '\nQuery:', query, '\nParams:', params)
    throw e
  }
}

/**
 * Get all matching rows
 * @param {string} query - SQL query
 * @param {...any} params - Query parameters
 * @returns {Array<object>} Array of row objects
 */
function rows(query, ...params) {
  try {
    const results = []
    const stmt = db.prepare(query)
    if (params.length > 0) {
      stmt.bind(params)
    }
    while (stmt.step()) {
      const columns = stmt.getColumnNames()
      const values = stmt.get()
      const obj = {}
      for (let i = 0; i < columns.length; i++) {
        obj[columns[i]] = values[i]
      }
      results.push(obj)
    }
    stmt.free()
    return results
  } catch (e) {
    console.error('DB rows error:', e.message, '\nQuery:', query, '\nParams:', params)
    throw e
  }
}

/**
 * Run a statement (INSERT, UPDATE, DELETE)
 * @param {string} query - SQL query
 * @param {...any} params - Query parameters
 * @returns {object} Result with changes count
 */
function run(query, ...params) {
  try {
    if (params.length > 0) {
      db.run(query, params)
    } else {
      db.run(query)
    }
    scheduleSave()
    // Return info similar to better-sqlite3
    const changesResult = db.exec('SELECT changes() as changes, last_insert_rowid() as lastInsertRowid')
    return {
      changes: changesResult[0]?.values[0]?.[0] || 0,
      lastInsertRowid: changesResult[0]?.values[0]?.[1] || 0
    }
  } catch (e) {
    console.error('DB run error:', e.message, '\nQuery:', query, '\nParams:', params)
    throw e
  }
}

/**
 * Run multiple statements in a transaction
 * @param {Function} fn - Function containing db operations
 * @returns {any} Result of the function
 */
function transaction(fn) {
  db.run('BEGIN TRANSACTION')
  try {
    const result = fn()
    db.run('COMMIT')
    scheduleSave()
    return result
  } catch (e) {
    db.run('ROLLBACK')
    throw e
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  Schema Initialization
// ════════════════════════════════════════════════════════════════════════════

function initDb() {
  // Migration tracking table
  db.run(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      executedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Check and apply migrations
  applyMigrations()
}

function applyMigrations() {
  const migrations = [
    {
      name: '001_initial_schema',
      sql: `
        -- Restaurants
        CREATE TABLE IF NOT EXISTS restaurants (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          ville TEXT NOT NULL,
          pays TEXT DEFAULT 'CH',
          plan TEXT DEFAULT 'bistro',
          maxCvt INTEGER DEFAULT 100,
          tel TEXT,
          email TEXT UNIQUE,
          web TEXT,
          avg_ticket REAL,
          createdAt INTEGER,
          updatedAt INTEGER
        );

        CREATE INDEX IF NOT EXISTS idx_restaurants_email ON restaurants(email);

        -- Users (Staff)
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          restaurantId TEXT NOT NULL,
          n TEXT NOT NULL,
          email TEXT NOT NULL,
          passwordHash TEXT NOT NULL,
          role TEXT DEFAULT 'serveur',
          active BOOLEAN DEFAULT 1,
          pin TEXT,
          createdAt INTEGER,
          updatedAt INTEGER,
          FOREIGN KEY (restaurantId) REFERENCES restaurants(id),
          UNIQUE(restaurantId, email)
        );

        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_restaurantId ON users(restaurantId);

        -- Salles (Dining Rooms)
        CREATE TABLE IF NOT EXISTS salles (
          id TEXT PRIMARY KEY,
          restaurantId TEXT NOT NULL,
          name TEXT NOT NULL,
          type TEXT DEFAULT 'intérieure',
          exterior BOOLEAN DEFAULT 0,
          active BOOLEAN DEFAULT 1,
          openByDefault BOOLEAN DEFAULT 1,
          color TEXT,
          priority INTEGER DEFAULT 0,
          createdAt INTEGER,
          updatedAt INTEGER,
          FOREIGN KEY (restaurantId) REFERENCES restaurants(id)
        );

        CREATE INDEX IF NOT EXISTS idx_salles_restaurantId ON salles(restaurantId);

        -- Tables
        CREATE TABLE IF NOT EXISTS tables_r (
          id TEXT PRIMARY KEY,
          restaurantId TEXT NOT NULL,
          salle TEXT NOT NULL,
          n TEXT NOT NULL,
          shape TEXT DEFAULT 'round',
          capMin INTEGER DEFAULT 2,
          capMax INTEGER DEFAULT 4,
          x REAL DEFAULT 0,
          y REAL DEFAULT 0,
          w REAL DEFAULT 10,
          h REAL DEFAULT 10,
          active BOOLEAN DEFAULT 1,
          priority INTEGER DEFAULT 0,
          blocked BOOLEAN DEFAULT 0,
          blockedReason TEXT,
          held BOOLEAN DEFAULT 0,
          _closedToday TEXT,
          tableH TEXT,
          orient TEXT,
          barSide TEXT,
          createdAt INTEGER,
          updatedAt INTEGER,
          FOREIGN KEY (restaurantId) REFERENCES restaurants(id),
          FOREIGN KEY (salle) REFERENCES salles(id)
        );

        CREATE INDEX IF NOT EXISTS idx_tables_restaurantId ON tables_r(restaurantId);
        CREATE INDEX IF NOT EXISTS idx_tables_salle ON tables_r(salle);

        -- Combos (Combined Tables)
        CREATE TABLE IF NOT EXISTS combos (
          id TEXT PRIMARY KEY,
          restaurantId TEXT NOT NULL,
          salle TEXT NOT NULL,
          label TEXT NOT NULL,
          tables_list TEXT NOT NULL,
          cap INTEGER NOT NULL,
          capOverride INTEGER,
          align TEXT,
          orient TEXT,
          origSpan TEXT,
          origPositions TEXT,
          createdAt INTEGER,
          updatedAt INTEGER,
          FOREIGN KEY (restaurantId) REFERENCES restaurants(id),
          FOREIGN KEY (salle) REFERENCES salles(id)
        );

        CREATE INDEX IF NOT EXISTS idx_combos_restaurantId ON combos(restaurantId);

        -- Services (Midi, Soir, etc.)
        CREATE TABLE IF NOT EXISTS services (
          id TEXT PRIMARY KEY,
          restaurantId TEXT NOT NULL,
          name TEXT NOT NULL,
          icon TEXT,
          open_time TEXT NOT NULL,
          close_time TEXT NOT NULL,
          lastOrder TEXT,
          buffer INTEGER DEFAULT 15,
          bookingCutoffMins INTEGER DEFAULT 30,
          active BOOLEAN DEFAULT 1,
          color TEXT,
          jours TEXT NOT NULL,
          maxCouverts INTEGER DEFAULT 100,
          maxParService INTEGER DEFAULT 50,
          _closedToday TEXT,
          createdAt INTEGER,
          updatedAt INTEGER,
          FOREIGN KEY (restaurantId) REFERENCES restaurants(id)
        );

        CREATE INDEX IF NOT EXISTS idx_services_restaurantId ON services(restaurantId);

        -- Reservations
        CREATE TABLE IF NOT EXISTS resas (
          id TEXT PRIMARY KEY,
          restaurantId TEXT NOT NULL,
          n TEXT NOT NULL,
          nom TEXT,
          prenom TEXT,
          c INTEGER NOT NULL,
          tbl TEXT,
          t TEXT NOT NULL,
          svc TEXT NOT NULL,
          s TEXT DEFAULT 'reserved',
          note TEXT,
          date TEXT NOT NULL,
          createdAt INTEGER,
          updatedAt INTEGER,
          statut INTEGER DEFAULT 0,
          mode TEXT DEFAULT 'manuel',
          tel TEXT,
          email TEXT,
          canal TEXT,
          prisPar TEXT,
          src TEXT,
          bebe INTEGER DEFAULT 0,
          pmr INTEGER DEFAULT 0,
          allergie BOOLEAN DEFAULT 0,
          confirmed BOOLEAN DEFAULT 0,
          tablePref TEXT,
          noteProfil TEXT,
          FOREIGN KEY (restaurantId) REFERENCES restaurants(id),
          FOREIGN KEY (tbl) REFERENCES tables_r(id),
          FOREIGN KEY (svc) REFERENCES services(id)
        );

        CREATE INDEX IF NOT EXISTS idx_resas_date ON resas(date);
        CREATE INDEX IF NOT EXISTS idx_resas_restaurantId ON resas(restaurantId);
        CREATE INDEX IF NOT EXISTS idx_resas_svc ON resas(svc);
        CREATE INDEX IF NOT EXISTS idx_resas_email ON resas(email);

        -- Clients (CRM)
        CREATE TABLE IF NOT EXISTS clients (
          id TEXT PRIMARY KEY,
          restaurantId TEXT NOT NULL,
          nom TEXT NOT NULL,
          prenom TEXT,
          tel TEXT,
          email TEXT,
          statut INTEGER DEFAULT 0,
          allergies TEXT,
          notes TEXT,
          langue TEXT DEFAULT 'fr',
          entreprise TEXT,
          tags TEXT,
          tablePref TEXT,
          createdAt INTEGER,
          updatedAt INTEGER,
          lastVisit TEXT,
          totalVisits INTEGER DEFAULT 0,
          totalCouverts INTEGER DEFAULT 0,
          totalNoshows INTEGER DEFAULT 0,
          blacklisted BOOLEAN DEFAULT 0,
          blacklistReason TEXT,
          FOREIGN KEY (restaurantId) REFERENCES restaurants(id)
        );

        CREATE INDEX IF NOT EXISTS idx_clients_restaurantId ON clients(restaurantId);
        CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);

        -- Options (Settings)
        CREATE TABLE IF NOT EXISTS options (
          id TEXT PRIMARY KEY,
          restaurantId TEXT UNIQUE NOT NULL,
          wifi BOOLEAN DEFAULT 0,
          wifi_payant BOOLEAN DEFAULT 0,
          parking BOOLEAN DEFAULT 0,
          parking_valet BOOLEAN DEFAULT 0,
          terrasse BOOLEAN DEFAULT 0,
          accessible BOOLEAN DEFAULT 0,
          animaux BOOLEAN DEFAULT 0,
          animaux_terrasse_only BOOLEAN DEFAULT 0,
          reservation_min INTEGER DEFAULT 1,
          reservation_max INTEGER DEFAULT 20,
          annulation_h INTEGER DEFAULT 24,
          allow_past_booking BOOLEAN DEFAULT 0,
          booking_horizon_days INTEGER DEFAULT 180,
          slot_interval_mins INTEGER DEFAULT 15,
          default_duration_mins INTEGER DEFAULT 90,
          require_phone BOOLEAN DEFAULT 1,
          allow_walkin BOOLEAN DEFAULT 1,
          dispersion_mode TEXT DEFAULT 'ia',
          dispersion_interval INTEGER DEFAULT 5,
          dispersion_max_per_slot INTEGER DEFAULT 3,
          groupe_seuil INTEGER DEFAULT 8,
          groupe_max_par_service INTEGER DEFAULT 2,
          notif_new_resa BOOLEAN DEFAULT 1,
          notif_new_hours INTEGER DEFAULT 1,
          auto_confirm BOOLEAN DEFAULT 0,
          auto_remind_24h BOOLEAN DEFAULT 1,
          auto_noshow_flag BOOLEAN DEFAULT 1,
          chaises_bebe INTEGER DEFAULT 0,
          places_pmr INTEGER DEFAULT 0,
          createdAt INTEGER,
          updatedAt INTEGER,
          FOREIGN KEY (restaurantId) REFERENCES restaurants(id)
        );

        CREATE INDEX IF NOT EXISTS idx_options_restaurantId ON options(restaurantId);

        -- Fermetures (Closures)
        CREATE TABLE IF NOT EXISTS fermetures (
          id TEXT PRIMARY KEY,
          restaurantId TEXT NOT NULL,
          type TEXT NOT NULL,
          date TEXT NOT NULL,
          dateFin TEXT,
          label TEXT NOT NULL,
          note TEXT,
          salle TEXT,
          service TEXT,
          active BOOLEAN DEFAULT 1,
          createdAt INTEGER,
          updatedAt INTEGER,
          FOREIGN KEY (restaurantId) REFERENCES restaurants(id)
        );

        CREATE INDEX IF NOT EXISTS idx_fermetures_restaurantId ON fermetures(restaurantId);
        CREATE INDEX IF NOT EXISTS idx_fermetures_date ON fermetures(date);

        -- Gift Cards
        CREATE TABLE IF NOT EXISTS gift_cards (
          id TEXT PRIMARY KEY,
          restaurantId TEXT NOT NULL,
          code TEXT UNIQUE NOT NULL,
          amount REAL NOT NULL,
          balance REAL NOT NULL,
          currency TEXT DEFAULT 'CHF',
          status TEXT DEFAULT 'active',
          buyerName TEXT,
          buyerEmail TEXT,
          buyerTel TEXT,
          recipientName TEXT,
          recipientEmail TEXT,
          message TEXT,
          createdAt INTEGER,
          updatedAt INTEGER,
          expiresAt TEXT,
          usedAt TEXT,
          usedResaId TEXT,
          stripePaymentId TEXT,
          source TEXT DEFAULT 'admin',
          FOREIGN KEY (restaurantId) REFERENCES restaurants(id)
        );

        CREATE INDEX IF NOT EXISTS idx_gift_cards_restaurantId ON gift_cards(restaurantId);
        CREATE INDEX IF NOT EXISTS idx_gift_cards_code ON gift_cards(code);

        -- Reviews
        CREATE TABLE IF NOT EXISTS reviews (
          id TEXT PRIMARY KEY,
          restaurantId TEXT NOT NULL,
          resaId TEXT,
          clientId TEXT,
          clientName TEXT NOT NULL,
          clientEmail TEXT,
          date TEXT,
          createdAt INTEGER,
          updatedAt INTEGER,
          rating INTEGER NOT NULL,
          comment TEXT,
          service TEXT,
          source TEXT DEFAULT 'internal',
          reply TEXT,
          repliedAt INTEGER,
          visible BOOLEAN DEFAULT 1,
          flagged BOOLEAN DEFAULT 0,
          FOREIGN KEY (restaurantId) REFERENCES restaurants(id)
        );

        CREATE INDEX IF NOT EXISTS idx_reviews_restaurantId ON reviews(restaurantId);

        -- Loyalty Configuration
        CREATE TABLE IF NOT EXISTS loyalty_config (
          id TEXT PRIMARY KEY,
          restaurantId TEXT UNIQUE NOT NULL,
          active BOOLEAN DEFAULT 0,
          mode TEXT DEFAULT 'points',
          pointsPerChf REAL DEFAULT 1.0,
          stampsGoal INTEGER DEFAULT 10,
          cashbackPercent REAL DEFAULT 5.0,
          rewardName TEXT,
          rewardValue REAL,
          rewardThreshold INTEGER,
          welcomeBonus INTEGER DEFAULT 0,
          birthdayBonus INTEGER DEFAULT 0,
          expirationMonths INTEGER DEFAULT 0,
          doublePointsDays TEXT,
          createdAt INTEGER,
          updatedAt INTEGER,
          FOREIGN KEY (restaurantId) REFERENCES restaurants(id)
        );

        -- Loyalty Cards
        CREATE TABLE IF NOT EXISTS loyalty_cards (
          id TEXT PRIMARY KEY,
          restaurantId TEXT NOT NULL,
          clientId TEXT NOT NULL,
          clientName TEXT NOT NULL,
          clientEmail TEXT,
          points INTEGER DEFAULT 0,
          stamps INTEGER DEFAULT 0,
          cashbackBalance REAL DEFAULT 0,
          totalEarned INTEGER DEFAULT 0,
          rewardsUsed INTEGER DEFAULT 0,
          joinedAt INTEGER,
          updatedAt INTEGER,
          lastActivity TEXT,
          FOREIGN KEY (restaurantId) REFERENCES restaurants(id),
          FOREIGN KEY (clientId) REFERENCES clients(id)
        );

        -- Loyalty Events
        CREATE TABLE IF NOT EXISTS loyalty_events (
          id TEXT PRIMARY KEY,
          loyaltyCardId TEXT NOT NULL,
          date TEXT NOT NULL,
          type TEXT NOT NULL,
          amount INTEGER NOT NULL,
          label TEXT NOT NULL,
          resaId TEXT,
          createdAt INTEGER,
          FOREIGN KEY (loyaltyCardId) REFERENCES loyalty_cards(id)
        );

        -- Room Items
        CREATE TABLE IF NOT EXISTS room_items (
          id TEXT PRIMARY KEY,
          restaurantId TEXT NOT NULL,
          salle TEXT NOT NULL,
          sym TEXT,
          lbl TEXT NOT NULL,
          shape TEXT NOT NULL,
          x REAL NOT NULL,
          y REAL NOT NULL,
          w REAL NOT NULL,
          h REAL NOT NULL,
          createdAt INTEGER,
          updatedAt INTEGER,
          FOREIGN KEY (restaurantId) REFERENCES restaurants(id),
          FOREIGN KEY (salle) REFERENCES salles(id)
        );

        -- Sites (Multi-site)
        CREATE TABLE IF NOT EXISTS sites (
          id TEXT PRIMARY KEY,
          restaurantId TEXT NOT NULL,
          name TEXT NOT NULL,
          ville TEXT,
          adresse TEXT,
          tel TEXT,
          email TEXT,
          web TEXT,
          active BOOLEAN DEFAULT 1,
          color TEXT,
          plan TEXT DEFAULT 'bistro',
          maxCvt INTEGER DEFAULT 100,
          createdAt INTEGER,
          updatedAt INTEGER,
          acceptRedirect BOOLEAN DEFAULT 0,
          redirectPriority INTEGER DEFAULT 0,
          redirectMsg TEXT,
          FOREIGN KEY (restaurantId) REFERENCES restaurants(id)
        );

        -- Orders (Kitchen)
        CREATE TABLE IF NOT EXISTS orders (
          id TEXT PRIMARY KEY,
          restaurantId TEXT NOT NULL,
          resaId TEXT,
          tableId TEXT,
          status TEXT DEFAULT 'pending',
          items TEXT NOT NULL,
          notes TEXT,
          priority INTEGER DEFAULT 0,
          createdAt INTEGER,
          updatedAt INTEGER,
          sentAt INTEGER,
          completedAt INTEGER,
          FOREIGN KEY (restaurantId) REFERENCES restaurants(id)
        );

        CREATE INDEX IF NOT EXISTS idx_orders_restaurantId ON orders(restaurantId);
        CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

        -- Notifications
        CREATE TABLE IF NOT EXISTS notifications (
          id TEXT PRIMARY KEY,
          restaurantId TEXT NOT NULL,
          userId TEXT,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT,
          data TEXT,
          read_status BOOLEAN DEFAULT 0,
          createdAt INTEGER,
          FOREIGN KEY (restaurantId) REFERENCES restaurants(id)
        );

        -- Audit Logs
        CREATE TABLE IF NOT EXISTS audit_logs (
          id TEXT PRIMARY KEY,
          restaurantId TEXT NOT NULL,
          userId TEXT,
          action TEXT NOT NULL,
          resource TEXT,
          resourceId TEXT,
          changes TEXT,
          createdAt INTEGER,
          FOREIGN KEY (restaurantId) REFERENCES restaurants(id)
        );
      `
    }
  ]

  for (const migration of migrations) {
    const existing = row('SELECT name FROM migrations WHERE name = ?', migration.name)
    if (!existing) {
      // sql.js db.run only handles single statements, use exec for multi-statement
      const statements = migration.sql.split(';').filter(s => s.trim().length > 0)
      for (const stmt of statements) {
        try {
          db.run(stmt + ';')
        } catch (e) {
          // Ignore errors for IF NOT EXISTS statements
          if (!e.message.includes('already exists')) {
            console.warn('Migration statement warning:', e.message)
          }
        }
      }
      run('INSERT INTO migrations (name) VALUES (?)', migration.name)
      console.log(`Applied migration: ${migration.name}`)
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  Seed Data (Demo Mode)
// ════════════════════════════════════════════════════════════════════════════

function seedDemoData() {
  try {
    const existing = row('SELECT id FROM restaurants LIMIT 1')
    if (existing) {
      console.log('Demo data already exists, skipping seed')
      return
    }

    const restaurantId = uuidv4()
    const now = Date.now()

    run(`INSERT INTO restaurants (id, name, ville, pays, plan, maxCvt, tel, email, web, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      restaurantId, 'Le Bistro de Sion', 'Sion', 'CH', 'bistro', 80, '+41 27 322 80 80', 'info@bistro.ch', 'https://bistro.ch', now, now)

    // Create admin user (password: admin123)
    const userId = uuidv4()
    run(`INSERT INTO users (id, restaurantId, n, email, passwordHash, role, active, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      userId, restaurantId, 'Admin Bistro', 'admin@bistro.ch',
      '$2a$10$Zd4oHzGgJzQW.gKJNKQjZ.mH6vf9jKVCvEUZ2U.8LVhJ/8YoVZvhS',
      'proprietaire', 1, now, now)

    // Create salles
    const salleInt = uuidv4()
    const salleTer = uuidv4()

    run(`INSERT INTO salles (id, restaurantId, name, type, exterior, active, color, priority, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      salleInt, restaurantId, 'Salle intérieure', 'intérieure', 0, 1, '#4F46E5', 0, now, now)

    run(`INSERT INTO salles (id, restaurantId, name, type, exterior, active, color, priority, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      salleTer, restaurantId, 'Terrasse', 'extérieure', 1, 1, '#EC4899', 1, now, now)

    // Create tables
    for (let i = 1; i <= 8; i++) {
      run(`INSERT INTO tables_r (id, restaurantId, salle, n, shape, capMin, capMax, x, y, w, h, active, priority, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        uuidv4(), restaurantId, salleInt, `T${i}`, 'round', 2, 4, (i % 4) * 25, Math.floor(i / 4) * 50, 15, 15, 1, i, now, now)
    }

    for (let i = 9; i <= 12; i++) {
      run(`INSERT INTO tables_r (id, restaurantId, salle, n, shape, capMin, capMax, x, y, w, h, active, priority, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        uuidv4(), restaurantId, salleTer, `T${i}`, 'square', 2, 6, ((i - 9) % 2) * 50, Math.floor((i - 9) / 2) * 50, 20, 20, 1, i, now, now)
    }

    // Create services
    run(`INSERT INTO services (id, restaurantId, name, icon, open_time, close_time, lastOrder, buffer, bookingCutoffMins, active, color, jours, maxCouverts, maxParService, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      uuidv4(), restaurantId, 'Midi', '12', '12:00', '14:30', '13:45', 15, 30, 1, '#60A5FA', '[1,2,3,4,5]', 80, 40, now, now)

    run(`INSERT INTO services (id, restaurantId, name, icon, open_time, close_time, lastOrder, buffer, bookingCutoffMins, active, color, jours, maxCouverts, maxParService, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      uuidv4(), restaurantId, 'Soir', '18', '18:30', '22:00', '21:15', 15, 30, 1, '#F97316', '[0,1,2,3,4,5,6]', 80, 40, now, now)

    // Create options
    run(`INSERT INTO options (id, restaurantId, wifi, parking, terrasse, accessible, animaux, require_phone, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      uuidv4(), restaurantId, 1, 1, 1, 1, 1, 1, now, now)

    // Create loyalty config
    run(`INSERT INTO loyalty_config (id, restaurantId, active, mode, pointsPerChf, stampsGoal, rewardName, rewardValue, rewardThreshold, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      uuidv4(), restaurantId, 1, 'points', 1.0, 10, 'Repas offert', 100, 500, now, now)

    saveToDisk()
    console.log('Demo data seeded successfully')
  } catch (error) {
    console.error('Error seeding demo data:', error.message)
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  Initialize and Export
// ════════════════════════════════════════════════════════════════════════════

initDb()

if (process.env.DEMO_MODE !== 'false') {
  seedDemoData()
}

export { db, row, rows, run, transaction, saveToDisk }
