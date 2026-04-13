import { describe, it, before, after } from 'node:test'
import assert from 'node:assert'
import { spawn } from 'node:child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TEST_DB_PATH = path.join(__dirname, '..', 'test.db')
const API_URL = 'http://localhost:3001'

let server = null
let authToken = null
let restaurantId = null
let serviceId = null
let tableId = null
let resaId = null

async function startServer() {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      NODE_ENV: 'test',
      DB_PATH: TEST_DB_PATH,
      PORT: 3001,
      JWT_SECRET: 'test-secret-key'
    }

    server = spawn('node', [path.join(__dirname, '..', 'server.js')], {
      env,
      stdio: 'pipe'
    })

    let output = ''
    server.stdout.on('data', (data) => {
      output += data.toString()
      if (output.includes('R3STO Restaurant Management API')) {
        resolve()
      }
    })

    server.stderr.on('data', (data) => {
      console.error('Server error:', data.toString())
    })

    setTimeout(() => resolve(), 2000)
  })
}

async function stopServer() {
  return new Promise((resolve) => {
    if (server) {
      server.kill()
      server.on('exit', () => {
        if (fs.existsSync(TEST_DB_PATH)) {
          fs.unlinkSync(TEST_DB_PATH)
        }
        resolve()
      })
      setTimeout(() => resolve(), 500)
    } else {
      resolve()
    }
  })
}

async function setupTestData() {
  // Register a restaurant
  const registerResponse = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      restaurantName: 'Resas Test Restaurant',
      email: 'resas@test.com',
      password: 'ResasPassword123',
      ville: 'Bern'
    })
  })

  const registerData = await registerResponse.json()
  authToken = registerData.token
  restaurantId = registerData.user.restaurantId

  // Get the created service using the database directly via a query
  const db = (await import('better-sqlite3')).default
  const dbInstance = new db(TEST_DB_PATH)
  const service = dbInstance.prepare(
    'SELECT id FROM services WHERE restaurantId = ? LIMIT 1'
  ).get(restaurantId)
  serviceId = service?.id

  const table = dbInstance.prepare(
    'SELECT id FROM tables WHERE restaurantId = ? LIMIT 1'
  ).get(restaurantId)
  tableId = table?.id

  dbInstance.close()
}

describe('Reservations Routes', () => {
  before(async () => {
    await startServer()
    await new Promise(resolve => setTimeout(resolve, 1000))
    await setupTestData()
  })

  after(async () => {
    await stopServer()
  })

  describe('GET /api/resas', () => {
    it('returns array of reservations', async () => {
      const response = await fetch(`${API_URL}/api/resas`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      assert.equal(response.status, 200)
      const data = await response.json()
      assert.ok(Array.isArray(data))
    })

    it('filters by date parameter', async () => {
      // Create a reservation first
      const today = new Date().toISOString().split('T')[0]

      const createResponse = await fetch(`${API_URL}/api/resas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          n: 'Test Resa 1',
          c: 4,
          date: today,
          svc: serviceId,
          t: '12:00'
        })
      })

      assert.equal(createResponse.status, 201)

      // Now filter by date
      const filterResponse = await fetch(
        `${API_URL}/api/resas?date=${today}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      )

      assert.equal(filterResponse.status, 200)
      const data = await filterResponse.json()
      assert.ok(Array.isArray(data))
      assert.ok(data.length > 0)
      assert.ok(data.every(r => r.date === today))
    })

    it('filters by service (svc) parameter', async () => {
      const response = await fetch(
        `${API_URL}/api/resas?svc=${serviceId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      )

      assert.equal(response.status, 200)
      const data = await response.json()
      assert.ok(Array.isArray(data))
    })

    it('requires authentication', async () => {
      const response = await fetch(`${API_URL}/api/resas`, {
        method: 'GET'
      })

      assert.equal(response.status, 401)
    })
  })

  describe('POST /api/resas', () => {
    it('creates a new reservation', async () => {
      const today = new Date().toISOString().split('T')[0]

      const response = await fetch(`${API_URL}/api/resas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          n: 'Martin Dupont',
          nom: 'Dupont',
          prenom: 'Martin',
          c: 4,
          date: today,
          svc: serviceId,
          t: '19:00',
          tel: '+41 79 123 4567',
          email: 'martin@example.com'
        })
      })

      assert.equal(response.status, 201)
      const data = await response.json()
      assert.ok(data.id)
      resaId = data.id
      assert.equal(data.n, 'Martin Dupont')
      assert.equal(data.c, 4)
      assert.equal(data.date, today)
      assert.equal(data.s, 'reserved')
    })

    it('requires mandatory fields', async () => {
      const response = await fetch(`${API_URL}/api/resas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          nom: 'Test',
          // missing: n, c, date, svc
        })
      })

      assert.equal(response.status, 400)
      const data = await response.json()
      assert.ok(data.message.includes('required'))
    })

    it('sets default values for optional fields', async () => {
      const today = new Date().toISOString().split('T')[0]

      const response = await fetch(`${API_URL}/api/resas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          n: 'Minimal Resa',
          c: 2,
          date: today,
          svc: serviceId
        })
      })

      assert.equal(response.status, 201)
      const data = await response.json()
      assert.equal(data.s, 'reserved')
      assert.equal(data.mode, 'manuel')
      assert.equal(data.canal, 'telephone')
    })

    it('requires authentication', async () => {
      const response = await fetch(`${API_URL}/api/resas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          n: 'Test',
          c: 4,
          date: '2026-04-01',
          svc: serviceId
        })
      })

      assert.equal(response.status, 401)
    })
  })

  describe('GET /api/resas/:id', () => {
    it('returns single reservation by ID', async () => {
      // First create a reservation
      const today = new Date().toISOString().split('T')[0]

      const createResponse = await fetch(`${API_URL}/api/resas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          n: 'Get Test Resa',
          c: 3,
          date: today,
          svc: serviceId
        })
      })

      const created = await createResponse.json()
      const getResponse = await fetch(`${API_URL}/api/resas/${created.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      assert.equal(getResponse.status, 200)
      const data = await getResponse.json()
      assert.equal(data.id, created.id)
      assert.equal(data.n, 'Get Test Resa')
    })

    it('returns 404 for nonexistent reservation', async () => {
      const response = await fetch(`${API_URL}/api/resas/nonexistent-id`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      assert.equal(response.status, 404)
    })

    it('requires authentication', async () => {
      const response = await fetch(`${API_URL}/api/resas/some-id`, {
        method: 'GET'
      })

      assert.equal(response.status, 401)
    })
  })

  describe('PATCH /api/resas/:id', () => {
    it('updates reservation fields', async () => {
      const today = new Date().toISOString().split('T')[0]

      // Create a reservation
      const createResponse = await fetch(`${API_URL}/api/resas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          n: 'Update Test Resa',
          c: 2,
          date: today,
          svc: serviceId
        })
      })

      const created = await createResponse.json()

      // Update the reservation
      const updateResponse = await fetch(`${API_URL}/api/resas/${created.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          n: 'Updated Name',
          c: 5,
          tel: '+41 79 999 9999'
        })
      })

      assert.equal(updateResponse.status, 200)
      const data = await updateResponse.json()
      assert.equal(data.n, 'Updated Name')
      assert.equal(data.c, 5)
      assert.equal(data.tel, '+41 79 999 9999')
    })

    it('returns 404 for nonexistent reservation', async () => {
      const response = await fetch(`${API_URL}/api/resas/nonexistent-id`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ n: 'Updated' })
      })

      assert.equal(response.status, 404)
    })

    it('requires authentication', async () => {
      const response = await fetch(`${API_URL}/api/resas/some-id`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ n: 'Updated' })
      })

      assert.equal(response.status, 401)
    })
  })

  describe('DELETE /api/resas/:id', () => {
    it('deletes a reservation', async () => {
      const today = new Date().toISOString().split('T')[0]

      // Create a reservation to delete
      const createResponse = await fetch(`${API_URL}/api/resas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          n: 'Delete Test Resa',
          c: 2,
          date: today,
          svc: serviceId
        })
      })

      const created = await createResponse.json()

      // Delete the reservation
      const deleteResponse = await fetch(`${API_URL}/api/resas/${created.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      assert.equal(deleteResponse.status, 200)
      const data = await deleteResponse.json()
      assert.ok(data.message.includes('deleted'))

      // Verify it's gone
      const getResponse = await fetch(`${API_URL}/api/resas/${created.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      assert.equal(getResponse.status, 404)
    })

    it('returns 404 for nonexistent reservation', async () => {
      const response = await fetch(`${API_URL}/api/resas/nonexistent-id`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      assert.equal(response.status, 404)
    })

    it('requires authentication', async () => {
      const response = await fetch(`${API_URL}/api/resas/some-id`, {
        method: 'DELETE'
      })

      assert.equal(response.status, 401)
    })
  })

  describe('POST /api/resas/:id/status', () => {
    it('changes reservation status to valid transition', async () => {
      const today = new Date().toISOString().split('T')[0]

      // Create a reservation
      const createResponse = await fetch(`${API_URL}/api/resas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          n: 'Status Test Resa',
          c: 2,
          date: today,
          svc: serviceId
        })
      })

      const created = await createResponse.json()

      // Change status to arrived
      const statusResponse = await fetch(
        `${API_URL}/api/resas/${created.id}/status`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ status: 'arrived' })
        }
      )

      assert.equal(statusResponse.status, 200)
      const data = await statusResponse.json()
      assert.equal(data.s, 'arrived')
    })

    it('allows valid status transitions', async () => {
      const today = new Date().toISOString().split('T')[0]

      const createResponse = await fetch(`${API_URL}/api/resas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          n: 'Transitions Test',
          c: 2,
          date: today,
          svc: serviceId
        })
      })

      const created = await createResponse.json()

      const validStatuses = ['arrived', 'done', 'noshow', 'cancelled', 'waitlist']

      for (const status of validStatuses) {
        const response = await fetch(
          `${API_URL}/api/resas/${created.id}/status`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ status })
          }
        )

        assert.equal(response.status, 200)
        const data = await response.json()
        assert.equal(data.s, status)
      }
    })

    it('rejects invalid status', async () => {
      const today = new Date().toISOString().split('T')[0]

      const createResponse = await fetch(`${API_URL}/api/resas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          n: 'Invalid Status Test',
          c: 2,
          date: today,
          svc: serviceId
        })
      })

      const created = await createResponse.json()

      const statusResponse = await fetch(
        `${API_URL}/api/resas/${created.id}/status`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ status: 'invalid_status' })
        }
      )

      assert.equal(statusResponse.status, 400)
      const data = await statusResponse.json()
      assert.ok(data.message.includes('Invalid'))
    })

    it('returns 404 for nonexistent reservation', async () => {
      const response = await fetch(
        `${API_URL}/api/resas/nonexistent-id/status`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ status: 'arrived' })
        }
      )

      assert.equal(response.status, 404)
    })

    it('requires authentication', async () => {
      const response = await fetch(
        `${API_URL}/api/resas/some-id/status`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'arrived' })
        }
      )

      assert.equal(response.status, 401)
    })
  })
})
