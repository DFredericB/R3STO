// ══════════════════════════════════════════════════
//  R3STO — Alertes
//  Centre de notifications et alertes opérationnelles
// ══════════════════════════════════════════════════

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useTranslation'
import { ViewToolbar } from '../../components/ui/ViewToolbar'
import { RADIUS } from '../../utils/design'

// R3STO concept : auto-assign systématique → 'unassigned' retiré (cf. feedback_no_unassigned_resa)
type AlertType = 'waitlist' | 'noshow' | 'arriving' | 'group' | 'overbooking'

interface Alert {
  id: string
  type: AlertType
  icon: string
  title: string
  sub: string
  severity: 'critical' | 'warning' | 'info'
  action?: () => void
  actionLabel?: string
}

export function Alertes() {
  const { t } = useT()
  const nav = useNavigate()
  const { resas, activeDate, tables, services } = useAppStore()
  const [filter, setFilter] = useState<'all' | AlertType>('all')

  const alerts = useMemo(() => {
    const dayResas = resas.filter(r => r.date === activeDate)
    const out: Alert[] = []

    // Waitlist
    dayResas.filter(r => r.s === 'waitlist').forEach(r => {
      out.push({
        id: `wl-${r.id}`, type: 'waitlist', icon: '⏳',
        title: `${r.n} — ${r.c} cvt`,
        sub: `${t('alerts.waitlistSub')} · ${r.t}`,
        severity: 'warning',
        action: () => nav('/waitlist'),
        actionLabel: t('alerts.goWaitlist'),
      })
    })

    // R3STO concept : pas de "Unassigned tables" — auto-assign systématique. Bloc supprimé.

    // No-shows
    dayResas.filter(r => r.s === 'noshow').forEach(r => {
      out.push({
        id: `ns-${r.id}`, type: 'noshow', icon: '🚫',
        title: `${r.n} — ${r.c} cvt · ${r.tbl || '—'}`,
        sub: `No-show · ${r.t}`,
        severity: 'critical',
      })
    })

    // Arriving in 30 min
    const now = new Date()
    const nowMins = now.getHours() * 60 + now.getMinutes()
    dayResas.filter(r => {
      if (r.s !== 'reserved') return false
      const parts = r.t.split(/[h:]/)
      const m = parseInt(parts[0]) * 60 + parseInt(parts[1] || '0')
      return m >= nowMins && m <= nowMins + 30
    }).forEach(r => {
      out.push({
        id: `ar-${r.id}`, type: 'arriving', icon: '🔜',
        title: `${r.n} — ${r.c} cvt · ${r.tbl || '—'}`,
        sub: `${t('alerts.arrivingSoon')} · ${r.t}`,
        severity: 'info',
        action: () => nav('/plan'),
        actionLabel: t('alerts.viewPlan'),
      })
    })

    // Large groups (≥6 cvt)
    dayResas.filter(r => r.c >= 6 && (r.s === 'reserved' || r.s === 'waitlist')).forEach(r => {
      out.push({
        id: `gr-${r.id}`, type: 'group', icon: '👥',
        title: `${r.n} — ${r.c} cvt · ${r.tbl || '—'}`,
        sub: `${t('alerts.largeGroup')} · ${r.t}`,
        severity: 'warning',
        action: () => nav('/groupes'),
        actionLabel: t('alerts.viewGroups'),
      })
    })

    // Overbooking check (simple: total cvt > maxCouverts per service)
    // B8: Utiliser r.svc === svc.id au lieu de r.svc === svc.name.toLowerCase()
    // B12: Utiliser service.maxCouverts au lieu de resto.maxCvt
    services.filter(s => s.active).forEach(svc => {
      const svcLimit = svc.maxCouverts || useAppStore.getState().resto.maxCvt || 120
      const svcResas = dayResas.filter(r => r.svc === svc.id && r.s !== 'cancelled' && r.s !== 'noshow' && r.s !== 'done')
      const totalCvt = svcResas.reduce((s, r) => s + r.c, 0)
      if (totalCvt > svcLimit * 0.9) {
        out.push({
          id: `ob-${svc.id}`, type: 'overbooking', icon: '⚠️',
          title: `${svc.icon} ${svc.name} — ${totalCvt}/${svcLimit} cvt`,
          sub: totalCvt >= svcLimit ? t('alerts.overbookedFull') : t('alerts.nearCapacity'),
          severity: totalCvt >= svcLimit ? 'critical' : 'warning',
        })
      }
    })

    return out
  }, [resas, activeDate, tables, services, t, nav])

  const filtered = filter === 'all' ? alerts : alerts.filter(a => a.type === filter)
  const criticals = alerts.filter(a => a.severity === 'critical').length
  const warnings = alerts.filter(a => a.severity === 'warning').length

  const sevColor: Record<string, string> = {
    critical: '#dc5050',
    warning: '#e8a530',
    info: 'var(--bl)',
  }

  const FILTERS: { id: 'all' | AlertType; label: string; icon: string }[] = [
    { id: 'all', label: t('alerts.all'), icon: '📋' },
    { id: 'waitlist', label: t('alerts.waitlistLabel'), icon: '⏳' },
    { id: 'noshow', label: 'No-show', icon: '🚫' },
    { id: 'arriving', label: t('alerts.arrivingLabel'), icon: '🔜' },
    { id: 'group', label: t('alerts.groupLabel'), icon: '👥' },
    { id: 'overbooking', label: t('alerts.overbookingLabel'), icon: '⚠️' },
  ]

  const chipS = (on: boolean): React.CSSProperties => ({
    height: 34, padding: '0 12px', borderRadius: 7,
    border: `2px solid ${on ? 'rgba(91,156,246,.6)' : 'var(--border)'}`,
    background: on ? 'rgba(91,156,246,.22)' : 'var(--surf3)',
    color: on ? '#7bb8ff' : 'var(--t2)',
    cursor: 'pointer', fontSize: 12, fontWeight: on ? 700 : 600,
    fontFamily: 'var(--ff)', whiteSpace: 'nowrap',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
    transition: 'all .12s',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <ViewToolbar
        title="Alertes"
        subtitle={alerts.length === 0
          ? t('alerts.noAlerts')
          : `${alerts.length} ${t('alerts.activeAlerts')}${criticals > 0 ? ` · ${criticals} ${t('alerts.critical')}` : ''}${warnings > 0 ? ` · ${warnings} ${t('alerts.warnings')}` : ''}`}
      >
        {/* Filters */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '0 16px 6px' }}>
          {FILTERS.map(f => {
            const cnt = f.id === 'all' ? alerts.length : alerts.filter(a => a.type === f.id).length
            return (
              <button key={f.id} onClick={() => setFilter(f.id)} style={chipS(filter === f.id)}>
                {f.icon} {f.label} {cnt > 0 && <span style={{ fontSize: 10, opacity: .7 }}>({cnt})</span>}
              </button>
            )
          })}
        </div>
      </ViewToolbar>

      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {/* Alert cards */}
        {filtered.length === 0 ? (
        <div style={{
          padding: '40px 20px', textAlign: 'center',
          background: 'var(--surf)', borderRadius: RADIUS.lg,
          border: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--t2)' }}>{t('alerts.allClear')}</div>
          <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 4 }}>{t('alerts.allClearSub')}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(a => (
            <div key={a.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
              background: 'var(--surf)', borderRadius: RADIUS.md,
              border: `1px solid ${sevColor[a.severity]}25`,
              borderLeft: `4px solid ${sevColor[a.severity]}`,
              transition: 'all .15s',
            }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{a.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{a.title}</div>
                <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>{a.sub}</div>
              </div>
              <span style={{
                fontSize: 9, padding: '2px 6px', borderRadius: 4,
                background: sevColor[a.severity] + '18',
                color: sevColor[a.severity],
                fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em',
                flexShrink: 0,
              }}>
                {a.severity}
              </span>
              {a.action && (
                <button onClick={a.action} style={{
                  padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                  background: 'var(--bp)', border: '1px solid var(--b2)',
                  color: 'var(--bl)', cursor: 'pointer', whiteSpace: 'nowrap',
                }}>
                  {a.actionLabel || t('general.view')}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  )
}
