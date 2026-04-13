// ══════════════════════════════════════════════════
//  R3STO — Auto-sync push (debounced full-state)
//  Subscribes to Zustand store → pushes every 2s
// ══════════════════════════════════════════════════

import { useAppStore } from '../store/useAppStore'

const DEBOUNCE_MS = 2000
const DATA_KEYS = [
  'resas','tables','combos','services','salles','resto','options',
  'users','fermetures','roomItems','clients','giftCards','reviews',
  'loyaltyConfig','loyaltyCards','sites',
] as const

let timer: ReturnType<typeof setTimeout> | null = null
let pushing = false
const prevSnapshot: Record<string, unknown> = {}

function getApiBase(): string {
  return (import.meta as any).env?.VITE_API_BASE || 'https://api.r3sto.ch/api'
}

function getToken(): string | null {
  try { return localStorage.getItem('r3sto-token') } catch { return null }
}

async function pushState(): Promise<void> {
  if (pushing) return
  pushing = true
  try {
    const state = useAppStore.getState() as any
    const restaurantId = state.restaurantId
    if (!restaurantId) return
    const token = getToken()
    if (!token) return

    const payload: Record<string, unknown> = { restaurantId }
    for (const key of DATA_KEYS) {
      payload[key] = state[key]
    }

    const res = await fetch(`${getApiBase()}/sync/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })
    if (!res.ok) console.warn('[sync] push failed:', res.status)
  } catch (err) {
    console.warn('[sync] push error:', err)
  } finally {
    pushing = false
  }
}

function schedulePush() {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => { timer = null; pushState() }, DEBOUNCE_MS)
}

let started = false

export function startAutoSync(): void {
  if (started) return
  started = true

  // Initialize snapshot
  const state = useAppStore.getState() as any
  for (const key of DATA_KEYS) {
    prevSnapshot[key] = state[key]
  }

  useAppStore.subscribe((state: any) => {
    if (state.isDemo) return
    let changed = false
    for (const key of DATA_KEYS) {
      if (state[key] !== prevSnapshot[key]) {
        changed = true
        prevSnapshot[key] = state[key]
      }
    }
    if (changed) schedulePush()
  })
}
