// ══════════════════════════════════════════════════
//  R3STO — Analytics Engine
//  Collecte automatique d'usage : pages, actions,
//  modules, durées, patterns d'utilisation.
//  Données agrégées envoyées à l'API toutes les 5 min.
// ══════════════════════════════════════════════════

export interface PageEvent {
  path: string
  ts: number        // timestamp entrée
  dur: number       // durée en secondes
  actions: number   // nombre d'actions sur la page
}

export interface ActionEvent {
  type: string      // 'resa.create' | 'resa.edit' | 'client.create' | 'table.move' | etc.
  ts: number
  meta?: Record<string, string | number | boolean>
}

export interface ModuleUsage {
  module: string    // 'reservations' | 'widget' | 'clients' | 'marketing' | 'fidelite' | etc.
  visits: number
  totalTime: number // secondes
  lastUsed: number  // timestamp
  actions: number
}

export interface SessionSummary {
  restoId: string
  plan: string
  sessionId: string
  startedAt: number
  endedAt: number
  totalPages: number
  totalActions: number
  totalDuration: number   // secondes
  pages: PageEvent[]
  actions: ActionEvent[]
  modules: ModuleUsage[]
  device: 'desktop' | 'tablet' | 'mobile'
  lang: string
  userRole: string
  features: FeatureFlags
}

export interface FeatureFlags {
  widgetActive: boolean
  marketingUsed: boolean
  fideliteUsed: boolean
  multisiteActive: boolean
  prepaiementUsed: boolean
  cadeauxUsed: boolean
  qrcodeUsed: boolean
  commandesUsed: boolean
  blacklistUsed: boolean
}

// ── Module mapping from routes ──
const ROUTE_TO_MODULE: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/reservations': 'reservations',
  '/agenda': 'reservations',
  '/grille': 'reservations',
  '/plan': 'reservations',
  '/nouvelle-resa': 'reservations',
  '/waitlist': 'reservations',
  '/groupes': 'reservations',
  '/alertes': 'alertes',
  '/clients': 'clients',
  '/marketing': 'marketing',
  '/blacklist': 'clients',
  '/avis': 'avis',
  '/fidelite': 'fidelite',
  '/widget': 'widget',
  '/qrcode': 'widget',
  '/menu': 'menu',
  '/commandes': 'commandes',
  '/prepaiement': 'prepaiement',
  '/cadeaux': 'cadeaux',
  '/profil': 'config',
  '/salles': 'config',
  '/fermetures': 'config',
  '/setup-plan': 'config',
  '/tables': 'config',
  '/options': 'config',
  '/multisite': 'multisite',
  '/acces-roles': 'admin',
  '/historique': 'admin',
  '/support': 'support',
  '/kds-cuisine': 'order',
  '/kds-bar': 'order',
  '/service': 'order',
  '/caisse': 'order',
}

// ── Singleton analytics collector ──
class AnalyticsCollector {
  private sessionId: string
  private startedAt: number
  private pages: PageEvent[] = []
  private actions: ActionEvent[] = []
  private moduleMap: Map<string, ModuleUsage> = new Map()
  private currentPage: { path: string; enteredAt: number; actions: number } | null = null
  private flushInterval: ReturnType<typeof setInterval> | null = null
  private restoId = ''
  private plan = ''
  private lang = 'FR'
  private userRole = 'superadmin'

  constructor() {
    this.sessionId = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    this.startedAt = Date.now()
    // Flush every 5 minutes
    this.flushInterval = setInterval(() => this.flush(), 5 * 60 * 1000)
    // Flush on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.flush())
    }
  }

  setContext(restoId: string, plan: string, lang: string, userRole: string) {
    this.restoId = restoId
    this.plan = plan
    this.lang = lang
    this.userRole = userRole
  }

  trackPageView(path: string) {
    // Close previous page
    if (this.currentPage) {
      const dur = Math.round((Date.now() - this.currentPage.enteredAt) / 1000)
      this.pages.push({
        path: this.currentPage.path,
        ts: this.currentPage.enteredAt,
        dur,
        actions: this.currentPage.actions,
      })
      // Update module usage
      const mod = ROUTE_TO_MODULE[this.currentPage.path] || 'other'
      const existing = this.moduleMap.get(mod) || { module: mod, visits: 0, totalTime: 0, lastUsed: 0, actions: 0 }
      existing.visits++
      existing.totalTime += dur
      existing.lastUsed = Date.now()
      existing.actions += this.currentPage.actions
      this.moduleMap.set(mod, existing)
    }
    this.currentPage = { path, enteredAt: Date.now(), actions: 0 }
  }

  trackAction(type: string, meta?: Record<string, string | number | boolean>) {
    this.actions.push({ type, ts: Date.now(), meta })
    if (this.currentPage) this.currentPage.actions++
  }

  getDevice(): 'desktop' | 'tablet' | 'mobile' {
    if (typeof window === 'undefined') return 'desktop'
    const w = window.innerWidth
    if (w < 768) return 'mobile'
    if (w < 1024) return 'tablet'
    return 'desktop'
  }

  getFeatureFlags(): FeatureFlags {
    // Read from localStorage data
    try {
      const raw = localStorage.getItem('r3sto-app-data')
      if (!raw) return defaultFeatureFlags()
      const data = JSON.parse(raw)?.state
      if (!data) return defaultFeatureFlags()
      return {
        widgetActive: true, // widget is always available
        marketingUsed: (data.campaigns?.length || 0) > 0,
        fideliteUsed: (data.loyaltyProgram?.active) || false,
        multisiteActive: (data.sites?.length || 0) > 1,
        prepaiementUsed: (data.prepayments?.length || 0) > 0,
        cadeauxUsed: (data.giftCards?.length || 0) > 0,
        qrcodeUsed: false,
        commandesUsed: false,
        blacklistUsed: (data.clients?.filter((c: any) => c.blacklisted)?.length || 0) > 0,
      }
    } catch { return defaultFeatureFlags() }
  }

  getSummary(): SessionSummary {
    // Close current page if open
    if (this.currentPage) {
      const dur = Math.round((Date.now() - this.currentPage.enteredAt) / 1000)
      this.pages.push({
        path: this.currentPage.path,
        ts: this.currentPage.enteredAt,
        dur,
        actions: this.currentPage.actions,
      })
    }

    return {
      restoId: this.restoId,
      plan: this.plan,
      sessionId: this.sessionId,
      startedAt: this.startedAt,
      endedAt: Date.now(),
      totalPages: this.pages.length,
      totalActions: this.actions.length,
      totalDuration: Math.round((Date.now() - this.startedAt) / 1000),
      pages: [...this.pages],
      actions: [...this.actions],
      modules: Array.from(this.moduleMap.values()),
      device: this.getDevice(),
      lang: this.lang,
      userRole: this.userRole,
      features: this.getFeatureFlags(),
    }
  }

  async flush() {
    const summary = this.getSummary()
    if (summary.totalPages === 0 && summary.totalActions === 0) return

    // Store locally for admin access (demo mode)
    try {
      const existing = JSON.parse(localStorage.getItem('r3sto-analytics') || '[]')
      existing.push(summary)
      // Keep last 50 sessions
      while (existing.length > 50) existing.shift()
      localStorage.setItem('r3sto-analytics', JSON.stringify(existing))
    } catch { /* ignore */ }

    // Send to API (non-blocking, fire-and-forget)
    try {
      const token = localStorage.getItem('r3sto-token')
      if (token) {
        fetch('https://api.r3sto.com/analytics/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(summary),
          keepalive: true,
        }).catch(() => {})
      }
    } catch { /* ignore */ }
  }

  destroy() {
    this.flush()
    if (this.flushInterval) clearInterval(this.flushInterval)
  }
}

function defaultFeatureFlags(): FeatureFlags {
  return {
    widgetActive: false,
    marketingUsed: false,
    fideliteUsed: false,
    multisiteActive: false,
    prepaiementUsed: false,
    cadeauxUsed: false,
    qrcodeUsed: false,
    commandesUsed: false,
    blacklistUsed: false,
  }
}

// ── Singleton export ──
export const analytics = new AnalyticsCollector()

// ── Action type constants ──
export const ACTIONS = {
  // Reservations
  RESA_CREATE: 'resa.create',
  RESA_EDIT: 'resa.edit',
  RESA_CANCEL: 'resa.cancel',
  RESA_CONFIRM: 'resa.confirm',
  RESA_SEAT: 'resa.seat',
  RESA_DONE: 'resa.done',
  RESA_NOSHOW: 'resa.noshow',
  RESA_REASSIGN: 'resa.reassign',
  RESA_WAITLIST: 'resa.waitlist',
  // Tables
  TABLE_CREATE: 'table.create',
  TABLE_MOVE: 'table.move',
  TABLE_DELETE: 'table.delete',
  COMBO_CREATE: 'combo.create',
  COMBO_DELETE: 'combo.delete',
  // Clients
  CLIENT_CREATE: 'client.create',
  CLIENT_EDIT: 'client.edit',
  CLIENT_DELETE: 'client.delete',
  CLIENT_BLACKLIST: 'client.blacklist',
  // Marketing
  CAMPAIGN_CREATE: 'campaign.create',
  CAMPAIGN_SEND: 'campaign.send',
  // Reviews
  REVIEW_REPLY: 'review.reply',
  // Widget
  WIDGET_CONFIG: 'widget.config',
  WIDGET_COPY_CODE: 'widget.copyCode',
  // Gift cards
  GIFTCARD_CREATE: 'giftcard.create',
  // Config
  CONFIG_SAVE: 'config.save',
  SERVICE_EDIT: 'service.edit',
  SALLE_EDIT: 'salle.edit',
  FERMETURE_CREATE: 'fermeture.create',
  // Export
  EXPORT_CSV: 'export.csv',
  EXPORT_PDF: 'export.pdf',
  PRINT: 'print',
  // Search
  SEARCH_OPEN: 'search.open',
  SEARCH_NAVIGATE: 'search.navigate',
} as const
