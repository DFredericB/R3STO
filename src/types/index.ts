// ══════════════════════════════════════════════════
//  R3STO — Types TypeScript
//  Toutes les entités métier sont définies ici
//  Un changement ici → TypeScript signale PARTOUT
// ══════════════════════════════════════════════════

export type ResaStatus = 'reserved' | 'arrived' | 'done' | 'noshow' | 'cancelled' | 'waitlist'
export type ResaCanal = 'telephone' | 'walkin' | 'widget' | 'google' | 'email' | 'whatsapp' | 'sms' | 'waitlist'
export type ResaMode = 'ia' | 'manuel' | 'web'
// ── Rôles système R3STO (entreprise SaaS) ─────────
// SuperAdmin = Didier (accès total, toute la plateforme)
// Les rôles sont ceux d'une boîte SaaS, PAS d'un restaurant
export type UserRole =
  | 'superadmin'
  | 'cto'
  | 'coo'
  | 'manager'
  | 'dev'
  | 'sales'
  | 'marketing'
  | 'rh'
  | 'comptable'
  | 'support'
  | 'onboarding'
  | 'stagiaire'
  | 'custom'

// ── Modules de permissions ────────────────────────
export type PermissionModule =
  | 'dashboard'
  | 'resas'
  | 'plan'
  | 'grille'
  | 'agenda'
  | 'waitlist'
  | 'groupes'
  | 'clients'
  | 'crm'
  | 'marketing'
  | 'blacklist'
  | 'avis'
  | 'fidelite'
  | 'widget'
  | 'menu'
  | 'commandes'
  | 'kds'
  | 'caisse'
  | 'delivery'
  | 'prepaiement'
  | 'cadeaux'
  | 'profil'
  | 'salles'
  | 'tables'
  | 'fermetures'
  | 'options'
  | 'acces_roles'
  | 'multisite'
  | 'audit'
  | 'alertes'
  | 'historique'
  | 'support'
  | 'finance'
  | 'equipes'
  | 'plateforme'
  | 'newsletter'
  | 'marketplace'
  | 'site_vitrine'
  | 'qrcode'
  | 'modules'
  | 'rh'

// ── Niveaux d'accès par module ────────────────────
export type PermissionLevel = 'none' | 'read' | 'write' | 'admin'

// ── Profil de permissions pour un rôle ────────────
export interface RolePermissions {
  role: UserRole
  label: string
  color: string
  icon: string
  description: string
  modules: Record<PermissionModule, PermissionLevel>
}

// ── Permissions par défaut pour chaque rôle ───────
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, Pick<RolePermissions, 'label' | 'color' | 'icon' | 'description'>> = {
  superadmin:  { label: 'Super Admin', color: '#e74c3c', icon: '🛡️', description: 'Accès total — fondateur R3STO' },
  cto:         { label: 'CTO', color: '#9b59b6', icon: '💻', description: 'Direction technique, infra, dev' },
  coo:         { label: 'COO', color: '#f39c12', icon: '👑', description: 'Direction opérations' },
  manager:     { label: 'Manager', color: '#2ecc71', icon: '👔', description: 'Gestion d\'équipe et opérations' },
  dev:         { label: 'Développeur', color: '#3498db', icon: '⌨️', description: 'Développement produit' },
  sales:       { label: 'Commercial', color: '#e67e22', icon: '📈', description: 'Ventes, prospection, closing' },
  marketing:   { label: 'Marketing', color: '#8e44ad', icon: '📣', description: 'Campagnes, contenu, SEO' },
  rh:          { label: 'Ressources Humaines', color: '#e91e63', icon: '🧑‍💼', description: 'Recrutement, paie, personnel' },
  comptable:   { label: 'Comptable', color: '#1abc9c', icon: '📊', description: 'Finance, facturation, TVA' },
  support:     { label: 'Support Client', color: '#3cc870', icon: '🎧', description: 'Tickets, assistance clients' },
  onboarding:  { label: 'Onboarding', color: '#4480d8', icon: '🚀', description: 'Mise en route nouveaux clients' },
  stagiaire:   { label: 'Stagiaire', color: '#9e9e9e', icon: '📝', description: 'Accès limité en lecture' },
  custom:      { label: 'Personnalisé', color: '#607d8b', icon: '⚡', description: 'Permissions sur mesure' },
}

// ── Helper: module access par défaut selon rôle ───
export function getDefaultModuleAccess(role: UserRole): Record<PermissionModule, PermissionLevel> {
  const all = (level: PermissionLevel): Record<PermissionModule, PermissionLevel> => {
    const modules: PermissionModule[] = [
      'dashboard','resas','plan','grille','agenda','waitlist','groupes',
      'clients','crm','marketing','blacklist','avis','fidelite',
      'widget','menu','commandes','kds','caisse','delivery',
      'prepaiement','cadeaux','profil','salles','tables','fermetures',
      'options','acces_roles','multisite','audit','alertes','historique',
      'support','finance','equipes','plateforme','newsletter','marketplace',
      'site_vitrine','qrcode','modules','rh',
    ]
    return Object.fromEntries(modules.map(m => [m, level])) as Record<PermissionModule, PermissionLevel>
  }

  switch (role) {
    case 'superadmin': return all('admin')
    case 'cto': return { ...all('admin'), finance: 'read', rh: 'none' as any }
    case 'coo': return { ...all('admin'), plateforme: 'read' }
    case 'manager': return { ...all('write'), acces_roles: 'read', plateforme: 'none', finance: 'read' }
    case 'dev': return { ...all('none'), dashboard: 'read', plateforme: 'admin', audit: 'admin', alertes: 'write', modules: 'write', widget: 'write', marketplace: 'write' }
    case 'sales': return { ...all('none'), dashboard: 'read', clients: 'write', crm: 'admin', marketing: 'read', avis: 'read', newsletter: 'read', fidelite: 'read' }
    case 'marketing': return { ...all('none'), dashboard: 'read', clients: 'read', crm: 'read', marketing: 'admin', avis: 'write', fidelite: 'write', newsletter: 'admin', site_vitrine: 'write', widget: 'read' }
    case 'rh': return { ...all('none'), dashboard: 'read', equipes: 'admin', finance: 'read', acces_roles: 'write' }
    case 'comptable': return { ...all('none'), dashboard: 'read', finance: 'admin', prepaiement: 'read', cadeaux: 'read' }
    case 'support': return { ...all('none'), dashboard: 'read', clients: 'write', crm: 'read', support: 'admin', avis: 'write', blacklist: 'write', historique: 'read' }
    case 'onboarding': return { ...all('none'), dashboard: 'read', clients: 'write', crm: 'read', support: 'write', profil: 'read', salles: 'read', tables: 'read' }
    case 'stagiaire': return { ...all('read'), acces_roles: 'none', finance: 'none', plateforme: 'none', audit: 'none' }
    case 'custom': return all('none')
  }
}
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
  phone?: string
  avatar?: string
  permissions?: Partial<Record<PermissionModule, PermissionLevel>>  // overrides per-user
  lastLogin?: string
  createdAt?: number
  department?: string
  notes?: string
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
  autoEnroll: boolean             // inscription auto 1ère résa
  autoEarnOnDone: boolean         // accumulation auto quand résa → done
  tiersEnabled: boolean           // activer les niveaux
  tiers: LoyaltyTier[]           // niveaux configurables
}

export interface LoyaltyTier {
  name: string         // ex: 'Bronze', 'Argent', 'Or'
  icon: string         // ex: '🥉', '🥈', '🥇'
  minEarned: number    // total gagné minimum pour ce tier
  color: string        // couleur badge
  perks: string        // avantages texte libre
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
  tier?: string                  // nom du tier courant
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

// ── Support Ticket ────────────────────────────────
export type TicketStatus = 'open' | 'inprogress' | 'resolved' | 'closed'
export type TicketPriority = 'normal' | 'urgent'
export type TicketType = 'tech' | 'usage' | 'feature' | 'billing'

export interface TicketMessage {
  id: string
  role: 'client' | 'admin'
  content: string
  ts: number
  by?: string           // nom de l'auteur (admin side)
}

export interface Ticket {
  id: string            // TKT-XXXXX
  siteId?: string       // multi-site context
  createdAt: number
  updatedAt: number
  status: TicketStatus
  priority: TicketPriority
  type: TicketType
  module: string
  subject: string
  description: string
  messages: TicketMessage[]
  userAgent?: string
  plan?: string
  assignee?: string     // admin who handles it
  rating?: number       // 1-5 after resolution
  resolvedAt?: number
}

// ── Liste d'attente ───────────────────────────────
export interface WaitlistItem {
  id: string
  n: string
  c: number
  svc: string
  t: string
  tel?: string
  note?: string
  createdAt: number
}

// ── Demande groupe ────────────────────────────────
export interface GroupRequest {
  id: string
  n: string           // nom du contact
  c: number           // couverts demandés
  svc: string
  date: string        // ISO
  t: string           // heure souhaitée
  tel?: string
  email?: string
  note?: string
  mode: 'auto' | 'manuel'
  status: 'pending' | 'accepted' | 'refused'
  createdAt: number
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
