import { useState, useCallback } from 'react'
import { useAppStore } from '../store/useAppStore'

const API = (import.meta as any).env?.VITE_API_BASE || 'https://api.r3sto.com'
const TOKEN_KEY = 'r3sto-token'
const USER_KEY  = 'r3sto-user'
const REMEMBER_EMAIL_KEY = 'r3sto-remember-email'

export interface AuthUser {
  id: number
  email: string
  name?: string
  role: string
  plan?: string
}

function readUser(): AuthUser | null {
  try {
    const s = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY)
    return s ? JSON.parse(s) : null
  } catch { return null }
}

export function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || ''
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(readUser)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const login = useCallback(async (email: string, password: string, remember: boolean) => {
    setLoading(true); setError(null)
    try {
      const r = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok || !data.ok) throw new Error(data.error || 'Identifiants invalides')

      const store = remember ? localStorage : sessionStorage
      localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY)
      sessionStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(USER_KEY)
      store.setItem(TOKEN_KEY, data.access_token)
      store.setItem(USER_KEY, JSON.stringify(data.user))
      useAppStore.getState().resetData()
      if (remember) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, email)
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY)
      }
      setUser(data.user)
      return true
    } catch (e: any) {
      setError(e?.message || 'Erreur de connexion')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const signup = useCallback(async (payload: {
    name: string
    email: string
    password: string
    phone?: string
    restaurantName?: string
    plan?: string
  }) => {
    setLoading(true); setError(null)
    try {
      const r = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok || !data.ok) throw new Error(data.error || "Inscription impossible")
      const token = data.access_token || data.token
      const newUser = data.user
      if (!token || !newUser) throw new Error('Réponse serveur invalide')
      localStorage.setItem(TOKEN_KEY, token)
      localStorage.setItem(USER_KEY, JSON.stringify(newUser))
      useAppStore.getState().resetData()
      setUser(newUser)
      return true
    } catch (e: any) {
      setError(e?.message || "Erreur d'inscription")
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY)
    sessionStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(USER_KEY)
    setUser(null)
  }, [])

  return { user, loading, error, login, signup, logout }
}

export function getRememberedEmail(): string {
  return localStorage.getItem(REMEMBER_EMAIL_KEY) || ''
}
