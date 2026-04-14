// ══════════════════════════════════════════════════
//  R3STO — Vue Agenda
//  Timeline chronologique par créneau 30min
//  Groupé par service, indicateur "maintenant"
// ══════════════════════════════════════════════════

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useTranslation'
import { ViewToolbar } from '../../components/ui/ViewToolbar'
import { ResaBadges } from '../../components/resa/ResaBadges'
import { StatusActions } from '../../components/resa/StatusActions'
import { STATUS } from '../../utils/design'
import { timeToMins, nowMins, todayISO } from '../../utils/date'
import { OrphanBanner } from '../../components/ui/OrphanBanner'

export function Agenda() {
  const { resas, services, activeDate, tables, setResaStatus } = useAppStore()
  const navigate = useNavigate()
  const { t: _t, fmtDate: _fmtDate } = useT()
  const todayDate = todayISO()
  const isToday = activeDate === todayDate
  const [svcFilter, setSvcFilter] = useState<string>('tous')
  const [salleFilter, setSalleFilter] = useState<string>('toutes')

  const activeServices = useMemo(() => services.filter(s => s.active), [services])

  const dayResas = useMemo(() =>
    resas.filter(r => r.date === activeDate && r.s !== 'cancelled')
      .filter(r => svcFilter === 'tous' || r.svc === svcFilter)
      .filter(r => salleFilter === 'toutes' || tables.find(tb => tb.n === r.tbl)?.salle === salleFilter),
    [resas, activeDate, svcFilter, salleFilter, tables]
  )

  const totalCvt = dayResas.reduce((s, r) => s + r.c, 0)
  const now = nowMins()

  // Slots par service
  const svcSlots = useMemo(() => activeServices.map(s => ({
    label: s.name,
    icon: s.icon || '',
    open: timeToMins(s.open),
    close: timeToMins(s.close),
    color: s.color || 'var(--bl)',
  })), [activeServices])

  const allSlots = useMemo(() => {
    const slots: number[] = []
    svcSlots.forEach(svc => {
      for (let m = svc.open; m < svc.close; m += 30) {
        if (!slots.includes(m)) slots.push(m)
      }
    })
    return slots.sort((a, b) => a - b)
  }, [svcSlots])

  const resaBySlot = useMemo(() => {
    const map: Record<number, typeof dayResas> = {}
    dayResas.forEach(r => {
      const parts = r.t.split(/[h:]/)
      const m = parseInt(parts[0]) * 60 + parseInt(parts[1] || '0')
      const slotKey = Math.floor(m / 30) * 30
      if (!map[slotKey]) map[slotKey] = []
      map[slotKey].push(r)
    })
    return map
  }, [dayResas])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--hh))', overflow: 'hidden' }}>
      <ViewToolbar
        title="Agenda"
        subtitle={`${dayResas.length} résas · ${totalCvt}p`}
        serviceFilter={svcFilter}
        onServiceFilter={setSvcFilter}
        salleFilter={salleFilter}
        onSalleFilter={setSalleFilter}
        onNewResa={() => navigate('/nouvelle-resa')}
      />

      {/* Bannière orphelins */}
      <div style={{ padding: '8px 16px 0' }}><OrphanBanner onNavigate={(id) => navigate(`/reservations?edit=${id}`)} /></div>

      {/* Timeline */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {allSlots.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--t3)', fontSize: 14 }}>Aucun service configuré</div>
        ) : (
          <div>
            {allSlots.map(slotMin => {
              const hr = Math.floor(slotMin / 60)
              const mn = slotMin % 60
              const label = `${hr}h${String(mn).padStart(2, '0')}`
              const isNow = isToday && now >= slotMin && now < slotMin + 30
              const slotResas = resaBySlot[slotMin] || []
              const slotCvt = slotResas.reduce((s, r) => s + r.c, 0)
              const svc = svcSlots.find(s => slotMin >= s.open && slotMin < s.close)
              const isFirstSlot = svc && slotMin === svc.open

              return (
                <div key={slotMin}>
                  {isFirstSlot && svc && (
                    <div style={{
                      padding: '7px 14px', background: svc.color + '15',
                      borderBottom: '1px solid var(--border)',
                      fontSize: 12, fontWeight: 800, color: svc.color,
                      textTransform: 'uppercase', letterSpacing: .5,
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      <span>{svc.icon}</span> {svc.label}
                      <span style={{ fontSize: 11, fontWeight: 600, marginLeft: 'auto', opacity: .7 }}>
                        {dayResas.filter(r => {
                          const parts = r.t.split(/[h:]/)
                          const m = parseInt(parts[0]) * 60 + parseInt(parts[1] || '0')
                          return m >= svc.open && m < svc.close
                        }).length} résas · {dayResas.filter(r => {
                          const parts = r.t.split(/[h:]/)
                          const m = parseInt(parts[0]) * 60 + parseInt(parts[1] || '0')
                          return m >= svc.open && m < svc.close
                        }).reduce((s, r) => s + r.c, 0)}p
                      </span>
                    </div>
                  )}
                  <div style={{
                    display: 'flex', borderBottom: '1px solid var(--border)',
                    background: isNow ? 'var(--rp)' : 'transparent',
                    minHeight: slotResas.length > 0 ? 44 : 34,
                  }}>
                    {/* Colonne heure */}
                    <div style={{
                      width: 62, flexShrink: 0, padding: '6px 8px', textAlign: 'right',
                      fontSize: 13, fontWeight: 800, fontFamily: 'var(--fm)',
                      color: isNow ? 'var(--rd)' : 'var(--t3)',
                      borderRight: isNow ? '3px solid var(--rd)' : '3px solid var(--border)',
                    }}>
                      {label}
                      {slotCvt > 0 && <div style={{ fontSize: 10, color: 'var(--t4)', fontWeight: 600 }}>{slotCvt}p</div>}
                    </div>
                    {/* Résas du créneau */}
                    <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 5, padding: '5px 10px', alignItems: 'center' }}>
                      {slotResas.length === 0 && (
                        <span style={{ fontSize: 12, color: 'var(--t4)' }}>—</span>
                      )}
                      {slotResas.map(r => {
                        const st = STATUS[r.s as keyof typeof STATUS]
                        const isWaitlist = r.s === 'waitlist'
                        const tableObj = r.tbl ? tables.find(tb => tb.n === r.tbl) : null
                        return (
                          <div key={r.id}
                            onClick={() => navigate(`/reservations?edit=${r.id}`)}
                            style={{
                              padding: '5px 10px', borderRadius: 7, cursor: 'pointer',
                              background: isWaitlist ? 'rgba(245, 158, 11, .15)' : (st?.bg || 'var(--surf2)'),
                              border: `1px solid ${isWaitlist ? 'rgba(245, 158, 11, .3)' : (st?.border || 'var(--border)')}`,
                              display: 'flex', alignItems: 'center', gap: 5,
                              transition: 'transform .1s',
                              opacity: r.s === 'done' ? .45 : 1,
                            }}
                            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.02)')}
                            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
                            <span style={{ fontSize: 11 }}>{st?.icon}</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: st?.hex || 'var(--text)' }}>
                              {isWaitlist && '🕐 '}{r.prenom ? `${r.nom} ${r.prenom}` : r.nom || r.n}
                            </span>
                            <span style={{ fontSize: 12, fontFamily: 'var(--fm)', color: 'var(--t2)', fontWeight: 700 }}>
                              {r.c}p
                            </span>
                            {r.tbl && <span style={{ fontSize: 11, fontFamily: 'var(--fm)', color: 'var(--t3)', fontWeight: 600, padding: '1px 5px', background: 'var(--bp)', borderRadius: 4 }}>
                              {tableObj?.blocked ? '🚫 ' : tableObj?.held ? '🔒 ' : ''}{r.tbl.includes('+') ? '🔗 ' : ''}{r.tbl}
                            </span>}
                            <ResaBadges resa={r} />
                            {/* ── Actions rapides ── */}
                            <div onClick={e => e.stopPropagation()}>
                              <StatusActions status={r.s} onChangeStatus={(newS) => setResaStatus(r.id, newS)} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
