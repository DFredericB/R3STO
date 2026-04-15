
// ══════════════════════════════════════════════════
//  R3STO — Store global (Zustand)
//  Remplace toutes les variables globales JS
//  Usage: const resas = useAppStore(s => s.resas)
// ══════════════════════════════════════════════════

import { create } from 'zustand'
import { api } from '../api/apiService'
import { persist } from 'zustand/middleware'
import type {
  Resa, Table, Combo, Service, Salle, Resto,
  OptionsData, User, Fermeture, UserRole, RoomItem, Client, GiftCard, Review,
  LoyaltyConfig, LoyaltyCard, LoyaltyEvent, Site
} from '../types'

// ── Toast bridge : permet au store (hors React) d'afficher des toasts ──
// Wiré depuis App via <ToastBridge/> après ToastProvider.
type ToastKind = 'success' | 'error' | 'warning' | 'info'
let _toastHandler: ((msg: string, type?: ToastKind) => void) | null = null
export const setStoreToastHandler = (fn: ((msg: string, type?: ToastKind) => void) | null) => {
  _toastHandler = fn
}

// ── API sync avec rollback + toast en cas d'échec ──
// - fn      : appel API (optimistic déjà appliqué au state local)
// - rollback: restore du state local si l'API refuse (facultatif mais recommandé)
// - label   : libellé court pour le message d'erreur ("suppression réservation", etc.)
const sync = (
  fn: () => Promise<any>,
  rollback?: () => void,
  label?: string
) => {
  fn().catch((err) => {
    // Log toujours (remplace le catch silencieux historique)
    console.error(`[R3STO] API sync failed${label ? ` (${label})` : ''}:`, err)
    // Rollback du state local si fourni
    if (rollback) {
      try { rollback() } catch (e) { console.error('[R3STO] rollback failed:', e) }
    }
    // Toast utilisateur via le bridge (si monté)
    if (_toastHandler) {
      const msg = label
        ? `Échec : ${label}${rollback ? '. Modification annulée.' : '.'}`
        : `Échec de synchronisation${rollback ? '. Modification annulée.' : '.'}`
      _toastHandler(msg, 'error')
    }
  })
}

// ── Données par défaut ─────────────────────────────
const DEFAULT_SERVICES: Service[] = [
  {
    id: 'sv1', name: 'Midi', icon: '☀️',
    open: '12:00', close: '14:30', lastOrder: '13:45',
    buffer: 15, bookingCutoffMins: 0, active: true,
    color: '#4480d8', jours: [1,2,3,4,5,6,0],
    maxCouverts: 80, maxParService: 0
  },
  {
    id: 'sv2', name: 'Soir', icon: '🌙',
    open: '19:00', close: '22:30', lastOrder: '21:30',
    buffer: 15, bookingCutoffMins: 0, active: true,
    color: '#7c3aed', jours: [1,2,3,4,5,6,0],
    maxCouverts: 80, maxParService: 0
  }
]

const DEFAULT_SALLES: Salle[] = [
  { id: 'sa1', name: 'Salle principale', type: 'intérieure', exterior: false, active: true, openByDefault: true, color: '#4480d8', priority: 1 },
  { id: 'sa2', name: 'Terrasse', type: 'extérieure', exterior: true, active: true, openByDefault: true, color: '#38b090', priority: 2 }
]

const DEFAULT_OPTIONS: OptionsData = {
  wifi: true, wifi_payant: false, parking: false, parking_valet: false,
  terrasse: true, accessible: true, animaux: false, animaux_terrasse_only: true,
  reservation_min: 1, reservation_max: 20, annulation_h: 24,
  allow_past_booking: false, booking_horizon_days: 90,
  slot_interval_mins: 15, default_duration_mins: 90,
  require_phone: false, allow_walkin: true,
  dispersion_mode: 'ia', dispersion_interval: 15, dispersion_max_per_slot: 3,
  groupe_seuil: 8, groupe_max_par_service: 2,
  notif_new_resa: true, notif_new_hours: 3,
  auto_confirm: false, auto_remind_24h: true, auto_noshow_flag: true,
  chaises_bebe: 4, places_pmr: 2
}

const today = (): string => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

// ── Transitions de statut autorisées ────────────────
const VALID_TRANSITIONS: Record<string, string[]> = {
  reserved:  ['arrived', 'noshow', 'cancelled', 'done'],
  arrived:   ['done', 'noshow'],
  waitlist:  ['reserved', 'cancelled'],
  done:      ['reserved'], // réactivation possible (cohérent avec StatusActions restore)
  noshow:    ['reserved'], // réactivation possible
  cancelled: ['reserved'], // réactivation possible
}

// ── Interface du store ─────────────────────────────
interface AppStore {
  // Sync
  restaurantId: number | null
  setRestaurantId: (id: number | null) => void

  // Données
  resas: Resa[]
  tables: Table[]
  combos: Combo[]
  services: Service[]
  salles: Salle[]
  resto: Resto
  options: OptionsData
  users: User[]
  fermetures: Fermeture[]
  roomItems: RoomItem[]
  clients: Client[]
  giftCards: GiftCard[]
  reviews: Review[]
  loyaltyConfig: LoyaltyConfig
  loyaltyCards: LoyaltyCard[]
  sites: Site[]
  activeSiteId: string | null

  // Navigation
  activeDate: string
  isDemo: boolean
  _demoVersion: number
  userRole: UserRole
  lang: 'fr' | 'en' | 'de' | 'it'
  theme: 'dark' | 'light'
  sidebarCollapsed: boolean
  showQuickResa: boolean
  blinkResaIds: string[]

  // Actions — Réservations
  addResa: (resa: Resa) => void
  updateResa: (id: string, patch: Partial<Resa>) => void
  deleteResa: (id: string) => void
  setResaStatus: (id: string, status: Resa['s']) => void
  swapTables: (idA: string, idB: string) => void
  blinkResa: (id: string) => void

  // Actions — Navigation
  setActiveDate: (date: string) => void

  // Actions — Config
  updateOptions: (patch: Partial<OptionsData>) => void
  updateResto: (patch: Partial<Resto>) => void
  setTables: (tables: Table[]) => void
  setCombos: (combos: Combo[]) => void
  setServices: (services: Service[]) => void
  setSalles: (salles: Salle[]) => void
  setRoomItems: (items: RoomItem[]) => void

  // Actions — Clients
  addClient: (client: Client) => void
  updateClient: (id: string, patch: Partial<Client>) => void
  deleteClient: (id: string) => void

  // Actions — Gift Cards
  addGiftCard: (gc: GiftCard) => void
  updateGiftCard: (id: string, patch: Partial<GiftCard>) => void
  deleteGiftCard: (id: string) => void
  useGiftCard: (id: string, amount: number, resaId?: string) => void

  // Actions — Reviews
  addReview: (review: Review) => void
  updateReview: (id: string, patch: Partial<Review>) => void
  deleteReview: (id: string) => void

  // Actions — Loyalty
  updateLoyaltyConfig: (patch: Partial<LoyaltyConfig>) => void
  addLoyaltyCard: (card: LoyaltyCard) => void
  updateLoyaltyCard: (id: string, patch: Partial<LoyaltyCard>) => void
  deleteLoyaltyCard: (id: string) => void
  addLoyaltyEvent: (cardId: string, event: LoyaltyEvent) => void

  // Actions — Multi-site
  addSite: (site: Site) => void
  updateSite: (id: string, patch: Partial<Site>) => void
  deleteSite: (id: string) => void
  setActiveSite: (id: string | null) => void

  // Actions — Fermetures
  addFermeture: (f: Fermeture) => void
  updateFermeture: (id: string, patch: Partial<Fermeture>) => void
  deleteFermeture: (id: string) => void

  // Actions — Auth & UI
  setUserRole: (role: UserRole) => void
  setLang: (lang: 'fr' | 'en' | 'de' | 'it') => void
  setTheme: (theme: 'dark' | 'light') => void
  toggleSidebar: () => void
  toggleQuickResa: () => void

  // Actions — Demo
  loadDemoData: (data: Partial<AppStore>) => void
  resetData: () => void
}

// ── Store ──────────────────────────────────────────
export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      // État initial
      restaurantId: null,
      setRestaurantId: (id) => set({ restaurantId: id }),
      resas: [],
      tables: [],
      combos: [],
      services: DEFAULT_SERVICES,
      salles: DEFAULT_SALLES,
      resto: { name: '', ville: '', pays: 'CH', plan: 'bistro', maxCvt: 30, tel: '', email: '', web: '' },
      options: DEFAULT_OPTIONS,
      users: [],
      fermetures: [],
      roomItems: [],
      clients: [],
      giftCards: [],
      reviews: [],
      loyaltyConfig: {
        active: false, mode: 'stamps',
        pointsPerChf: 1, stampsGoal: 10,
        cashbackPercent: 5,
        rewardName: 'Dessert offert', rewardValue: 15, rewardThreshold: 10,
        welcomeBonus: 1, birthdayBonus: 2, expirationMonths: 12,
        doublePointsDays: [], autoEnroll: false, autoEarnOnDone: false, tiersEnabled: false, tiers: []
      },
      loyaltyCards: [],
      sites: [],
      activeSiteId: null,
      activeDate: today(),
      isDemo: false,
      _demoVersion: 0,
      userRole: 'superadmin',
      lang: 'fr',
      theme: 'dark',
      sidebarCollapsed: false,
      showQuickResa: true,
      blinkResaIds: [],

      // Réservations
      addResa: (resa) => set((s) => {
        // ── Garde-fou complet via canPlaceResa : capacité, blocage, double-booking, fermeture ──
        // Ne s'applique que si la résa est placée sur une table connue (sinon double-booking-only)
        if (resa.tbl && resa.date && resa.svc && resa.s !== 'waitlist') {
          const tableExists = s.tables.some(t => t.id === resa.tbl || t.n === resa.tbl)
          if (tableExists && resa.c) {
            const check = canPlaceResa(resa.tbl, resa.date, resa.svc, resa.c)
            if (!check.ok) {
              console.warn(`[R3STO] Résa refusée (${resa.tbl} ${resa.date} ${resa.svc}) : ${check.reason}`)
              if (_toastHandler) _toastHandler(`Réservation refusée : ${check.reason}`, 'error')
              return s
            }
          } else {
            // Fallback : au minimum bloquer le double-booking même si la table n'est pas dans state.tables
            const occupied = s.resas.some(r =>
              r.date === resa.date && r.svc === resa.svc && r.tbl === resa.tbl &&
              (r.s === 'reserved' || r.s === 'arrived')
            )
            if (occupied) {
              console.warn(`[R3STO] Double-booking bloqué : ${resa.tbl} déjà occupée (${resa.date} ${resa.svc})`)
              if (_toastHandler) _toastHandler(`Table ${resa.tbl} déjà occupée pour ce service`, 'error')
              return s
            }
          }
        }
        const prev = s.resas
        sync(
          () => api.resas.create(resa),
          () => set({ resas: prev }),
          'création réservation'
        )
        return { resas: [...s.resas, resa] }
      }),
      updateResa: (id, patch) => {
        // Si on déplace la résa sur une autre table/date/svc, vérifier canPlaceResa
        const current = useAppStore.getState().resas.find(r => r.id === id)
        if (current) {
          const next = { ...current, ...patch }
          const movingSlot = ('tbl' in patch) || ('date' in patch) || ('svc' in patch) || ('cvt' in patch)
          if (movingSlot && next.tbl && next.date && next.svc && next.c && next.s !== 'waitlist') {
            // Ignorer soi-même dans le check double-booking
            const others = useAppStore.getState().resas.filter(r => r.id !== id)
            const conflict = others.some(r =>
              r.date === next.date && r.svc === next.svc && r.tbl === next.tbl &&
              (r.s === 'reserved' || r.s === 'arrived')
            )
            if (conflict) {
              console.warn(`[R3STO] updateResa refusé : table ${next.tbl} déjà occupée`)
              if (_toastHandler) _toastHandler(`Déplacement refusé : table déjà occupée`, 'error')
              return
            }
            // Vérifie capacité/blocage/fermeture via canPlaceResa si la table est connue
            const tableExists = useAppStore.getState().tables.some(t => t.id === next.tbl || t.n === next.tbl)
            if (tableExists) {
              const check = canPlaceResa(next.tbl, next.date, next.svc, next.c)
              if (!check.ok && check.reason !== 'Table déjà occupée pour ce service') {
                console.warn(`[R3STO] updateResa refusé : ${check.reason}`)
                if (_toastHandler) _toastHandler(`Déplacement refusé : ${check.reason}`, 'error')
                return
              }
            }
          }
        }
        const prevResas = useAppStore.getState().resas
        set((s) => ({ resas: s.resas.map((r) => r.id === id ? { ...r, ...patch } : r) }))
        sync(
          () => api.resas.update(id, patch),
          () => set({ resas: prevResas }),
          'mise à jour réservation'
        )
      },
      deleteResa: (id) => {
        const prev = useAppStore.getState().resas
        set((s) => ({ resas: s.resas.filter((r) => r.id !== id) }))
        sync(() => api.resas.delete(id), () => set({ resas: prev }), 'suppression réservation')
      },
      setResaStatus: (id, status) => set((s) => {
        const resa = s.resas.find(r => r.id === id)
        if (!resa) return s
        const allowed = (VALID_TRANSITIONS[resa.s] || [])
        if (!allowed.includes(status)) {
          console.warn(`[R3STO] Transition refusée : ${resa.s} → ${status}`)
          return s
        }
        sync(() => api.resas.setStatus(id, status))
        return { resas: s.resas.map((r) => r.id === id ? { ...r, s: status } : r) }
      }),
      swapTables: (idA, idB) => { sync(() => api.resas.swap(idA, idB)); set((s) => {
        const a = s.resas.find(r => r.id === idA)
        const b = s.resas.find(r => r.id === idB)
        if (!a || !b) return s
        return {
          resas: s.resas.map(r =>
            r.id === idA ? { ...r, tbl: b.tbl } :
            r.id === idB ? { ...r, tbl: a.tbl } : r
          )
        }
      }) },
      blinkResa: (id) => {
        // Remplacer les anciens blinks par le nouveau — persiste jusqu'à la prochaine résa
        set({ blinkResaIds: [id] })
      },

      // Navigation
      setActiveDate: (date) => set({ activeDate: date }),

      // Config
      updateOptions: (patch) => { sync(() => api.options.update(patch as any)); set((s) => ({ options: { ...s.options, ...patch } })) },
      updateResto: (patch) => { sync(() => api.resto.update(patch as any)); set((s) => ({ resto: { ...s.resto, ...patch } })) },
      setTables: (tables) => { sync(() => api.tables.updateBatch(tables)); set({ tables }) },
      setCombos: (combos) => { sync(() => api.combos.updateBatch(combos as any)); set({ combos }) },
      setServices: (services) => { sync(() => api.services.updateBatch(services as any)); set({ services }) },
      setSalles: (salles) => { sync(() => api.salles.updateBatch(salles as any)); set({ salles }) },
      setRoomItems: (items) => { sync(() => api.roomItems.updateBatch(items)); set({ roomItems: items }) },

      // Fermetures
      addFermeture: (f) => { sync(() => api.fermetures.create(f)); set((s) => ({ fermetures: [...s.fermetures, f] })) },
      updateFermeture: (id, patch) => { sync(() => api.fermetures.update(id, patch)); set((s) => ({
        fermetures: s.fermetures.map((f) => f.id === id ? { ...f, ...patch } : f)
      })) },
      deleteFermeture: (id) => {
        const prev = useAppStore.getState().fermetures
        set((s) => ({ fermetures: s.fermetures.filter((f) => f.id !== id) }))
        sync(() => api.fermetures.delete(id), () => set({ fermetures: prev }), 'suppression fermeture')
      },

      // Clients
      addClient: (client) => { sync(() => api.clients.create(client)); set((s) => ({ clients: [...s.clients, client] })) },
      updateClient: (id, patch) => { sync(() => api.clients.update(id, patch)); set((s) => ({
        clients: s.clients.map((c) => c.id === id ? { ...c, ...patch } : c)
      })) },
      deleteClient: (id) => {
        const prev = useAppStore.getState().clients
        set((s) => ({ clients: s.clients.filter((c) => c.id !== id) }))
        sync(() => api.clients.delete(id), () => set({ clients: prev }), 'suppression client')
      },

      // Gift Cards
      addGiftCard: (gc) => { sync(() => api.giftCards.create(gc)); set((s) => ({ giftCards: [...s.giftCards, gc] })) },
      updateGiftCard: (id, patch) => { sync(() => api.giftCards.update(id, patch)); set((s) => ({
        giftCards: s.giftCards.map((g) => g.id === id ? { ...g, ...patch } : g)
      })) },
      deleteGiftCard: (id) => {
        const prev = useAppStore.getState().giftCards
        set((s) => ({ giftCards: s.giftCards.filter((g) => g.id !== id) }))
        sync(() => api.giftCards.delete(id), () => set({ giftCards: prev }), 'suppression carte cadeau')
      },
      useGiftCard: (id, amount, resaId) => { sync(() => api.giftCards.use(id, amount, resaId)); set((s) => ({
        giftCards: s.giftCards.map((g) => {
          if (g.id !== id) return g
          const newBalance = Math.max(0, g.balance - amount)
          return {
            ...g,
            balance: newBalance,
            status: newBalance === 0 ? 'used' as const : 'partial' as const,
            usedAt: new Date().toISOString().slice(0, 10),
            usedResaId: resaId || g.usedResaId,
          }
        })
      })) },

      // Reviews
      addReview: (review) => { sync(() => api.reviews.create(review)); set((s) => ({ reviews: [...s.reviews, review] })) },
      updateReview: (id, patch) => { sync(() => api.reviews.update(id, patch)); set((s) => ({
        reviews: s.reviews.map((r) => r.id === id ? { ...r, ...patch } : r)
      })) },
      deleteReview: (id) => {
        const prev = useAppStore.getState().reviews
        set((s) => ({ reviews: s.reviews.filter((r) => r.id !== id) }))
        sync(() => api.reviews.delete(id), () => set({ reviews: prev }), 'suppression avis')
      },

      // Loyalty
      updateLoyaltyConfig: (patch) => { sync(() => api.loyalty.updateConfig(patch)); set((s) => ({
        loyaltyConfig: { ...s.loyaltyConfig, ...patch }
      })) },
      addLoyaltyCard: (card) => { sync(() => api.loyalty.createCard(card)); set((s) => ({
        loyaltyCards: [...s.loyaltyCards, card]
      })) },
      updateLoyaltyCard: (id, patch) => { sync(() => api.loyalty.updateCard(id, patch)); set((s) => ({
        loyaltyCards: s.loyaltyCards.map((c) => c.id === id ? { ...c, ...patch } : c)
      })) },
      deleteLoyaltyCard: (id) => {
        const prev = useAppStore.getState().loyaltyCards
        set((s) => ({ loyaltyCards: s.loyaltyCards.filter((c) => c.id !== id) }))
        sync(() => api.loyalty.deleteCard(id), () => set({ loyaltyCards: prev }), 'suppression carte fidélité')
      },
      addLoyaltyEvent: (cardId, event) => { sync(() => api.loyalty.addEvent(cardId, event)); set((s) => ({
        loyaltyCards: s.loyaltyCards.map((c) => {
          if (c.id !== cardId) return c
          const newHistory = [...c.history, event]
          const delta = event.type === 'earn' || event.type === 'bonus' ? event.amount : -event.amount
          return {
            ...c,
            points: s.loyaltyConfig.mode === 'points' ? c.points + delta : c.points,
            stamps: s.loyaltyConfig.mode === 'stamps' ? c.stamps + delta : c.stamps,
            cashbackBalance: s.loyaltyConfig.mode === 'cashback' ? c.cashbackBalance + delta : c.cashbackBalance,
            totalEarned: event.type === 'earn' || event.type === 'bonus' ? c.totalEarned + event.amount : c.totalEarned,
            rewardsUsed: event.type === 'redeem' ? c.rewardsUsed + 1 : c.rewardsUsed,
            lastActivity: event.date,
            history: newHistory
          }
        })
      })) },

      // Multi-site
      addSite: (site: Site) => { sync(() => api.sites.create(site)); set((s: AppStore) => ({ sites: [...s.sites, site] })) },
      updateSite: (id: string, patch: Partial<Site>) => { sync(() => api.sites.update(id, patch)); set((s: AppStore) => ({
        sites: s.sites.map((si: Site) => si.id === id ? { ...si, ...patch } : si)
      })) },
      deleteSite: (id: string) => {
        const prevState = useAppStore.getState()
        const prevSites = prevState.sites
        const prevActiveSiteId = prevState.activeSiteId
        set((s: AppStore) => ({
          sites: s.sites.filter((si: Site) => si.id !== id),
          activeSiteId: s.activeSiteId === id ? null : s.activeSiteId
        }))
        sync(
          () => api.sites.delete(id),
          () => set({ sites: prevSites, activeSiteId: prevActiveSiteId }),
          'suppression site'
        )
      },
      setActiveSite: (id: string | null) => set({ activeSiteId: id }),

      // Auth & UI
      setUserRole: (role) => set({ userRole: role }),
      setLang: (lang) => set({ lang }),
      setTheme: (theme) => {
        document.documentElement.setAttribute('data-theme', theme)
        set({ theme })
      },
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      toggleQuickResa: () => set((s) => ({ showQuickResa: !s.showQuickResa })),

      // Demo
      loadDemoData: (data) => set((s) => ({ ...s, ...data, isDemo: true })),
      resetData: () => set({
        restaurantId: null,
        resas: [], tables: [], combos: [],
        services: DEFAULT_SERVICES, salles: DEFAULT_SALLES,
        options: DEFAULT_OPTIONS, users: [], fermetures: [], roomItems: [], clients: [], giftCards: [], reviews: [], loyaltyCards: [],
        sites: [], activeSiteId: null,
        activeDate: today()
      })
    }),
    {
      name: 'r3sto-app-data',
      // ── Corruption detection : si le JSON est invalide, reset propre ──
      onRehydrateStorage: () => {
        return (_state, error) => {
          if (error) {
            console.error('[R3STO] Données localStorage corrompues — reset automatique', error)
            try { localStorage.removeItem('r3sto-app-data') } catch (_) {}
            window.location.reload()
          }
        }
      },
      partialize: (state) => ({
        restaurantId: state.restaurantId,
        resas: state.resas,
        tables: state.tables,
        combos: state.combos,
        services: state.services,
        salles: state.salles,
        resto: state.resto,
        options: state.options,
        users: state.users,
        fermetures: state.fermetures,
        roomItems: state.roomItems,
        clients: state.clients,
        giftCards: state.giftCards,
        reviews: state.reviews,
        loyaltyConfig: state.loyaltyConfig,
        loyaltyCards: state.loyaltyCards,
        sites: state.sites,
        activeSiteId: state.activeSiteId,
        lang: state.lang,
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        showQuickResa: state.showQuickResa,
        isDemo: state.isDemo,
        _demoVersion: state._demoVersion,
      })
    }
  )
)

// ── Sélecteurs utiles ──────────────────────────────
export const selectResasForDate = (date: string) =>
  (s: AppStore) => s.resas.filter((r) => r.date === date)

export const selectActiveServices = (s: AppStore) =>
  s.services.filter((sv) => sv.active)

export const selectActiveTables = (s: AppStore) =>
  s.tables.filter((t) => t.active)

// ── Validation helpers ──────────────────────────────

/** Vérifie si une table est déjà occupée pour un créneau donné */
export function isDoubleBooked(tbl: string, date: string, svc: string): boolean {
  const state = useAppStore.getState()
  return state.resas.some(r =>
    r.date === date && r.svc === svc && r.tbl === tbl &&
    (r.s === 'reserved' || r.s === 'arrived')
  )
}

/** Vérifie si une transition de statut est valide */
export function isValidTransition(from: string, to: string): boolean {
  return (VALID_TRANSITIONS[from] || []).includes(to)
}

/** Vérifie si on peut placer une résa sur cette table (capacité + blocage + double-booking) */
export function canPlaceResa(tbl: string, date: string, svc: string, cvt: number): { ok: boolean; reason?: string } {
  const state = useAppStore.getState()
  const table = state.tables.find(t => t.id === tbl || t.n === tbl)
  if (!table) return { ok: false, reason: 'Table introuvable' }
  if (!table.active) return { ok: false, reason: 'Table inactive' }
  if (table.blocked) return { ok: false, reason: `Table bloquée${table.blockedReason ? ` : ${table.blockedReason}` : ''}` }
  if (cvt > table.capMax) return { ok: false, reason: `Capacité max ${table.capMax} couverts` }
  if (cvt < table.capMin) return { ok: false, reason: `Capacité min ${table.capMin} couverts` }
  // Double-booking
  const occupied = state.resas.some(r =>
    r.date === date && r.svc === svc && r.tbl === tbl &&
    (r.s === 'reserved' || r.s === 'arrived')
  )
  if (occupied) return { ok: false, reason: 'Table déjà occupée pour ce service' }
  // Fermeture
  const closed = state.fermetures.some(f =>
    f.active && f.date <= date && (!f.dateFin || f.dateFin >= date) &&
    (!f.service || f.service === svc)
  )
  if (closed) return { ok: false, reason: 'Service fermé à cette date' }
  return { ok: true }
}

/** Vérifie si une résa en attente de réassignation existe */
export function hasPendingReassign(date: string, svc: string): boolean {
  const state = useAppStore.getState()
  return state.resas.some(r =>
    r.date === date && r.svc === svc &&
    (r.s === 'reserved' || r.s === 'arrived') && !r.tbl
  )
}

/** Table bloquée pour un service spécifique */
export function isTableHeld(tbl: string, svcId?: string): boolean {
  const state = useAppStore.getState()
  const table = state.tables.find(t => t.id === tbl || t.n === tbl)
  if (!table) return false
  if (table.blocked) return true
  if (table.held) return true
  // Check fermetures spécifiques au service
  if (svcId) {
    return state.fermetures.some(f =>
      f.active && f.type === 'service' && f.service === svcId &&
      f.date <= state.activeDate && (!f.dateFin || f.dateFin >= state.activeDate)
    )
  }
  return false
}

/** Match table dans un combo (utiliser au lieu de .includes()) */
export function tblMatchesTable(comboTables: string[], tblId: string): boolean {
  return comboTables.some(t => t.trim() === tblId.trim())
}

// ── Permission helpers ────────────────────────────────
import { getDefaultModuleAccess } from '../types'
import type { PermissionModule, PermissionLevel } from '../types'


/** Vérifie si le rôle actuel a accès au module */
export function hasAccess(module: PermissionModule, minLevel: PermissionLevel = 'read'): boolean {
  const state = useAppStore.getState()
  const defaults = getDefaultModuleAccess(state.userRole)
  const level = defaults[module] || 'none'
  const levels: PermissionLevel[] = ['none', 'read', 'write', 'admin']
  return levels.indexOf(level) >= levels.indexOf(minLevel)
}
