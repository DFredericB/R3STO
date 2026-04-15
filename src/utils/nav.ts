// ══════════════════════════════════════════════════
//  R3STO — Navigation (centralisé, i18n + permissions)
//  Source unique de vérité pour Sidebar + BottomNav + SearchModal.
//  Zéro hardcoding : tous les labels passent par t(labelKey) et
//  les groupes par t(groupLabelKey).
// ══════════════════════════════════════════════════

import type { Action } from './permissions'
import type { Plan } from './plans'

export type NavGroupKey =
  | 'reservations'
  | 'r3sto-order'
  | 'r3sto-delivery'
  | 'clients'
  | 'channels'
  | 'r3sto-crm'
  | 'admin-erp'
  | 'settings'
  | 'help'

export type NavBadgeType = 'count' | 'pending' | 'waitlist'

export interface NavItem {
  path: string
  icon: string
  /** Clé i18n — résoudre via t(labelKey) */
  labelKey: string
  badge?: NavBadgeType
  /** Si défini, verrouillé tant que enabledModules ne le contient pas */
  moduleId?: 'order' | 'cash' | 'delivery'
  /** Plan minimum requis (bypass en démo) */
  minPlan?: Plan
  /** Permission requise (bypass en démo) — si omis : visible par tous */
  requires?: Action
  /** Groupe visuel */
  groupKey: NavGroupKey
  /** Visible uniquement sur admin.r3sto.ch */
  adminOnly?: boolean
  /** Marquer "bientôt" — badge WIP */
  wip?: boolean
}

/** Label i18n par groupe — utiliser t(NAV_GROUPS[key]) */
export const NAV_GROUPS: Record<NavGroupKey, string> = {
  reservations:    'nav.reservations',
  'r3sto-order':   'nav.r3stoOrder',
  'r3sto-delivery':'nav.r3stoDelivery',
  clients:         'nav.clients_section',
  channels:        'nav.channels',
  'r3sto-crm':     'nav.r3stoCrm',
  'admin-erp':     'nav.r3stoErp',
  settings:        'nav.settings',
  help:            'nav.help',
}

/**
 * Ordre : cœur quotidien en haut (Dashboard, Agenda, Journal), actions
 * secondaires ensuite, admin/réglages en bas. Icônes dédupliquées.
 */
export const NAV_ITEMS: NavItem[] = [
  // ── RÉSERVATIONS ──
  { path: '/dashboard',     icon: '📊', labelKey: 'nav.dashboard',     badge: 'count',    groupKey: 'reservations' },
  { path: '/agenda',        icon: '📅', labelKey: 'nav.agenda',                          groupKey: 'reservations' },
  { path: '/reservations',  icon: '📖', labelKey: 'nav.journal',                         groupKey: 'reservations' },
  { path: '/plan',          icon: '🗺️', labelKey: 'nav.floorplan',                       groupKey: 'reservations', minPlan: 'resto' },
  { path: '/grille',        icon: '🔲', labelKey: 'nav.grid',                            groupKey: 'reservations' },
  { path: '/nouvelle-resa', icon: '⚡', labelKey: 'nav.nouvelleResa',                    groupKey: 'reservations' },
  { path: '/waitlist',      icon: '⏳', labelKey: 'nav.waitlist',      badge: 'waitlist', groupKey: 'reservations', minPlan: 'resto' },
  { path: '/groupes',       icon: '👥', labelKey: 'nav.groups',        badge: 'pending',  groupKey: 'reservations', minPlan: 'resto' },

  // ── R3STO ORDER ──
  { path: '/commandes',     icon: '🔔', labelKey: 'nav.orders',        groupKey: 'r3sto-order' },
  { path: '/kds-cuisine',   icon: '🍳', labelKey: 'nav.kdsCuisine',    groupKey: 'r3sto-order', moduleId: 'order' },
  { path: '/kds-bar',       icon: '🍸', labelKey: 'nav.kdsBar',        groupKey: 'r3sto-order', moduleId: 'order' },
  { path: '/service',       icon: '🧑\u200d💼', labelKey: 'nav.service', groupKey: 'r3sto-order', moduleId: 'order' },
  { path: '/caisse',        icon: '🧾', labelKey: 'nav.register',      groupKey: 'r3sto-order', moduleId: 'order' },

  // ── R3STO DELIVERY ──
  { path: '/delivery',          icon: '🛵', labelKey: 'nav.delivery',         groupKey: 'r3sto-delivery' },
  { path: '/delivery-orders',   icon: '📦', labelKey: 'nav.deliveryOrders',   groupKey: 'r3sto-delivery' },
  { path: '/delivery-tracking', icon: '📍', labelKey: 'nav.deliveryTracking', groupKey: 'r3sto-delivery', moduleId: 'delivery' },
  { path: '/delivery-zones',    icon: '🗾', labelKey: 'nav.deliveryZones',    groupKey: 'r3sto-delivery', moduleId: 'delivery' },

  // ── CLIENTS ──
  { path: '/clients',       icon: '👤', labelKey: 'nav.clients',   groupKey: 'clients', minPlan: 'resto', requires: 'viewCrm' },
  { path: '/avis',          icon: '⭐', labelKey: 'nav.reviews',   groupKey: 'clients', minPlan: 'gastro' },
  { path: '/fidelite',      icon: '🏆', labelKey: 'nav.loyalty',   groupKey: 'clients', minPlan: 'resto' },
  { path: '/marketing',     icon: '📣', labelKey: 'nav.campaigns', groupKey: 'clients', minPlan: 'resto', requires: 'manageMarketing' },
  { path: '/blacklist',     icon: '🚫', labelKey: 'nav.blacklist', groupKey: 'clients', minPlan: 'resto', requires: 'viewCrm' },

  // ── CANAUX ──
  { path: '/widget',        icon: '🌐',  labelKey: 'nav.widget',       groupKey: 'channels' },
  { path: '/qrcode',        icon: '📱',  labelKey: 'nav.qrcode',       groupKey: 'channels', minPlan: 'resto' },
  { path: '/menu',          icon: '📋',  labelKey: 'nav.menu',         groupKey: 'channels', minPlan: 'resto' },
  { path: '/cadeaux',       icon: '🎁',  labelKey: 'nav.giftCards',    groupKey: 'channels', minPlan: 'resto' },
  { path: '/marketplace',   icon: '🛒',  labelKey: 'nav.marketplace',  groupKey: 'channels', minPlan: 'resto' },
  { path: '/prepaiement',   icon: '💳',  labelKey: 'nav.prepayment',   groupKey: 'channels', minPlan: 'gastro' },
  { path: '/site-vitrine',  icon: '🏪',  labelKey: 'nav.siteVitrine',  groupKey: 'channels', minPlan: 'gastro' },
  { path: '/modules',       icon: '🧩',  labelKey: 'nav.modules',      groupKey: 'channels' },

  // ── R3STO CRM (admin.r3sto.ch only) ──
  { path: '/crm',          icon: '📇', labelKey: 'nav.crm',        groupKey: 'r3sto-crm', adminOnly: true },
  { path: '/newsletter',   icon: '📧', labelKey: 'nav.newsletter', groupKey: 'r3sto-crm', adminOnly: true },

  // ── ADMIN ERP (admin.r3sto.ch only) ──
  { path: '/admin-dashboard',   icon: '🎛️', labelKey: 'nav.adminDashboard',   groupKey: 'admin-erp', adminOnly: true },
  { path: '/equipes',           icon: '👷', labelKey: 'nav.equipes',          groupKey: 'admin-erp', adminOnly: true },
  { path: '/finance',           icon: '💶', labelKey: 'nav.finance',          groupKey: 'admin-erp', adminOnly: true, requires: 'viewFinance' },
  { path: '/data-intelligence', icon: '🧠', labelKey: 'nav.dataIntelligence', groupKey: 'admin-erp', adminOnly: true },
  { path: '/pricing-strategy',  icon: '📈', labelKey: 'nav.pricingStrategy',  groupKey: 'admin-erp', adminOnly: true },
  { path: '/plateforme',        icon: '🛠️', labelKey: 'nav.plateforme',       groupKey: 'admin-erp', adminOnly: true },
  { path: '/audit',             icon: '🕵️', labelKey: 'nav.audit',            groupKey: 'admin-erp', adminOnly: true, requires: 'viewLogs' },
  { path: '/alertes',           icon: '⚠️', labelKey: 'nav.alertes',          groupKey: 'admin-erp', adminOnly: true },
  { path: '/admin-marketplace', icon: '🏪', labelKey: 'nav.adminMarketplace', groupKey: 'admin-erp', adminOnly: true },

  // ── RÉGLAGES ──
  { path: '/profil',        icon: '🏛️', labelKey: 'nav.myRestaurant', groupKey: 'settings' },
  { path: '/salles',        icon: '🚪', labelKey: 'nav.roomsServices', groupKey: 'settings' },
  { path: '/tables',        icon: '🪑', labelKey: 'nav.tablesCombos',  groupKey: 'settings' },
  { path: '/setup-plan',    icon: '🔧', labelKey: 'nav.tablesPlan',    groupKey: 'settings', minPlan: 'resto' },
  { path: '/fermetures',    icon: '🔒', labelKey: 'nav.closures',      groupKey: 'settings' },
  { path: '/options',       icon: '⚙️', labelKey: 'nav.options',       groupKey: 'settings' },
  { path: '/acces-roles',   icon: '🔐', labelKey: 'nav.teamAccess',    groupKey: 'settings', minPlan: 'resto', requires: 'manageUsers' },
  { path: '/multisite',     icon: '🏢', labelKey: 'nav.multisite',     groupKey: 'settings', minPlan: 'gastro', requires: 'manageSites' },

  // ── AIDE ──
  { path: '/historique',    icon: '📜', labelKey: 'nav.history',  groupKey: 'help' },
  { path: '/admin-tickets', icon: '🎫', labelKey: 'nav.tickets',  groupKey: 'help' },
  { path: '/support',       icon: '💬', labelKey: 'nav.support',  groupKey: 'help' },
]
