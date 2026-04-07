import { describe, it, before, after } from 'node:test'
import assert from 'node:assert'
import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TEST_DB_PATH = path.join(__dirname, '..', 'test_db.db')

let db = null

// Copy the database initialization from db.js
function initDb(database) {
  // Migration tracking table
  database.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      executedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Check and apply migrations
  applyMigrations(database)
}

function applyMigrations(database) {
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
        CREATE TABLE IF NOT EXISTS tables (
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

        CREATE INDEX IF NOT EXISTS idx_tables_restaurantId ON tables(restaurantId);
        CREATE INDEX IF NOT EXISTS idx_tables_salle ON tables(salle);

        -- Services
        CREATE TABLE IF NOT EXISTS services (
          id TEXT PRIMARY KEY,
          restaurantId TEXT NOT NULL,
          name TEXT NOT NULL,
          icon TEXT,
          open TEXT NOT NULL,
          close TEXT NOT NULL,
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
          FOREIGN KEY (tbl) REFERENCES tables(id),
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
          FOREIGN KEY (restaurantId) REFERENCES restaurants(id),
          FOREIGN KEY (resaId) REFERENCES resas(id),
          FOREIGN KEY (clientId) REFERENCES clients(id)
        );

        CREATE INDEX IF NOT EXISTS idx_reviews_restaurantId ON reviews(restaurantId);
        CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);

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

        CREATE INDEX IF NOT EXISTS idx_loyalty_config_restaurantId ON loyalty_config(restaurantId);

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

        CREATE INDEX IF NOT EXISTS idx_loyalty_cards_restaurantId ON loyalty_cards(restaurantId);
        CREATE INDEX IF NOT EXISTS idx_loyalty_cards_clientId ON loyalty_cards(clientId);

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

        CREATE INDEX IF NOT EXISTS idx_loyalty_events_cardId ON loyalty_events(loyaltyCardId);

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

        CREATE INDEX IF NOT EXISTS idx_room_items_restaurantId ON room_items(restaurantId);

        -- Sites
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

        CREATE INDEX IF NOT EXISTS idx_sites_restaurantId ON sites(restaurantId);

        -- Orders
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
          FOREIGN KEY (restaurantId) REFERENCES restaurants(id),
          FOREIGN KEY (resaId) REFERENCES resas(id),
          FOREIGN KEY (tableId) REFERENCES tables(id)
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
          read BOOLEAN DEFAULT 0,
          createdAt INTEGER,
          FOREIGN KEY (restaurantId) REFERENCES restaurants(id),
          FOREIGN KEY (userId) REFERENCES users(id)
        );

        CREATE INDEX IF NOT EXISTS idx_notifications_restaurantId ON notifications(restaurantId);
        CREATE INDEX IF NOT EXISTS idx_notifications_userId ON notifications(userId);
        CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

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
          FOREIGN KEY (restaurantId) REFERENCES restaurants(id),
          FOREIGN KEY (userId) REFERENCES users(id)
        );

        CREATE INDEX IF NOT EXISTS idx_audit_logs_restaurantId ON audit_logs(restaurantId);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_createdAt ON audit_logs(createdAt);
      `
    }
  ]

  const getStmt = database.prepare(`
    SELECT name FROM migrations WHERE name = ?
  `)

  const insertStmt = database.prepare(`
    INSERT INTO migrations (name) VALUES (?)
  `)

  for (const migration of migrations) {
    const existing = getStmt.get(migration.name)
    if (!existing) {
      database.exec(migration.sql)
      insertStmt.run(migration.name)
    }
  }
}

function seedDemoData(database) {
  try {
    const existing = database.prepare('SELECT id FROM restaurants LIMIT 1').get()
    if (existing) {
      return
    }

    const restaurantId = uuidv4()
    const now = Date.now()

    // Create demo restaurant
    database.prepare(`
      INSERT INTO restaurants (id, name, ville, pays, plan, maxCvt, tel, email, web, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(restaurantId, 'Test Bistro', 'Zurich', 'CH', 'bistro', 80, '+41 27 322 80 80', 'info@test.ch', 'https://test.ch', now, now)

    // Create admin user
    const userId = uuidv4()
    database.prepare(`
      INSERT INTO users (id, restaurantId, n, email, passwordHash, role, active, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      restaurantId,
      'Test Admin',
      'admin@test.ch',
      'hash',
      'proprietaire',
      1,
      now,
      now
    )

    // Create salles
    const salleId = uuidv4()
    database.prepare(`
      INSERT INTO salles (id, restaurantId, name, type, exterior, active, color, priority, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(salleId, restaurantId, 'Main Room', 'intérieure', 0, 1, '#4F46E5', 0, now, now)

    // Create tables
    for (let i = 1; i <= 5; i++) {
      const tableId = uuidv4()
      database.prepare(`
        INSERT INTO tables (id, restaurantId, salle, n, shape, capMin, capMax, x, y, w, h, active, priority, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(tableId, restaurantId, salleId, `T${i}`, 'round', 2, 4, i * 25, 50, 15, 15, 1, i, now, now)
    }

    // Create services
    database.prepare(`
      INSERT INTO services (id, restaurantId, name, icon, open, close, lastOrder, buffer, bookingCutoffMins, active, color, jours, maxCouverts, maxParService, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), restaurantId, 'Lunch', '12', '12:00', '14:30', '13:45', 15, 30, 1, '#60A5FA', '[1,2,3,4,5]', 80, 40, now, now)

    // Create options
    database.prepare(`
      INSERT INTO options (id, restaurantId, wifi, parking, terrasse, accessible, animaux, require_phone, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), restaurantId, 1, 1, 1, 1, 1, 1, now, now)

    // Create loyalty config
    database.prepare(`
      INSERT INTO loyalty_config (id, restaurantId, active, mode, pointsPerChf, stampsGoal, rewardName, rewardValue, rewardThreshold, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), restaurantId, 1, 'points', 1.0, 10, 'Free Meal', 100, 500, now, now)
  } catch (error) {
    console.error('Error seeding demo data:', error.message)
  }
}

describe('Database', () => {
  before(() => {
    db = new Database(TEST_DB_PATH)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    initDb(db)
  })

  after(() => {
    if (db) {
      db.close()
    }
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH)
    }
  })

  describe('Schema Initialization', () => {
    it('creates all required tables', () => {
      const tables = db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `).all()

      const tableNames = tables.map(t => t.name)

      const requiredTables = [
        'restaurants', 'users', 'salles', 'tables', 'services', 'resas',
        'clients', 'options', 'fermetures', 'gift_cards', 'reviews',
        'loyalty_config', 'loyalty_cards', 'loyalty_events', 'room_items',
        'sites', 'orders', 'notifications', 'audit_logs', 'migrations', 'combos'
      ]

      for (const table of requiredTables) {
        assert.ok(
          tableNames.includes(table),
          `Table ${table} should exist`
        )
      }
    })

    it('creates restaurants table with correct columns', () => {
      const columns = db.pragma('table_info(restaurants)')
      const columnNames = columns.map(c => c.name)

      assert.ok(columnNames.includes('id'))
      assert.ok(columnNames.includes('name'))
      assert.ok(columnNames.includes('ville'))
      assert.ok(columnNames.includes('pays'))
      assert.ok(columnNames.includes('email'))
      assert.ok(columnNames.includes('createdAt'))
      assert.ok(columnNames.includes('updatedAt'))
    })

    it('creates users table with correct columns', () => {
      const columns = db.pragma('table_info(users)')
      const columnNames = columns.map(c => c.name)

      assert.ok(columnNames.includes('id'))
      assert.ok(columnNames.includes('restaurantId'))
      assert.ok(columnNames.includes('email'))
      assert.ok(columnNames.includes('passwordHash'))
      assert.ok(columnNames.includes('role'))
      assert.ok(columnNames.includes('active'))
    })

    it('creates resas table with all required fields', () => {
      const columns = db.pragma('table_info(resas)')
      const columnNames = columns.map(c => c.name)

      const requiredColumns = ['id', 'restaurantId', 'n', 'c', 't', 'svc', 's', 'date']
      for (const col of requiredColumns) {
        assert.ok(columnNames.includes(col), `Resas table should have ${col} column`)
      }
    })
  })

  describe('Indexes', () => {
    it('creates index on restaurants.email', () => {
      const indexes = db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='index' AND name='idx_restaurants_email'
      `).get()

      assert.ok(indexes, 'Index idx_restaurants_email should exist')
    })

    it('creates index on users.restaurantId', () => {
      const indexes = db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='index' AND name='idx_users_restaurantId'
      `).get()

      assert.ok(indexes, 'Index idx_users_restaurantId should exist')
    })

    it('creates index on resas.date', () => {
      const indexes = db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='index' AND name='idx_resas_date'
      `).get()

      assert.ok(indexes, 'Index idx_resas_date should exist')
    })

    it('creates index on resas.restaurantId', () => {
      const indexes = db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='index' AND name='idx_resas_restaurantId'
      `).get()

      assert.ok(indexes, 'Index idx_resas_restaurantId should exist')
    })

    it('creates index on clients.email', () => {
      const indexes = db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='index' AND name='idx_clients_email'
      `).get()

      assert.ok(indexes, 'Index idx_clients_email should exist')
    })
  })

  describe('Seed Data', () => {
    it('populates demo restaurant successfully', () => {
      seedDemoData(db)

      const restaurant = db.prepare('SELECT * FROM restaurants LIMIT 1').get()
      assert.ok(restaurant)
      assert.equal(restaurant.name, 'Test Bistro')
      assert.equal(restaurant.ville, 'Zurich')
    })

    it('creates demo user with restaurant', () => {
      const user = db.prepare('SELECT * FROM users LIMIT 1').get()
      assert.ok(user)
      assert.equal(user.role, 'proprietaire')
      assert.equal(user.email, 'admin@test.ch')
    })

    it('creates demo salles', () => {
      const salles = db.prepare('SELECT * FROM salles LIMIT 1').get()
      assert.ok(salles)
      assert.equal(salles.name, 'Main Room')
    })

    it('creates demo tables', () => {
      const tables = db.prepare('SELECT * FROM tables LIMIT 1').get()
      assert.ok(tables)
      assert.ok(tables.n.startsWith('T'))
    })

    it('creates demo services', () => {
      const service = db.prepare('SELECT * FROM services LIMIT 1').get()
      assert.ok(service)
      assert.equal(service.name, 'Lunch')
    })
  })

  describe('Foreign Keys', () => {
    it('enforces foreign key constraints', () => {
      const restaurantId = uuidv4()
      const now = Date.now()

      // Insert a restaurant
      db.prepare(`
        INSERT INTO restaurants (id, name, ville, pays, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(restaurantId, 'FK Test', 'Zurich', 'CH', now, now)

      // Try to insert a user referencing non-existent restaurant
      assert.throws(() => {
        db.prepare(`
          INSERT INTO users (id, restaurantId, n, email, passwordHash, role, active, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(uuidv4(), 'non-existent-id', 'Test', 'test@test.ch', 'hash', 'serveur', 1, now, now)
      })
    })
  })

  describe('Migrations', () => {
    it('tracks executed migrations', () => {
      const migrations = db.prepare('SELECT * FROM migrations').all()
      assert.ok(migrations.length > 0)
      assert.ok(migrations.some(m => m.name === '001_initial_schema'))
    })

    it('does not re-apply migrations', () => {
      const initialCount = db.prepare('SELECT COUNT(*) as count FROM migrations').get().count
      initDb(db)
      const finalCount = db.prepare('SELECT COUNT(*) as count FROM migrations').get().count
      assert.equal(initialCount, finalCount)
    })
  })

  describe('Data Integrity', () => {
    it('enforces unique email constraint on restaurants', () => {
      const now = Date.now()
      const email = 'unique@test.ch'

      db.prepare(`
        INSERT INTO restaurants (id, name, ville, pays, email, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), 'Rest 1', 'Zurich', 'CH', email, now, now)

      assert.throws(() => {
        db.prepare(`
          INSERT INTO restaurants (id, name, ville, pays, email, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(uuidv4(), 'Rest 2', 'Zurich', 'CH', email, now, now)
      })
    })

    it('stores and retrieves timestamps correctly', () => {
      const now = Date.now()
      const restaurantId = uuidv4()

      db.prepare(`
        INSERT INTO restaurants (id, name, ville, pays, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(restaurantId, 'Timestamp Test', 'Zurich', 'CH', now, now)

      const restaurant = db.prepare('SELECT * FROM restaurants WHERE id = ?').get(restaurantId)
      assert.equal(restaurant.createdAt, now)
      assert.equal(restaurant.updatedAt, now)
    })
  })

  describe('WAL Mode', () => {
    it('journal mode is set to WAL', () => {
      const mode = db.pragma('journal_mode')
      assert.equal(mode, 'wal')
    })

    it('foreign keys are enabled', () => {
      const fkEnabled = db.pragma('foreign_keys')
      assert.ok(fkEnabled)
    })
  })
})
