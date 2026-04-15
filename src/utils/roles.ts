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
  superadmin: { icon: '🛡️', color: 'var(--rd)', labelKey: 'role.superadmin' },
  cto:        { icon: '💻', color: 'var(--pu)', labelKey: 'role.cto' },
  coo:        { icon: '⚙️', color: 'var(--or)', labelKey: 'role.coo' },
  manager:    { icon: '📊', color: 'var(--gn)', labelKey: 'role.manager' },
  dev:        { icon: '⌨️', color: 'var(--bl)', labelKey: 'role.dev' },
  sales:      { icon: '📈', color: 'var(--gn)', labelKey: 'role.sales' },
  marketing:  { icon: '📣', color: 'var(--or)', labelKey: 'role.marketing' },
  rh:         { icon: '👥', color: 'var(--bl)', labelKey: 'role.rh' },
  comptable:  { icon: '💰', color: 'var(--gn)', labelKey: 'role.comptable' },
  support:    { icon: '🎧', color: 'var(--bl)', labelKey: 'role.support' },
  onboarding: { icon: '🚀', color: 'var(--or)', labelKey: 'role.onboarding' },
  stagiaire:  { icon: '📝', color: 'var(--t3)', labelKey: 'role.stagiaire' },
  custom:     { icon: '⚡', color: 'var(--t2)', labelKey: 'role.custom' },
}

export const ALL_ROLES: UserRole[] = Object.keys(ROLES) as UserRole[]

/** Rôles avec accès superadmin-level (bypass gates) */
export const SUPER_ROLES: UserRole[] = ['superadmin']

/** Helper : ce rôle peut-il accéder à l'admin console ? */
export function isAdminRole(role: UserRole): boolean {
  return ['superadmin', 'cto', 'coo', 'dev'].includes(role)
}
