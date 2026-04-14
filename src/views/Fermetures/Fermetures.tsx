import { useState, useMemo } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useTranslation'
import { useToast } from '../../components/ui/Toast'
import type { Fermeture } from '../../types/index'

// Swiss public holidays 2026
const FERIES_CH = [
  { date: '2026-01-01', label: "Jour de l'an" },
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

export function Fermetures() {
  const { t } = useT()
  const { fermetures, salles, services, addFermeture, updateFermeture, deleteFermeture } = useAppStore()
  const { toast } = useToast()

  // Form state
  const [fermType, setFermType] = useState('restaurant')
  const [selectedSalle, setSelectedSalle] = useState('')
  const [selectedService, setSelectedService] = useState('')
  const [fermLabel, setFermLabel] = useState('')
  const [fermStart, setFermStart] = useState('')
  const [fermEnd, setFermEnd] = useState('')
  const [fermNote, setFermNote] = useState('')
  const [widgetMsg, setWidgetMsg] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [filterType, setFilterType] = useState('all')

  // (demo data removed — reads directly from store)
  const activeFermetures = fermetures
  const activeSalles = salles
  const activeServices = services

  // Filter closures
  const filteredFermetures = useMemo(() => {
    let list = [...activeFermetures]
    if (filterType !== 'all') list = list.filter(f => f.type === filterType)
    // Sort by date, upcoming first
    list.sort((a, b) => a.date.localeCompare(b.date))
    return list
  }, [activeFermetures, filterType])

  // Group by status: upcoming vs past
  const today = new Date().toISOString().slice(0, 10)
  const upcoming = filteredFermetures.filter(f => (f.dateFin || f.date) >= today)
  const past = filteredFermetures.filter(f => (f.dateFin || f.date) < today)

  // Handlers
  const handleAddFermeture = () => {
    if (!fermLabel || !fermStart) {
      toast(t('ferm.fillRequired'), 'error')
      return
    }
    const newF: Fermeture = {
      id: `ferm_${Date.now()}`,
      type: fermType as Fermeture['type'],
      date: fermStart,
      dateFin: fermEnd || undefined,
      label: fermLabel,
      note: fermNote || undefined,
      salle: fermType === 'salle' ? selectedSalle : undefined,
      service: fermType === 'service' ? selectedService : undefined,
      active: true,
    }
    addFermeture(newF)
    toast(t('ferm.added'), 'success')
    setFermLabel(''); setFermStart(''); setFermEnd(''); setFermNote(''); setWidgetMsg('')
    setShowForm(false)
  }
  const handleToggleFermeture = (id: string) => {
    const f = activeFermetures.find(x => x.id === id)
    if (f) {
      updateFermeture(id, { active: !f.active })
      toast(t('ferm.statusUpdated'), 'success')
    }
  }
  const handleDeleteFermeture = (id: string) => {
    deleteFermeture(id)
    toast(t('ferm.deleted') || 'Fermeture supprimée', 'success')
  }
  const handleAddHoliday = (date: string, label: string) => {
    // Check if already exists
    if (activeFermetures.some(f => f.date === date && f.type === 'ferie')) {
      toast('Déjà ajouté', 'warning')
      return
    }
    const quickF = {
      id: `ferie_${Date.now()}_${date}`,
      type: 'ferie' as const,
      date,
      label,
      active: true,
    }
    addFermeture(quickF)
    toast(`${label} — ${t('ferm.markedClosed')}`, 'success')
  }

  // Styles
  const inputS: React.CSSProperties = { width: '100%', padding: '8px 10px', fontSize: 12, border: '1px solid var(--border)', borderRadius: 7, background: 'var(--surf)', color: 'var(--text)', fontFamily: 'var(--ff)', boxSizing: 'border-box' }
  const labelS: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4, color: 'var(--text)' }
  const chipS = (on: boolean): React.CSSProperties => ({
    padding: '5px 12px', borderRadius: 7, fontSize: 11, fontWeight: on ? 700 : 500, cursor: 'pointer',
    border: `1.5px solid ${on ? 'rgba(91,156,246,.5)' : 'var(--border)'}`,
    background: on ? 'rgba(91,156,246,.15)' : 'var(--surf3)',
    color: on ? '#7bb8ff' : 'var(--t3)',
    transition: 'all .12s',
  })

  // Scope label helper
  const scopeLabel = (f: Fermeture) => {
    if (f.type === 'salle' && f.salle) return `🚪 ${f.salle}`
    if (f.type === 'service' && f.service) return `⏰ ${f.service}`
    return null
  }

  // Duration helper
  const durationLabel = (f: Fermeture) => {
    if (!f.dateFin || f.dateFin === f.date) return f.date.slice(5).replace('-', '/')
    const d1 = new Date(f.date + 'T12:00:00')
    const d2 = new Date(f.dateFin + 'T12:00:00')
    const days = Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1
    return `${f.date.slice(5).replace('-', '/')} → ${f.dateFin.slice(5).replace('-', '/')} (${days}j)`
  }

  return (
    <div style={{ padding: '14px 18px 20px', display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 960 }}>
      {/* ═══ Header ═══ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>📅 {t('ferm.title')}</div>
        <div style={{ flex: 1 }} />
        <button onClick={() => setShowForm(!showForm)} style={{
          padding: '7px 16px', fontSize: 12, fontWeight: 700, borderRadius: 7, cursor: 'pointer',
          background: showForm ? 'var(--surf3)' : 'var(--bl)', color: showForm ? 'var(--t2)' : '#fff',
          border: showForm ? '1px solid var(--border)' : 'none',
        }}>
          {showForm ? '✕ ' + t('ferm.cancel') : '➕ ' + t('ferm.new')}
        </button>
      </div>

      {/* ═══ Add form (collapsible) ═══ */}
      {showForm && (
        <div style={{ background: 'var(--surf2)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'var(--text)' }}>
            {t('ferm.new')}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* Left column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Scope */}
              <div>
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

              {/* Conditional salle/service selectors */}
              {(fermType === 'salle' || fermType === 'salle_service') && (
                <div>
                  <label style={labelS}>{t('ferm.roomLabel')}</label>
                  <select value={selectedSalle} onChange={e => setSelectedSalle(e.target.value)} style={inputS}>
                    <option value="">{t('ferm.allRooms')}</option>
                    {activeSalles.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}

              {(fermType === 'service' || fermType === 'salle_service') && (
                <div>
                  <label style={labelS}>{t('ferm.serviceLabel')}</label>
                  <select value={selectedService} onChange={e => setSelectedService(e.target.value)} style={inputS}>
                    <option value="">{t('ferm.allServices')}</option>
                    {activeServices.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
                  </select>
                </div>
              )}

              {/* Label */}
              <div>
                <label style={labelS}>{t('ferm.label')} <span style={{ color: 'var(--rd)' }}>*</span></label>
                <input type="text" value={fermLabel} onChange={e => setFermLabel(e.target.value)} placeholder={t('ferm.labelPlaceholder')} style={inputS} />
              </div>
            </div>

            {/* Right column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Date pickers — the core of the rework */}
              <div>
                <label style={labelS}>{t('ferm.start')} <span style={{ color: 'var(--rd)' }}>*</span></label>
                <input type="date" value={fermStart} onChange={e => { setFermStart(e.target.value); if (!fermEnd || e.target.value > fermEnd) setFermEnd(e.target.value) }} style={{ ...inputS, fontSize: 13, fontWeight: 600, padding: '10px 12px' }} />
              </div>
              <div>
                <label style={labelS}>{t('ferm.end')}</label>
                <input type="date" value={fermEnd} min={fermStart} onChange={e => setFermEnd(e.target.value)} style={{ ...inputS, fontSize: 13, fontWeight: 600, padding: '10px 12px' }} />
                <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 3 }}>
                  {fermStart && fermEnd && fermStart !== fermEnd
                    ? `${Math.round((new Date(fermEnd+'T12:00:00').getTime() - new Date(fermStart+'T12:00:00').getTime()) / 86400000) + 1} jours`
                    : fermStart && !fermEnd ? '1 jour' : ''}
                </div>
              </div>

              {/* Note */}
              <div>
                <label style={labelS}>{t('ferm.note')}</label>
                <input type="text" value={fermNote} onChange={e => setFermNote(e.target.value)} placeholder={t('ferm.notePlaceholder')} style={inputS} />
              </div>

              {/* Widget message */}
              <div style={{ padding: '8px 10px', background: 'rgba(68,128,216,.06)', border: '1px solid rgba(68,128,216,.15)', borderRadius: 7 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--bl)', marginBottom: 4 }}>
                  🔌 {t('ferm.widgetMsg')}
                </div>
                <input type="text" value={widgetMsg} onChange={e => setWidgetMsg(e.target.value)} placeholder={t('ferm.widgetPlaceholder')} style={{ ...inputS, marginBottom: 2 }} />
                <div style={{ fontSize: 10, color: 'var(--t3)' }}>{t('ferm.widgetHint')}</div>
              </div>
            </div>
          </div>

          <button onClick={handleAddFermeture} style={{
            marginTop: 12, padding: '10px 24px', fontSize: 12, fontWeight: 700,
            background: 'var(--bl)', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer',
          }}>
            {t('ferm.add')}
          </button>
        </div>
      )}

      {/* ═══ Filter chips ═══ */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={() => setFilterType('all')} style={chipS(filterType === 'all')}>
          {t('toolbar.all')} ({activeFermetures.length})
        </button>
        {Object.entries(TYPE_ICONS).map(([type, icon]) => {
          const cnt = activeFermetures.filter(f => f.type === type).length
          if (cnt === 0) return null
          return (
            <button key={type} onClick={() => setFilterType(type)} style={chipS(filterType === type)}>
              {icon} {t(`ferm.type.${type}`)} ({cnt})
            </button>
          )
        })}
      </div>

      {/* ═══ Upcoming closures ═══ */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
          {t('ferm.upcoming') || 'À venir'} ({upcoming.length})
        </div>
        {upcoming.length === 0 ? (
          <div style={{ padding: '16px', textAlign: 'center', fontSize: 12, color: 'var(--t4)', background: 'var(--surf2)', borderRadius: 10, border: '1px solid var(--border)' }}>
            {t('ferm.noClosures')}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {upcoming.map(f => {
              const colors = TYPE_COLORS[f.type] || TYPE_COLORS.restaurant
              const scope = scopeLabel(f)
              const isActive = today >= f.date && today <= (f.dateFin || f.date)
              return (
                <div key={f.id} style={{
                  padding: '10px 14px', background: colors.bg, border: `1.5px solid ${colors.border}`,
                  borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10,
                  boxShadow: isActive ? `0 0 12px ${colors.border}` : 'none',
                }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{TYPE_ICONS[f.type] || '📅'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: colors.text }}>{f.label}</span>
                      {isActive && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: colors.text, color: '#fff' }}>
                          EN COURS
                        </span>
                      )}
                      {scope && (
                        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--t3)', padding: '1px 6px', background: 'var(--surf3)', borderRadius: 4 }}>
                          {scope}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'DM Mono,monospace', marginTop: 2 }}>
                      {durationLabel(f)}
                    </div>
                    {f.note && <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>{f.note}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button onClick={() => handleToggleFermeture(f.id)} title={t('ferm.manage')} style={{
                      width: 30, height: 30, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surf3)',
                      color: 'var(--t2)', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>✏️</button>
                    <button onClick={() => handleDeleteFermeture(f.id)} title="Supprimer" style={{
                      width: 30, height: 30, borderRadius: 6, border: '1px solid rgba(220,80,80,.3)', background: 'rgba(220,80,80,.08)',
                      color: 'var(--rd)', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>🗑</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ═══ Past closures (collapsed) ═══ */}
      {past.length > 0 && (
        <details style={{ marginTop: 4 }}>
          <summary style={{ fontSize: 11, fontWeight: 700, color: 'var(--t4)', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '.06em' }}>
            {t('ferm.past') || 'Passées'} ({past.length})
          </summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8, opacity: 0.6 }}>
            {past.map(f => {
              const colors = TYPE_COLORS[f.type] || TYPE_COLORS.restaurant
              return (
                <div key={f.id} style={{
                  padding: '8px 12px', background: colors.bg, border: `1px solid ${colors.border}`,
                  borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ fontSize: 14 }}>{TYPE_ICONS[f.type] || '📅'}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: colors.text }}>{f.label}</span>
                  <span style={{ fontSize: 10, color: 'var(--t4)', fontFamily: 'DM Mono,monospace' }}>{durationLabel(f)}</span>
                </div>
              )
            })}
          </div>
        </details>
      )}

      {/* ═══ Bottom: Swiss holidays + Widget defaults ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 4 }}>
        {/* Swiss holidays quick-add */}
        <div style={{ background: 'var(--surf2)', border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--bl)', marginBottom: 8 }}>
            🇨🇭 {t('ferm.swissHolidays')}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {FERIES_CH.map(f => {
              const already = activeFermetures.some(af => af.date === f.date && af.type === 'ferie')
              return (
                <span key={f.date} onClick={() => !already && handleAddHoliday(f.date, f.label)} style={{
                  fontSize: 11, padding: '3px 9px', borderRadius: 5, cursor: already ? 'default' : 'pointer',
                  background: already ? 'rgba(60,200,112,.12)' : 'rgba(68,128,216,.08)',
                  border: `1px solid ${already ? 'rgba(60,200,112,.3)' : 'rgba(68,128,216,.2)'}`,
                  color: already ? 'var(--gn)' : 'var(--bl)',
                  opacity: already ? 0.7 : 1,
                }}>
                  {already ? '✓ ' : ''}{f.date.slice(5).replace('-', '/')} {f.label}
                </span>
              )
            })}
          </div>
          <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 6 }}>{t('ferm.clickToAdd')}</div>
        </div>

        {/* Widget default message */}
        <div style={{ background: 'var(--surf2)', border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--bl)', marginBottom: 6 }}>
            🔌 {t('ferm.defaultWidgetMsg')}
          </div>
          <input type="text" defaultValue={t('ferm.defaultWidgetValue')} style={{ ...inputS, marginBottom: 4 }} />
          <div style={{ fontSize: 10, color: 'var(--t3)' }}>
            {t('ferm.defaultWidgetHint')} · <span style={{ color: 'var(--bl)', cursor: 'pointer' }}>{t('ferm.widgetSettings')} →</span>
          </div>
        </div>
      </div>
    </div>
  )
}
