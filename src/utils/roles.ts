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
  rh:         { icon: '