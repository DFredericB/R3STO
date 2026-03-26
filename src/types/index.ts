// ══════════════════════════════════════════════════
//  R3STO — Types TypeScript
//  Toutes les entités métier sont définies ici
//  Un changement ici → TypeScript signale PARTOUT
// ══════════════════════════════════════════════════

export type ResaStatus = 'reserved' | 'arrived' | 'done' | 'noshow' | 'cancelled' | 'waitlist'
export type ResaCanal = 'telephone' | 'walkin' | 'widget' | 'google' | 'email'
export type ResaMode = 'ia' | 'manuel' | 'web'
export type UserRole = 'proprietaire' | 'manager' | 'serveur'
export type Plan = 'bistro' | 'resto' | 'gastro'

// ── Réservation ────────────────────────────────────
export interface Resa {
  id: string
  n: string           // nom complet
  nom: string
  prenom: string
  c: number           // couverts
  tbl: string         // table assignée
  t: string           // heure format '19h30'
  svc: string         // service lowercase
  s: ResaStatus
  note: string
  date: string        // ISO YYYY-MM-DD
  createdAt: number   // timestamp
  statut: 0 | 1 | 2 | 3  // 0=standard, 1=régulier, 2=VIP, 3=surveiller
  mode: ResaMode
  tel: string
  email: string
  canal: ResaCanal
  prisPar: string
  src?: string        // 'web' si widget
  bebe: number
  pmr: number
  allergie: boolean
  confirmed?: boolean
  tablePref?: string    // table préférée détectée depuis l'historique
  noteProfil?: string   // notes du profil client
}

// ── Table ──────────────────────────────────────────
export interface Table {
  id: string
  n: string           // label ex: 'T1'
  salle: string       // nom de la salle
  shape: 'round' | 'round_sm' | 'round_lg' | 'rect' | 'rect_lg' | 'square' | 'square_sm' | 'oval' | 'banquette' | 'bar'
  capMin: number
  capMax: number
  x: number           // position canvas %
  y: number
  w: number           // dimensions canvas %
  h: number
  active: boolean
  priority: number    // ordre remplissage IA
  blocked: boolean
  held: boolean
  blockedReason?: string
  _closedToday?: string  // date ISO si fermée
  tableH?: 'basse' | 'standard' | 'haute'  // hauteur physique de la table
  orient?: 'V' | 'H'   // orientation chaises (square_sm 2p)
  barSide?: 'top' | 'bottom'  // côté des tabourets pour forme bar (défaut: bottom)
}

// ── Combo (tables combinées) ───────────────────────
export interface Combo {
  id: string
  label: string       // ex: 'T1+T2'
  tables: string[]    // IDs des tables
  cap: number          // capacité auto (somme des tables)
  capOverride?: number // capacité manuelle si différente
  align?: 'L' | 'C' | 'R' // disposition couverts : gauche / centré / droite
  orient?: 'H' | 'V'      // orientation : H = horizontal (côte à côte), V = vertical (empilé)
  salle: string
  origSpan?: { x1: number; x2: number; y1: number; y2: number } // bbox originale pour L/C/R
  origPositions?: Record<string, { x: number; y: number }>  // positions individuelles avant pack
}

// ── Objet de salle (décor, mur, porte…) ─────────
export interface RoomItem {
  id: string
  sym: string        // emoji
  lbl: string        // label ex: 'Porte'
  shape: string      // 'porte', 'mur', 'colonne', etc.
  x: number
  y: number
  w: number
  h: number
  salle: string
}

// ── Service ────────────────────────────────────────
export interface Service {
  id: string
  name: string
  icon: string
  open: string        // '12:00'
  close: string       // '14:30'
  lastOrder: string   // '13:45'
  buffer: number      // minutes
  bookingCutoffMins: number
  active: boolean
  color: string
  jours: number[]     // 0=dim, 1=lun...
  maxCouverts: number
  maxParService: number
  _closedToday?: string
}

// ── Salle ──────────────────────────────────────────
export interface Salle {
  id: string
  name: string
  type: 'intérieure' | 'extérieure' | 'privée' | 'bar'
  exterior: boolean
  active: boolean
  openByDefault: boolean
  color: string
  priority: number
}

// ── Restaurant ─────────────────────────────────────
export interface Resto {
  name: string
  ville: string
  pays: string          // ISO 3166-1 alpha-2 : 'CH', 'FR', 'BE', etc.
  plan: Plan
  maxCvt: number
  tel: string
  email: string
  web: string
  avg_ticket?: number
}

// ── Fermeture ──────────────────────────────────────
export interface Fermeture {
  id: string
  type: 'restaurant' | 'salle' | 'service' | 'vacances' | 'ferie' | 'exception'
  date: string        // ISO
  dateFin?: string    // ISO si période
  label: string
  note?: string
  salle?: string
  service?: string
  active: boolean
}

// ── Utilisateur ────────────────────────────────────
export interface User {
  id: string
  n: string
  email: string
  role: UserRole
  active: boolean
  pin?: string
}

// ── Options ────────────────────────────────────────
export interface OptionsData {
  // Équipements
  wifi: boolean
  wifi_payant: boolean
  parking: boolean
  parking_valet: boolean
  terrasse: boolean
  accessible: boolean
  animaux: boolean
  animaux_terrasse_only: boolean
  // Réservation
  reservation_min: number
  reservation_max: number
  annulation_h: number
  allow_past_booking: boolean
  booking_horizon_days: number
  slot_interval_mins: number
  default_duration_mins: number
  require_phone: boolean
  allow_walkin: boolean
  // Dispersion
  dispersion_mode: 'ia' | 'manuel'
  dispersion_interval: number
  dispersion_max_per_slot: number
  // Groupes
  groupe_seuil: number
  groupe_max_par_service: number
  // Notifications
  notif_new_resa: boolean
  notif_new_hours: number
  // Automatisations
  auto_confirm: boolean
  auto_remind_24h: boolean
  auto_noshow_flag: boolean
  // Familles
  chaises_bebe: number
  places_pmr: number
}

// ── État global de l'app ───────────────────────────
export interface AppState {
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
  activeDate: string  // ISO YYYY-MM-DD
  // UI state
  isDemo: boolean
  userRole: UserRole
  lang: 'fr' | 'en' | 'de' | 'it'
}
