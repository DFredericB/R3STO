// ══════════════════════════════════════════════════
//  R3STO — Permissions (rôle × action)
//  Centralise tous les checks d'autorisation UI.
//  Les vues appellent hasPermission('editResa'), jamais
//  `if (userRole === 'superadmin')` directement.
//  En démo : tout retourne true (miroir app complet).
// ══════════════════════════════════════════════════

import { useAppStore } from '../store/useAppStore'
import type { UserRole } from '../types'

export type Action =
  | 'editResa'
  | 'deleteResa'
  | 'manageUsers'
  | 'manageRoles'
  | 'viewFinance'
  | 'editFinance'
  | 'accessAdminConsole'
  | 'manageSites'
  | 'manageMarketing'
  | 'exportData'
  | 'resetDemo'
  | 'viewCrm'
  | 'editCrm'
  | 'viewLogs'
  | 'managePlan'

/** Matrice rôles × actions — source de vérité */
export const ROLE_PERMISSIONS: Record<UserRole, Action[]> = {
  superadmin: ['editResa', 'deleteResa', 'manageUsers', 'manageRoles', 'viewFinance',
               'editFinance', 'accessAdminConsole', 'manageSites', 'manageMarketing',
               'exportData', 'resetDemo', 'viewCrm', 'editCrm', 'viewLogs', 'managePlan'],
  cto:        ['accessAdminConsole', 'viewLogs', 'manageUsers', 'exportData', 'resetDemo'],
  coo:        ['editResa', 'deleteResa', 'manageUsers', 'viewFinance', 'manageSites',
               'manageMarketing', 'exportData', 'viewCrm', 'editCrm'],
  manager:    ['editResa', 'deleteResa', 'manageMarketing', 'viewCrm', 'editCrm', 'exportData'],
  dev:        ['accessAdminConsole', 'viewLogs'],
  sales:      ['viewCrm', 'editCrm'],
  marketing:  ['manageMarketing', 'viewCrm'],
  rh:         ['manageUsers'],
  comptable:  ['viewFinance', 'exportData'],
  support:    ['viewCrm', 'editResa'],
  onboarding: ['viewCrm', 'editCrm'],
  stagiaire:  [],
  custom:     [], // résolu dynamiquement via User.customPermissions
}

/** Check d'autorisation UI — à utiliser partout au lieu de `role === 'xxx'` */
export function hasPermission(action: Action): boolean {
  const { isDemo, userRole } = useAppStore.getState()
  if (isDemo) return true // démo = miroir app, tout autorisé
  return ROLE_PERMISSIONS[userRole]?.includes(action) ?? false
}

/** Réactif dans un composant : force un re-render quand role ou isDemo change */
export function usePermission(action: Action): boolean {
  const userRole = useAppStore(s => s.userRole)
  const isDemo = useAppStore(s => s.isDemo)
  if (isDemo) return true
  return ROLE_PERMISSIONS[userRole]?.includes(action) ?? false
}
