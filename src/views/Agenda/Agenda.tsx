// ══════════════════════════════════════════════════
//  R3STO — Vue Agenda
//  Timeline chronologique par créneau 30min
//  Groupé par service, indicateur "maintenant"
// ══════════════════════════════════════════════════

import { useEffect, useMemo, useRef, useState } from 'react'
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
  const { t } = useT()
  const todayDate = todayISO()
  const isToday = activeDate === todayDate
  const [svcFilter, setSvcFilter] = useState<string>('tous')
  const [salleFilter, setSalleFilter] = useState<string>('toutes')
  const [hideDone, setHideDone] = useState<boolean>(false)
  const nowSlotRef = useRef<HTMLDivElement | null>(null)

  const activeServices = useMemo(() => services.filter(s => s.active), [services])

  const dayResas = useMemo(() =>
    resas.filter(r => r.date === activeDate && r.s !== 'cancelled')
      .filter(r => svcFilter === 'tous' || r.svc === svcFilter)
      .filter(r => salleFilter === 'toutes' || tables.find(tb => tb.n === r.tbl)?.salle === salleFilter)
      .filter(r => !hideDone || (r.s !== 'done' && r.s !== 'noshow')),
    [resas, activeDate, svcFilter, salleFilter, tables, hideDone]
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

  // Résas fermes (hors waitlist) pour timeline
  const firmResas = useMemo(() => dayResas.filter(r => r.s !== 'waitlist'), [dayResas])
  const waitlistResas = useMemo(() => dayResas.filter(r => r.s === 'waitlist'), [dayResas])

  // Auto-scroll vers "maintenant" quand on ouvre l'Agenda aujourd'hui
  useEffect(() => {
    if (isToday && nowSlotRef.current) {
      const t0 = setTimeout(() => nowSlotRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 120)
      return () => clearTimeout(t0)
    }
    return
  }, [isToday, activeDate])

  const resaBySlot = useMemo(() => {
    const map: Record<number, typeof dayResas> = {}
    firmResas.forEach(r => {
      const parts = r.t.split(/[h:]/)
      const m = parseInt(parts[0]) * 60 + parseInt(parts[1] || '0')
      const slotKey = Math.floor(m / 30) * 30
      if (!map[slotKey]) map[slotKey] = []
      map[slotKey].push(r)
    })
    return map
  }, [firmResas])

  // Stats service mémoïsées (sans waitlist)
  const svcStats = useMemo(() => {
    const out: Record<number, { count: number; cvt: number }> = {}
    svcSlots.forEach(svc => {
      const rs = firmResas.filter(r => {
        const parts = r.t.split(/[h:]/)
        const m = parseInt(parts[0]) * 60 + parseInt(parts[1] || '0')
        return m >= svc.open && m < svc.close
      })
      out[svc.open] = { count: rs.length, cvt: rs.reduce((a, r) => a + r.c, 0) }
    })
    return out
  }, [firmResas, svcSlots])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--hh))', overflow: 'hidden' }}>
      <ViewToolbar
        title={t('agenda.title')}
        subtitle={`${dayResas.length} ${t('common.resas')} · ${totalCvt}${t('common.persons')}`}
        serviceFilter={svcFilter}
        onServiceFilter={setSvcFilter}
        salleFilter={salleFilter}
        onSalleFilter={setSalleFilter}
        onNewResa={() => navigate('/nouvelle-resa')}
      >
        <button
          onClick={() => setHideDone(v => !v)}
          style={{
            padding: '5px 10px', borderRadius: 7, border: '1px solid var(--border)',
            background: hideDone ? 'var(--bl)' : 'var(--surf3)',
            color: hideDone ? '#fff' : 'var(--t2)',
            fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--ff)',
            display: 'flex', alignItems: 'center', gap: 4,
          }}
          title={t('common.hideDone')}
        >
          {hideDone ? '✓ ' : ''}{t('common.hideDone')}
        </button>
      </ViewToolbar>

      {/* Bannière orphelins */}
      <div style={{ padding: '8px 16px 0' }}><OrphanBanner onNavigate={(id) => navigate(`/reservations?edit=${id}`)} /></div>

      {/* Liste d'attente du jour (hors timeline) */}
      {waitlistResas.length > 0 && (
        <div style={{ padding: '8px 16px 0' }}>
          <div style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--ap)', border: '1px solid var(--ab)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--am)' }}>🕐 {t('agenda.waitlistBlock')} ({waitlistResas.length})</span>
            {waitlistResas.map(r => (
              <span key={r.id} onClick={() => navigate(`/reservations?edit=${r.id}`)} style={{ fontSize: 11, fontWeight: 700, color: 'var(--am)', padding: '2px 8px', background: 'var(--surf)', borderRadius: 6, cursor: 'pointer', border: '1px solid var(--ab)' }}>
                {r.prenom ? `${r.prenom} ${r.nom}` : r.nom || r.n} · {r.c}{t('common.persons')}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {allSlots.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--t3)', fontSize: 14 }}>{t('agenda.noService')}</div>
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
                <div key={slotMin} ref={isNow ? nowSlotRef : undefined} style={{ position: 'relative' }}>
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
                        {svcStats[svc.open]?.count || 0} {t('common.resas')} · {svcStats[svc.open]?.cvt || 0}{t('common.persons')}
                      </span>
                    </div>
                  )}
                  {isNow && (() => {
                    const offsetPct = ((now - slotMin) / 30) * 100
                    return (
                      <div style={{ position: 'absolute', left: 0, right: 0, top: `calc(${offsetPct}% )`, height: 2, background: 'var(--rd)', zIndex: 2, pointerEvents: 'none', boxShadow: '0 0 6px rgba(239,68,68,.6)' }}>
                        <span style={{ position: 'absolute', left: 54, top: -9, background: 'var(--rd)', color: '#fff', fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 10, fontFamily: 'var(--fm)' }}>{t('common.now')}</span>
                      </div>
                    )
                  })()}
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
                      {slotCvt > 0 && <div style={{ fontSize: 10, color: 'var(--t4)', fontWeight: 600 }}>{slotCvt}{t('common.persons')}</div>}
                    </div>
                    {/* Résas du créneau */}
                    <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 5, padding: '5px 10px', alignItems: 'center' }}>
                      {slotResas.length === 0 && (
                        <span style={{ fontSize: 12, color: 'var(--t4)' }}>{t('common.free')}</span>
                      )}
                      {slotResas.map(r => {
                        const st = STATUS[r.s as keyof typeof STATUS]
                        const tableObj = r.tbl ? tables.find(tb => tb.n === r.tbl) : null
                        const hasTableError = tableObj?.blocked === true
                        return (
                          <div key={r.id}
                            onClick={() => navigate(`/reservations?edit=${r.id}`)}
                            style={{
                              padding: '5px 10px', borderRadius: 7, cursor: 'pointer',
                              background: hasTableError ? 'rgba(239,68,68,.12)' : (st?.bg || 'var(--surf2)'),
                              border: `1px solid ${hasTableError ? 'var(--rd)' : (st?.border || 'var(--border)')}`,
                              display: 'flex', alignItems: 'center', gap: 5,
                              transition: 'transform .1s',
                              opacity: r.s === 'done' ? .45 : 1,
                            }}
                            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.02)')}
                            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
                            <span style={{ fontSize: 11 }}>{st?.icon}</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: st?.hex || 'var(--text)' }}>
                              {r.prenom ? `${r.prenom} ${r.nom}` : r.nom || r.n}
                            </span>
                            <span style={{ fontSize: 12, fontFamily: 'var(--fm)', color: 'var(--t2)', fontWeight: 700 }}>
                              {r.c}{t('common.persons')}
                            </span>
                            {r.tbl && !hasTableError && <span style={{ fontSize: 11, fontFamily: 'var(--fm)', color: 'var(--t3)', fontWeight: 600, padding: '1px 5px', background: 'var(--bp)', borderRadius: 4 }}>
                              {tableObj?.held ? '🔒 ' : ''}{r.tbl.includes('+') ? '🔗 ' : ''}{r.tbl}
                            </span>}
                            {hasTableError && (
                              <span style={{ fontSize: 10, fontFamily: 'var(--fm)', color: 'var(--rd)', fontWeight: 800, padding: '2px 6px', background: 'rgba(239,68,68,.12)', border: '1px solid var(--rd)', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 3 }}
                                onClick={e => { e.stopPropagation(); navigate(`/reservations?edit=${r.id}`) }}
                                title="Table bloquée — cliquer pour réassigner">
                                ⚠️ {r.tbl} {t('agenda.tblBlocked')}
                              </span>
                            )}
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
