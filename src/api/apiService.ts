// ══════════════════════════════════════════════════════════════════════════════
//  R3STO — API Service Layer
//  ══════════════════════════════════════════════════════════════════════════════
//  Abstraction over data operations
//  Currently: localStorage via Zustand store
//  Future: REST API calls to api.r3sto.ch
//
//  Usage:
//    const bookings = await api.resas.list('2026-03-29', 'soir')
//    const booking = await api.resas.create({ ... })
//    await api.resas.setStatus(id, 'arrived')
// ══════════════════════════════════════════════════════════════════════════════

import type {
  Resa, Table, Combo, Service, Salle, Resto, OptionsData, User, Fermeture,
  Client, GiftCard, Review, LoyaltyConfig, LoyaltyCard, LoyaltyEvent, Site,
  RoomItem
} from '../types'

// ── Configuration ──────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_BASE as string || 'https://api.r3sto.ch'
type ApiMode = 'local' | 'api'

const config = {
  mode: (import.meta.env.VITE_API_MODE as ApiMode) || 'local',
  baseUrl: API_BASE,
  timeout: 10000,
}

// ── Token Management ──────────────────────────────────────────────────────
let _token: string | null = null

function getToken(): string {
  return _token || localStorage.getItem('r3sto-token') || ''
}

function setToken(t: string): void {
  _token = t
  localStorage.setItem('r3sto-token', t)
}

function clearToken(): void {
  _token = null
  try {
    localStorage.removeItem('r3sto-token')
  } catch (_) {}
}

// ── Custom Error Class ─────────────────────────────────────────────────────
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
    Object.setPrototypeOf(this, ApiError.prototype)
  }
}

// ── HTTP Request Helper (for future API mode) ──────────────────────────────
async function request<T>(
  method: string,
  path: string,
  body?: any
): Promise<T> {
  if (config.mode === 'local') {
    throw new Error(
      'ApiService en mode local — utiliser le store Zustand directement'
    )
  }

  const url = `${config.baseUrl}${path}`
  const token = getToken()

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), config.timeout)

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`
      try {
        const errorData = await response.json()
        errorMessage = errorData.message || errorMessage
      } catch (_) {}
      throw new ApiError(response.status, errorMessage)
    }

    return response.json()
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof ApiError) throw error
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(408, 'Délai d\'attente dépassé')
    }
    throw error
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  API Service Object
// ══════════════════════════════════════════════════════════════════════════════

export const api = {
  config,

  // ────────────────────────────────────────────────────────────────────────
  //  Authentication
  // ────────────────────────────────────────────────────────────────────────
  auth: {
    login: async (email: string, password: string) =>
      request<{ token: string; user: any }>('POST', '/auth/login', {
        email,
        password,
      }),

    register: async (data: any) =>
      request<{ token: string }>('POST', '/auth/register', data),

    logout: () => {
      clearToken()
    },

    setToken,
    getToken,
    clearToken,
  },

  // ────────────────────────────────────────────────────────────────────────
  //  Reservations (Réservations)
  // ────────────────────────────────────────────────────────────────────────
  resas: {
    list: async (date?: string, svc?: string) => {
      const params = new URLSearchParams()
      if (date) params.append('date', date)
      if (svc) params.append('svc', svc)
      const queryStr = params.toString()
      return request<Resa[]>('GET', `/resas${queryStr ? `?${queryStr}` : ''}`)
    },

    get: async (id: string) => request<Resa>('GET', `/resas/${id}`),

    create: async (resa: Omit<Resa, 'id'>) =>
      request<Resa>('POST', '/resas', resa),

    update: async (id: string, patch: Partial<Resa>) =>
      request<Resa>('PATCH', `/resas/${id}`, patch),

    delete: async (id: string) => request<void>('DELETE', `/resas/${id}`),

    setStatus: async (id: string, status: Resa['s']) =>
      request<Resa>('POST', `/resas/${id}/status`, { status }),

    swap: async (idA: string, idB: string) =>
      request<void>('POST', '/resas/swap', { idA, idB }),

    // Bulk operations
    bulkUpdate: async (updates: Array<{ id: string; patch: Partial<Resa> }>) =>
      request<Resa[]>('POST', '/resas/bulk', { updates }),

    bulkDelete: async (ids: string[]) =>
      request<void>('DELETE', '/resas/bulk', { ids }),

    // Filtering & search
    search: async (query: string) =>
      request<Resa[]>('GET', `/resas/search?q=${encodeURIComponent(query)}`),

    // Statistics
    stats: async (dateFrom?: string, dateTo?: string) =>
      request<any>('GET', `/resas/stats?from=${dateFrom || ''}&to=${dateTo || ''}`),
  },

  // ────────────────────────────────────────────────────────────────────────
  //  Tables (Gestion des tables)
  // ────────────────────────────────────────────────────────────────────────
  tables: {
    list: async () => request<Table[]>('GET', '/tables'),

    get: async (id: string) => request<Table>('GET', `/tables/${id}`),

    create: async (table: Omit<Table, 'id'>) =>
      request<Table>('POST', '/tables', table),

    update: async (id: string, patch: Partial<Table>) =>
      request<Table>('PATCH', `/tables/${id}`, patch),

    delete: async (id: string) => request<void>('DELETE', `/tables/${id}`),

    // Batch operations
    updateBatch: async (tables: Table[]) =>
      request<Table[]>('PUT', '/tables/batch', { tables }),

    // Table status
    setStatus: async (id: string, active: boolean) =>
      request<Table>('PATCH', `/tables/${id}`, { active }),

    block: async (id: string, reason?: string) =>
      request<Table>('POST', `/tables/${id}/block`, { reason }),

    unblock: async (id: string) => request<Table>('POST', `/tables/${id}/unblock`),

    hold: async (id: string) => request<Table>('POST', `/tables/${id}/hold`),

    release: async (id: string) => request<Table>('POST', `/tables/${id}/release`),
  },

  // ────────────────────────────────────────────────────────────────────────
  //  Combos (Combined Tables)
  // ────────────────────────────────────────────────────────────────────────
  combos: {
    list: async () => request<Combo[]>('GET', '/combos'),

    get: async (id: string) => request<Combo>('GET', `/combos/${id}`),

    create: async (combo: Omit<Combo, 'id'>) =>
      request<Combo>('POST', '/combos', combo),

    update: async (id: string, patch: Partial<Combo>) =>
      request<Combo>('PATCH', `/combos/${id}`, patch),

    delete: async (id: string) => request<void>('DELETE', `/combos/${id}`),

    updateBatch: async (combos: Combo[]) =>
      request<Combo[]>('PUT', '/combos/batch', { combos }),
  },

  // ────────────────────────────────────────────────────────────────────────
  //  Room Items (Décor, murs, portes, etc.)
  // ────────────────────────────────────────────────────────────────────────
  roomItems: {
    list: async () => request<RoomItem[]>('GET', '/room-items'),

    get: async (id: string) => request<RoomItem>('GET', `/room-items/${id}`),

    create: async (item: Omit<RoomItem, 'id'>) =>
      request<RoomItem>('POST', '/room-items', item),

    update: async (id: string, patch: Partial<RoomItem>) =>
      request<RoomItem>('PATCH', `/room-items/${id}`, patch),

    delete: async (id: string) => request<void>('DELETE', `/room-items/${id}`),

    updateBatch: async (items: RoomItem[]) =>
      request<RoomItem[]>('PUT', '/room-items/batch', { items }),
  },

  // ────────────────────────────────────────────────────────────────────────
  //  Services (Midi, Soir, etc.)
  // ────────────────────────────────────────────────────────────────────────
  services: {
    list: async () => request<Service[]>('GET', '/services'),

    get: async (id: string) => request<Service>('GET', `/services/${id}`),

    create: async (service: Omit<Service, 'id'>) =>
      request<Service>('POST', '/services', service),

    update: async (id: string, patch: Partial<Service>) =>
      request<Service>('PATCH', `/services/${id}`, patch),

    delete: async (id: string) => request<void>('DELETE', `/services/${id}`),

    updateBatch: async (services: Service[]) =>
      request<Service[]>('PUT', '/services/batch', { services }),

    // Service status
    setActive: async (id: string, active: boolean) =>
      request<Service>('PATCH', `/services/${id}`, { active }),
  },

  // ────────────────────────────────────────────────────────────────────────
  //  Salles (Dining Rooms)
  // ────────────────────────────────────────────────────────────────────────
  salles: {
    list: async () => request<Salle[]>('GET', '/salles'),

    get: async (id: string) => request<Salle>('GET', `/salles/${id}`),

    create: async (salle: Omit<Salle, 'id'>) =>
      request<Salle>('POST', '/salles', salle),

    update: async (id: string, patch: Partial<Salle>) =>
      request<Salle>('PATCH', `/salles/${id}`, patch),

    delete: async (id: string) => request<void>('DELETE', `/salles/${id}`),

    updateBatch: async (salles: Salle[]) =>
      request<Salle[]>('PUT', '/salles/batch', { salles }),

    // Salle status
    setActive: async (id: string, active: boolean) =>
      request<Salle>('PATCH', `/salles/${id}`, { active }),
  },

  // ────────────────────────────────────────────────────────────────────────
  //  Clients (CRM)
  // ────────────────────────────────────────────────────────────────────────
  clients: {
    list: async () => request<Client[]>('GET', '/clients'),

    get: async (id: string) => request<Client>('GET', `/clients/${id}`),

    create: async (client: Omit<Client, 'id'>) =>
      request<Client>('POST', '/clients', client),

    update: async (id: string, patch: Partial<Client>) =>
      request<Client>('PATCH', `/clients/${id}`, patch),

    delete: async (id: string) => request<void>('DELETE', `/clients/${id}`),

    search: async (q: string) =>
      request<Client[]>('GET', `/clients/search?q=${encodeURIComponent(q)}`),

    // Client stats
    getStats: async (id: string) =>
      request<any>('GET', `/clients/${id}/stats`),

    // Blacklist
    blacklist: async (id: string, reason: string) =>
      request<Client>('POST', `/clients/${id}/blacklist`, { reason }),

    removeFromBlacklist: async (id: string) =>
      request<Client>('POST', `/clients/${id}/unblacklist`),
  },

  // ────────────────────────────────────────────────────────────────────────
  //  Restaurant Configuration
  // ────────────────────────────────────────────────────────────────────────
  resto: {
    get: async () => request<Resto>('GET', '/resto'),

    update: async (patch: Partial<Resto>) =>
      request<Resto>('PATCH', '/resto', patch),
  },

  // ────────────────────────────────────────────────────────────────────────
  //  Options (Settings)
  // ────────────────────────────────────────────────────────────────────────
  options: {
    get: async () => request<OptionsData>('GET', '/options'),

    update: async (patch: Partial<OptionsData>) =>
      request<OptionsData>('PATCH', '/options', patch),

    // Reset to defaults
    reset: async () => request<OptionsData>('POST', '/options/reset'),
  },

  // ────────────────────────────────────────────────────────────────────────
  //  Gift Cards (Bons cadeaux)
  // ────────────────────────────────────────────────────────────────────────
  giftCards: {
    list: async () => request<GiftCard[]>('GET', '/gift-cards'),

    get: async (id: string) => request<GiftCard>('GET', `/gift-cards/${id}`),

    create: async (gc: Omit<GiftCard, 'id'>) =>
      request<GiftCard>('POST', '/gift-cards', gc),

    update: async (id: string, patch: Partial<GiftCard>) =>
      request<GiftCard>('PATCH', `/gift-cards/${id}`, patch),

    delete: async (id: string) => request<void>('DELETE', `/gift-cards/${id}`),

    // Use gift card
    use: async (id: string, amount: number, resaId?: string) =>
      request<GiftCard>('POST', `/gift-cards/${id}/use`, { amount, resaId }),

    // Check balance
    checkBalance: async (code: string) =>
      request<{ balance: number; status: string }>('GET', `/gift-cards/validate/${code}`),

    // Search by code
    searchByCode: async (code: string) =>
      request<GiftCard>('GET', `/gift-cards/code/${code}`),
  },

  // ────────────────────────────────────────────────────────────────────────
  //  Reviews (Avis clients)
  // ────────────────────────────────────────────────────────────────────────
  reviews: {
    list: async () => request<Review[]>('GET', '/reviews'),

    get: async (id: string) => request<Review>('GET', `/reviews/${id}`),

    create: async (review: Omit<Review, 'id'>) =>
      request<Review>('POST', '/reviews', review),

    update: async (id: string, patch: Partial<Review>) =>
      request<Review>('PATCH', `/reviews/${id}`, patch),

    delete: async (id: string) => request<void>('DELETE', `/reviews/${id}`),

    // Reply to review
    reply: async (id: string, reply: string) =>
      request<Review>('POST', `/reviews/${id}/reply`, { reply }),

    // Flag for moderation
    flag: async (id: string) => request<Review>('POST', `/reviews/${id}/flag`),

    unflag: async (id: string) => request<Review>('POST', `/reviews/${id}/unflag`),

    // Publish/hide
    publish: async (id: string) =>
      request<Review>('PATCH', `/reviews/${id}`, { visible: true }),

    hide: async (id: string) =>
      request<Review>('PATCH', `/reviews/${id}`, { visible: false }),
  },

  // ────────────────────────────────────────────────────────────────────────
  //  Loyalty Program (Fidélité)
  // ────────────────────────────────────────────────────────────────────────
  loyalty: {
    // Config
    getConfig: async () =>
      request<LoyaltyConfig>('GET', '/loyalty/config'),

    updateConfig: async (patch: Partial<LoyaltyConfig>) =>
      request<LoyaltyConfig>('PATCH', '/loyalty/config', patch),

    // Loyalty cards
    listCards: async () => request<LoyaltyCard[]>('GET', '/loyalty/cards'),

    getCard: async (id: string) =>
      request<LoyaltyCard>('GET', `/loyalty/cards/${id}`),

    createCard: async (card: Omit<LoyaltyCard, 'id'>) =>
      request<LoyaltyCard>('POST', '/loyalty/cards', card),

    updateCard: async (id: string, patch: Partial<LoyaltyCard>) =>
      request<LoyaltyCard>('PATCH', `/loyalty/cards/${id}`, patch),

    deleteCard: async (id: string) =>
      request<void>('DELETE', `/loyalty/cards/${id}`),

    // Loyalty events
    addEvent: async (cardId: string, event: Omit<LoyaltyEvent, 'id'>) =>
      request<LoyaltyCard>('POST', `/loyalty/cards/${cardId}/events`, event),

    getHistory: async (cardId: string) =>
      request<LoyaltyEvent[]>('GET', `/loyalty/cards/${cardId}/history`),

    // Rewards
    redeemReward: async (cardId: string, amount: number) =>
      request<LoyaltyCard>('POST', `/loyalty/cards/${cardId}/redeem`, { amount }),
  },

  // ────────────────────────────────────────────────────────────────────────
  //  Multi-Site Management (Gastro)
  // ────────────────────────────────────────────────────────────────────────
  sites: {
    list: async () => request<Site[]>('GET', '/sites'),

    get: async (id: string) => request<Site>('GET', `/sites/${id}`),

    create: async (site: Omit<Site, 'id'>) =>
      request<Site>('POST', '/sites', site),

    update: async (id: string, patch: Partial<Site>) =>
      request<Site>('PATCH', `/sites/${id}`, patch),

    delete: async (id: string) => request<void>('DELETE', `/sites/${id}`),

    // Set active site
    setActive: async (id: string) => request<void>('POST', `/sites/${id}/activate`),

    // Redirect logic
    getRedirects: async (id: string) =>
      request<any>('GET', `/sites/${id}/redirects`),

    updateRedirects: async (id: string, redirects: any) =>
      request<void>('PATCH', `/sites/${id}/redirects`, redirects),
  },

  // ────────────────────────────────────────────────────────────────────────
  //  Users (Staff)
  // ────────────────────────────────────────────────────────────────────────
  users: {
    list: async () => request<User[]>('GET', '/users'),

    get: async (id: string) => request<User>('GET', `/users/${id}`),

    create: async (user: Omit<User, 'id'>) =>
      request<User>('POST', '/users', user),

    update: async (id: string, patch: Partial<User>) =>
      request<User>('PATCH', `/users/${id}`, patch),

    delete: async (id: string) => request<void>('DELETE', `/users/${id}`),

    updateBatch: async (users: User[]) =>
      request<User[]>('PUT', '/users/batch', { users }),

    // PIN management
    setPIN: async (id: string, pin: string) =>
      request<User>('POST', `/users/${id}/pin`, { pin }),

    removePIN: async (id: string) => request<User>('POST', `/users/${id}/pin/remove`),
  },

  // ────────────────────────────────────────────────────────────────────────
  //  Closures (Fermetures)
  // ────────────────────────────────────────────────────────────────────────
  fermetures: {
    list: async () => request<Fermeture[]>('GET', '/fermetures'),

    get: async (id: string) => request<Fermeture>('GET', `/fermetures/${id}`),

    create: async (fermeture: Omit<Fermeture, 'id'>) =>
      request<Fermeture>('POST', '/fermetures', fermeture),

    update: async (id: string, patch: Partial<Fermeture>) =>
      request<Fermeture>('PATCH', `/fermetures/${id}`, patch),

    delete: async (id: string) => request<void>('DELETE', `/fermetures/${id}`),

    updateBatch: async (fermetures: Fermeture[]) =>
      request<Fermeture[]>('PUT', '/fermetures/batch', { fermetures }),

    // Check if closed on date
    isClosedOn: async (date: string) =>
      request<{ closed: boolean; reason?: string }>('GET', `/fermetures/check/${date}`),
  },

  // ────────────────────────────────────────────────────────────────────────
  //  Public Widget (Booking Engine)
  // ────────────────────────────────────────────────────────────────────────
  widget: {
    // Get widget config for a restaurant
    getConfig: async (restoSlug: string) =>
      request<any>('GET', `/widget/${restoSlug}/config`),

    // Check availability for a given date/service/party size
    checkAvailability: async (
      restoSlug: string,
      date: string,
      svc: string,
      cvt: number
    ) =>
      request<{
        available: boolean
        slots: string[]
        tables: any[]
      }>(
        'GET',
        `/widget/${restoSlug}/availability?date=${date}&svc=${svc}&cvt=${cvt}`
      ),

    // Create a booking through widget
    createBooking: async (restoSlug: string, data: any) =>
      request<{
        id: string
        confirmed: boolean
        confirmationCode?: string
      }>('POST', `/widget/${restoSlug}/book`, data),

    // Validate email confirmation
    validateEmail: async (email: string, code: string) =>
      request<{ valid: boolean }>('POST', '/widget/validate-email', {
        email,
        code,
      }),

    // Resend confirmation email
    resendConfirmation: async (email: string, resaId: string) =>
      request<{ sent: boolean }>('POST', '/widget/resend-confirmation', {
        email,
        resaId,
      }),

    // Cancel booking via widget
    cancelBooking: async (resaId: string, email: string) =>
      request<{ cancelled: boolean }>('POST', '/widget/cancel', {
        resaId,
        email,
      }),
  },

  // ────────────────────────────────────────────────────────────────────────
  //  Payments (QR & Prepayment)
  // ────────────────────────────────────────────────────────────────────────
  payments: {
    // Create payment intent
    createIntent: async (data: {
      table: string
      amount: number
      method: string
    }) =>
      request<{
        clientSecret: string
        intentId: string
      }>('POST', '/payments/create-intent', data),

    // Get bill for table
    getBill: async (table: string) =>
      request<{
        items: any[]
        total: number
        currency: string
      }>('GET', `/payments/bill/${table}`),

    // Split bill
    splitBill: async (
      intentId: string,
      splits: Array<{ amount: number; method: string }>
    ) =>
      request<void>('POST', `/payments/${intentId}/split`, { splits }),

    // Confirm payment
    confirmPayment: async (intentId: string) =>
      request<{
        receipt: string
        transactionId: string
      }>('POST', `/payments/${intentId}/confirm`),

    // Get payment status
    getStatus: async (intentId: string) =>
      request<{ status: string; amount: number }>(
        'GET',
        `/payments/${intentId}/status`
      ),

    // Refund
    refund: async (intentId: string, amount?: number) =>
      request<{ refunded: boolean; refundId: string }>(
        'POST',
        `/payments/${intentId}/refund`,
        { amount }
      ),
  },

  // ────────────────────────────────────────────────────────────────────────
  //  Real-time Sync & Notifications
  // ────────────────────────────────────────────────────────────────────────
  sync: {
    // Get current app state
    getState: async () => request<any>('GET', '/sync/state'),

    // Push local changes to server
    pushChanges: async (changes: any[]) =>
      request<void>('POST', '/sync/push', { changes }),

    // Get pending events
    getEvents: async () => request<any[]>('GET', '/sync/events'),

    // Subscribe to real-time updates (polling fallback)
    subscribe: (callback: (event: any) => void): (() => void) => {
      const interval = setInterval(async () => {
        try {
          const events = await api.sync.getEvents()
          events.forEach(callback)
        } catch (error) {
          console.error('[apiService] Sync error:', error)
        }
      }, 5000)

      return () => clearInterval(interval)
    },

    // WebSocket connection (future)
    connect: async () => {
      // To be implemented with WebSocket or SSE
      return new Promise((resolve) => resolve(null))
    },
  },

  // ────────────────────────────────────────────────────────────────────────
  //  Admin & System
  // ────────────────────────────────────────────────────────────────────────
  admin: {
    // Get system stats
    getStats: async () =>
      request<{
        totalResas: number
        totalClients: number
        revenue: number
        avgTicket: number
      }>('GET', '/admin/stats'),

    // Get audit logs
    getLogs: async (limit: number = 100) =>
      request<any[]>('GET', `/admin/logs?limit=${limit}`),

    // Export data
    exportData: async (format: 'json' | 'csv' = 'json') =>
      request<{
        url: string
        expiresIn: number
      }>('POST', '/admin/export', { format }),

    // Import data
    importData: async (data: any) =>
      request<{ imported: number; errors: any[] }>(
        'POST',
        '/admin/import',
        data
      ),

    // Database backup
    backup: async () =>
      request<{
        url: string
        expiresIn: number
        size: number
      }>('POST', '/admin/backup'),

    // System health
    getHealth: async () =>
      request<{
        status: 'ok' | 'degraded' | 'down'
        uptime: number
        version: string
      }>('GET', '/admin/health'),
  },

  // ────────────────────────────────────────────────────────────────────────
  //  Notifications
  // ────────────────────────────────────────────────────────────────────────
  notifications: {
    list: async () => request<any[]>('GET', '/notifications'),

    get: async (id: string) => request<any>('GET', `/notifications/${id}`),

    markRead: async (id: string) =>
      request<void>('POST', `/notifications/${id}/read`),

    markAllRead: async () =>
      request<void>('POST', '/notifications/read-all'),

    delete: async (id: string) =>
      request<void>('DELETE', `/notifications/${id}`),

    clearAll: async () => request<void>('DELETE', '/notifications'),

    // Subscribe to notifications
    subscribe: (callback: (notif: any) => void): (() => void) => {
      const unsubscribe = api.sync.subscribe((event) => {
        if (event.type === 'notification') {
          callback(event.data)
        }
      })
      return unsubscribe
    },
  },

  // ────────────────────────────────────────────────────────────────────────
  //  Batch Operations
  // ────────────────────────────────────────────────────────────────────────
  batch: {
    execute: async (operations: Array<{
      method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
      path: string
      body?: any
    }>) =>
      request<any[]>('POST', '/batch', { operations }),
  },
}

export default api

// ══════════════════════════════════════════════════════════════════════════════
//  Export utilities
// ══════════════════════════════════════════════════════════════════════════════

export { setToken, clearToken, getToken, request }

// ──────────────────────────────────────────────────────────────────────────────
//  Type Exports (for convenience)
// ──────────────────────────────────────────────────────────────────────────────

export type {
  Resa,
  Table,
  Combo,
  Service,
  Salle,
  Resto,
  OptionsData,
  User,
  Fermeture,
  Client,
  GiftCard,
  Review,
  LoyaltyConfig,
  LoyaltyCard,
  LoyaltyEvent,
  Site,
  RoomItem,
}
