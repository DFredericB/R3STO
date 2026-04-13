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
    console.log('Loaded existing database from', dbPath)
  } catch (e) {
    console.log('No existing database found, creating new one')
  }
}

const db = dbBuffer ? new SQL.Database(dbBuffer) : new SQL.Database()

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON')

// ════════════════════════════════════════════════════════════════════════════
//  Auto-save to disk
// ════════════════════════════════════════════════════════════════════════════

let saveTimer = null

function scheduleSave() {
  if (saveTimer) return
  saveTimer = setTimeout(() => {
    saveToDisk()
    saveTimer = null
  }, 3000)
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
//  Helper Functions — same API as better-sqlite3 wrappers
// ════════════════════════════════════════════════════════════════════════════

function row(query, ...params) {
  try {
    const stmt = db.prepare(query)
    if (params.length > 0) stmt.bind(params)
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
    console.error('DB row error:', e.message, '| Query:', query)
    throw e
  }
}

function rows(query, ...params) {
  try {
    const results = []
    const stmt = db.prepare(query)
    if (params.length > 0) stmt.bind(params)
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
    console.error('DB rows error:', e.message, '| Query:', query)
    throw e
  }
}

function run(query, ...params) {
  try {
    if (params.length > 0) {
      db.run(query, params)
    } else {
      db.run(query)
    }
    scheduleSave()
    const info = db.exec('SELECT changes() as c, last_insert_rowid() as r')
    return {
      changes: info[0]?.values[0]?.[0] || 0,
      lastInsertRowid: info[0]?.values[0]?.[1] || 0
    }
  } catch (e) {
    console.error('DB run error:', e.message, '| Query:', query)
    throw e
  }
}

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
//  Schema — exact same as original (tables, open, close, read columns)
// ════════════════════════════════════════════════════════════════════════════

function initDb() {
  db.run(`CREATE TABLE IF NOT EXISTS migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    executedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`)

  applyMigrations()
}

function execMulti(sql) {
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))
  for (const stmt of statements) {
    try {
      db.run(stmt)
    } catch (e) {
      if (!e.message.includes('already exists')) {
        console.warn('  Migration warning:', e.message.substring(0, 80))
      }
    }
  }
}

function applyMigrations() {
  const migrations = [
    {
      name: '001_initial_schema',
      sql: `
CREATE TABLE IF NOT EXISTS restaurants (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, ville TEXT NOT NULL,
  pays TEXT DEFAULT 'CH', plan TEXT DEFAULT 'bistro', maxCvt INTEGER DEFAULT 100,
  tel TEXT, email TEXT UNIQUE, web TEXT, avg_ticket REAL,
  createdAt INTEGER, updatedAt INTEGER
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, restaurantId TEXT NOT NULL,
  n TEXT NOT NULL, email TEXT NOT NULL, passwordHash TEXT NOT NULL,
  role TEXT DEFAULT 'serveur', active BOOLEAN DEFAULT 1, pin TEXT,
  createdAt INTEGER, updatedAt INTEGER,
  FOREIGN KEY (restaurantId) REFERENCES restaurants(id),
  UNIQUE(restaurantId, email)
);

CREATE TABLE IF NOT EXISTS salles (
  id TEXT PRIMARY KEY, restaurantId TEXT NOT NULL,
  name TEXT NOT NULL, type TEXT DEFAULT 'intérieure',
  exterior BOOLEAN DEFAULT 0, active BOOLEAN DEFAULT 1,
  openByDefault BOOLEAN DEFAULT 1, color TEXT, priority INTEGER DEFAULT 0,
  createdAt INTEGER, updatedAt INTEGER,
  FOREIGN KEY (restaurantId) REFERENCES restaurants(id)
);

CREATE TABLE IF NOT EXISTS tables (
  id TEXT PRIMARY KEY, restaurantId TEXT NOT NULL, salle TEXT NOT NULL,
  n TEXT NOT NULL, shape TEXT DEFAULT 'round',
  capMin INTEGER DEFAULT 2, capMax INTEGER DEFAULT 4,
  x REAL DEFAULT 0, y REAL DEFAULT 0, w REAL DEFAULT 10, h REAL DEFAULT 10,
  active BOOLEAN DEFAULT 1, priority INTEGER DEFAULT 0,
  blocked BOOLEAN DEFAULT 0, blockedReason TEXT,
  held BOOLEAN DEFAULT 0, _closedToday TEXT,
  tableH TEXT, orient TEXT, barSide TEXT,
  createdAt INTEGER, updatedAt INTEGER,
  FOREIGN KEY (restaurantId) REFERENCES restaurants(id),
  FOREIGN KEY (salle) REFERENCES salles(id)
);

CREATE TABLE IF NOT EXISTS combos (
  id TEXT PRIMARY KEY, restaurantId TEXT NOT NULL, salle TEXT NOT NULL,
  label TEXT NOT NULL, tables TEXT NOT NULL,
  cap INTEGER NOT NULL, capOverride INTEGER,
  align TEXT, orient TEXT, origSpan TEXT, origPositions TEXT,
  createdAt INTEGER, updatedAt INTEGER,
  FOREIGN KEY (restaurantId) REFERENCES restaurants(id)
);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY, restaurantId TEXT NOT NULL,
  name TEXT NOT NULL, icon TEXT,
  open TEXT NOT NULL, close TEXT NOT NULL, lastOrder TEXT,
  buffer INTEGER DEFAULT 15, bookingCutoffMins INTEGER DEFAULT 30,
  active BOOLEAN DEFAULT 1, color TEXT, jours TEXT NOT NULL,
  maxCouverts INTEGER DEFAULT 100, maxParService INTEGER DEFAULT 50,
  _closedToday TEXT, createdAt INTEGER, updatedAt INTEGER,
  FOREIGN KEY (restaurantId) REFERENCES restaurants(id)
);

CREATE TABLE IF NOT EXISTS resas (
  id TEXT PRIMARY KEY, restaurantId TEXT NOT NULL,
  n TEXT NOT NULL, nom TEXT, prenom TEXT, c INTEGER NOT NULL,
  tbl TEXT, t TEXT NOT NULL, svc TEXT NOT NULL,
  s TEXT DEFAULT 'reserved', note TEXT, date TEXT NOT NULL,
  createdAt INTEGER, updatedAt INTEGER,
  statut INTEGER DEFAULT 0, mode TEXT DEFAULT 'manuel',
  tel TEXT, email TEXT, canal TEXT, prisPar TEXT, src TEXT,
  bebe INTEGER DEFAULT 0, pmr INTEGER DEFAULT 0,
  allergie BOOLEAN DEFAULT 0, confirmed BOOLEAN DEFAULT 0,
  tablePref TEXT, noteProfil TEXT,
  FOREIGN KEY (restaurantId) REFERENCES restaurants(id)
);

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY, restaurantId TEXT NOT NULL,
  nom TEXT NOT NULL, prenom TEXT, tel TEXT, email TEXT,
  statut INTEGER DEFAULT 0, allergies TEXT, notes TEXT,
  langue TEXT DEFAULT 'fr', entreprise TEXT, tags TEXT, tablePref TEXT,
  createdAt INTEGER, updatedAt INTEGER, lastVisit TEXT,
  totalVisits INTEGER DEFAULT 0, totalCouverts INTEGER DEFAULT 0,
  totalNoshows INTEGER DEFAULT 0, blacklisted BOOLEAN DEFAULT 0,
  blacklistReason TEXT,
  FOREIGN KEY (restaurantId) REFERENCES restaurants(id)
);

CREATE TABLE IF NOT EXISTS options (
  id TEXT PRIMARY KEY, restaurantId TEXT UNIQUE NOT NULL,
  wifi BOOLEAN DEFAULT 0, wifi_payant BOOLEAN DEFAULT 0,
  parking BOOLEAN DEFAULT 0, parking_valet BOOLEAN DEFAULT 0,
  terrasse BOOLEAN DEFAULT 0, accessible BOOLEAN DEFAULT 0,
  animaux BOOLEAN DEFAULT 0, animaux_terrasse_only BOOLEAN DEFAULT 0,
  reservation_min INTEGER DEFAULT 1, reservation_max INTEGER DEFAULT 20,
  annulation_h INTEGER DEFAULT 24, allow_past_booking BOOLEAN DEFAULT 0,
  booking_horizon_days INTEGER DEFAULT 180, slot_interval_mins INTEGER DEFAULT 15,
  default_duration_mins INTEGER DEFAULT 90, require_phone BOOLEAN DEFAULT 1,
  allow_walkin BOOLEAN DEFAULT 1, dispersion_mode TEXT DEFAULT 'ia',
  dispersion_interval INTEGER DEFAULT 5, dispersion_max_per_slot INTEGER DEFAULT 3,
  groupe_seuil INTEGER DEFAULT 8, groupe_max_par_service INTEGER DEFAULT 2,
  notif_new_resa BOOLEAN DEFAULT 1, notif_new_hours INTEGER DEFAULT 1,
  auto_confirm BOOLEAN DEFAULT 0, auto_remind_24h BOOLEAN DEFAULT 1,
  auto_noshow_flag BOOLEAN DEFAULT 1, chaises_bebe INTEGER DEFAULT 0,
  places_pmr INTEGER DEFAULT 0,
  createdAt INTEGER, updatedAt INTEGER,
  FOREIGN KEY (restaurantId) REFERENCES restaurants(id)
);

CREATE TABLE IF NOT EXISTS fermetures (
  id TEXT PRIMARY KEY, restaurantId TEXT NOT NULL,
  type TEXT NOT NULL, date TEXT NOT NULL, dateFin TEXT,
  label TEXT NOT NULL, note TEXT, salle TEXT, service TEXT,
  active BOOLEAN DEFAULT 1, createdAt INTEGER, updatedAt INTEGER,
  FOREIGN KEY (restaurantId) REFERENCES restaurants(id)
);

CREATE TABLE IF NOT EXISTS gift_cards (
  id TEXT PRIMARY KEY, restaurantId TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL, amount REAL NOT NULL, balance REAL NOT NULL,
  currency TEXT DEFAULT 'CHF', status TEXT DEFAULT 'active',
  buyerName TEXT, buyerEmail TEXT, buyerTel TEXT,
  recipientName TEXT, recipientEmail TEXT, message TEXT,
  createdAt INTEGER, updatedAt INTEGER, expiresAt TEXT,
  usedAt TEXT, usedResaId TEXT, stripePaymentId TEXT,
  source TEXT DEFAULT 'admin',
  FOREIGN KEY (restaurantId) REFERENCES restaurants(id)
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY, restaurantId TEXT NOT NULL,
  resaId TEXT, clientId TEXT, clientName TEXT NOT NULL,
  clientEmail TEXT, date TEXT, createdAt INTEGER, updatedAt INTEGER,
  rating INTEGER NOT NULL, comment TEXT, service TEXT,
  source TEXT DEFAULT 'internal', reply TEXT, repliedAt INTEGER,
  visible BOOLEAN DEFAULT 1, flagged BOOLEAN DEFAULT 0,
  FOREIGN KEY (restaurantId) REFERENCES restaurants(id)
);

CREATE TABLE IF NOT EXISTS loyalty_config (
  id TEXT PRIMARY KEY, restaurantId TEXT UNIQUE NOT NULL,
  active BOOLEAN DEFAULT 0, mode TEXT DEFAULT 'points',
  pointsPerChf REAL DEFAULT 1.0, stampsGoal INTEGER DEFAULT 10,
  cashbackPercent REAL DEFAULT 5.0, rewardName TEXT,
  rewardValue REAL, rewardThreshold INTEGER,
  welcomeBonus INTEGER DEFAULT 0, birthdayBonus INTEGER DEFAULT 0,
  expirationMonths INTEGER DEFAULT 0, doublePointsDays TEXT,
  createdAt INTEGER, updatedAt INTEGER,
  FOREIGN KEY (restaurantId) REFERENCES restaurants(id)
);

CREATE TABLE IF NOT EXISTS loyalty_cards (
  id TEXT PRIMARY KEY, restaurantId TEXT NOT NULL,
  clientId TEXT NOT NULL, clientName TEXT NOT NULL, clientEmail TEXT,
  points INTEGER DEFAULT 0, stamps INTEGER DEFAULT 0,
  cashbackBalance REAL DEFAULT 0, totalEarned INTEGER DEFAULT 0,
  rewardsUsed INTEGER DEFAULT 0, joinedAt INTEGER, updatedAt INTEGER,
  lastActivity TEXT,
  FOREIGN KEY (restaurantId) REFERENCES restaurants(id)
);

CREATE TABLE IF NOT EXISTS loyalty_events (
  id TEXT PRIMARY KEY, loyaltyCardId TEXT NOT NULL,
  date TEXT NOT NULL, type TEXT NOT NULL,
  amount INTEGER NOT NULL, label TEXT NOT NULL,
  resaId TEXT, createdAt INTEGER,
  FOREIGN KEY (loyaltyCardId) REFERENCES loyalty_cards(id)
);

CREATE TABLE IF NOT EXISTS room_items (
  id TEXT PRIMARY KEY, restaurantId TEXT NOT NULL, salle TEXT NOT NULL,
  sym TEXT, lbl TEXT NOT NULL, shape TEXT NOT NULL,
  x REAL NOT NULL, y REAL NOT NULL, w REAL NOT NULL, h REAL NOT NULL,
  createdAt INTEGER, updatedAt INTEGER,
  FOREIGN KEY (restaurantId) REFERENCES restaurants(id)
);

CREATE TABLE IF NOT EXISTS sites (
  id TEXT PRIMARY KEY, restaurantId TEXT NOT NULL,
  name TEXT NOT NULL, ville TEXT, adresse TEXT, tel TEXT, email TEXT, web TEXT,
  active BOOLEAN DEFAULT 1, color TEXT, plan TEXT DEFAULT 'bistro',
  maxCvt INTEGER DEFAULT 100, createdAt INTEGER, updatedAt INTEGER,
  acceptRedirect BOOLEAN DEFAULT 0, redirectPriority INTEGER DEFAULT 0,
  redirectMsg TEXT,
  FOREIGN KEY (restaurantId) REFERENCES restaurants(id)
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY, restaurantId TEXT NOT NULL,
  resaId TEXT, tableId TEXT, status TEXT DEFAULT 'pending',
  items TEXT NOT NULL, notes TEXT, priority INTEGER DEFAULT 0,
  createdAt INTEGER, updatedAt INTEGER, sentAt INTEGER, completedAt INTEGER,
  FOREIGN KEY (restaurantId) REFERENCES restaurants(id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY, restaurantId TEXT NOT NULL,
  userId TEXT, type TEXT NOT NULL, title TEXT NOT NULL,
  message TEXT, data TEXT, read BOOLEAN DEFAULT 0, createdAt INTEGER,
  FOREIGN KEY (restaurantId) REFERENCES restaurants(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY, restaurantId TEXT NOT NULL,
  userId TEXT, action TEXT NOT NULL, resource TEXT,
  resourceId TEXT, changes TEXT, createdAt INTEGER,
  FOREIGN KEY (restaurantId) REFERENCES restaurants(id)
)
      `
    }
    ,
    {
      name: '002_stripe_fields',
      sql: `
ALTER TABLE restaurants ADD COLUMN stripeCustomerId TEXT;
ALTER TABLE restaurants ADD COLUMN stripeSubscriptionId TEXT;
ALTER TABLE restaurants ADD COLUMN subscriptionStatus TEXT DEFAULT 'none';
ALTER TABLE restaurants ADD COLUMN slug TEXT;
ALTER TABLE restaurants ADD COLUMN logo TEXT
      `
    },
    {
      name: '003_password_resets',
      sql: `
CREATE TABLE IF NOT EXISTS password_resets (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expiresAt INTEGER NOT NULL,
  usedAt INTEGER,
  createdAt INTEGER NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id)
)
      `
    },
    {
      name: '003_addons_table',
      sql: `
CREATE TABLE IF NOT EXISTS addons (
  id TEXT PRIMARY KEY, restaurantId TEXT NOT NULL,
  moduleId TEXT NOT NULL, active BOOLEAN DEFAULT 1,
  stripeSubscriptionItemId TEXT,
  activatedAt INTEGER, deactivatedAt INTEGER,
  FOREIGN KEY (restaurantId) REFERENCES restaurants(id),
  UNIQUE(restaurantId, moduleId)
)
      `
    },
    {
      name: '004_client_profile_fields',
      sql: `
ALTER TABLE clients ADD COLUMN dateNaissance TEXT;
ALTER TABLE clients ADD COLUMN menuDuJourOptin BOOLEAN DEFAULT 0;
      `
    }
  ]

  for (const migration of migrations) {
    const existing = row('SELECT name FROM migrations WHERE name = ?', migration.name)
    if (!existing) {
      execMulti(migration.sql)
      run('INSERT INTO migrations (name) VALUES (?)', migration.name)
      console.log(`  ✓ Applied migration: ${migration.name}`)
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  Seed Demo Data
// ════════════════════════════════════════════════════════════════════════════

function seedDemoData() {
  try {
    const existing = row('SELECT id FROM restaurants LIMIT 1')
    if (existing) {
      console.log('  Demo data already present')
      return
    }

    const rid = uuidv4()
    const now = Date.now()

    run(`INSERT INTO restaurants (id,name,ville,pays,plan,maxCvt,tel,email,web,createdAt,updatedAt)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      rid,'Le Bistro de Sion','Sion','CH','bistro',80,'+41 27 322 80 80','info@bistro.ch','https://bistro.ch',now,now)

    run(`INSERT INTO users (id,restaurantId,n,email,passwordHash,role,active,createdAt,updatedAt)
      VALUES (?,?,?,?,?,?,?,?,?)`,
      uuidv4(),rid,'Admin Bistro','admin@bistro.ch',
      '$2a$10$tsIdd0Ywd2mgNt6OXTZV4uQktIjsIwLcI45ndkp74ZJ812qH14QNC',
      'proprietaire',1,now,now)

    const s1 = uuidv4(), s2 = uuidv4()
    run(`INSERT INTO salles (id,restaurantId,name,type,exterior,active,color,priority,createdAt,updatedAt)
      VALUES (?,?,?,?,?,?,?,?,?,?)`, s1,rid,'Salle intérieure','intérieure',0,1,'#4F46E5',0,now,now)
    run(`INSERT INTO salles (id,restaurantId,name,type,exterior,active,color,priority,createdAt,updatedAt)
      VALUES (?,?,?,?,?,?,?,?,?,?)`, s2,rid,'Terrasse','extérieure',1,1,'#EC4899',1,now,now)

    for (let i = 1; i <= 8; i++) {
      run(`INSERT INTO tables (id,restaurantId,salle,n,shape,capMin,capMax,x,y,w,h,active,priority,createdAt,updatedAt)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        uuidv4(),rid,s1,`T${i}`,'round',2,4,(i%4)*25,Math.floor(i/4)*50,15,15,1,i,now,now)
    }
    for (let i = 9; i <= 12; i++) {
      run(`INSERT INTO tables (id,restaurantId,salle,n,shape,capMin,capMax,x,y,w,h,active,priority,createdAt,updatedAt)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        uuidv4(),rid,s2,`T${i}`,'square',2,6,((i-9)%2)*50,Math.floor((i-9)/2)*50,20,20,1,i,now,now)
    }

    run(`INSERT INTO services (id,restaurantId,name,icon,open,close,lastOrder,buffer,bookingCutoffMins,active,color,jours,maxCouverts,maxParService,createdAt,updatedAt)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      uuidv4(),rid,'Midi','12','12:00','14:30','13:45',15,30,1,'#60A5FA','[1,2,3,4,5]',80,40,now,now)
    run(`INSERT INTO services (id,restaurantId,name,icon,open,close,lastOrder,buffer,bookingCutoffMins,active,color,jours,maxCouverts,maxParService,createdAt,updatedAt)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      uuidv4(),rid,'Soir','18','18:30','22:00','21:15',15,30,1,'#F97316','[0,1,2,3,4,5,6]',80,40,now,now)

    run(`INSERT INTO options (id,restaurantId,wifi,parking,terrasse,accessible,animaux,require_phone,createdAt,updatedAt)
      VALUES (?,?,?,?,?,?,?,?,?,?)`, uuidv4(),rid,1,1,1,1,1,1,now,now)

    run(`INSERT INTO loyalty_config (id,restaurantId,active,mode,pointsPerChf,stampsGoal,rewardName,rewardValue,rewardThreshold,createdAt,updatedAt)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`, uuidv4(),rid,1,'points',1.0,10,'Repas offert',100,500,now,now)

    saveToDisk()
    console.log('  ✓ Demo data seeded')
  } catch (error) {
    console.error('  ✗ Seed error:', error.message)
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  Initialize
// ════════════════════════════════════════════════════════════════════════════

initDb()

if (process.env.DEMO_MODE !== 'false') {
  seedDemoData()
}

export { db, row, rows, run, transaction, saveToDisk }
