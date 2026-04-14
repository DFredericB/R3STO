// ══════════════════════════════════════════════════
//  R3STO — useAdminApi
//  Hooks pour brancher les vues Admin sur /admin/*
//  (financials, stats, activities) avec fallback demo
// ══════════════════════════════════════════════════

import { useEffect, useState } from 'react'

const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'https://api.r3sto.ch'
const TOKEN_KEY = 'r3sto-token'

async function apiGet<T = any>(path: string): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY)
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (!res.ok) throw new Error(`${path} ${res.status}`)
  return res.json()
}

const isDemoHost = typeof window !== 'undefined' && window.location.hostname.startsWith('demo.')

export interface AdminFinancials {
  mrr: number
  arr: number
  mrr_breakdown?: { bistro?: number; resto?: number; gastro?: number; total?: number } & Record<string, number>
  by_status?: Record<string, number>
  total_users?: number
  total_restaurants?: number
  signups_30d?: number
  plan_prices?: { bistro?: number; resto?: number; gastro?: number } & Record<string, number>
  currency?: string
}

export interface AdminStats {
  totalUsers: number
  totalRestos: number
  signups7d: number
  signups30d: number
  totalResas: number
}

type FetchState<T> = {
  data: T | null
  loading: boolean
  error: string | null
  source: 'api' | 'demo' | 'idle'
  refetch: () => void
}

export function useAdminFinancials(): FetchState<AdminFinancials> {
  const [data, setData] = useState<AdminFinancials | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<'api' | 'demo' | 'idle'>('idle')
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (isDemoHost) {
      setSource('demo')
      return
    }
    let cancelled = false
    setLoading(true)
    apiGet<AdminFinancials>('/admin/financials')
      .then(d => {
        if (cancelled) return
        setData(d)
        setSource('api')
        setError(null)
      })
      .catch(e => {
        if (cancelled) return
        setError(String(e.message || e))
        setSource('demo')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [tick])

  return { data, loading, error, source, refetch: () => setTick(t => t + 1) }
}

export function useAdminStats(): FetchState<AdminStats> {
  const [data, setData] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<'api' | 'demo' | 'idle'>('idle')
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (isDemoHost) {
      setSource('demo')
      return
    }
    let cancelled = false
    setLoading(true)
    apiGet<AdminStats>('/admin/stats')
      .then(d => {
        if (cancelled) return
        setData(d)
        setSource('api')
        setError(null)
      })
      .catch(e => {
        if (cancelled) return
        setError(String(e.message || e))
        setSource('demo')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [tick])

  return { data, loading, error, source, refetch: () => setTick(t => t + 1) }
}
