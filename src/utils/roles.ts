// ══════════════════════════════════════════════════
//  R3STO — Roles dictionary (centralisé, i18n-ready)
//  Seule source de vérité pour icône + clé i18n + couleur.
//  Les composants n'écrivent JAMAIS "Super Admin" en dur :
//  ils utilisent ROLES[role].labelKey + t(...).
// ══════════════════════════════════════════════════

import type { UserRole } from '../types'

export interface RoleMeta {
  icon: string
  color: string
  /** Clé i18n — résoudre avec useT(): t(ROLES[role].labelKey) */
  labelKey: string
}

export const ROLES: Record<UserRole, RoleMeta> = {
  // ── Restaurant (app.r3sto.ch) ──────────────
  proprietaire: { icon: '👑', color: 'var(--rd)', labelKey: 'role.proprietaire' },
  gerant:       { icon: '🎖️', color: 'var(--or)', labelKey: 'role.gerant' },
  manager:      { icon: '📊', color: 'var(--gn)', labelKey: 'role.manager' },
  serveur:      { icon: '🍽️', color: 'var(--bl)', labelKey: 'role.serveur' },
  host:         { icon: '🎩', color: 'var(--pu)', labelKey: 'role.host' },
  chef:         { icon: '👨‍🍳', color: 'var(--or)', labelKey: 'role.chef' },
  bar:          { icon: '🍸', color: 'var(--gn)', labelKey: 'role.bar' },
  caissier:     { icon: '💳', color: 'var(--gn)', labelKey: 'role.caissier' },
  stagiaire:    { icon: '📝', color: 'var(--t3)', labelKey: 'role.stagiaire' },
  // ── Corporate (admin.r3sto.ch) ─────────────
  superadmin: { icon: '🛡️', color: 'var(--rd)', labelKey: 'role.superadmin' },
  cto:        { icon: '💻', color: 'var(--pu)', labelKey: 'role.cto' },
  coo:        { icon: '⚙️', color: 'var(--or)', labelKey: 'role.coo' },
  dev:        { icon: '⌨️', color: 'var(--bl)', labelKey: 'role.dev' },
  sales:      { icon: '📈', color: 'var(--gn)', labelKey: 'role.sales' },
  marketing:  { icon: '📣', color: 'var(--or)', labelKey: 'role.marketing' },
  rh:         { icon: '👥', color: 'var(--bl)', labelKey: 'role.rh' },
  comptable:  { icon: '💰', color: 'var(--gn)', labelKey: 'role.comptable' },
  support:    { icon: '🎧', color: 'var(--bl)', labelKey: 'role.support' },
  onboarding: { icon: '🚀', color: 'var(--or)', labelKey: 'role.onboarding' },
  custom:     { icon: '⚡', color: 'var(--t2)', labelKey: 'role.custom' },
}

export const ALL_ROLES: UserRole[] = Object.keys(ROLES) as UserRole[]

/** Rôles visibles dans le switcher restaurant (app.r3sto.ch) */
export const RESTAURANT_ROLES: UserRole[] = [
  'proprietaire', 'gerant', 'manager', 'serveur', 'host', 'chef', 'bar', 'caissier', 'stagiaire'
]

/** Rôles visibles dans le switcher corporate (admin.r3sto.ch) */
export const CORP_ROLES: UserRole[] = [
  'superadmin', 'cto', 'coo', 'dev', 'sales', 'marketing', 'rh', 'comptable', 'support', 'onboarding', 'stagiaire'
]

/** Rôles visibles dans le menu déroulant TOPBAR (4 seulement — liste complète dans /acces-roles) */
export const TOPBAR_RESTAURANT_ROLES: UserRole[] = [
  'proprietaire', 'gerant', 'serveur', 'host'
]
export const TOPBAR_CORP_ROLES: UserRole[] = [
  'superadmin', 'coo', 'sales', 'support'
]

/** Rôles avec accès superadmin-level (bypass gates) */
export const SUPER_ROLES: UserRole[] = ['superadmin', 'proprietaire']

/** Helper : ce rôle peut-il accéder à l'admin console ? */
export function isAdminRole(role: UserRole): boolean {
  return ['superadmin', 'cto', 'coo', 'dev'].includes(role)
}
