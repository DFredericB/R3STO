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
import { STATUS, CANAUX } from '../../utils/design'
import { timeToMins, nowMins, todayISO } from '../../utils/date'

export function Agenda() {
  const { resas, services, activeDate, tables, setResaStatus } = useAppStore()
  const navigate = useNavigate()
  const { t, fmtDate } = useT()
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
                    background: isNow ? 'rgba(220,80,80,.05)' : 'transparent',
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
                        return (
                          <div key={r.id}
                            onClick={() => navigate(`/reservations?edit=${r.id}`)}
                            style={{
                              padding: '5px 10px', borderRadius: 7, cursor: 'pointer',
                              background: st?.bg || 'var(--surf2)',
                              border: `1px solid ${st?.border || 'var(--border)'}`,
                              display: 'flex', alignItems: 'center', gap: 5,
                              transition: 'transform .1s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.02)')}
                            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
                            <span style={{ fontSize: 11 }}>{st?.icon}</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: st?.hex || 'var(--text)' }}>
                              {r.prenom ? `${r.nom} ${r.prenom}` : r.nom || r.n}
                            </span>
                            <span style={{ fontSize: 12, fontFamily: 'var(--fm)', color: 'var(--t2)', fontWeight: 700 }}>
                              {r.c}p
                            </span>
                            {r.tbl && <span style={{ fontSize: 11, fontFamily: 'var(--fm)', color: 'var(--t3)', fontWeight: 600, padding: '1px 5px', background: 'rgba(68,128,216,.1)', borderRadius: 4 }}>{r.tbl}</span>}
                            {r.statut === 2 && <span>⭐</span>}
                            {r.allergie && <span>⚠️</span>}
                            {r.bebe > 0 && <span style={{ fontSize: 11 }}>👶</span>}
                            {r.canal && CANAUX[r.canal] && (
                              <span style={{ fontSize: 10, opacity: .8 }}>{CANAUX[r.canal].icon}</span>
                            )}
                            <span style={{
                              fontSize: 9, fontWeight: 800, padding: '1px 4px', borderRadius: 3,
                              background: r.mode === 'ia' ? 'rgba(91,156,246,.15)' : 'rgba(232,165,48,.12)',
                              color: r.mode === 'ia' ? '#7bb8ff' : '#e8a530',
                            }}>{r.mode === 'ia' ? '🤖' : '✋'}</span>
                            {/* ── Actions rapides ── */}
                            <div style={{ display: 'flex', gap: 2, marginLeft: 4 }} onClick={e => e.stopPropagation()}>
                              {r.s === 'reserved' && (
                                <button title="Arrivé" onClick={() => setResaStatus(r.id, 'arrived')}
                                  style={{ width: 24, height: 24, borderRadius: 5, border: '1px solid rgba(60,200,112,.4)', background: 'rgba(60,200,112,.1)', color: 'var(--gn)', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>✅</button>
                              )}
                              {r.s === 'arrived' && (
                                <button title="Libérer" onClick={() => setResaStatus(r.id, 'done')}
                                  style={{ width: 24, height: 24, borderRadius: 5, border: '1px solid rgba(60,200,112,.4)', background: 'rgba(60,200,112,.12)', color: 'var(--gn)', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>🏁</button>
                              )}
                              {(r.s === 'reserved' || r.s === 'arrived') && (
                                <button title="No-show" onClick={() => setResaStatus(r.id, 'noshow')}
                                  style={{ width: 24, height: 24, borderRadius: 5, border: '1px solid rgba(220,80,80,.35)', background: 'rgba(220,80,80,.12)', color: 'var(--rd)', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>🚫</button>
                              )}
                              {(r.s === 'cancelled' || r.s === 'noshow') && (
                                <button title="Réactiver" onClick={() => setResaStatus(r.id, 'reserved')}
                                  style={{ width: 24, height: 24, borderRadius: 5, border: '1px solid rgba(91,156,246,.4)', background: 'rgba(91,156,246,.1)', color: 'var(--bl)', cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>↩️</button>
                              )}
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
