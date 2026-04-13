// ══════════════════════════════════════════════════════════════════════════════
//  R3STO — API Push (fire & forget)
//  Envoie les mutations vers le backend en parallèle du Zustand store
//  Si l'API est injoignable ou mode local, les appels sont ignorés silencieusement
// ══════════════════════════════════════════════════════════════════════════════

const API_BASE = import.meta.env.VITE_API_BASE as string || 'https://api.r3sto.ch/api'
const API_MODE = import.meta.env.VITE_API_MODE as string || 'local'

function getToken(): string {
  return localStorage.getItem('r3sto-token') || ''
}

async function apiFetch(path: string, options?: RequestInit): Promise<any> {
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
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  } catch (err) {
    clearTimeout(timeoutId)
    throw err
  }
}

function shouldPush(): boolean {
  return API_MODE !== 'local' && !!getToken()
}

export const apiPush = {
  // Réservations
  createResa: (resa: any) =>
    shouldPush() && apiFetch('/resas', { method: 'POST', body: JSON.stringify(resa) }).catch(console.warn),

  updateResa: (id: string, patch: any) =>
    shouldPush() && apiFetch(`/resas/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }).catch(console.warn),

  deleteResa: (id: string) =>
    shouldPush() && apiFetch(`/resas/${id}`, { method: 'DELETE' }).catch(console.warn),

  setResaStatus: (id: string, status: string) =>
    shouldPush() && apiFetch(`/resas/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) }).catch(console.warn),

  // Tables
  updateTables: (tables: any[]) =>
    shouldPush() && apiFetch('/tables/batch', { method: 'PUT', body: JSON.stringify({ tables }) }).catch(console.warn),

  // Clients
  createClient: (client: any) =>
    shouldPush() && apiFetch('/clients', { method: 'POST', body: JSON.stringify(client) }).catch(console.warn),

  updateClient: (id: string, patch: any) =>
    shouldPush() && apiFetch(`/clients/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }).catch(console.warn),

  deleteClient: (id: string) =>
    shouldPush() && apiFetch(`/clients/${id}`, { method: 'DELETE' }).catch(console.warn),

  // Config
  updateOptions: (patch: any) =>
    shouldPush() && apiFetch('/options', { method: 'PATCH', body: JSON.stringify(patch) }).catch(console.warn),

  updateResto: (patch: any) =>
    shouldPush() && apiFetch('/resto', { method: 'PATCH', body: JSON.stringify(patch) }).catch(console.warn),

  // Services & Salles
  updateServices: (services: any[]) =>
    shouldPush() && apiFetch('/services', { method: 'PUT', body: JSON.stringify(services) }).catch(console.warn),

  updateSalles: (salles: any[]) =>
    shouldPush() && apiFetch('/salles', { method: 'PUT', body: JSON.stringify(salles) }).catch(console.warn),
}
