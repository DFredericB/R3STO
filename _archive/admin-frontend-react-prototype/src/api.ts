const API = import.meta.env.VITE_API_URL as string;
export const RESTAURANT_ID = Number(import.meta.env.VITE_RESTAURANT_ID || 1);

function token() { return localStorage.getItem("r3sto_token") || ""; }
export function setToken(t: string) { localStorage.setItem("r3sto_token", t); }
export function clearToken() { localStorage.removeItem("r3sto_token"); }
export function isAuthed() { return !!token(); }

async function req(path: string, opts: RequestInit = {}) {
  const r = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      ...(opts.headers || {}),
    },
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.statusText);
  return r.json();
}

export const api = {
  login: (email: string, password: string) =>
    req("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  stats: () => req(`/stats/global/?restaurant_id=${RESTAURANT_ID}`),
  reservations: () => req(`/reservations?restaurant_id=${RESTAURANT_ID}`),
  menus: () => req(`/menus?restaurant_id=${RESTAURANT_ID}`),
  items: () => req(`/items?restaurant_id=${RESTAURANT_ID}`),
  paiements: () => req(`/paiements?restaurant_id=${RESTAURANT_ID}`),
  tables: () => req(`/tables?restaurant_id=${RESTAURANT_ID}`),
};
