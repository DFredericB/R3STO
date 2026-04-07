// ══════════════════════════════════════════════════
//  R3STO — Types TypeScript
//  Toutes les entités métier sont définies ici
//  Un changement ici → TypeScript signale PARTOUT
// ══════════════════════════════════════════════════

export type ResaStatus = 'reserved' | 'arrived' | 'done' | 'noshow' | 'cancelled' | 'waitlist'
export type ResaCanal = 'telephone' | 'walkin' | 'widget' | 'google' | 'email' | 'whatsapp' | 'sms'
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
  type: 'restaurant' | 'salle' | 'service' | 'vacances' | 'ferie' | 'exception' | 'travaux'
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

// ── Client (fiche CRM) ──────────────────────────────
export interface Client {
  id: string
  nom: string
  prenom: string
  tel: string
  email: string
  statut: 0 | 1 | 2 | 3     // 0=standard, 1=régulier, 2=VIP, 3=surveiller
  allergies: string           // texte libre
  notes: string               // préférences, commentaires
  langue: string              // 'fr', 'en', 'de', 'it'
  entreprise: string
  tags: string[]              // ex: ['terrasse', 'vin-rouge', 'anniversaire']
  tablePref: string           // table préférée
  createdAt: number           // timestamp
  lastVisit: string           // date ISO dernière visite
  totalVisits: number
  totalCouverts: number
  totalNoshows: number
  blacklisted: boolean
  blacklistReason: string
}

// ── Bon cadeau ────────────────────────────────────
export type GiftCardStatus = 'active' | 'partial' | 'used' | 'expired' | 'cancelled'

export interface GiftCard {
  id: string
  code: string              // code unique ex: 'GC-A7X2-K9M4'
  amount: number            // montant initial en CHF
  balance: number           // solde restant
  currency: string          // 'CHF'
  status: GiftCardStatus
  // Acheteur
  buyerName: string
  buyerEmail: string
  buyerTel: string
  // Destinataire
  recipientName: string
  recipientEmail: string
  message: string           // message personnalisé
  // Suivi
  createdAt: number         // timestamp
  expiresAt: string         // date ISO expiration (1 an par défaut)
  usedAt?: string           // date ISO dernière utilisation
  usedResaId?: string       // résa liée si utilisé
  // Paiement
  stripePaymentId?: string  // Stripe payment intent ID
  source: 'admin' | 'online'  // créé par le resto ou acheté en ligne
}

// ── Avis client ──────────────────────────────────
export interface Review {
  id: string
  resaId?: string           // réservation liée
  clientId?: string         // client CRM lié
  clientName: string
  clientEmail: string
  date: string              // date ISO de la visite
  createdAt: number         // timestamp de l'avis
  rating: 1 | 2 | 3 | 4 | 5
  comment: string
  service: string           // midi, soir, etc.
  source: 'internal' | 'google' | 'email'  // d'où vient l'avis
  reply?: string            // réponse du restaurateur
  repliedAt?: number
  visible: boolean          // affiché publiquement ou pas
  flagged: boolean          // signalé pour modération
}

// ── Programme fidélité ───────────────────────────────
export type LoyaltyMode = 'points' | 'stamps' | 'cashback'

export interface LoyaltyConfig {
  active: boolean
  mode: LoyaltyMode
  // Points : combien par CHF dépensé
  pointsPerChf: number
  // Tampons : 1 tampon par visite
  stampsGoal: number             // ex: 10 → 10e visite gratuite
  // Cashback : % retourné
  cashbackPercent: number
  // Récompenses
  rewardName: string             // ex: 'Repas offert', 'Dessert offert'
  rewardValue: number            // valeur en CHF
  rewardThreshold: number        // seuil pour débloquer (points ou stamps)
  // Options
  welcomeBonus: number           // bonus inscription (en points ou stamps)
  birthdayBonus: number          // bonus anniversaire
  expirationMonths: number       // 0 = jamais
  doublePointsDays: number[]     // jours de la semaine (0=dim) pour x2
}

export interface LoyaltyCard {
  id: string
  clientId: string
  clientName: string
  clientEmail: string
  points: number
  stamps: number
  cashbackBalance: number        // solde cashback accumulé en CHF
  totalEarned: number            // total points/stamps gagnés depuis le début
  rewardsUsed: number            // nombre de récompenses utilisées
  joinedAt: number               // timestamp inscription
  lastActivity: string           // date ISO
  history: LoyaltyEvent[]
}

export interface LoyaltyEvent {
  id: string
  date: string                   // ISO
  type: 'earn' | 'redeem' | 'bonus' | 'expire'
  amount: number                 // +/- points/stamps
  label: string                  // description lisible
  resaId?: string
}

// ── Site (multi-site Gastro) ─────────────────────────
export interface Site {
  id: string
  name: string              // ex: 'Le Bistro de Sion'
  ville: string
  adresse: string
  tel: string
  email: string
  web: string
  active: boolean
  color: string             // couleur d'identification
  plan: Plan                // plan individuel du site
  maxCvt: number
  createdAt: number
  acceptRedirect?: boolean    // Accept incoming redirected clients
  redirectPriority?: number   // Priority in redirect order (1 = first proposed)
  redirectMsg?: string        // Custom message shown to redirected clients
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
  clients: Client[]
  giftCards: GiftCard[]
  reviews: Review[]
  loyaltyConfig: LoyaltyConfig
  loyaltyCards: LoyaltyCard[]
  // Multi-site (Gastro)
  sites: Site[]
  activeSiteId: string | null  // null = site principal (mono-site)
  // Navigation
  activeDate: string  // ISO YYYY-MM-DD
  // UI state
  isDemo: boolean
  userRole: UserRole
  lang: 'fr' | 'en' | 'de' | 'it'
}
