import { describe, it, before, after } from 'node:test'
import assert from 'node:assert'
import { spawn } from 'node:child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import Database from 'better-sqlite3'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TEST_DB_PATH = path.join(__dirname, '..', 'test.db')
const API_URL = 'http://localhost:3001'

let server = null

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

describe('Authentication Routes', () => {
  before(async () => {
    await startServer()
    await new Promise(resolve => setTimeout(resolve, 1000))
  })

  after(async () => {
    await stopServer()
  })

  describe('POST /api/auth/register', () => {
    it('creates restaurant + user and returns JWT token', async () => {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantName: 'Test Restaurant',
          email: 'test@restaurant.com',
          password: 'SecurePassword123',
          ville: 'Zurich',
          plan: 'pro'
        })
      })

      assert.equal(response.status, 201)
      const data = await response.json()
      assert.ok(data.token)
      assert.ok(data.user.id)
      assert.equal(data.user.email, 'test@restaurant.com')
      assert.equal(data.user.role, 'proprietaire')
      assert.ok(data.user.restaurantId)
    })

    it('rejects duplicate email with 409 conflict', async () => {
      const payload = {
        restaurantName: 'Test Restaurant 2',
        email: 'duplicate@restaurant.com',
        password: 'SecurePassword123',
        ville: 'Geneva'
      }

      const response1 = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      assert.equal(response1.status, 201)

      const response2 = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      assert.equal(response2.status, 409)
      const data = await response2.json()
      assert.ok(data.message.includes('already registered'))
    })

    it('rejects password shorter than 8 characters', async () => {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantName: 'Test Restaurant',
          email: 'short@restaurant.com',
          password: 'Short1',
          ville: 'Bern'
        })
      })

      assert.equal(response.status, 400)
      const data = await response.json()
      assert.ok(data.message.includes('at least 8 characters'))
    })

    it('requires all mandatory fields', async () => {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantName: 'Test Restaurant'
          // missing email and password
        })
      })

      assert.equal(response.status, 400)
      const data = await response.json()
      assert.ok(data.message.includes('required'))
    })
  })

  describe('POST /api/auth/login', () => {
    let testEmail = 'login@test.com'
    let testPassword = 'LoginPassword123'

    before(async () => {
      // Create a test user for login tests
      await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantName: 'Login Test Restaurant',
          email: testEmail,
          password: testPassword,
          ville: 'Lausanne'
        })
      })
    })

    it('returns token with valid credentials', async () => {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword
        })
      })

      assert.equal(response.status, 200)
      const data = await response.json()
      assert.ok(data.token)
      assert.equal(data.user.email, testEmail)
      assert.equal(data.user.role, 'proprietaire')
    })

    it('returns 401 with invalid password', async () => {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: 'WrongPassword123'
        })
      })

      assert.equal(response.status, 401)
      const data = await response.json()
      assert.ok(data.message.includes('Invalid'))
    })

    it('returns 401 with nonexistent email', async () => {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent@test.com',
          password: 'SomePassword123'
        })
      })

      assert.equal(response.status, 401)
    })

    it('requires email and password', async () => {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail
          // missing password
        })
      })

      assert.equal(response.status, 400)
      const data = await response.json()
      assert.ok(data.message.includes('required'))
    })
  })

  describe('GET /api/auth/me', () => {
    let validToken = null

    before(async () => {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantName: 'Me Test Restaurant',
          email: 'me@test.com',
          password: 'MePassword123',
          ville: 'Lugano'
        })
      })

      const data = await response.json()
      validToken = data.token
    })

    it('returns authenticated user with valid token', async () => {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${validToken}`
        }
      })

      assert.equal(response.status, 200)
      const data = await response.json()
      assert.ok(data.id)
      assert.equal(data.email, 'me@test.com')
      assert.equal(data.role, 'proprietaire')
      assert.equal(data.active, 1)
    })

    it('returns 401 without authorization header', async () => {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        method: 'GET'
      })

      assert.equal(response.status, 401)
      const data = await response.json()
      assert.ok(data.message.includes('authorization'))
    })

    it('returns 401 with invalid token', async () => {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer invalid.token.here'
        }
      })

      assert.equal(response.status, 401)
      const data = await response.json()
      assert.ok(data.message.includes('Invalid'))
    })

    it('returns 401 with malformed authorization header', async () => {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': 'BadFormat ' + validToken
        }
      })

      assert.equal(response.status, 401)
    })
  })

  describe('POST /api/auth/logout', () => {
    let validToken = null

    before(async () => {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantName: 'Logout Test Restaurant',
          email: 'logout@test.com',
          password: 'LogoutPassword123',
          ville: 'Neuchatel'
        })
      })

      const data = await response.json()
      validToken = data.token
    })

    it('returns success message when logging out', async () => {
      const response = await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${validToken}`
        }
      })

      assert.equal(response.status, 200)
      const data = await response.json()
      assert.ok(data.message.includes('logged out'))
    })

    it('returns 401 without token on logout', async () => {
      const response = await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST'
      })

      assert.equal(response.status, 401)
    })
  })

  describe('POST /api/auth/refresh', () => {
    let validToken = null

    before(async () => {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantName: 'Refresh Test Restaurant',
          email: 'refresh@test.com',
          password: 'RefreshPassword123',
          ville: 'Solothurn'
        })
      })

      const data = await response.json()
      validToken = data.token
    })

    it('returns new token when refreshing', async () => {
      const response = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${validToken}`
        }
      })

      assert.equal(response.status, 200)
      const data = await response.json()
      assert.ok(data.token)
      assert.notEqual(data.token, validToken)
    })

    it('returns 401 without token on refresh', async () => {
      const response = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST'
      })

      assert.equal(response.status, 401)
    })
  })
})
