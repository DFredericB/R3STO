// ══════════════════════════════════════════════════
//  R3STO — useAnalytics Hook
//  Auto-track page views on route changes
//  Provides trackAction() for component-level events
// ══════════════════════════════════════════════════

import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { analytics, ACTIONS } from '../utils/analytics'
import { useAppStore } from '../store/useAppStore'

/**
 * Hook principal : s'initialise avec le contexte resto
 * et track automatiquement les changements de route.
 * Appeler UNE SEULE FOIS dans App.tsx.
 */
export function useAnalyticsInit() {
  const location = useLocation()
  const resto = useAppStore(s => s.resto)
  const lang = useAppStore(s => s.lang)
  const userRole = useAppStore(s => s.userRole)

  // Set context
  useEffect(() => {
    analytics.setContext(
      resto?.name || 'unknown',
      resto?.plan || 'unknown',
      lang || 'FR',
      userRole || 'superadmin'
    )
  }, [resto?.name, resto?.plan, lang, userRole])

  // Track page views on route change
  useEffect(() => {
    analytics.trackPageView(location.pathname)
  }, [location.pathname])

  // Cleanup on unmount
  useEffect(() => {
    return () => analytics.destroy()
  }, [])
}

/**
 * Hook léger : trackAction() pour les composants.
 * Usage : const { track } = useTrack()
 *         track(ACTIONS.RESA_CREATE, { covers: 4 })
 */
export function useTrack() {
  return {
    track: (type: string, meta?: Record<string, string | number | boolean>) => {
      analytics.trackAction(type, meta)
    },
    ACTIONS,
  }
}
