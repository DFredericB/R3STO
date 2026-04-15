// ══════════════════════════════════════════════════
//  R3STO — Vue Dashboard
//  Résa rapide, agenda, KPIs, stats
// ══════════════════════════════════════════════════

import { useState, Fragment } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useNavigate } from 'react-router-dom'

import { useT } from '../../i18n/useTranslation'
import { todayISO, nowMins, timeToMins } from '../../utils/date'
import { CANAUX, sectionTitle, filterChip } from '../../utils/design'

// ── Types ────────────────────────────────────────
type PeriodKey = 'day' | '7d' | '30d' | '90d' | 'year' | 'month'

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'day', label: 'Jour' },
  { key: '7d', label: '7 jours' },
  { key: '30d', label: '30 jours' },
  { key: '90d', label: '90 jours' },
  { key: 'year', label: 'Année' },
  { key: 'month', label: 'Mois' },
]

const MONTH_NAMES = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

// ── Helpers ──────────────────────────────────────
function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

// ── StatCard ─────────────────────────────────────
function StatCard({ label, value, valueSecondary, pct, sub, color = 'var(--bl)', dotColor }: {
  label: string; value: string | number; valueSecondary?: string | number; pct?: number; sub?: string; color?: string; dotColor?: string
}) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ ...sectionTitle, display: 'flex', alignItems: 'center', gap: 6 }}>
        {dotColor && <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />}
        <span>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 28, fontWeight: 900, color, fontFamily: 'var(--fm)', letterSpacing: '-.02em', lineHeight: 1 }}>
          {value}{valueSecondary !== undefined && <span style={{ color: 'var(--t4)', fontWeight: 700 }}>/{valueSecondary}</span>}
        </span>
        {pct !== undefined && (
          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--t2)', fontFamily: 'var(--fm)' }}>{pct}%</span>
        )}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--t3)' }}>{sub}</div>}
    </div>
  )
}

// ── AttentionCard XL ─────────────────────────────
function AttentionCard({ icon, label, value, sub, color, bg, border, onClick }: {
  icon: string; label: string; value: number | string; sub: string; color: string; bg: string; border: string; onClick?: () => void
}) {
  return (
    <button onClick={onClick} style={{
      textAlign: 'left', cursor: onClick ? 'pointer' : 'default',
      display: 'flex', flexDirection: 'column', gap: 4,
      padding: '12px 14px', borderRadius: 10,
      background: bg, border: `1px solid ${border}`,
      fontFamily: 'var(--ff)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <span style={{ fontSize: 11, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 900, color, fontFamily: 'var(--fm)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)' }}>{sub}</div>
    </button>
  )
}

// ── Badge pill compacte (cliquable) ──────────────
function BadgePill({ icon, label, color, bg, border, onClick }: {
  icon: string; label: string; color: string; bg: string; border: string; onClick?: () => void
}) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 4,
      padding: '5px 10px', borderRadius: 7,
      background: bg, border: `1px solid ${border}`,
      cursor: onClick ? 'pointer' : 'default',
      fontFamily: 'var(--ff)',
    }}>
      <span style={{ fontSize: 12 }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color }}>{label}</span>
    </button>
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

// ═════════════════════════════════════════════════
export function Dashboard() {
  const { resas, tables, services, salles, resto, activeDate, setActiveDate } = useAppStore()
  const navigate = useNavigate()
  const { t, fmtDate } = useT()
  const todayDate = todayISO()
  const isToday = activeDate === todayDate

  // ── Période d'analyse ──────────────────────────
  const [period, setPeriod] = useState<PeriodKey>('day')
  const [direction, setDirection] = useState<'past' | 'future'>('past')
  const [mealSlot, setMealSlot] = useState<'service' | 'midi' | 'soir' | 'jour'>('midi')
  const slotColor = mealSlot === 'midi' ? '#f5c518' : mealSlot === 'soir' ? '#4a7fd6' : mealSlot === 'jour' ? 'var(--gn)' : 'var(--bl)'
  void direction // TODO Phase2: filtrer past/future
  const now = new Date()
  const [selMonth, setSelMonth] = useState(now.getMonth())
  const [selYear, setSelYear] = useState(now.getFullYear())
  const [selDay, setSelDay] = useState(activeDate)

  // ── Données du jour ────────────────────────────
  const dayResas = resas.filter(r => r.date === activeDate && r.s !== 'cancelled')
  const totalCvt = dayResas.reduce((s, r) => s + r.c, 0)

  const activeServices = services.filter(s => s.active)
  const nowM = nowMins()

  const currentService = activeServices.find(s => {
    return nowM >= timeToMins(s.open) && nowM <= timeToMins(s.close)
  })

  // ── Analytique ────────────────────────────
  const activeTables = tables.filter(tb => tb.active)
  const avgTicket = resto.avg_ticket || 45

  // ── Données période pour analyse ──────────
  const periodDays = (() => {
    if (period === 'day') {
      const iso = selDay
      const dayR = resas.filter(r => r.date === iso && r.s !== 'cancelled')
      const dayNS = resas.filter(r => r.date === iso && r.s === 'noshow')
      const dayAll = resas.filter(r => r.date === iso)
      return [{ iso, count: dayR.length, cvt: dayR.reduce((s, r) => s + r.c, 0), noshow: dayNS.length, total: dayAll.length }]
    }
    if (period === 'month') {
      const numDays = daysInMonth(selYear, selMonth)
      return Array.from({ length: numDays }, (_, i) => {
        const d = new Date(selYear, selMonth, i + 1)
        const iso = toISO(d)
        const dayR = resas.filter(r => r.date === iso && r.s !== 'cancelled')
        const dayNS = resas.filter(r => r.date === iso && r.s === 'noshow')
        const dayAll = resas.filter(r => r.date === iso)
        return { iso, count: dayR.length, cvt: dayR.reduce((s, r) => s + r.c, 0), noshow: dayNS.length, total: dayAll.length }
      })
    }
    if (period === 'year') {
      // Année complète sélectionnée
      const days: { iso: string; count: number; cvt: number; noshow: number; total: number }[] = []
      for (let m = 0; m < 12; m++) {
        const numDays = daysInMonth(selYear, m)
        for (let d = 1; d <= numDays; d++) {
          const dt = new Date(selYear, m, d)
          const iso = toISO(dt)
          const dayR = resas.filter(r => r.date === iso && r.s !== 'cancelled')
          const dayNS = resas.filter(r => r.date === iso && r.s === 'noshow')
          const dayAll = resas.filter(r => r.date === iso)
          days.push({ iso, count: dayR.length, cvt: dayR.reduce((s, r) => s + r.c, 0), noshow: dayNS.length, total: dayAll.length })
        }
      }
      return days
    }
    const numDays = period === '7d' ? 7 : period === '30d' ? 30 : 90
    return Array.from({ length: numDays }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (numDays - 1 - i))
      const iso = toISO(d)
      const dayR = resas.filter(r => r.date === iso && r.s !== 'cancelled')
      const dayNS = resas.filter(r => r.date === iso && r.s === 'noshow')
      const dayAll = resas.filter(r => r.date === iso)
      return { iso, count: dayR.length, cvt: dayR.reduce((s, r) => s + r.c, 0), noshow: dayNS.length, total: dayAll.length }
    })
  })()

  const pResas = periodDays.reduce((s, d) => s + d.count, 0)
  const pCvt = periodDays.reduce((s, d) => s + d.cvt, 0)
  const pNS = periodDays.reduce((s, d) => s + d.noshow, 0)
  const pTotal = periodDays.reduce((s, d) => s + d.total, 0)
  const pCancelled = resas.filter(r => periodDays.some(d => d.iso === r.date) && r.s === 'cancelled').length
  const noshowRate = pTotal > 0 ? Math.round(pNS / pTotal * 100) : 0
  const avgCvtPerResa = pResas > 0 ? (pCvt / pResas).toFixed(1) : '0'
  const numDaysInPeriod = periodDays.length
  const avgResaPerDay = numDaysInPeriod > 0 ? (pResas / numDaysInPeriod).toFixed(1) : '0'

  // Label période
  const periodLabel = period === 'day' ? (() => {
      const dd = new Date(selDay + 'T12:00:00')
      const dn = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam']
      return `${dn[dd.getDay()]} ${dd.getDate()} ${MONTH_NAMES[dd.getMonth()]} ${dd.getFullYear()}`
    })()
    : period === '7d' ? '7 jours'
    : period === '30d' ? '30 jours'
    : period === '90d' ? '90 jours'
    : period === 'year' ? `Année ${selYear}`
    : `${MONTH_NAMES[selMonth]} ${selYear}`

  // Abréviation pour les StatCards
  const pTag = period === 'day' ? (() => {
      const dd = new Date(selDay + 'T12:00:00')
      return `${dd.getDate()}/${dd.getMonth() + 1}`
    })()
    : period === '7d' ? '7j'
    : period === '30d' ? '30j'
    : period === '90d' ? '90j'
    : period === 'year' ? String(selYear)
    : MONTH_NAMES[selMonth].slice(0, 3)

  // Performance par service (période)
  const svcPerf = activeServices.map(svc => {
    const svcR = resas.filter(r => r.svc === svc.id && periodDays.some(d => d.iso === r.date) && r.s !== 'cancelled')
    const svcCvt = svcR.reduce((s, r) => s + r.c, 0)
    return { name: svc.name, icon: svc.icon || '', color: svc.color || 'var(--bl)', count: svcR.length, cvt: svcCvt }
  })

  // Canaux (jour)
  const canalCounts = {
    telephone: dayResas.filter(r => r.canal === 'telephone').length,
    walkin: dayResas.filter(r => r.canal === 'walkin').length,
    widget: dayResas.filter(r => r.canal === 'widget').length,
    email: dayResas.filter(r => r.canal === 'email').length,
    whatsapp: dayResas.filter(r => r.canal === 'whatsapp').length,
    sms: dayResas.filter(r => r.canal === 'sms').length,
  }

  // Tables (jour)
  const occupiedTbls = new Set(dayResas.filter(r => r.s === 'arrived' || r.s === 'reserved').map(r => r.tbl))
  const blockedTables = tables.filter(tb => tb.blocked).length
  const heldTables = activeTables.filter(tb => tb.held && !occupiedTbls.has(tb.n)).length
  const freeTables = activeTables.filter(tb => !occupiedTbls.has(tb.n) && !tb.held).length
  const occTables = activeTables.length - freeTables - heldTables

  // Badges journée complète (pas filtré par service — service déjà dans header)
  // Résas filtrées période + créneau (pour AttentionCards)
  const pDatesAttn = new Set(periodDays.map(d => d.iso))
  const filteredResas = resas.filter(r => pDatesAttn.has(r.date) && r.s !== 'cancelled' && (
    mealSlot === 'service' || mealSlot === 'jour' ? true :
    mealSlot === 'midi' ? r.svc === 'midi' || r.svc === 'brunch' || r.svc === 'dejeuner' :
    mealSlot === 'soir' ? r.svc === 'soir' || r.svc === 'diner' :
    true
  ))
  const vips = filteredResas.filter(r => r.statut === 2)
  const allergies = filteredResas.filter(r => r.allergie)
  const babies = filteredResas.reduce((s, r) => s + r.bebe, 0)
  const pmrs = filteredResas.reduce((s, r) => s + r.pmr, 0)

  // ── Tendance agrégée (semaines si >30j) ────────
  // Pour les charts tendance/noshow, toujours montrer au moins 7 jours de contexte
  const trendSource = (() => {
    if (period === 'day') {
      // Montrer 7 jours autour du jour sélectionné pour donner du contexte
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(selDay + 'T12:00:00')
        d.setDate(d.getDate() - 6 + i)
        const iso = toISO(d)
        const dayR = resas.filter(r => r.date === iso && r.s !== 'cancelled')
        const dayNS = resas.filter(r => r.date === iso && r.s === 'noshow')
        const dayAll = resas.filter(r => r.date === iso)
        return { iso, count: dayR.length, cvt: dayR.reduce((s, r) => s + r.c, 0), noshow: dayNS.length, total: dayAll.length }
      })
    }
    return periodDays
  })()

  const trendData = (() => {
    const source = trendSource
    if (source.length <= 14) {
      // Jour par jour
      const DAY_ABBR = ['D', 'L', 'M', 'M', 'J', 'V', 'S']
      return source.map(d => ({
        label: DAY_ABBR[new Date(d.iso + 'T12:00:00').getDay()],
        count: d.count,
        cvt: d.cvt,
        iso: d.iso,
        noshow: d.noshow,
        total: d.total,
      }))
    }
    if (numDaysInPeriod <= 90) {
      // Par semaine
      const weeks: { label: string; count: number; cvt: number; noshow: number; total: number; iso: string }[] = []
      for (let i = 0; i < periodDays.length; i += 7) {
        const chunk = periodDays.slice(i, i + 7)
        const d0 = new Date(chunk[0].iso + 'T12:00:00')
        weeks.push({
          label: `${d0.getDate()}/${d0.getMonth()+1}`,
          count: chunk.reduce((s, d) => s + d.count, 0),
          cvt: chunk.reduce((s, d) => s + d.cvt, 0),
          noshow: chunk.reduce((s, d) => s + d.noshow, 0),
          total: chunk.reduce((s, d) => s + d.total, 0),
          iso: chunk[0].iso,
        })
      }
      return weeks
    }
    // Par mois
    const months: { label: string; count: number; cvt: number; noshow: number; total: number; iso: string }[] = []
    const grouped: Record<string, typeof periodDays> = {}
    periodDays.forEach(d => {
      const key = d.iso.slice(0, 7) // YYYY-MM
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(d)
    })
    Object.entries(grouped).forEach(([key, days]) => {
      const [, m] = key.split('-')
      months.push({
        label: MONTH_NAMES[parseInt(m) - 1].slice(0, 3),
        count: days.reduce((s, d) => s + d.count, 0),
        cvt: days.reduce((s, d) => s + d.cvt, 0),
        noshow: days.reduce((s, d) => s + d.noshow, 0),
        total: days.reduce((s, d) => s + d.total, 0),
        iso: days[0].iso,
      })
    })
    return months
  })()

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
        {!isToday && (
          <span style={{
            fontSize: 11, fontWeight: 700, color: 'var(--am)',
            padding: '2px 8px', borderRadius: 5, background: 'var(--ap)',
          }}>
            📅 {fmtDate(activeDate)}
          </span>
        )}
      </div>

      {/* ── Accès rapide +Résa ── */}
      <div style={{
        borderBottom: '1px solid var(--border)', background: 'var(--surf)', flexShrink: 0,
        padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <button
          onClick={() => navigate('/nouvelle-resa')}
          style={{
            padding: '8px 18px', borderRadius: 10, border: 'none',
            background: 'linear-gradient(135deg,#6b3fa0,#a855f7)',
            color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer',
            fontFamily: 'var(--ff)',
          }}
        ><span style={{fontSize:14,marginRight:4}}>⚡</span>Rapide</button>
        <div style={{ flex: 1 }} />
        {/* Accès rapide aux vues principales */}
        {([
          { path: '/agenda', icon: '📅', label: 'Agenda' },
          { path: '/reservations', icon: '📖', label: 'Journal' },
          { path: '/plan', icon: '📐', label: 'Plan de salle' },
          { path: '/grille', icon: '🪑', label: 'Grille' },
        ] as const).map(v => (
          <button key={v.path} onClick={() => navigate(v.path)} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
            border: '1px solid var(--border)', background: 'var(--surf3)',
            fontSize: 12, fontWeight: 700, color: 'var(--t2)', fontFamily: 'var(--ff)',
            transition: 'all .12s',
          }}>
            <span style={{ fontSize: 13 }}>{v.icon}</span>
            {v.label}
          </button>
        ))}
      </div>

      {/* ── Corps scrollable ── */}
      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* ── ANALYSE — sélecteur de période bien visible ── */}
        <div style={{
          padding: '8px 18px 12px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
          borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
          background: 'var(--surf)',
        }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>📈 Analyse</span>
          {/* Passé / Futur */}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', borderRight: '1px solid var(--border)', paddingRight: 10, marginRight: 4 }}>
            <button onClick={() => setDirection('past')}
              style={{ ...filterChip(direction === 'past'), fontSize: 11, padding: '5px 12px' }}>
              Passé
            </button>
            <button onClick={() => setDirection('future')}
              style={{ ...filterChip(direction === 'future'), fontSize: 11, padding: '5px 12px' }}>
              Futur
            </button>
          </div>
          {/* Service / Midi / Soir / Jour */}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', borderRight: '1px solid var(--border)', paddingRight: 10, marginRight: 4 }}>
            <button onClick={() => setMealSlot('service')}
              style={{ ...filterChip(mealSlot === 'service'), fontSize: 11, padding: '5px 12px' }}>
              Service
            </button>
            <button onClick={() => setMealSlot('midi')}
              style={{ ...filterChip(mealSlot === 'midi'), fontSize: 11, padding: '5px 12px' }}>
              ☀ Midi
            </button>
            <button onClick={() => setMealSlot('soir')}
              style={{ ...filterChip(mealSlot === 'soir'), fontSize: 11, padding: '5px 12px' }}>
              🌙 Soir
            </button>
            <button onClick={() => setMealSlot('jour')}
              style={{ ...filterChip(mealSlot === 'jour'), fontSize: 11, padding: '5px 12px' }}>
              Jour
            </button>
          </div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {PERIODS.map(p => (
              <button key={p.key} onClick={() => setPeriod(p.key)}
                style={{ ...filterChip(period === p.key), fontSize: 11, padding: '5px 12px' }}>
                {p.label}
              </button>
            ))}
          </div>
          {/* Sélecteur jour */}
          {period === 'day' && (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginLeft: 4 }}>
              <button onClick={() => {
                const d = new Date(selDay + 'T12:00:00'); d.setDate(d.getDate() - 1); const iso = toISO(d); setSelDay(iso); setActiveDate(iso)
              }} style={{ border: '1px solid var(--border)', background: 'var(--surf3)', borderRadius: 5, padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--ff)', fontSize: 12, fontWeight: 700, color: 'var(--t2)' }}>◀</button>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', minWidth: 140, textAlign: 'center' }}>
                {periodLabel}
              </span>
              <button onClick={() => {
                const d = new Date(selDay + 'T12:00:00'); d.setDate(d.getDate() + 1); const iso = toISO(d); setSelDay(iso); setActiveDate(iso)
              }} style={{ border: '1px solid var(--border)', background: 'var(--surf3)', borderRadius: 5, padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--ff)', fontSize: 12, fontWeight: 700, color: 'var(--t2)' }}>▶</button>
            </div>
          )}
          {/* Sélecteur mois/année */}
          {period === 'month' && (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginLeft: 4 }}>
              <button onClick={() => {
                if (selMonth === 0) { setSelMonth(11); setSelYear(y => y - 1) } else setSelMonth(m => m - 1)
              }} style={{ border: '1px solid var(--border)', background: 'var(--surf3)', borderRadius: 5, padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--ff)', fontSize: 12, fontWeight: 700, color: 'var(--t2)' }}>◀</button>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', minWidth: 110, textAlign: 'center' }}>
                {MONTH_NAMES[selMonth]} {selYear}
              </span>
              <button onClick={() => {
                if (selMonth === 11) { setSelMonth(0); setSelYear(y => y + 1) } else setSelMonth(m => m + 1)
              }} style={{ border: '1px solid var(--border)', background: 'var(--surf3)', borderRadius: 5, padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--ff)', fontSize: 12, fontWeight: 700, color: 'var(--t2)' }}>▶</button>
            </div>
          )}
          {/* Sélecteur année */}
          {period === 'year' && (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginLeft: 4 }}>
              <button onClick={() => setSelYear(y => y - 1)}
                style={{ border: '1px solid var(--border)', background: 'var(--surf3)', borderRadius: 5, padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--ff)', fontSize: 12, fontWeight: 700, color: 'var(--t2)' }}>◀</button>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', minWidth: 50, textAlign: 'center' }}>
                {selYear}
              </span>
              <button onClick={() => setSelYear(y => y + 1)}
                style={{ border: '1px solid var(--border)', background: 'var(--surf3)', borderRadius: 5, padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--ff)', fontSize: 12, fontWeight: 700, color: 'var(--t2)' }}>▶</button>
            </div>
          )}
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)' }}>{periodLabel}</span>
        </div>

        {/* ── KPIs période ── */}
        <div style={{ padding: '12px 18px 14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
            <StatCard label={`Résas (${pTag})`} value={pResas} valueSecondary={pTotal} pct={pTotal > 0 ? Math.round(pResas / pTotal * 100) : 0} sub={`${avgResaPerDay}/jour en moy.`} color="var(--bl)" dotColor={slotColor} />
            <StatCard label={`Couverts (${pTag})`} value={pCvt} pct={activeTables.length > 0 && numDaysInPeriod > 0 ? Math.round(pCvt / (activeTables.reduce((s, tb) => s + tb.capMax, 0) * numDaysInPeriod) * 100) : 0} sub={`${avgCvtPerResa} cvt/résa`} color="var(--gn)" dotColor={slotColor} />
            <StatCard label={`Remplissage (${pTag})`} value={period === 'day' ? occTables : pResas} valueSecondary={period === 'day' ? activeTables.length : activeTables.length * numDaysInPeriod} pct={period === 'day' ? (activeTables.length > 0 ? Math.min(100, Math.round(occTables / activeTables.length * 100)) : 0) : (activeTables.length > 0 && numDaysInPeriod > 0 ? Math.min(100, Math.round(pResas / (activeTables.length * numDaysInPeriod) * 100)) : 0)} sub={period === 'day' ? `${activeTables.length} tables actives` : `${numDaysInPeriod > 0 ? (pResas / numDaysInPeriod).toFixed(0) : 0} résas/jour`} color={period === 'day' ? (occTables >= activeTables.length ? '#ef4444' : occTables >= activeTables.length * 0.7 ? '#f59e0b' : 'var(--gn)') : 'var(--bl)'} dotColor={slotColor} />
            <StatCard label={`No-shows (${pTag})`} value={pNS} valueSecondary={pTotal} pct={noshowRate} sub={`Taux : ${noshowRate}%`} color={noshowRate > 10 ? '#ef4444' : noshowRate > 5 ? '#f59e0b' : 'var(--gn)'} dotColor={slotColor} />
            <StatCard label={`Annulations (${pTag})`} value={pCancelled} valueSecondary={pTotal} pct={pTotal > 0 ? Math.round(pCancelled / pTotal * 100) : 0} sub={`sur ${pTotal} résas`} color="var(--t3)" dotColor={slotColor} />
          </div>
        </div>

        {/* ── 4 AttentionCards XL ── */}
        <div style={{ padding: '10px 18px 6px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          <AttentionCard icon="⭐" label="VIP" value={vips.length} sub={vips.length > 0 ? `${vips.length} client${vips.length > 1 ? 's' : ''} prioritaire${vips.length > 1 ? 's' : ''}` : 'Aucun VIP du jour'} color="#D4A017" bg="rgba(212,160,23,.08)" border="rgba(212,160,23,.25)" onClick={() => navigate('/reservations')} />
          <AttentionCard icon="⚠️" label="Allergies" value={allergies.length} sub={allergies.length > 0 ? 'Vigilance cuisine' : 'Aucune allergie signalée'} color="var(--am)" bg="var(--ap)" border="var(--ab)" onClick={() => navigate('/reservations')} />
          <AttentionCard icon="👶" label="Bébés" value={babies} sub={babies > 0 ? `${babies} chaise${babies > 1 ? 's' : ''} haute${babies > 1 ? 's' : ''}` : 'Aucun bébé'} color="#06b6d4" bg="rgba(6,182,212,.08)" border="rgba(6,182,212,.25)" onClick={() => navigate('/reservations')} />
          <AttentionCard icon="♿" label="PMR" value={pmrs} sub={pmrs > 0 ? 'Accès adapté requis' : 'Aucun PMR'} color="#a855f7" bg="rgba(168,85,247,.08)" border="rgba(168,85,247,.25)" onClick={() => navigate('/reservations')} />
        </div>

        {/* ── STATS — 3x2 grille ── */}
        <div style={{ padding: '0 18px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>

          {/* Distribution horaire (jour) */}
          <div className="card">
            <div style={{ ...sectionTitle, marginBottom: 10 }}>{t('dash.hourlyDistribution')}</div>
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
                    <div title={`${h}h: ${cnt} résa${cnt > 1 ? 's' : ''}`} style={{
                      width: '100%', minHeight: 3,
                      height: `${Math.round(cnt / maxH * 64)}px`,
                      borderRadius: '3px 3px 0 0',
                      background: cnt > 0 ? 'var(--bl)' : 'var(--surf3)',
                      transition: 'height .3s ease',
                    }} />
                    <span style={{ fontSize: 8, color: 'var(--t4)', fontFamily: 'var(--fm)' }}>{h}</span>
                  </div>
                ))
              })()}
            </div>
          </div>

          {/* Répartition par salle (jour) */}
          <div className="card">
            <div style={{ ...sectionTitle, marginBottom: 10 }}>{t('dash.roomBreakdown')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {salles.filter(s => s.active).map(salle => {
                // Table.salle contient le NOM de la salle, pas l'id (cf. types/index.ts:168)
                const salleTableNames = tables.filter(tb => tb.salle === salle.name && tb.active).map(tb => tb.n)
                const salleResas = dayResas.filter(r => salleTableNames.includes(r.tbl))
                const salleCvt = salleResas.reduce((s, r) => s + r.c, 0)
                const salleMax = tables.filter(tb => tb.salle === salle.name && tb.active).reduce((s, tb) => s + tb.capMax, 0)
                const pct = salleMax > 0 ? Math.round(salleCvt / salleMax * 100) : 0
                return (
                  <div key={salle.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>{salle.name}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--fm)', color: 'var(--t3)' }}>{salleCvt}/{salleMax}p · {pct}%</span>
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

          {/* Performance par service (période) */}
          <div className="card">
            <div style={{ ...sectionTitle, marginBottom: 10 }}>🍽️ Services ({pTag})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {svcPerf.length === 0 ? (
                <span style={{ fontSize: 11, color: 'var(--t4)' }}>Aucun service actif</span>
              ) : svcPerf.map(svc => {
                const maxSvcCount = Math.max(...svcPerf.map(s => s.count), 1)
                const pct = Math.round(svc.count / maxSvcCount * 100)
                return (
                  <div key={svc.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>{svc.icon} {svc.name}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--fm)', color: 'var(--t3)' }}>{svc.count} résas · {svc.cvt}p</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: 'var(--surf3)', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: svc.color, transition: 'width .3s ease' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Tendance (période — agrégé auto) */}
          <div className="card">
            <div style={{ ...sectionTitle, marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>📊 Couverts {period === 'day' ? '(7 derniers jours)' : numDaysInPeriod <= 14 ? '(jours)' : numDaysInPeriod <= 90 ? '(semaines)' : '(mois)'}</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--t3)', fontFamily: 'var(--fm)' }}>
                Moy. {trendData.length > 0 ? Math.round(trendData.reduce((s,d)=>s+d.cvt,0)/trendData.length) : 0} cvts/jour
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: trendData.length <= 14 ? 4 : 2, height: 70 }}>
              {(() => {
                const maxC = Math.max(...trendData.map(d => d.count), 1)
                return trendData.map((d, i) => {
                  const isActive = period === 'day' ? d.iso === selDay : d.iso === activeDate
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 0 }}>
                      <span style={{ fontSize: 8, fontWeight: 700, fontFamily: 'var(--fm)', color: 'var(--t3)' }}>{d.count}</span>
                      <div title={`${d.label}: ${d.count} résas, ${d.cvt} couverts`} style={{
                        width: '100%', minHeight: 4,
                        height: `${Math.round(d.count / maxC * 48)}px`,
                        borderRadius: 3,
                        background: isActive ? 'var(--bl)' : d.count > 0 ? 'var(--bp)' : 'var(--surf3)',
                        border: isActive ? '1px solid var(--bl)' : 'none',
                        transition: 'height .3s ease',
                      }} />
                      <span style={{
                        fontSize: trendData.length <= 14 ? 9 : 7, fontWeight: isActive ? 800 : 500,
                        color: isActive ? 'var(--bl)' : 'var(--t4)', fontFamily: 'var(--fm)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%',
                      }}>{d.label}</span>
                    </div>
                  )
                })
              })()}
            </div>
          </div>

          {/* Canaux — donut + centre % majoritaire */}
          <div className="card">
            <div style={{ ...sectionTitle, marginBottom: 10 }}>🎯 Sources ({pTag})</div>
            {(() => {
              const canals = [
                { key: 'telephone' as const, icon: CANAUX.telephone.icon, label: t(CANAUX.telephone.label), color: CANAUX.telephone.hex },
                { key: 'walkin' as const, icon: CANAUX.walkin.icon, label: t(CANAUX.walkin.label), color: CANAUX.walkin.hex },
                { key: 'widget' as const, icon: CANAUX.widget.icon, label: t(CANAUX.widget.label), color: CANAUX.widget.hex },
                { key: 'email' as const, icon: CANAUX.email.icon, label: t(CANAUX.email.label), color: CANAUX.email.hex },
                { key: 'whatsapp' as const, icon: CANAUX.whatsapp.icon, label: t(CANAUX.whatsapp.label), color: CANAUX.whatsapp.hex },
                { key: 'sms' as const, icon: CANAUX.sms.icon, label: t(CANAUX.sms.label), color: CANAUX.sms.hex },
              ]
              const total = canals.reduce((s,c)=>s+canalCounts[c.key],0) || 1
              const segs = canals.map(c=>({...c, cnt: canalCounts[c.key], pct: Math.round(canalCounts[c.key]/total*100)}))
              const top = segs.slice().sort((a,b)=>b.cnt-a.cnt)[0]
              let acc = 0
              const grad = segs.filter(s=>s.cnt>0).map(s => {
                const from = acc
                acc += s.cnt/total*100
                return `${s.color} ${from}% ${acc}%`
              }).join(', ') || 'var(--surf3) 0% 100%'
              return (
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ position: 'relative', width: 90, height: 90, flexShrink: 0 }}>
                    <div style={{ width: 90, height: 90, borderRadius: '50%', background: `conic-gradient(${grad})` }} />
                    <div style={{ position: 'absolute', inset: 14, borderRadius: '50%', background: 'var(--surf)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--fm)', lineHeight: 1 }}>{top ? top.pct : 0}%</span>
                      <span style={{ fontSize: 7, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: .5, marginTop: 2 }}>{top ? top.label : '—'}</span>
                    </div>
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {segs.filter(s=>s.cnt>0).slice(0,6).map(s=>(
                      <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                        <span style={{ flex: 1, color: 'var(--t2)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.icon} {s.label}</span>
                        <span style={{ fontFamily: 'var(--fm)', fontWeight: 700, color: 'var(--t3)' }}>{s.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}
          </div>

          {/* Taux no-show — évolution période */}
          <div className="card">
            <div style={{ ...sectionTitle, marginBottom: 10 }}>🚫 No-shows ({pTag})</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: trendData.length <= 14 ? 4 : 2, height: 60 }}>
              {(() => {
                const maxNS = Math.max(...trendData.map(d => d.noshow), 1)
                return trendData.map((d, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 0 }}>
                    <span style={{ fontSize: 8, fontWeight: 700, fontFamily: 'var(--fm)', color: d.noshow > 0 ? 'var(--rd)' : 'var(--t4)' }}>{d.noshow}</span>
                    <div title={`${d.label}: ${d.noshow} no-show${d.noshow > 1 ? 's' : ''} / ${d.total} résas`} style={{
                      width: '100%', minHeight: 3,
                      height: `${Math.round(d.noshow / maxNS * 40)}px`,
                      borderRadius: 3,
                      background: d.noshow > 0 ? (period === 'day' && d.iso === selDay ? 'var(--rd)' : 'rgba(220,80,80,.6)') : 'var(--surf3)',
                      transition: 'height .3s ease',
                    }} />
                    <span style={{ fontSize: trendData.length <= 14 ? 9 : 7, color: 'var(--t4)', fontFamily: 'var(--fm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{d.label}</span>
                  </div>
                ))
              })()}
            </div>
            <div style={{ marginTop: 8, fontSize: 11, fontWeight: 700, color: noshowRate > 10 ? 'var(--rd)' : 'var(--t3)', textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
              <span>Taux : {noshowRate}% sur {periodLabel}</span>
              {noshowRate > 8 && (
                <span style={{ background: 'rgba(239,68,68,.12)', color: 'var(--rd)', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, border: '1px solid rgba(239,68,68,.25)' }}>
                  📈 Tendance haute
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Top tables + Heatmap heures de pointe ── */}
        <div style={{ padding: '0 18px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

          {/* Top tables (période) */}
          <div className="card">
            <div style={{ ...sectionTitle, marginBottom: 10 }}>🏆 Top tables ({pTag})</div>
            {(() => {
              const counts: Record<string, number> = {}
              const pDates = new Set(periodDays.map(d => d.iso)); resas.filter(r => pDates.has(r.date) && r.s !== 'cancelled').forEach(r => { if (r.tbl) counts[r.tbl] = (counts[r.tbl]||0) + 1 })
              const rows = Object.entries(counts).map(([tid,cnt]) => {
                const tb = activeTables.find(x => x.id === tid)
                return { name: tb?.n || tid, cnt }
              }).sort((a,b)=>b.cnt-a.cnt).slice(0,6)
              const max = Math.max(...rows.map(r=>r.cnt), 1)
              if (rows.length === 0) return <div style={{ fontSize: 11, color: 'var(--t4)', textAlign: 'center', padding: '18px 0' }}>Aucune résa sur la période</div>
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {rows.map(r => (
                    <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--t2)', width: 34, fontFamily: 'var(--fm)' }}>{r.name}</span>
                      <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'var(--surf3)', overflow: 'hidden' }}>
                        <div style={{ width: `${r.cnt/max*100}%`, height: '100%', background: 'linear-gradient(90deg, var(--bl), var(--bp))', borderRadius: 4 }} />
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--t2)', width: 22, textAlign: 'right', fontFamily: 'var(--fm)' }}>{r.cnt}</span>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>

          {/* Heatmap heures de pointe 12h-21h × L-D */}
          <div className="card">
            <div style={{ ...sectionTitle, marginBottom: 10 }}>🔥 Heures de pointe ({pTag})</div>
            {(() => {
              const days = ['L','M','M','J','V','S','D']
              const hours = [12,13,14,15,16,17,18,19,20,21]
              const grid: number[][] = days.map(() => hours.map(() => 0))
              const pDates2 = new Set(periodDays.map(d => d.iso))
              resas.filter(r => pDates2.has(r.date) && r.s !== 'cancelled').forEach(r => {
                const d = new Date(r.date)
                const dow = (d.getDay() + 6) % 7
                const hh = parseInt((r.t || '00h00').split('h')[0], 10)
                const hi = hours.indexOf(hh)
                if (hi >= 0) grid[dow][hi] += (r.c || 0)
              })
              const max = Math.max(...grid.flat(), 1)
              return (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: `18px repeat(${hours.length}, 1fr)`, gap: 2, alignItems: 'center' }}>
                    <span />
                    {hours.map(h => <span key={h} style={{ fontSize: 8, color: 'var(--t4)', fontFamily: 'var(--fm)', textAlign: 'center' }}>{h}</span>)}
                    {days.map((dl, di) => (
                      <Fragment key={di}>
                        <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--t3)', fontFamily: 'var(--fm)' }}>{dl}</span>
                        {grid[di].map((v, hi) => (
                          <div key={hi} title={`${dl} ${hours[hi]}h : ${v} cvts`} style={{ aspectRatio: '1', minHeight: 14, borderRadius: 3, background: v === 0 ? 'var(--surf3)' : `rgba(59,130,246,${0.15 + (v/max)*0.75})` }} />
                        ))}
                      </Fragment>
                    ))}
                  </div>
                  <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4, fontSize: 8, color: 'var(--t4)', justifyContent: 'flex-end' }}>
                    <span>0</span>
                    <div style={{ width: 50, height: 5, borderRadius: 3, background: 'linear-gradient(90deg, var(--surf3), rgba(59,130,246,0.9))' }} />
                    <span>{max}</span>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>

      </div>
    </div>
  )
}
