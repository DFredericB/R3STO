// ══════════════════════════════════════════════════
//  R3STO — Store global (Zustand)
//  Remplace toutes les variables globales JS
//  Usage: const resas = useAppStore(s => s.resas)
// ══════════════════════════════════════════════════

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Resa, Table, Combo, Service, Salle, Resto,
  OptionsData, User, Fermeture, UserRole
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

  // Navigation
  curView: string
  activeDate: string
  isDemo: boolean
  userRole: UserRole
  lang: 'fr' | 'en' | 'de' | 'it'

  // Actions — Réservations
  addResa: (resa: Resa) => void
  updateResa: (id: string, patch: Partial<Resa>) => void
  deleteResa: (id: string) => void
  setResaStatus: (id: string, status: Resa['s']) => void

  // Actions — Navigation
  setView: (view: string) => void
  setActiveDate: (date: string) => void

  // Actions — Config
  updateOptions: (patch: Partial<OptionsData>) => void
  updateResto: (patch: Partial<Resto>) => void
  setTables: (tables: Table[]) => void
  setServices: (services: Service[]) => void
  setSalles: (salles: Salle[]) => void

  // Actions — Auth
  setUserRole: (role: UserRole) => void
  setLang: (lang: 'fr' | 'en' | 'de' | 'it') => void

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
      resto: { name: '', ville: '', plan: 'bistro', maxCvt: 30, tel: '', email: '', web: '' },
      options: DEFAULT_OPTIONS,
      users: [],
      fermetures: [],
      curView: 'dashboard',
      activeDate: today(),
      isDemo: false,
      userRole: 'proprietaire',
      lang: 'fr',

      // Réservations
      addResa: (resa) => set((s) => ({ resas: [...s.resas, resa] })),
      updateResa: (id, patch) => set((s) => ({
        resas: s.resas.map((r) => r.id === id ? { ...r, ...patch } : r)
      })),
      deleteResa: (id) => set((s) => ({ resas: s.resas.filter((r) => r.id !== id) })),
      setResaStatus: (id, status) => set((s) => ({
        resas: s.resas.map((r) => r.id === id ? { ...r, s: status } : r)
      })),

      // Navigation
      setView: (view) => set({ curView: view }),
      setActiveDate: (date) => set({ activeDate: date }),

      // Config
      updateOptions: (patch) => set((s) => ({ options: { ...s.options, ...patch } })),
      updateResto: (patch) => set((s) => ({ resto: { ...s.resto, ...patch } })),
      setTables: (tables) => set({ tables }),
      setServices: (services) => set({ services }),
      setSalles: (salles) => set({ salles }),

      // Auth
      setUserRole: (role) => set({ userRole: role }),
      setLang: (lang) => set({ lang }),

      // Demo
      loadDemoData: (data) => set((s) => ({ ...s, ...data, isDemo: true })),
      resetData: () => set({
        resas: [], tables: [], combos: [],
        services: DEFAULT_SERVICES, salles: DEFAULT_SALLES,
        options: DEFAULT_OPTIONS, users: [], fermetures: [],
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
        lang: state.lang
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
