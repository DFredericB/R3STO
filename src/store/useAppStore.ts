// ══════════════════════════════════════════════════
//  R3STO — Store global (Zustand)
//  Remplace toutes les variables globales JS
//  Usage: const resas = useAppStore(s => s.resas)
// ══════════════════════════════════════════════════

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Resa, Table, Combo, Service, Salle, Resto,
  OptionsData, User, Fermeture, UserRole, RoomItem, Client, GiftCard, Review,
  LoyaltyConfig, LoyaltyCard, LoyaltyEvent, Site
} from '../types'

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

// ── Interface du store ─────────────────────────────
interface AppStore {
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

  // Navigation
  curView: string
  activeDate: string
  isDemo: boolean
  _demoVersion: number
  userRole: UserRole
  lang: 'fr' | 'en' | 'de' | 'it'
  theme: 'dark' | 'light'
  sidebarCollapsed: boolean

  // Actions — Réservations
  addResa: (resa: Resa) => void
  updateResa: (id: string, patch: Partial<Resa>) => void
  deleteResa: (id: string) => void
  setResaStatus: (id: string, status: Resa['s']) => void
  swapTables: (idA: string, idB: string) => void

  // Actions — Navigation
  setView: (view: string) => void
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

  // Actions — Auth & UI
  setUserRole: (role: UserRole) => void
  setLang: (lang: 'fr' | 'en' | 'de' | 'it') => void
  setTheme: (theme: 'dark' | 'light') => void
  toggleSidebar: () => void

  // Actions — Demo
  loadDemoData: (data: Partial<AppStore>) => void
  resetData: () => void
}

// ── Store ──────────────────────────────────────────
export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      // État initial
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
        doublePointsDays: []
      },
      loyaltyCards: [],
      sites: [],
      activeSiteId: null,
      curView: 'dashboard',
      activeDate: today(),
      isDemo: false,
      _demoVersion: 0,
      userRole: 'proprietaire',
      lang: 'fr',
      theme: 'dark',
      sidebarCollapsed: false,

      // Réservations
      addResa: (resa) => set((s) => {
        // ── Garde-fou double-booking : empêcher 2 résas actives sur la même table/date/service ──
        if (resa.tbl && resa.date && resa.svc) {
          const occupied = s.resas.some(r =>
            r.date === resa.date && r.svc === resa.svc && r.tbl === resa.tbl &&
            (r.s === 'reserved' || r.s === 'arrived')
          )
          if (occupied) {
            console.warn(`[R3STO] Double-booking bloqué : ${resa.tbl} déjà occupée (${resa.date} ${resa.svc})`)
            return s // ne pas ajouter
          }
        }
        return { resas: [...s.resas, resa] }
      }),
      updateResa: (id, patch) => set((s) => ({
        resas: s.resas.map((r) => r.id === id ? { ...r, ...patch } : r)
      })),
      deleteResa: (id) => set((s) => ({ resas: s.resas.filter((r) => r.id !== id) })),
      setResaStatus: (id, status) => set((s) => ({
        resas: s.resas.map((r) => r.id === id ? { ...r, s: status } : r)
      })),
      swapTables: (idA, idB) => set((s) => {
        const a = s.resas.find(r => r.id === idA)
        const b = s.resas.find(r => r.id === idB)
        if (!a || !b) return s
        return {
          resas: s.resas.map(r =>
            r.id === idA ? { ...r, tbl: b.tbl } :
            r.id === idB ? { ...r, tbl: a.tbl } : r
          )
        }
      }),

      // Navigation
      setView: (view) => set({ curView: view }),
      setActiveDate: (date) => set({ activeDate: date }),

      // Config
      updateOptions: (patch) => set((s) => ({ options: { ...s.options, ...patch } })),
      updateResto: (patch) => set((s) => ({ resto: { ...s.resto, ...patch } })),
      setTables: (tables) => set({ tables }),
      setCombos: (combos) => set({ combos }),
      setServices: (services) => set({ services }),
      setSalles: (salles) => set({ salles }),
      setRoomItems: (items) => set({ roomItems: items }),

      // Clients
      addClient: (client) => set((s) => ({ clients: [...s.clients, client] })),
      updateClient: (id, patch) => set((s) => ({
        clients: s.clients.map((c) => c.id === id ? { ...c, ...patch } : c)
      })),
      deleteClient: (id) => set((s) => ({ clients: s.clients.filter((c) => c.id !== id) })),

      // Gift Cards
      addGiftCard: (gc) => set((s) => ({ giftCards: [...s.giftCards, gc] })),
      updateGiftCard: (id, patch) => set((s) => ({
        giftCards: s.giftCards.map((g) => g.id === id ? { ...g, ...patch } : g)
      })),
      deleteGiftCard: (id) => set((s) => ({ giftCards: s.giftCards.filter((g) => g.id !== id) })),
      useGiftCard: (id, amount, resaId) => set((s) => ({
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
      })),

      // Reviews
      addReview: (review) => set((s) => ({ reviews: [...s.reviews, review] })),
      updateReview: (id, patch) => set((s) => ({
        reviews: s.reviews.map((r) => r.id === id ? { ...r, ...patch } : r)
      })),
      deleteReview: (id) => set((s) => ({ reviews: s.reviews.filter((r) => r.id !== id) })),

      // Loyalty
      updateLoyaltyConfig: (patch) => set((s) => ({
        loyaltyConfig: { ...s.loyaltyConfig, ...patch }
      })),
      addLoyaltyCard: (card) => set((s) => ({
        loyaltyCards: [...s.loyaltyCards, card]
      })),
      updateLoyaltyCard: (id, patch) => set((s) => ({
        loyaltyCards: s.loyaltyCards.map((c) => c.id === id ? { ...c, ...patch } : c)
      })),
      deleteLoyaltyCard: (id) => set((s) => ({
        loyaltyCards: s.loyaltyCards.filter((c) => c.id !== id)
      })),
      addLoyaltyEvent: (cardId, event) => set((s) => ({
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
      })),

      // Multi-site
      addSite: (site) => set((s) => ({ sites: [...s.sites, site] })),
      updateSite: (id, patch) => set((s) => ({
        sites: s.sites.map(si => si.id === id ? { ...si, ...patch } : si)
      })),
      deleteSite: (id) => set((s) => ({
        sites: s.sites.filter(si => si.id !== id),
        activeSiteId: s.activeSiteId === id ? null : s.activeSiteId
      })),
      setActiveSite: (id) => set({ activeSiteId: id }),

      // Auth & UI
      setUserRole: (role) => set({ userRole: role }),
      setLang: (lang) => set({ lang }),
      setTheme: (theme) => {
        document.documentElement.setAttribute('data-theme', theme)
        set({ theme })
      },
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      // Demo
      loadDemoData: (data) => set((s) => ({ ...s, ...data, isDemo: true })),
      resetData: () => set({
        resas: [], tables: [], combos: [],
        services: DEFAULT_SERVICES, salles: DEFAULT_SALLES,
        options: DEFAULT_OPTIONS, users: [], fermetures: [], roomItems: [], clients: [], giftCards: [], reviews: [], loyaltyCards: [],
        sites: [], activeSiteId: null,
        activeDate: today()
      })
    }),
    {
      name: 'r3sto-app-data',
      partialize: (state) => ({
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
