// ══════════════════════════════════════════════════
//  R3STO — Vue Dashboard
//  KPIs enrichis, résa rapide, briefing services
//  Plus de ViewToolbar ici — QuickResa gère tout
// ══════════════════════════════════════════════════

import { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useNavigate } from 'react-router-dom'
import { QuickResa } from '../../components/ui/QuickResa'
import { useT } from '../../i18n/useTranslation'
import { todayISO, nowMins, timeToMins } from '../../utils/date'
import { CANAUX, sectionTitle } from '../../utils/design'

// ── StatCard ─────────────────────────────────────
function StatCard({ label, value, sub, color = 'var(--bl)' }: {
  label: string; value: string | number; sub?: string; color?: string
}) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ ...sectionTitle }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, color, fontFamily: 'var(--fm)', letterSpacing: '-.02em' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--t3)' }}>{sub}</div>}
    </div>
  )
}

// ── Barre de capacité ────────────────────────────
function CapacityBar({ current, max, color }: { current: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round(current / max * 100)) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
      <div style={{
        flex: 1, height: 6, borderRadius: 3,
        background: 'var(--surf3)', overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`, height: '100%', borderRadius: 3,
          background: pct > 85 ? 'var(--rd)' : pct > 60 ? 'var(--am)' : color,
          transition: 'width .3s ease',
        }} />
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--fm)', color: 'var(--t3)', minWidth: 30, textAlign: 'right' }}>
        {pct}%
      </span>
    </div>
  )
}

// ── Canal badge ──────────────────────────────────
function CanalBadge({ label, count, icon }: { label: string; count: number; icon: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4,
      padding: '3px 8px', borderRadius: 5,
      background: 'var(--surf3)', fontSize: 11, color: 'var(--t2)',
    }}>
      <span>{icon}</span>
      <span style={{ fontWeight: 700, fontFamily: 'var(--fm)' }}>{count}</span>
      <span style={{ color: 'var(--t4)' }}>{label}</span>
    </div>
  )
}

// ── Badge pill compacte ─────────────────────────
function BadgePill({ icon, label, color, bg, border }: {
  icon: string; label: string; color: string; bg: string; border: string
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4,
      padding: '5px 10px', borderRadius: 7,
      background: bg, border: `1px solid ${border}`,
    }}>
      <span style={{ fontSize: 12 }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color }}>{label}</span>
    </div>
  )
}

// ── Widget météo (simulation — à brancher sur API météo) ──
function WeatherWidget({ t, terraceCvt, hasExterior }: {
  t: (k: string) => string; terraceCvt: number; hasExterior: boolean
}) {
  // Simulation météo — en prod, brancher sur OpenWeatherMap / MeteoSwiss
  const [weather] = useState(() => {
    const conditions = [
      { icon: '☀️', label: '24°C', ok: true },
      { icon: '⛅', label: '18°C', ok: true },
      { icon: '🌧️', label: '14°C', ok: false },
      { icon: '🌦️', label: '16°C', ok: false },
      { icon: '❄️', label: '2°C', ok: false },
    ]
    // Déterministe par date pour la démo
    const idx = new Date().getDate() % conditions.length
    return conditions[idx]
  })

  if (!hasExterior) return null

  const terraceOk = weather.ok

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 14px', borderRadius: 10,
      background: terraceOk ? 'rgba(80,183,122,.06)' : 'rgba(220,80,80,.06)',
      border: `1px solid ${terraceOk ? 'rgba(80,183,122,.2)' : 'rgba(220,80,80,.2)'}`,
    }}>
      {/* Météo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 22 }}>{weather.icon}</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>{weather.label}</div>
          <div style={{ fontSize: 10, color: 'var(--t3)' }}>{t('dash.weather')}</div>
        </div>
      </div>

      <div style={{ width: 1, height: 28, background: 'var(--border)', flexShrink: 0 }} />

      {/* Statut terrasse */}
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: 12, fontWeight: 700,
          color: terraceOk ? 'var(--gn)' : 'var(--rd)',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: terraceOk ? 'var(--gn)' : 'var(--rd)',
            display: 'inline-block',
          }} />
          {terraceOk ? t('dash.terraceOpen') : t('dash.terraceClosed')}
        </div>
        {terraceCvt > 0 && (
          <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>
            {terraceCvt} {t('dash.terraceCvt')}
          </div>
        )}
      </div>

      {/* Alerte rapatriement */}
      {!terraceOk && terraceCvt > 0 && (
        <div style={{
          padding: '4px 10px', borderRadius: 6,
          background: 'var(--rd)', color: '#fff',
          fontSize: 11, fontWeight: 700,
          animation: 'pulse 1.5s infinite',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          🚨 {t('dash.terraceAlert')}
        </div>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════
export function Dashboard() {
  const { resas, tables, services, salles, resto, activeDate } = useAppStore()
  const navigate = useNavigate()
  const { t, fmtDate } = useT()
  const todayDate = todayISO()
  const isToday = activeDate === todayDate

  // ── Données du jour ────────────────────────────
  const dayResas = resas.filter(r => r.date === activeDate && r.s !== 'cancelled')
  const arrived = dayResas.filter(r => r.s === 'arrived')
  const done = dayResas.filter(r => r.s === 'done')
  const noshows = dayResas.filter(r => r.s === 'noshow')
  const totalCvt = dayResas.reduce((s, r) => s + r.c, 0)

  const activeServices = services.filter(s => s.active)
  const nowM = nowMins()

  const currentService = activeServices.find(s => {
    return nowM >= timeToMins(s.open) && nowM <= timeToMins(s.close)
  })

  // ── Analytique enrichie ────────────────────────
  const activeTables = tables.filter(tb => tb.active)
  const maxCapacity = activeTables.reduce((s, tb) => s + tb.capMax, 0)
  const occupancyPct = maxCapacity > 0 ? Math.round(totalCvt / maxCapacity * 100) : 0
  const avgTicket = resto.avg_ticket || 45
  const estRevenue = totalCvt * avgTicket

  // Canaux
  const canalCounts = {
    telephone: dayResas.filter(r => r.canal === 'telephone').length,
    walkin: dayResas.filter(r => r.canal === 'walkin').length,
    widget: dayResas.filter(r => r.canal === 'widget').length,
    email: dayResas.filter(r => r.canal === 'email').length,
  }

  // Tables libres/occupées
  const occupiedTbls = new Set(dayResas.filter(r => r.s === 'arrived' || r.s === 'reserved').map(r => r.tbl))
  const freeTables = activeTables.filter(tb => !occupiedTbls.has(tb.n)).length
  const occTables = activeTables.length - freeTables

  // Badges enrichis
  const groups = dayResas.filter(r => r.c >= 6)
  const waitlist = resas.filter(r => r.date === activeDate && r.s === 'waitlist')
  const vips = dayResas.filter(r => r.statut === 2)
  const allergies = dayResas.filter(r => r.allergie)
  const babies = dayResas.reduce((s, r) => s + r.bebe, 0)
  const pmrs = dayResas.reduce((s, r) => s + r.pmr, 0)

  // Terrasse — résas sur tables extérieures
  const exteriorSalles = salles.filter(s => s.exterior && s.active)
  const exteriorTableNames = tables
    .filter(tb => tb.active && exteriorSalles.some(s => s.id === tb.salle))
    .map(tb => tb.n)
  const terraceCvt = dayResas
    .filter(r => exteriorTableNames.includes(r.tbl) && (r.s === 'arrived' || r.s === 'reserved'))
    .reduce((s, r) => s + r.c, 0)

  // Prochaines résas
  const nextResas = dayResas
    .filter(r => r.s === 'reserved')
    .sort((a, b) => a.t < b.t ? -1 : 1)
    .slice(0, 6)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--hh))', overflow: 'hidden' }}>

      {/* ── Header Dashboard — minimal ── */}
      <div style={{
        padding: '10px 18px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--surf)',
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>
          {t('dash.title')}
        </div>

        {currentService && (
          <span style={{
            fontSize: 11, fontWeight: 700, color: currentService.color,
            padding: '2px 8px', borderRadius: 5,
            background: `${currentService.color}15`,
          }}>
            ● {currentService.icon} {currentService.name} {t('dash.inProgress')}
          </span>
        )}

        {!isToday && (
          <span style={{
            fontSize: 11, fontWeight: 700, color: 'var(--am)',
            padding: '2px 8px', borderRadius: 5,
            background: 'var(--ap)',
          }}>
            📅 {fmtDate(activeDate)}
          </span>
        )}
      </div>

      {/* ── Résa rapide — toujours visible, jamais scrollé ── */}
      <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', background: 'var(--surf)', flexShrink: 0 }}>
        <QuickResa onOpenFullModal={() => navigate('/reservations?new=1')} />
      </div>

      {/* ── Corps scrollable ── */}
      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* KPIs — 2 rangées */}
        <div style={{ padding: '16px 18px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <StatCard
            label={t('dash.reservations')}
            value={dayResas.length}
            sub={`${totalCvt} ${t('dash.covers')}`}
            color="var(--bl)"
          />
          <StatCard
            label={t('dash.arrived')}
            value={`${arrived.length + done.length}`}
            sub={`${Math.round((arrived.length + done.length) / Math.max(dayResas.length, 1) * 100)}% ${t('dash.ofDay')}`}
            color="var(--gn)"
          />
          <StatCard
            label={t('dash.occupancy')}
            value={`${occupancyPct}%`}
            sub={`${totalCvt}/${maxCapacity} ${t('dash.capacity')}`}
            color={occupancyPct > 85 ? 'var(--rd)' : occupancyPct > 60 ? 'var(--am)' : 'var(--bl)'}
          />
          <StatCard
            label={t('dash.revenue')}
            value={`${estRevenue.toLocaleString()}`}
            sub={`${avgTicket} CHF ${t('dash.avgTicket')}`}
            color="var(--gn)"
          />
        </div>

        {/* Indicateurs opérationnels — badges compacts */}
        <div style={{ padding: '0 18px 14px', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Tables */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 10px', borderRadius: 7,
            background: 'var(--surf2)', border: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)' }}>{t('dash.tables')}</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--gn)', fontFamily: 'var(--fm)' }}>{freeTables}</span>
            <span style={{ fontSize: 10, color: 'var(--t4)' }}>{t('dash.available')}</span>
            <span style={{ color: 'var(--border)' }}>·</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--am)', fontFamily: 'var(--fm)' }}>{occTables}</span>
            <span style={{ fontSize: 10, color: 'var(--t4)' }}>{t('dash.occupied')}</span>
          </div>

          {/* No-shows */}
          <BadgePill icon="🚫" label={`${noshows.length} ${t('dash.noshows')}`} color="var(--rd)" bg="rgba(220,80,80,.08)" border="rgba(220,80,80,.2)" />

          {/* Groupes (6+) */}
          <BadgePill icon="👥" label={`${groups.length} ${t('dash.groups')}`} color="var(--bl)" bg="var(--bp)" border="var(--bl)" />

          {/* Waitlist */}
          <BadgePill icon="⏳" label={`${waitlist.length} ${t('dash.waitlist')}`} color="var(--am)" bg="var(--ap)" border="var(--ab)" />

          {/* VIPs */}
          <BadgePill icon="⭐" label={`${vips.length} ${t('dash.vips')}`} color="#D4A017" bg="rgba(212,160,23,.08)" border="rgba(212,160,23,.25)" />

          {/* Allergies */}
          <BadgePill icon="⚠️" label={`${allergies.length} ${t('dash.allergies')}`} color="var(--am)" bg="var(--ap)" border="var(--ab)" />

          {/* Bébés */}
          <BadgePill icon="👶" label={`${babies} ${t('dash.babies')}`} color="var(--t2)" bg="var(--surf3)" border="var(--border)" />

          {/* PMR */}
          <BadgePill icon="♿" label={`${pmrs} ${t('dash.pmr')}`} color="var(--t2)" bg="var(--surf3)" border="var(--border)" />

          <div style={{ flex: 1 }} />

          {/* Canaux */}
          <div style={{ display: 'flex', gap: 4 }}>
            <CanalBadge label={t('canal.telephone')} count={canalCounts.telephone} icon="📞" />
            <CanalBadge label={t('canal.walkin')} count={canalCounts.walkin} icon="🚶" />
            <CanalBadge label={t('canal.widget')} count={canalCounts.widget} icon="🌐" />
            <CanalBadge label={t('canal.email')} count={canalCounts.email} icon="✉️" />
          </div>
        </div>

        {/* Météo + Terrasse */}
        {exteriorSalles.length > 0 && (
          <div style={{ padding: '0 18px 14px' }}>
            <WeatherWidget t={t} terraceCvt={terraceCvt} hasExterior={exteriorSalles.length > 0} />
          </div>
        )}

        {/* ── ANALYTIQUES ── */}
        <div style={{ padding: '0 18px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

          {/* Distribution horaire */}
          <div className="card">
            <div style={{ ...sectionTitle, marginBottom: 10 }}>
              {t('dash.hourlyDistribution')}
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 80 }}>
              {(() => {
                const hours: Record<string, number> = {}
                for (let h = 11; h <= 23; h++) hours[`${h}`] = 0
                dayResas.forEach(r => {
                  const hh = r.t.split('h')[0]
                  if (hours[hh] !== undefined) hours[hh]++
                })
                const maxH = Math.max(...Object.values(hours), 1)
                return Object.entries(hours).map(([h, cnt]) => (
                  <div key={h} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <div
                      title={`${h}h: ${cnt} résa${cnt > 1 ? 's' : ''}`}
                      style={{
                        width: '100%', minHeight: 3,
                        height: `${Math.round(cnt / maxH * 64)}px`,
                        borderRadius: '3px 3px 0 0',
                        background: cnt > 0 ? 'var(--bl)' : 'var(--surf3)',
                        transition: 'height .3s ease',
                      }}
                    />
                    <span style={{ fontSize: 8, color: 'var(--t4)', fontFamily: 'var(--fm)' }}>{h}</span>
                  </div>
                ))
              })()}
            </div>
          </div>

          {/* Répartition par salle */}
          <div className="card">
            <div style={{ ...sectionTitle, marginBottom: 10 }}>
              {t('dash.roomBreakdown')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {salles.filter(s => s.active).map(salle => {
                const salleTableNames = tables.filter(tb => tb.salle === salle.id && tb.active).map(tb => tb.n)
                const salleResas = dayResas.filter(r => salleTableNames.includes(r.tbl))
                const salleCvt = salleResas.reduce((s, r) => s + r.c, 0)
                const salleMax = tables.filter(tb => tb.salle === salle.id && tb.active).reduce((s, tb) => s + tb.capMax, 0)
                const pct = salleMax > 0 ? Math.round(salleCvt / salleMax * 100) : 0
                return (
                  <div key={salle.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>{salle.name}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--fm)', color: 'var(--t3)' }}>
                        {salleCvt}/{salleMax}p · {pct}%
                      </span>
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: 'var(--surf3)', overflow: 'hidden' }}>
                      <div style={{
                        width: `${pct}%`, height: '100%', borderRadius: 3,
                        background: pct > 85 ? 'var(--rd)' : pct > 60 ? 'var(--am)' : salle.color || 'var(--bl)',
                        transition: 'width .3s ease',
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Tendance 7 jours */}
          <div className="card">
            <div style={{ ...sectionTitle, marginBottom: 10 }}>
              {t('dash.weekTrend')}
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 70 }}>
              {(() => {
                const days: { label: string; date: string; count: number; cvt: number }[] = []
                const DAY_ABBR = ['D', 'L', 'M', 'M', 'J', 'V', 'S']
                for (let i = 6; i >= 0; i--) {
                  const d = new Date()
                  d.setDate(d.getDate() - i)
                  const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
                  const dayRs = resas.filter(r => r.date === iso && r.s !== 'cancelled')
                  days.push({ label: DAY_ABBR[d.getDay()], date: iso, count: dayRs.length, cvt: dayRs.reduce((s, r) => s + r.c, 0) })
                }
                const maxC = Math.max(...days.map(d => d.count), 1)
                return days.map((d, i) => {
                  const isActive = d.date === activeDate
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, fontFamily: 'var(--fm)', color: 'var(--t3)' }}>{d.count}</span>
                      <div
                        title={`${d.date}: ${d.count} résas, ${d.cvt} couverts`}
                        style={{
                          width: '100%', minHeight: 4,
                          height: `${Math.round(d.count / maxC * 48)}px`,
                          borderRadius: 3,
                          background: isActive ? 'var(--bl)' : d.count > 0 ? 'var(--bp)' : 'var(--surf3)',
                          border: isActive ? '1px solid var(--bl)' : 'none',
                          transition: 'height .3s ease',
                        }}
                      />
                      <span style={{
                        fontSize: 9, fontWeight: isActive ? 800 : 500,
                        color: isActive ? 'var(--bl)' : 'var(--t4)',
                        fontFamily: 'var(--fm)',
                      }}>{d.label}</span>
                    </div>
                  )
                })
              })()}
            </div>
          </div>

          {/* Canaux — version visuelle */}
          <div className="card">
            <div style={{ ...sectionTitle, marginBottom: 10 }}>
              {t('dash.channels')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {([
                { key: 'telephone' as const, icon: CANAUX.telephone.icon, label: t(CANAUX.telephone.label), color: CANAUX.telephone.hex },
                { key: 'walkin' as const, icon: CANAUX.walkin.icon, label: t(CANAUX.walkin.label), color: CANAUX.walkin.hex },
                { key: 'widget' as const, icon: CANAUX.widget.icon, label: t(CANAUX.widget.label), color: CANAUX.widget.hex },
                { key: 'email' as const, icon: CANAUX.email.icon, label: t(CANAUX.email.label), color: CANAUX.email.hex },
              ]).map(canal => {
                const cnt = canalCounts[canal.key]
                const pct = dayResas.length > 0 ? Math.round(cnt / dayResas.length * 100) : 0
                return (
                  <div key={canal.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, width: 20, textAlign: 'center' }}>{canal.icon}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', width: 70 }}>{canal.label}</span>
                    <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--surf3)', overflow: 'hidden' }}>
                      <div style={{
                        width: `${pct}%`, height: '100%', borderRadius: 3,
                        background: canal.color, transition: 'width .3s ease',
                        minWidth: cnt > 0 ? 4 : 0,
                      }} />
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--fm)', color: 'var(--t2)', width: 36, textAlign: 'right' }}>
                      {cnt} <span style={{ color: 'var(--t4)', fontWeight: 500 }}>({pct}%)</span>
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Services du jour — avec barre de capacité */}
        <div style={{ padding: '0 18px 16px' }}>
          <div style={{ ...sectionTitle, fontSize: 12, marginBottom: 10 }}>
            {t('dash.services')}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {activeServices.map(svc => {
              const svcResas = dayResas.filter(r => r.svc === svc.name.toLowerCase())
              const svcCvt = svcResas.reduce((s, r) => s + r.c, 0)
              const openM = timeToMins(svc.open)
              const closeM = timeToMins(svc.close)
              const isActive = nowM >= openM && nowM <= closeM
              const isDone = nowM > closeM

              return (
                <div
                  key={svc.id}
                  className="card"
                  style={{
                    flex: 1, cursor: 'pointer',
                    border: isActive ? `1.5px solid ${svc.color}` : '1px solid var(--border)',
                    background: isActive ? `${svc.color}15` : 'var(--surf2)',
                  }}
                  onClick={() => navigate('/grille')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 18 }}>{svc.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{svc.name}</span>
                    {isActive && (
                      <span style={{ fontSize: 9, fontWeight: 700, color: svc.color, background: `${svc.color}20`, padding: '1px 5px', borderRadius: 4 }}>
                        ● LIVE
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--fm)', marginLeft: 'auto' }}>
                      {svc.open} – {svc.close}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: isDone ? 'var(--t3)' : 'var(--text)', fontFamily: 'var(--fm)' }}>
                        {svcResas.length}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--t3)' }}>{t('dash.reservationsLabel')}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: isDone ? 'var(--t3)' : 'var(--text)', fontFamily: 'var(--fm)' }}>
                        {svcCvt}p
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--t3)' }}>{t('dash.coversLabel')}</div>
                    </div>
                    <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: 'var(--t4)' }}>{t('dash.lastOrder')}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: isDone ? 'var(--t3)' : 'var(--text)', fontFamily: 'var(--fm)' }}>
                        {svc.lastOrder}
                      </div>
                    </div>
                  </div>
                  <CapacityBar current={svcCvt} max={svc.maxCouverts || maxCapacity} color={svc.color} />
                </div>
              )
            })}
          </div>
        </div>

        {/* Prochaines réservations */}
        <div style={{ padding: '0 18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ ...sectionTitle, fontSize: 12 }}>
              {t('dash.nextResas')}
            </div>
            <button
              className="btn btn-secondary"
              style={{ fontSize: 11 }}
              onClick={() => navigate('/reservations')}
            >
              {t('dash.viewAll')}
            </button>
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {nextResas.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--t3)', fontSize: 13 }}>
                {t('dash.noResa')}
              </div>
            ) : (
              nextResas.map((r, i) => (
                <div
                  key={r.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px',
                    borderBottom: i < nextResas.length - 1 ? '1px solid var(--border)' : 'none',
                    cursor: 'pointer',
                  }}
                  onClick={() => navigate(`/reservations?edit=${r.id}`)}
                >
                  <div style={{ fontFamily: 'var(--fm)', fontSize: 14, fontWeight: 900, color: 'var(--text)', width: 44, flexShrink: 0 }}>
                    {r.t.replace('h',':')}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.statut === 2 && '⭐ '}{r.n}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--t3)' }}>
                      {r.c}p{r.bebe > 0 ? ` 👶${r.bebe}` : ''}{r.pmr > 0 ? ` ♿${r.pmr}` : ''}{r.allergie ? ' ⚠️' : ''} · {r.tbl || '—'} · {r.svc}
                    </div>
                  </div>
                  <span className={`pill pill-${r.s}`}>{t(`status.${r.s}`)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
