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
  // Restaurant
  proprietaire: ['editResa', 'deleteResa', 'manageUsers', 'manageRoles', 'viewFinance',
                 'editFinance', 'manageSites', 'manageMarketing', 'exportData',
                 'viewCrm', 'editCrm', 'viewLogs', 'managePlan'],
  gerant:       ['editResa', 'deleteResa', 'manageUsers', 'viewFinance', 'manageMarketing',
                 'exportData', 'viewCrm', 'editCrm', 'managePlan'],
  serveur:      ['editResa'],
  host:         ['editResa', 'deleteResa', 'viewCrm'],
  chef:         [],
  bar:          [],
  caissier:     ['viewFinance'],
  // Corporate
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

/** Check d'autorisation UI — à utiliser partout au lieu de `