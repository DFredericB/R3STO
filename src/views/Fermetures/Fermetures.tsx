import { useState, useMemo } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useTranslation'
import { useToast } from '../../components/ui/Toast'
import type { Fermeture } from '../../types/index'

// ══════════════════════════════════════════════════
//  R3STO — Fermetures
//  Vue agenda calendrier + formulaire + liste
//  Calendrier mensuel affichant visuellement les
//  fermetures, jours fériés et vacances.
// ══════════════════════════════════════════════════

// Swiss public holidays 2026
const FERIES_CH = [
  { date: '2026-01-01', label: 'Jour de l\'an' },
  { date: '2026-04-19', label: 'Dimanche de Pâques' },
  { date: '2026-04-20', label: 'Lundi de Pâques' },
  { date: '2026-05-01', label: 'Fête du Travail' },
  { date: '2026-05-28', label: 'Ascension' },
  { date: '2026-06-08', label: 'Pentecôte' },
  { date: '2026-08-01', label: 'Fête nationale suisse' },
  { date: '2026-12-25', label: 'Noël' },
  { date: '2026-12-26', label: 'Deuxième jour de Noël' },
]

const TYPE_ICONS: Record<string, string> = {
  restaurant: '🏪', salle: '🚪', service: '⏰', vacances: '🌴',
  ferie: '🏖', exception: '⚠️', travaux: '🔧',
}

const TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  restaurant: { bg: 'rgba(220,80,80,.15)', border: 'rgba(220,80,80,.4)', text: 'var(--rd)' },
  salle:      { bg: 'rgba(144,96,224,.12)', border: 'rgba(144,96,224,.35)', text: '#b482ff' },
  service:    { bg: 'rgba(68,128,216,.12)', border: 'rgba(68,128,216,.35)', text: 'var(--bl)' },
  vacances:   { bg: 'rgba(60,200,112,.12)', border: 'rgba(60,200,112,.35)', text: 'var(--gn)' },
  ferie:      { bg: 'rgba(232,165,48,.12)', border: 'rgba(232,165,48,.35)', text: 'var(--am)' },
  exception:  { bg: 'rgba(220,80,80,.10)', border: 'rgba(220,80,80,.30)', text: 'var(--rd)' },
  travaux:    { bg: 'rgba(100,116,139,.12)', border: 'rgba(100,116,139,.35)', text: 'var(--t2)' },
}

// ── Helpers ────────────────────────────────────
function toISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfWeek(year: number, month: number): number {
  // 0=Mon, 6=Sun (ISO week)
  const d = new Date(year, month, 1).getDay()
  return d === 0 ? 6 : d - 1
}

export function Fermetures() {
  const { t, days, months } = useT()
  const { fermetures, salles, services } = useAppStore()
  const { toast } = useToast()

  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [fermType, setFermType] = useState('restaurant')
  const [selectedSalle, setSelectedSalle] = useState('')
  const [selectedService, setSelectedService] = useState('')
  const [tab, setTab] = useState<'calendar' | 'list'>('calendar')

  // Demo data
  const demoFermetures: Fermeture[] = [
    { id: 'f1', type: 'vacances', date: '2026-08-01', dateFin: '2026-08-16', label: 'Vacances été', note: 'Fermeture complète du restaurant', active: true },
    { id: 'f2', type: 'ferie', date: '2026-12-25', label: 'Noël', active: true },
    { id: 'f3', type: 'ferie', date: '2026-12-26', label: 'Deuxième jour de Noël', active: true },
    { id: 'f4', type: 'restaurant', date: '2026-04-20', label: 'Lundi de Pâques', active: true },
    { id: 'f5', type: 'travaux', date: '2026-06-15', dateFin: '2026-06-17', label: 'Travaux terrasse', note: 'Rénovation terrasse extérieure', active: true },
  ]
  const activeFermetures = fermetures.length === 0 ? demoFermetures : fermetures
  const activeSalles = salles.length > 0 ? salles : [{ id: 's1', name: 'Salle principale', color: '#4480d8', active: true }]
  const activeServices = services.length > 0 ? services : []

  // ── Calendar data ────────────────────────────
  const calData = useMemo(() => {
    const { year, month } = calMonth
    const daysInMonth = getDaysInMonth(year, month)
    const firstDay = getFirstDayOfWeek(year, month)
    const today = toISO(new Date())

    // Build closure map for this month
    const closureMap: Record<string, Fermeture[]> = {}
    for (const f of activeFermetures) {
      if (!f.active) continue
      const start = f.date
      const end = f.dateFin || f.date
      // Check each day in range that falls in this month
      const d = new Date(start + 'T12:00:00')
      const endD = new Date(end + 'T12:00:00')
      while (d <= endD) {
        if (d.getFullYear() === year && d.getMonth() === month) {
          const iso = toISO(d)
          if (!closureMap[iso]) closureMap[iso] = []
          closureMap[iso].push(f)
        }
        d.setDate(d.getDate() + 1)
      }
    }

    // Holiday map
    const holidayMap: Record<string, string> = {}
    for (const h of FERIES_CH) {
      const hd = new Date(h.date + 'T12:00:00')
      if (hd.getFullYear() === year && hd.getMonth() === month) {
        holidayMap[h.date] = h.label
      }
    }

    return { daysInMonth, firstDay, today, closureMap, holidayMap }
  }, [calMonth, activeFermetures])

  // ── Closures for selected date ───────────────
  const selectedClosures = useMemo(() => {
    if (!selectedDate) return []
    return activeFermetures.filter(f => {
      if (!f.active) return false
      const end = f.dateFin || f.date
      return selectedDate >= f.date && selectedDate <= end
    })
  }, [selectedDate, activeFermetures])

  // ── Handlers ────────────────────────────────
  const handleAddFermeture = () => { toast(t('ferm.added'), 'success') }
  const handleToggleFermeture = (_id: string) => { toast(t('ferm.statusUpdated'), 'success') }
  const handleAddHoliday = (date: string, label: string) => { toast(`${label} — ${t('ferm.markedClosed')}`, 'success') }

  const prevMonth = () => setCalMonth(p => p.month === 0 ? { year: p.year - 1, month: 11 } : { ...p, month: p.month - 1 })
  const nextMonth = () => setCalMonth(p => p.month === 11 ? { year: p.year + 1, month: 0 } : { ...p, month: p.month + 1 })
  const goToday = () => {
    const now = new Date()
    setCalMonth({ year: now.getFullYear(), month: now.getMonth() })
    setSelectedDate(toISO(now))
  }

  // ── Shared styles ───────────────────────────
  const inputS: React.CSSProperties = { width: '100%', padding: '8px', fontSize: 11, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surf)', color: 'var(--text)', fontFamily: 'var(--ff)', boxSizing: 'border-box' }
  const labelS: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4, color: 'var(--text)' }
  const navBtn: React.CSSProperties = { width: 32, height: 32, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surf3)', color: 'var(--t2)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }

  // ── Day header (Lun, Mar, …) ────────────────
  // days from useT() is [Dim, Lun, Mar, Mer, Jeu, Ven, Sam]
  // We want ISO order: [Lun, Mar, Mer, Jeu, Ven, Sam, Dim]
  const dayHeaders = [...days.slice(1), days[0]]

  // ── Render ──────────────────────────────────
  return (
    <div style={{ padding: '14px 18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* ═══ Header : titre + tabs + nav mois ═══ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>📅 {t('ferm.title')}</div>
        <div style={{ display: 'flex', gap: 2, background: 'var(--surf2)', borderRadius: 7, padding: 2 }}>
          {(['calendar', 'list'] as const).map(v => (
            <button key={v} onClick={() => setTab(v)} style={{
              padding: '5px 12px', fontSize: 11, fontWeight: tab === v ? 700 : 500, borderRadius: 6, border: 'none', cursor: 'pointer',
              background: tab === v ? 'var(--bl)' : 'transparent', color: tab === v ? '#fff' : 'var(--t3)',
            }}>
              {v === 'calendar' ? t('ferm.tabCalendar') : t('ferm.tabList')}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        {/* Month nav */}
        <button onClick={prevMonth} style={navBtn}>◀</button>
        <button onClick={goToday} style={{ ...navBtn, width: 'auto', padding: '0 10px', fontSize: 12, fontWeight: 700, color: 'var(--bl)', border: '1px solid var(--b2)', background: 'var(--bp)' }}>
          {t('ferm.today')}
        </button>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', minWidth: 120, textAlign: 'center' }}>
          {months[calMonth.month]} {calMonth.year}
        </div>
        <button onClick={nextMonth} style={navBtn}>▶</button>
      </div>

      {tab === 'calendar' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 14, alignItems: 'start' }}>
          {/* ═══ LEFT: Calendar grid ═══ */}
          <div style={{ background: 'var(--surf2)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
            {/* Day headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
              {dayHeaders.map((d, i) => (
                <div key={i} style={{ fontSize: 10, fontWeight: 700, color: i === 6 ? 'var(--rd)' : 'var(--t4)', textAlign: 'center', padding: '4px 0', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                  {d.slice(0, 3)}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
              {/* Empty cells before first day */}
              {Array.from({ length: calData.firstDay }).map((_, i) => (
                <div key={`e-${i}`} style={{ minHeight: 64 }} />
              ))}

              {/* Days */}
              {Array.from({ length: calData.daysInMonth }).map((_, i) => {
                const day = i + 1
                const iso = `${calMonth.year}-${String(calMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const isToday = iso === calData.today
                const isSelected = iso === selectedDate
                const closures = calData.closureMap[iso] || []
                const holiday = calData.holidayMap[iso]
                const isClosed = closures.length > 0
                const isSunday = (calData.firstDay + i) % 7 === 6

                return (
                  <div
                    key={day}
                    onClick={() => setSelectedDate(iso === selectedDate ? null : iso)}
                    style={{
                      minHeight: 64, padding: '3px 4px', borderRadius: 7, cursor: 'pointer',
                      border: isSelected ? '2px solid var(--bl)' : isToday ? '2px solid var(--b2)' : '1px solid transparent',
                      background: isClosed ? 'rgba(220,80,80,.08)' : holiday ? 'rgba(232,165,48,.06)' : isToday ? 'var(--bp)' : 'transparent',
                      transition: 'all .1s',
                    }}
                  >
                    {/* Day number */}
                    <div style={{
                      fontSize: 11, fontWeight: isToday ? 800 : 600,
                      color: isClosed ? 'var(--rd)' : isSunday ? 'rgba(220,80,80,.6)' : isToday ? 'var(--bl)' : 'var(--text)',
                      marginBottom: 2,
                    }}>
                      {day}
                    </div>

                    {/* Closure indicators */}
                    {closures.slice(0, 2).map((f, ci) => {
                      const colors = TYPE_COLORS[f.type] || TYPE_COLORS.restaurant
                      return (
                        <div key={ci} style={{
                          fontSize: 8, fontWeight: 700, padding: '1px 3px', borderRadius: 3, marginBottom: 1,
                          background: colors.bg, color: colors.text,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {TYPE_ICONS[f.type] || '📅'} {f.label}
                        </div>
                      )
                    })}
                    {closures.length > 2 && (
                      <div style={{ fontSize: 8, color: 'var(--t4)', fontWeight: 600 }}>+{closures.length - 2}</div>
                    )}

                    {/* Holiday badge (if no closure) */}
                    {!isClosed && holiday && (
                      <div style={{ fontSize: 8, fontWeight: 600, color: 'var(--am)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        🇨🇭 {holiday}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 10, marginTop: 10, padding: '6px 0', borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
              {Object.entries(TYPE_COLORS).map(([type, c]) => (
                <span key={type} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, color: 'var(--t3)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: c.bg, border: `1px solid ${c.border}` }} />
                  {TYPE_ICONS[type]} {t(`ferm.type.${type}`)}
                </span>
              ))}
            </div>
          </div>

          {/* ═══ RIGHT: Selected date detail + form ═══ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Selected date detail */}
            {selectedDate && (
              <div style={{ background: 'var(--surf2)', border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                  📆 {selectedDate.slice(8)}/{selectedDate.slice(5, 7)}/{selectedDate.slice(0, 4)}
                </div>
                {selectedClosures.length === 0 ? (
                  <div style={{ fontSize: 11, color: 'var(--t3)', padding: '6px 0' }}>{t('ferm.noClosure')}</div>
                ) : (
                  selectedClosures.map(f => {
                    const colors = TYPE_COLORS[f.type] || TYPE_COLORS.restaurant
                    return (
                      <div key={f.id} style={{ padding: '6px 8px', marginBottom: 4, borderRadius: 6, background: colors.bg, border: `1px solid ${colors.border}` }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: colors.text }}>
                          {TYPE_ICONS[f.type]} {f.label}
                        </div>
                        {f.dateFin && f.dateFin !== f.date && (
                          <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'DM Mono,monospace', marginTop: 2 }}>
                            {f.date.slice(5).replace('-', '/')} → {f.dateFin.slice(5).replace('-', '/')}
                          </div>
                        )}
                        {f.note && <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 2 }}>{f.note}</div>}
                      </div>
                    )
                  })
                )}
              </div>
            )}

            {/* Add closure form */}
            <div style={{ background: 'var(--surf2)', border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>
                ➕ {t('ferm.new')}
              </div>

              <div style={{ marginBottom: 8 }}>
                <label style={labelS}>{t('ferm.scope')}</label>
                <select value={fermType} onChange={e => { setFermType(e.target.value); setSelectedSalle(''); setSelectedService('') }} style={inputS}>
                  <option value="restaurant">🏪 {t('ferm.type.restaurant')}</option>
                  <option value="salle">🚪 {t('ferm.type.salle')}</option>
                  <option value="service">⏰ {t('ferm.type.service')}</option>
                  <option value="salle_service">🎯 {t('ferm.type.salleService')}</option>
                  <option value="vacances">🌴 {t('ferm.type.vacances')}</option>
                  <option value="ferie">🏖 {t('ferm.type.ferie')}</option>
                  <option value="travaux">🔧 {t('ferm.type.travaux')}</option>
                </select>
              </div>

              {(fermType === 'salle' || fermType === 'salle_service') && (
                <div style={{ marginBottom: 8 }}>
                  <label style={labelS}>{t('ferm.roomLabel')}</label>
                  <select value={selectedSalle} onChange={e => setSelectedSalle(e.target.value)} style={inputS}>
                    <option value="">{t('ferm.allRooms')}</option>
                    {activeSalles.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}

              {(fermType === 'service' || fermType === 'salle_service') && (
                <div style={{ marginBottom: 8 }}>
                  <label style={labelS}>{t('ferm.serviceLabel')}</label>
                  <select value={selectedService} onChange={e => setSelectedService(e.target.value)} style={inputS}>
                    <option value="">{t('ferm.allServices')}</option>
                    {activeServices.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
                  </select>
                </div>
              )}

              <div style={{ marginBottom: 8 }}>
                <label style={labelS}>{t('ferm.label')} <span style={{ color: 'var(--rd)' }}>*</span></label>
                <input type="text" placeholder={t('ferm.labelPlaceholder')} style={inputS} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
                <div>
                  <label style={labelS}>{t('ferm.start')} <span style={{ color: 'var(--rd)' }}>*</span></label>
                  <input type="date" defaultValue={selectedDate || ''} style={inputS} />
                </div>
                <div>
                  <label style={labelS}>{t('ferm.end')}</label>
                  <input type="date" style={inputS} />
                </div>
              </div>

              <div style={{ marginBottom: 8 }}>
                <label style={labelS}>{t('ferm.note')}</label>
                <input type="text" placeholder={t('ferm.notePlaceholder')} style={inputS} />
              </div>

              {/* Widget message */}
              <div style={{ margin: '6px 0', padding: '8px 10px', background: 'rgba(68,128,216,.06)', border: '1px solid rgba(68,128,216,.15)', borderRadius: 7 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--bl)', marginBottom: 4 }}>
                  🔌 {t('ferm.widgetMsg')}
                </div>
                <input type="text" placeholder={t('ferm.widgetPlaceholder')} style={{ ...inputS, marginBottom: 2 }} />
                <div style={{ fontSize: 10, color: 'var(--t3)' }}>{t('ferm.widgetHint')}</div>
              </div>

              <button onClick={handleAddFermeture} style={{
                width: '100%', marginTop: 6, padding: '9px', fontSize: 11, fontWeight: 700,
                background: 'var(--bl)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer',
              }}>
                {t('ferm.add')}
              </button>
            </div>

            {/* Swiss holidays quick-add */}
            <div style={{ background: 'var(--surf2)', border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--bl)', marginBottom: 6 }}>
                🇨🇭 {t('ferm.swissHolidays')}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {FERIES_CH.map(f => (
                  <span key={f.date} onClick={() => handleAddHoliday(f.date, f.label)} style={{
                    fontSize: 10, padding: '2px 7px', background: 'rgba(68,128,216,.08)', border: '1px solid rgba(68,128,216,.2)',
                    borderRadius: 4, color: 'var(--bl)', cursor: 'pointer',
                  }}>
                    {f.date.slice(5).replace('-', '/')} {f.label}
                  </span>
                ))}
              </div>
              <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 4 }}>{t('ferm.clickToAdd')}</div>
            </div>
          </div>
        </div>
      ) : (
        /* ═══ TAB LIST — vue liste classique ═══ */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {/* Closures list */}
          <div style={{ background: 'var(--surf2)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, color: 'var(--text)' }}>
              {t('ferm.planned')}
            </div>
            {activeFermetures.length === 0 ? (
              <div style={{ fontSize: 11, color: 'var(--t3)', textAlign: 'center', padding: '20px 0' }}>
                {t('ferm.noClosures')}
              </div>
            ) : (
              activeFermetures.map(f => {
                const colors = TYPE_COLORS[f.type] || TYPE_COLORS.restaurant
                return (
                  <div key={f.id} style={{
                    marginBottom: 8, padding: '9px 14px', background: colors.bg, border: `1px solid ${colors.border}`,
                    borderRadius: 9, display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <span style={{ fontSize: 16 }}>{TYPE_ICONS[f.type] || '📅'}</span>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: colors.text }}>{f.label}</span>
                      {f.dateFin && f.dateFin !== f.date && (
                        <span style={{ fontSize: 11, color: 'var(--t3)', marginLeft: 8, fontFamily: 'DM Mono,monospace' }}>
                          {f.date.slice(5).replace('-', '/')} → {f.dateFin.slice(5).replace('-', '/')}
                        </span>
                      )}
                      {!f.dateFin && (
                        <span style={{ fontSize: 11, color: 'var(--t3)', marginLeft: 8, fontFamily: 'DM Mono,monospace' }}>
                          {f.date.slice(5).replace('-', '/')}
                        </span>
                      )}
                      {f.note && <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>{f.note}</div>}
                    </div>
                    <button onClick={() => handleToggleFermeture(f.id)} style={{
                      fontSize: 11, padding: '3px 9px', background: colors.text, border: 'none',
                      borderRadius: 6, color: '#fff', fontWeight: 700, cursor: 'pointer',
                    }}>
                      {t('ferm.manage')}
                    </button>
                  </div>
                )
              })
            )}
          </div>

          {/* Right: Widget settings + Swiss holidays */}
          <div>
            <div style={{ background: 'var(--surf2)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--bl)', marginBottom: 6 }}>
                🔌 {t('ferm.defaultWidgetMsg')}
              </div>
              <input type="text" defaultValue={t('ferm.defaultWidgetValue')} style={{ ...inputS, marginBottom: 4 }} />
              <div style={{ fontSize: 11, color: 'var(--t3)' }}>
                {t('ferm.defaultWidgetHint')} · <span style={{ color: 'var(--bl)', cursor: 'pointer' }}>{t('ferm.widgetSettings')} →</span>
              </div>
            </div>

            <div style={{ background: 'var(--surf2)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--bl)', marginBottom: 8 }}>
                🇨🇭 {t('ferm.swissHolidays')}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {FERIES_CH.map(f => (
                  <span key={f.date} onClick={() => handleAddHoliday(f.date, f.label)} style={{
                    fontSize: 11, padding: '3px 9px', background: 'rgba(68,128,216,.08)', border: '1px solid rgba(68,128,216,.2)',
                    borderRadius: 5, color: 'var(--bl)', cursor: 'pointer',
                  }}>
                    {f.date.slice(5).replace('-', '/')} {f.label}
                  </span>
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 6 }}>{t('ferm.clickToAdd')}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
