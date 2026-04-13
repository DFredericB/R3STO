// ══════════════════════════════════════════════════
//  R3STO — StatusActions
//  Boutons d'action rapide pour changer le statut
//  d'une résa. Un clic = un changement. Uniforme.
// ══════════════════════════════════════════════════

import { RADIUS } from '../../utils/design'
import { useT } from '../../i18n/useTranslation'
import type { ResaStatus } from '../../types'

interface StatusActionsProps {
  status: ResaStatus
  onChangeStatus: (newStatus: ResaStatus) => void
  /** Compact = petits boutons icône seul */
  compact?: boolean
  style?: React.CSSProperties
}

interface ActionDef {
  target: ResaStatus
  icon: string
  labelKey: string
  color: string
  bg: string
  border: string
}

/** Transitions possibles selon le statut actuel */
function getActions(current: ResaStatus): ActionDef[] {
  switch (current) {
    case 'reserved':
      return [
        { target: 'arrived',   icon: '✅', labelKey: 'action.arrive',  color: 'var(--gn)', bg: 'rgba(60,200,112,.1)',  border: 'rgba(60,200,112,.35)' },
        { target: 'noshow',    icon: '❌', labelKey: 'action.noshow',  color: 'var(--rd)', bg: 'rgba(220,80,80,.1)',   border: 'rgba(220,80,80,.3)' },
        { target: 'cancelled', icon: '🚫', labelKey: 'action.cancel',  color: 'var(--t3)', bg: 'var(--surf3)',         border: 'var(--border)' },
      ]
    case 'arrived':
      return [
        { target: 'done',   icon: '🏁', labelKey: 'action.done',   color: 'var(--bl)', bg: 'rgba(68,128,216,.1)',  border: 'rgba(68,128,216,.3)' },
        { target: 'noshow', icon: '❌', labelKey: 'action.noshow', color: 'var(--rd)', bg: 'rgba(220,80,80,.1)',   border: 'rgba(220,80,80,.3)' },
      ]
    case 'noshow':
    case 'cancelled':
      return [
        { target: 'reserved', icon: '↩️', labelKey: 'action.restore', color: 'var(--bl)', bg: 'rgba(91,156,246,.1)', border: 'rgba(91,156,246,.35)' },
      ]
    case 'waitlist':
      return [
        { target: 'reserved', icon: '📋', labelKey: 'action.confirm', color: 'var(--bl)', bg: 'rgba(91,156,246,.1)', border: 'rgba(91,156,246,.35)' },
        { target: 'cancelled', icon: '🚫', labelKey: 'action.cancel', color: 'var(--t3)', bg: 'var(--surf3)',        border: 'var(--border)' },
      ]
    case 'done':
      return [
        { target: 'reserved', icon: '↩️', labelKey: 'action.restore', color: 'var(--bl)', bg: 'rgba(91,156,246,.1)', border: 'rgba(91,156,246,.35)' },
      ]
    default:
      return []
  }
}

const btnBase: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 3,
  borderRadius: RADIUS.sm, cursor: 'pointer',
  fontFamily: 'var(--ff)', fontWeight: 700,
  transition: 'all .12s', flexShrink: 0,
}

export function StatusActions({ status, onChangeStatus, compact = true, style }: StatusActionsProps) {
  const { t } = useT()
  const actions = getActions(status)
  if (!actions.length) return null

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, ...style }}>
      {actions.map(a => (
        <button
          key={a.target}
          onClick={(e) => { e.stopPropagation(); onChangeStatus(a.target) }}
          title={t(a.labelKey) || a.labelKey}
          style={{
            ...btnBase,
            width: compact ? 26 : 'auto',
            height: compact ? 26 : 28,
            padding: compact ? 0 : '4px 10px',
            background: a.bg,
            border: `1px solid ${a.border}`,
            color: a.color,
            fontSize: compact ? 13 : 11,
          }}
        >
          <span>{a.icon}</span>
          {!compact && <span>{t(a.labelKey)}</span>}
        </button>
      ))}
    </span>
  )
}

export default StatusActions
