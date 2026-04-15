// ══════════════════════════════════════════════════
//  R3STO — Host detection (centralisé)
//  Plus de `window.location.hostname.startsWith('admin.')`
//  éparpillé : utiliser isAdminHost() / isDemoHost() partout.
// ══════════════════════════════════════════════════

function getHost(): string {
  if (typeof window === 'undefined') return ''
  return window.location.hostname.toLowerCase()
}

/** Sous-domaine admin (admin.r3sto.ch) */
export function isAdminHost(): boolean {
  return getHost().startsWith('admin.')
}

/** Sous-domaine démo (demo.r3sto.ch) */
export function isDemoHost(): boolean {
  const h = getHost()
  return h.startsWith('demo.') || h === 'demo.r3sto.ch'
}

/** Sous-domaine auth (auth.r3sto.ch) */
export function isAuthHost(): boolean {
  return getHost().startsWith('auth.')
}

/** Sous-domaine pro B2B (pro.r3sto.ch) */
export function isProHost(): boolean {
  return getHost().startsWith('pro.')
}

/** Host de l'app SaaS principale (app.r3sto.ch) */
export function isAppHost(): boolean {
  return getHost().startsWith('app.')
}
