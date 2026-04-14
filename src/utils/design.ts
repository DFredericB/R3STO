// ══════════════════════════════════════════════════
//  R3STO — Design System
//  Constantes partagées : couleurs, statuts, canaux,
//  tailles, espacement, icônes, helpers
//  UN SEUL fichier de vérité pour toute l'app
// ══════════════════════════════════════════════════

import type { ResaStatus, ResaCanal } from '../types'

// ── Statuts de réservation ──────────────────────
export interface StatusMeta {
  label: string          // clé i18n : status.reserved, etc.
  icon: string
  color: string          // couleur CSS variable name
  hex: string            // fallback hex
  bg: string             // fond léger (rgba)
  border: string         // bordure plus marquée (rgba)
}

export const STATUS: Record<ResaStatus, StatusMeta> = {
  reserved: {
    label: 'status.reserved',
    icon: '📋',
    color: 'var(--bl)',
    hex: '#4480d8',
    bg: 'var(--bp)',
    border: 'var(--b2)',
  },
  arrived: {
    label: 'status.arrived',
    icon: '✅',
    color: 'var(--gn)',
    hex: '#3cc870',
    bg: 'var(--gp)',
    border: 'var(--gb)',
  },
  done: {
    label: 'status.done',
    icon: '🏁',
    color: 'var(--t3)',
    hex: '#6b82a0',
    bg: 'var(--surf3)',
    border: 'var(--border)',
  },
  noshow: {
    label: 'status.noshow',
    icon: '❌',
    color: 'var(--rd)',
    hex: '#dc5050',
    bg: 'var(--rp)',
    border: 'var(--rb)',
  },
  cancelled: {
    label: 'status.cancelled',
    icon: '🚫',
    color: 'var(--t4)',
    hex: '#3d526e',
    bg: 'var(--surf3)',
    border: 'var(--border)',
  },
  waitlist: {
    label: 'status.waitlist',
    icon: '⏳',
    color: 'var(--am)',
    hex: '#e8a530',
    bg: 'var(--ap)',
    border: 'var(--ab)',
  },
}

// ── Canaux de réservation ───────────────────────
export interface CanalMeta {
  label: string          // clé i18n
  icon: string
  color: string
  hex: string
}

export const CANAUX: Record<ResaCanal, CanalMeta> = {
  telephone: { label: 'modal.tel',      icon: '📞', color: 'var(--bl)', hex: '#4480d8' },
  walkin:    { label: 'modal.walkin',    icon: '🚶', color: 'var(--gn)', hex: '#3cc870' },
  widget:    { label: 'modal.canalWeb',  icon: '🌐', color: 'var(--pu)', hex: '#9060e0' },
  google:    { label: 'canal.google',    icon: '🔍', color: 'var(--am)', hex: '#e8a530' },
  email:     { label: 'modal.email',     icon: '✉️', color: 'var(--am)', hex: '#e8a530' },
  whatsapp:  { label: 'canal.whatsapp', icon: '💬', color: '#25d366',    hex: '#25d366' },
  sms:       { label: 'canal.sms',      icon: '📱', color: 'var(--t2)',  hex: '#64748b' },
  waitlist:  { label: 'canal.waitlist', icon: '⏳', color: '#f59e0b',    hex: '#f59e0b' },
}

// ── États de table (Grille, Plan 2D, Journal, Agenda) ─
//    UN SEUL endroit qui décrit comment une table est
//    rendue visuellement dans TOUTES les vues. Toute
//    nouvelle vue utilisant des tables DOIT s'y référer.
export type TableStateKey =
  | 'free'       // libre
  | 'reserved'   // réservée (pas encore arrivée)
  | 'arrived'    // arrivée / occupée
  | 'done'       // terminée (libérée)
  | 'blocked'    // bloquée manuellement
  | 'hold'       // bloquée temporaire / hold
  | 'combo'      // rattachée à un combo assemblé

export interface TableStateMeta {
  /** Clé i18n (fallback au label si non traduite) */
  label: string
  labelFr: string     // label FR dur pour fallback immédiat
  icon: string
  /** Couleur texte / accent */
  color: string
  hex: string
  /** Fond plein (état dominant) */
  fill: string
  /** Fond léger (overlays, listes) */
  bg: string
  /** Bordure */
  border: string
}

export const TABLE_STATE: Record<TableStateKey, TableStateMeta> = {
  free: {
    label: 'table.free', labelFr: 'Libre', icon: '⬜',
    color: 'var(--t3)', hex: '#6b82a0',
    fill: 'rgba(68,128,216,.06)',
    bg: 'rgba(68,128,216,.04)',
    border: 'rgba(68,128,216,.25)',
  },
  reserved: {
    label: 'table.reserved', labelFr: 'Réservée', icon: '📋',
    color: 'var(--bl)', hex: '#4480d8',
    fill: 'rgba(91,156,246,.50)',
    bg: 'rgba(91,156,246,.12)',
    border: 'rgba(91,156,246,.60)',
  },
  arrived: {
    label: 'table.arrived', labelFr: 'Occupée', icon: '✅',
    color: 'var(--gn)', hex: '#3cc870',
    fill: 'rgba(60,200,112,.45)',
    bg: 'rgba(60,200,112,.12)',
    border: 'rgba(60,200,112,.55)',
  },
  done: {
    label: 'table.done', labelFr: 'Libérée', icon: '🏁',
    color: 'var(--t3)', hex: '#6b82a0',
    fill: 'var(--surf3)',
    bg: 'var(--surf3)',
    border: 'var(--border)',
  },
  blocked: {
    label: 'table.blocked', labelFr: 'Bloquée', icon: '🚫',
    color: 'var(--rd)', hex: '#dc5050',
    fill: 'rgba(100,116,139,.15)',
    bg: 'rgba(220,80,80,.10)',
    border: 'rgba(220,80,80,.35)',
  },
  hold: {
    label: 'table.hold', labelFr: 'En attente', icon: '⏳',
    color: 'var(--am)', hex: '#e8a530',
    fill: 'rgba(232,165,48,.22)',
    bg: 'rgba(232,165,48,.10)',
    border: 'rgba(232,165,48,.45)',
  },
  combo: {
    label: 'table.combo', labelFr: 'Combo', icon: '🔗',
    color: 'var(--pu)', hex: '#9060e0',
    fill: 'rgba(144,96,224,.30)',
    bg: 'rgba(144,96,224,.10)',
    border: 'rgba(144,96,224,.55)',
  },
}

/**
 * Dérive l'état visuel d'une table depuis son état fonctionnel.
 * Utilitaire unique à appeler dans Grille / Plan / Journal / Agenda.
 */
export function tableStateFromResa(opts: {
  blocked?: boolean
  hold?: boolean
  combo?: boolean
  resaStatus?: ResaStatus | null
}): TableStateKey {
  if (opts.blocked) return 'blocked'
  if (opts.hold) return 'hold'
  if (opts.combo) return 'combo'
  if (!opts.resaStatus) return 'free'
  if (opts.resaStatus === 'arrived') return 'arrived'
  if (opts.resaStatus === 'done') return 'done'
  if (opts.resaStatus === 'reserved') return 'reserved'
  return 'free'
}

// ── Statuts client ──────────────────────────────
export interface ClientStatutMeta {
  label: string        // clé i18n
  icon: string
  color: string
  bg: string
  border: string
}

export const CLIENT_STATUTS: ClientStatutMeta[] = [
  { label: 'modal.standard', icon: '⬜', color: 'var(--t3)',  bg: 'var(--surf3)',              border: 'var(--border)' },
  { label: 'modal.regular',  icon: '🔵', color: 'var(--bl)',  bg: 'rgba(68,128,216,.12)',      border: 'rgba(68,128,216,.3)' },
  { label: 'modal.vip',      icon: '⭐', color: 'var(--am)',  bg: 'rgba(232,165,48,.12)',      border: 'rgba(232,165,48,.4)' },
  { label: 'modal.watched',  icon: '🔴', color: 'var(--rd)',  bg: 'rgba(220,80,80,.12)',       border: 'rgba(220,80,80,.4)' },
]

// ── Tailles standardisées ───────────────────────
export const SIZE = {
  /** Touch target minimum iPad (Apple HIG) */
  touch: 36,
  /** Bouton compact */
  btnSm: 28,
  /** Bouton standard */
  btnMd: 32,
  /** Bouton large */
  btnLg: 36,
  /** Input standard */
  inputH: 36,
  /** Input modale */
  inputHLg: 44,
  /** Header height */
  header: 56,
  /** Sidebar width */
  sidebar: 230,
  /** Sidebar collapsed */
  sidebarC: 56,
} as const

// ── Espacement (4px base) ───────────────────────
export const GAP = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
} as const

// ── Border radius ───────────────────────────────
export const RADIUS = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 10,
  xl: 14,
  pill: 20,
  round: '50%',
} as const

// ── Saturation helpers ──────────────────────────
/** Couleur de saturation : vert / orange / rouge */
export function saturationColor(ratio: number): string {
  if (ratio >= 0.9) return '#ef4444'
  if (ratio >= 0.7) return '#f59e0b'
  if (ratio >= 0.4) return '#22c55e'
  return 'var(--t4)'
}

/** Background léger pour saturation */
export function saturationBg(ratio: number): string {
  if (ratio >= 0.9) return 'rgba(239,68,68,.08)'
  if (ratio >= 0.7) return 'rgba(245,158,11,.08)'
  if (ratio >= 0.4) return 'rgba(34,197,94,.08)'
  return 'transparent'
}

// ── Styles réutilisables ────────────────────────

/** Label compact au-dessus d'un champ */
export const labelStyle: React.CSSProperties = {
  fontSize: 9, fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '.08em',
  color: 'var(--t4)',
  display: 'block',
  marginBottom: 3,
}

/** Section title dans les vues */
export const sectionTitle: React.CSSProperties = {
  fontSize: 11, fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '.08em',
  color: 'var(--t3)',
  marginBottom: 4,
}

/** Filter chip / tab style — usage: style={filterChip(isActive)} */
export const filterChip = (on: boolean): React.CSSProperties => ({
  padding: '6px 14px',
  borderRadius: RADIUS.pill,
  border: `1.5px solid ${on ? 'var(--bl)' : 'var(--border)'}`,
  background: on ? 'var(--bp)' : 'var(--surf3)',
  color: on ? 'var(--bl)' : 'var(--t2)',
  fontWeight: 700,
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'var(--ff)',
  whiteSpace: 'nowrap' as const,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  transition: 'all .12s',
})

// ── Typographie ─────────────────────────────────
export const FONT = {
  /** Micro labels, hints */
  xs: 9,
  /** Small body, badges */
  sm: 11,
  /** Standard text */
  md: 12,
  /** View titles, inputs */
  lg: 13,
  /** Section headers */
  xl: 14,
  /** Headings */
  xxl: 16,
  /** Mono font family */
  mono: 'var(--fm)',
  /** Main font family */
  main: 'var(--ff)',
} as const

/** Input standard */
export const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  background: 'var(--surf3)',
  border: '1.5px solid var(--border)',
  borderRadius: RADIUS.sm,
  color: 'var(--text)',
  fontSize: 12,
  fontFamily: 'var(--ff)',
  outline: 'none',
  boxSizing: 'border-box',
}
