// ══════════════════════════════════════════════════
//  R3STO — TableStateBadge
//  Badge uniforme pour représenter l'état d'une table
//  (libre / réservée / occupée / bloquée / hold / combo).
//  À utiliser dans Grille, Plan 2D, Journal, Agenda, Resas.
//  UNE SEULE source de vérité : TABLE_STATE dans design.ts.
// ══════════════════════════════════════════════════

import { TABLE_STATE, type TableStateKey, RADIUS } from '../../utils/design'
import { useT } from '../../i18n/useTranslation'

interface TableStateBadgeProps {
  state: TableStateKey
  /** Affiche aussi le libellé à côté de l'icône */
  showLabel?: boolean
  /** Badge compact (petite taille) */
  compact?: boolean
  /** Texte alternatif personnalisé (ex: nom de table) */
  label?: string
  style?: React.CSSProperties
}

export function TableStateBadge({
  state,
  showLabel = false,
  compact = true,
  label,
  style,
}: TableStateBadgeProps) {
  const { t } = useT()
  const m = TABLE_STATE[state]
  if (!m) return null

  const resolved = label ?? (showLabel ? (t(m.label) || m.labelFr) : undefined)

  return (
    <span
      title={t(m.label) || m.labelFr}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        padding: compact ? '1px 5px' : '2px 8px',
        borderRadius: RADIUS.xs,
        fontSize: compact ? 9 : 11,
        fontWeight: 700,
        lineHeight: compact ? '16px' : '18px',
        whiteSpace: 'nowrap',
        fontFamily: 'var(--ff)',
        background: m.bg,
        color: m.color,
        border: `1px solid ${m.border}`,
        ...style,
      }}
    >
      <span>{m.icon}</span>
      {resolved && <span>{resolved}</span>}
    </span>
  )
}

/** Chip pleine taille (fond plein) — pour cellules de table Grille/Plan */
export function TableStateCell({
  state,
  label,
  style,
}: {
  state: TableStateKey
  label?: string
  style?: React.CSSProperties
}) {
  const m = TABLE_STATE[state]
  if (!m) return null
  const isDominant = state === 'reserved' || state === 'arrived' || state === 'combo'
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: m.fill,
        color: isDominant ? '#fff' : m.color,
        border: `1px solid ${m.border}`,
        borderRadius: RADIUS.sm,
        fontSize: 11,
        fontWeight: 700,
        fontFamily: 'var(--ff)',
        padding: '4px 8px',
        ...style,
      }}
    >
      {label ?? m.icon}
    </div>
  )
}

export default TableStateBadge
