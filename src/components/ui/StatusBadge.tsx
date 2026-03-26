// ══════════════════════════════════════════════════
//  R3STO — StatusBadge
//  Composant unifié pour afficher le statut d'une résa
//  Utilisé dans : Resas, Grille, Dashboard, Modales
// ══════════════════════════════════════════════════

import { STATUS } from '../../utils/design'
import { useT } from '../../i18n/useTranslation'
import type { ResaStatus } from '../../types'

interface StatusBadgeProps {
  status: ResaStatus
  /** Compact = pill inline, full = avec icône */
  variant?: 'pill' | 'full' | 'dot'
  style?: React.CSSProperties
}

export function StatusBadge({ status, variant = 'pill', style }: StatusBadgeProps) {
  const { t } = useT()
  const meta = STATUS[status]
  if (!meta) return null

  if (variant === 'dot') {
    return (
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        background: meta.color,
        display: 'inline-block', flexShrink: 0,
        ...style,
      }} />
    )
  }

  if (variant === 'full') {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '3px 8px', borderRadius: 6,
        background: meta.bg,
        border: `1px solid ${meta.border}`,
        color: meta.color,
        fontSize: 11, fontWeight: 700,
        fontFamily: 'var(--ff)',
        whiteSpace: 'nowrap',
        ...style,
      }}>
        {meta.icon} {t(meta.label)}
      </span>
    )
  }

  // pill (default)
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px', borderRadius: 20,
      background: meta.bg,
      border: `1px solid ${meta.border}`,
      color: meta.color,
      fontSize: 10, fontWeight: 700,
      fontFamily: 'var(--ff)',
      whiteSpace: 'nowrap',
      ...style,
    }}>
      {t(meta.label)}
    </span>
  )
}

export default StatusBadge
