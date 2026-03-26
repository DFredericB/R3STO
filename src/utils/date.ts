// ══════════════════════════════════════════════════
//  R3STO — Utilitaires date/heure
//  Fonctions partagées — un seul endroit
// ══════════════════════════════════════════════════

/** Date du jour au format ISO YYYY-MM-DD */
export function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Convertir "12h30" ou "12:30" en minutes depuis minuit */
export function timeToMins(t: string): number {
  const [h, m] = t.replace('h', ':').split(':').map(Number)
  return h * 60 + (m || 0)
}

/** Convertir minutes depuis minuit en "12h30" */
export function minsToSlot(m: number): string {
  const h = Math.floor(m / 60)
  const mm = m % 60
  return `${h}h${String(mm).padStart(2, '0')}`
}

/** Décaler une date ISO de N jours */
export function shiftISO(iso: string, days: number): string {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Minutes depuis minuit maintenant */
export function nowMins(): number {
  return new Date().getHours() * 60 + new Date().getMinutes()
}
