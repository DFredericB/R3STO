// ══════════════════════════════════════════════════
//  R3STO — ProtectedRoute
//  Garde client-side par rôle (défense en profondeur).
//  IMPORTANT : ce garde est UX — la vraie sécurité
//  doit être appliquée côté API (middleware role).
// ══════════════════════════════════════════════════

import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './useAuth'

type Role = 'superadmin' | 'admin' | 'manager' | 'staff' | 'viewer'

interface ProtectedRouteProps {
  children: ReactNode
  /** Rôles autorisés. Si omis, tout utilisateur authentifié passe. */
  roles?: Role[]
  /** Redirection si l'utilisateur n'a pas les droits (défaut: /dashboard). */
  redirectTo?: string
}

/**
 * Bloque l'accès aux utilisateurs non authentifiés ou dont le rôle
 * n'est pas dans la liste `roles`. À combiner OBLIGATOIREMENT avec
 * un middleware de rôle côté API — ce garde n'est que de l'UX.
 */
export function ProtectedRoute({ children, roles, redirectTo = '/dashboard' }: ProtectedRouteProps) {
  const { user } = useAuth()

  if (!user) {
    // Utilisateur non authentifié → renvoi vers login via le gate d'App.tsx
    return <Navigate to="/" replace />
  }

  if (roles && roles.length > 0) {
    const userRole = (user.role || '').toLowerCase() as Role
    if (!roles.includes(userRole)) {
      // Log côté client pour aider au diagnostic — le backend doit aussi refuser.
      console.warn(`[ProtectedRoute] Accès refusé : rôle "${userRole}" non autorisé (requis : ${roles.join(', ')})`)
      return <Navigate to={redirectTo} replace />
    }
  }

  return <>{children}</>
}
