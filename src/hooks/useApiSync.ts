// ══════════════════════════════════════════════════
//  R3STO — useApiSync hook
//  Pull state from API on mount, then start auto-push
// ══════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { startAutoSync } from '../api/apiPush'

type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline'

function getApiBase(): string {
  return (import.meta as any).env?.VITE_API_BASE || 'https://api.r3sto.com'
}

function getToken(): string | null {
  try { return localStorage.getItem('r3sto-token') } catch { return null }
}

export function useApiSync() {
  const [status, setStatus] = useState<SyncStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = getToken()
    if (!token || token === 'demo-token') {
      setStatus('offline')
      return
    }

    const isDemo = window.location.hostname.startsWith('demo.')
    if (isDemo) {
      setStatus('offline')
      return
    }

    setStatus('syncing')

    fetch(`${getApiBase()}/sync/state`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data) => {
        if (!data.ok) {
          setStatus('offline')
          return
        }

        if (data.empty) {
          setStatus('synced')
          startAutoSync()
          return
        }

        // Map API data → Zustand store
        const store = useAppStore.getState()
        const setState = useAppStore.setState

        // Store restaurantId
        setState({ restaurantId: data.restaurantId })

        // Restaurant info
        if (data.restaurant) {
          const r = data.restaurant
          store.updateResto({
            name: r.name || '',
            tel: r.tel || '',
            email: r.email || '',
            web: r.web || '',
            ville: r.ville || '',
            pays: r.pays || 'CH',
            plan: r.plan || 'bistro',
            maxCvt: r.maxCvt || 60,
          })
        }

        // Settings (bulk)
        const settingsKeys = [
          'tables', 'combos', 'services', 'salles', 'options',
          'users', 'fermetures', 'roomItems', 'clients', 'giftCards',
          'reviews', 'loyaltyConfig', 'loyaltyCards', 'sites',
        ] as const
        const patch: Record<string, unknown> = {}
        for (const key of settingsKeys) {
          if (data[key] !== undefined) {
            patch[key] = data[key]
          }
        }
        if (Object.keys(patch).length > 0) {
          setState(patch as any)
        }

        // Reservations
        if (data.resas && Array.isArray(data.resas)) {
          setState({ resas: data.resas })
        }

        setStatus('synced')
        startAutoSync()
      })
      .catch((err) => {
        console.warn('[sync] pull failed:', err)
        setError(err.message)
        setStatus('offline')
      })
  }, [])

  return { status, error }
}
