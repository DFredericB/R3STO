// ══════════════════════════════════════════════════════════════════════════════
//  R3STO — useApiSync
//  Synchronise le Zustand store avec le backend API (api.r3sto.ch)
//
//  Stratégie :
//  1. Au mount : fetch /api/sync/state → hydrate le store
//  2. Les mutations individuelles passent par les endpoints REST
//  3. Fallback : si l'API est injoignable, on garde le localStorage
// ══════════════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../store/useAppStore'

const API_BASE = import.meta.env.VITE_API_BASE as string || 'https://api.r3sto.ch/api'
const API_MODE = import.meta.env.VITE_API_MODE as string || 'local'

// ── Token helpers ─────────────────────────────────────────────────────────
function getToken(): string {
  return localStorage.getItem('r3sto-token') || ''
}

// ── Fetch with auth ───────────────────────────────────────────────────────
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(options?.headers || {}),
      },
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }
    return res.json()
  } catch (err) {
    clearTimeout(timeoutId)
    throw err
  }
}

// ── Mapper backend → Zustand ──────────────────────────────────────────────
// Le backend renvoie les colonnes SQL brutes, on les mappe vers le format
// attendu par le store. La plupart sont identiques (1:1).
function mapSyncState(api: any) {
  return {
    // Restaurant config
    resto: api.restaurant ? {
      name: api.restaurant.name || '',
      ville: api.restaurant.ville || '',
      pays: api.restaurant.pays || 'CH',
      plan: api.restaurant.plan || 'bistro',
      maxCvt: api.restaurant.maxCvt || 30,
      tel: api.restaurant.tel || '',
      email: api.restaurant.email || '',
      web: api.restaurant.web || '',
      logo: api.restaurant.logo || '',
      slug: api.restaurant.slug || '',
    } : undefined,

    // Arrays — direct mapping (backend columns match frontend types)
    resas: api.resas || [],
    tables: (api.tables || []).map((t: any) => ({
      ...t,
      active: t.active === 1 || t.active === true,
      blocked: t.blocked === 1 || t.blocked === true,
      held: t.held === 1 || t.held === true,
    })),
    combos: api.combos || [],
    services: (api.services || []).map((s: any) => ({
      ...s,
      active: s.active === 1 || s.active === true,
      jours: typeof s.jours === 'string' ? JSON.parse(s.jours) : (s.jours || [1,2,3,4,5,6,0]),
    })),
    salles: (api.salles || []).map((s: any) => ({
      ...s,
      active: s.active === 1 || s.active === true,
      exterior: s.exterior === 1 || s.exterior === true,
      openByDefault: s.openByDefault === 1 || s.openByDefault === true,
    })),
    users: api.users || [],
    fermetures: (api.fermetures || []).map((f: any) => ({
      ...f,
      active: f.active === 1 || f.active === true,
    })),
    clients: api.clients || [],
    giftCards: api.giftCards || [],
    reviews: api.reviews || [],
    roomItems: api.roomItems || [],
    sites: api.sites || [],

    // Options — backend stores as flat row, frontend expects same shape
    options: api.options ? (() => {
      const o = { ...api.options }
      // Convert SQLite integers to booleans for boolean fields
      const boolFields = [
        'wifi', 'wifi_payant', 'parking', 'parking_valet', 'terrasse',
        'terrasse_couverte', 'terrasse_chauffee', 'climatisation',
        'borne_recharge', 'vue_panoramique', 'accessible', 'animaux',
        'animaux_terrasse_only', 'fumeur', 'salle_privee', 'vestiaire',
        'cave_vins', 'code_dress', 'notif_new_resa', 'notif_sound',
        'notif_commandes', 'notif_commandes_sound', 'notif_commandes_browser',
        'allow_past_booking', 'require_phone', 'allow_walkin',
        'groupes_prives', 'groupe_validation', 'privatisation',
        'auto_confirm', 'auto_noshow_flag', 'auto_cancel_noreply',
        'remind_confirmation', 'remind_48h', 'remind_24h', 'remind_2h',
        'remind_morning', 'remind_postvisit',
        'chaises_bebe_active', 'places_pmr_active', 'chaises_bebe_par_table',
        'widget_active', 'widget_table_choice', 'widget_client_recognition',
        'widget_pref_table', 'widget_auto_waitlist', 'widget_qr_payment',
        'widget_require_email_verify', 'widget_require_phone_verify',
        'widget_auto_create_client',
        'prepay_enabled', 'menu_on_widget', 'menu_du_jour', 'menu_allergenes',
        'menu_prix_visible', 'menu_photos',
        'campaigns_email', 'campaigns_sms', 'campaigns_birthday', 'campaigns_loyalty',
        'fermeture_show_on_widget',
      ]
      for (const key of boolFields) {
        if (key in o) o[key] = o[key] === 1 || o[key] === true
      }
      // Parse JSON arrays
      if (typeof o.langues === 'string') o.langues = JSON.parse(o.langues)
      // Remove internal DB fields
      delete o.id
      delete o.restaurantId
      delete o.createdAt
      delete o.updatedAt
      return o
    })() : undefined,

    // Loyalty
    loyaltyConfig: api.loyaltyConfig ? (() => {
      const lc = { ...api.loyaltyConfig }
      if (typeof lc.active === 'number') lc.active = lc.active === 1
      if (typeof lc.doublePointsDays === 'string') lc.doublePointsDays = JSON.parse(lc.doublePointsDays)
      delete lc.id
      delete lc.restaurantId
      return lc
    })() : undefined,
    loyaltyCards: (api.loyaltyCards || []).map((c: any) => ({
      ...c,
      history: typeof c.history === 'string' ? JSON.parse(c.history) : (c.history || []),
    })),
  }
}

// ── Le Hook ───────────────────────────────────────────────────────────────

export type SyncStatus = 'idle' | 'loading' | 'synced' | 'offline' | 'error'

export function useApiSync() {
  const [status, setStatus] = useState<SyncStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const attempted = useRef(false)

  useEffect(() => {
    // Ne sync qu'une seule fois au mount
    if (attempted.current) return
    attempted.current = true

    // Skip si mode local ou pas de token ou mode démo
    if (API_MODE === 'local') {
      setStatus('offline')
      return
    }

    const token = getToken()
    if (!token) {
      setStatus('offline')
      return
    }

    const store = useAppStore.getState()
    if (store.isDemo) {
      setStatus('offline')
      return
    }

    // Fetch l'état complet depuis l'API
    setStatus('loading')

    apiFetch<any>('/sync/state')
      .then((data) => {
        const mapped = mapSyncState(data)

        // Merge dans le store — on ne touche que les données métier
        const patch: Record<string, any> = {}
        for (const [key, val] of Object.entries(mapped)) {
          if (val !== undefined) {
            patch[key] = val
          }
        }

        useAppStore.setState(patch)
        setStatus('synced')
        console.log('[R3STO] ✓ Sync API réussie —', Object.keys(patch).length, 'slices chargées')
      })
      .catch((err) => {
        console.warn('[R3STO] Sync API échouée, fallback localStorage —', err.message)
        setError(err.message)
        setStatus('offline')
      })
  }, [])

  return { status, error }
}

// Note: apiPush a été extrait dans src/api/apiPush.ts pour éviter la dépendance circulaire
