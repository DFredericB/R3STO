// ══════════════════════════════════════════════════
//  R3STO — QuickResa v3
//  Widget compact de réservation rapide (Dashboard)
//  Design aligné sur prototype-resa-v3.html
//  2 rangées selector, chips carrés, couleurs proto
// ══════════════════════════════════════════════════

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore, isDoubleBooked } from '../../store/useAppStore'
import { useToast } from '../ui/Toast'
import PhoneInput, { toE164 } from '../ui/PhoneInput'
import { useT } from '../../i18n/useTranslation'
import { TABLE_STATE } from '../../utils/design'
import type { Resa } from '../../types'

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function timeToMins(t: string): number {
  const [h, m] = t.replace('h',':').split(':').map(Number)
  return h * 60 + (m || 0)
}

function minsToSlot(m: number): string {
  const h = Math.floor(m / 60)
  const mm = m % 60
  return `${h}h${String(mm).padStart(2,'0')}`
}

function shiftISO(iso: string, days: number): string {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function fmtH(t: string): string { return t.replace(':', 'h') }

const JOURS_COURTS = ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa']

interface QuickResaProps {
  onOpenFullModal?: () => void
}

/* ── Proto-matching styles ─────────────────────── */
const selLabel: React.CSSProperties = {
  fontSize: 9, fontWeight: 800, color: 'var(--muted, var(--t4))',
  textTransform: 'uppercase', letterSpacing: '.05em',
  whiteSpace: 'nowrap', flexShrink: 0,
}

const selGroup: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '0 10px', borderRight: '1px solid var(--border)',
  flexShrink: 0,
}

const selRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', flexWrap: 'wrap',
  width: '100%', gap: 0, minHeight: 40,
}

export function QuickResa({ onOpenFullModal }: QuickResaProps) {
  const { resas, tables, services, combos, salles, activeDate, setActiveDate, addResa, resto } = useAppStore()
  const pays = resto.pays || 'CH'
  const navigate = useNavigate()
  const { toast } = useToast()
  const { t } = useT()

  const todayDate = todayISO()
  const isToday = activeDate === todayDate

  // ── Services actifs (filtrés par jour de la semaine) ──
  const activeServices = useMemo(() => {
    const dayOfWeek = new Date(activeDate + 'T12:00:00').getDay()
    return services.filter(s => {
      if (!s.active) return false
      if (s.jours && s.jours.length > 0) return s.jours.includes(dayOfWeek)
      return true
    })
  }, [services, activeDate])

  // ── Prochain service auto ──
  const autoService = useMemo(() => {
    const nowM = new Date().getHours() * 60 + new Date().getMinutes()
    const current = activeServices.find(s => {
      const openM = timeToMins(s.open)
      const closeM = timeToMins(s.close)
      return nowM >= openM - 30 && nowM <= closeM
    })
    if (current) return current
    const next = activeServices.find(s => {
      const openM = timeToMins(s.open)
      return openM > nowM && openM - nowM <= 180
    })
    return next || activeServices[0] || null
  }, [activeServices])

  // ── Salles actives ──
  const activeSalles = useMemo(() => salles.filter(s => s.active), [salles])
  const defaultSalle = activeSalles.find(s => s.openByDefault) || activeSalles[0] || null

  // ── State ──
  const [nom, setNom] = useState('')
  const [tel, setTel] = useState('')
  const [cvt, setCvt] = useState(2)
  const [svc, setSvc] = useState(autoService?.name.toLowerCase() || '')
  const [slot, setSlot] = useState('')
  const [modeIA, setModeIA] = useState(true)
  const [salleId, setSalleId] = useState(defaultSalle?.id || '')
  const [showCvtPop, setShowCvtPop] = useState(false)
  const [cvtPopVal, setCvtPopVal] = useState(9)
  const [manualTable, setManualTable] = useState<string | null>(null)

  // ── Client detection ──
  const [clientMatch, setClientMatch] = useState<{ nom: string; tel: string; email: string; count: number } | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const q = nom.trim().toLowerCase()
    if (q.length < 2) { setClientMatch(null); return }
    debounceRef.current = setTimeout(() => {
      const matches = resas.filter(r => r.n?.toLowerCase().includes(q) || r.nom?.toLowerCase().includes(q))
      if (matches.length > 0) {
        const last = matches[matches.length - 1]
        setClientMatch({ nom: last.nom || last.n, tel: last.tel || '', email: last.email || '', count: matches.length })
      } else { setClientMatch(null) }
    }, 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [nom, resas])

  const applyClient = useCallback(() => {
    if (!clientMatch) return
    if (clientMatch.tel && !tel) setTel(clientMatch.tel)
    setNom(clientMatch.nom)
  }, [clientMatch, tel])

  useEffect(() => {
    if (autoService) setSvc(autoService.name.toLowerCase())
  }, [autoService])

  // ── Salle ID → Name mapping (FIX) ──
  const selSalleName = useMemo(() => {
    const s = activeSalles.find(s => s.id === salleId)
    return s ? s.name : salleId
  }, [salleId, activeSalles])

  // ── Service live ──
  // Un seul point vert : seulement le service auto-détecté (le plus pertinent)
  const isServiceLive = useCallback((svcName: string): boolean => {
    if (!isToday) return false
    if (!autoService) return false
    return autoService.name.toLowerCase() === svcName
  }, [isToday, autoService])

  // ── Calendrier 7j ──
  const calendarDays = useMemo(() => {
    const days: { iso: string; label: string; jour: string; isToday: boolean; isSelected: boolean }[] = []
    for (let i = 0; i < 7; i++) {
      const iso = shiftISO(todayDate, i)
      const d = new Date(iso + 'T12:00:00')
      days.push({ iso, label: String(d.getDate()), jour: JOURS_COURTS[d.getDay()], isToday: iso === todayDate, isSelected: iso === activeDate })
    }
    return days
  }, [todayDate, activeDate])

  // ── Créneaux ──
  const slots: string[] = useMemo(() => {
    const svcObj = activeServices.find(s => s.name.toLowerCase() === svc)
    if (!svcObj) return []
    const openM = timeToMins(svcObj.open)
    const loM = timeToMins(svcObj.lastOrder)
    const result: string[] = []
    for (let m = openM; m <= loM; m += 15) result.push(minsToSlot(m))
    return result
  }, [svc, activeServices])

  useEffect(() => {
    if (slots.length === 0) { setSlot(''); return }
    const nowM = new Date().getHours() * 60 + new Date().getMinutes()
    const nextSlot = slots.find(s => timeToMins(s) >= nowM) || slots[0]
    setSlot(nextSlot)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svc])

  // ── Disponibilité (FIXED: selSalleName) ──
  const availability = useMemo(() => {
    const svcResas = resas.filter(r =>
      r.date === activeDate && r.svc === svc && (r.s === 'reserved' || r.s === 'arrived')
    )
    const svcObj = activeServices.find(s => s.name.toLowerCase() === svc)
    const maxCvt = svcObj?.maxCouverts || 80
    const occupiedTbls = svcResas.map(r => r.tbl)
    const allActiveTables = tables.filter(tb => tb.active && !tb.blocked)
    const relevantTables = allActiveTables.filter(tb => !selSalleName || tb.salle === selSalleName)
    const freeTables = relevantTables.filter(tb => !occupiedTbls.includes(tb.n))
    const totalCvt = svcResas.reduce((s, r) => s + r.c, 0)
    const saturation = maxCvt > 0 ? totalCvt / maxCvt : 0

    const maxCapFree = Math.max(
      ...freeTables.map(tb => tb.capMax),
      ...combos.filter(c => !occupiedTbls.includes(c.label)).map(c => c.cap),
      0
    )

    const totalTables = relevantTables.length
    const maxPerSlot = svcObj ? Math.ceil(totalTables / (slots.length || 1) * 2) : 3
    const slotSaturation: Record<string, { resas: number; ratio: number }> = {}
    for (const sl of slots) {
      const slotResas = svcResas.filter(r => r.t === sl)
      slotSaturation[sl] = { resas: slotResas.length, ratio: maxPerSlot > 0 ? slotResas.length / maxPerSlot : 0 }
    }

    const perSalle: Record<string, { free: number; total: number }> = {}
    for (const s of activeSalles) {
      const st = allActiveTables.filter(tb => tb.salle === s.name)
      const sf = st.filter(tb => !occupiedTbls.includes(tb.n))
      perSalle[s.id] = { free: sf.length, total: st.length }
    }

    return { freeCount: freeTables.length, totalTables, totalCvt, maxCvt, saturation, maxCapFree, slotSaturation, perSalle }
  }, [resas, activeDate, svc, tables, combos, selSalleName, activeServices, slots, activeSalles])

  // Capacité par nb couverts (comme proto maxCapForCvt)
  const cvtAvail = useCallback((n: number) => {
    const occupiedTbls = resas
      .filter(r => r.date === activeDate && r.svc === svc && (r.s === 'reserved' || r.s === 'arrived'))
      .map(r => r.tbl)
    const free = tables.filter(tb => tb.active && !tb.blocked && !occupiedTbls.includes(tb.n) && tb.salle === selSalleName)
    const tCount = free.filter(tb => tb.capMax >= n && tb.capMin <= n + 1).length
    const cCount = combos.filter(c => c.cap >= n && c.salle === selSalleName &&
      c.tables.every(tid => { const x = tables.find(t => t.id === tid); return x && x.active && !x.blocked && !occupiedTbls.includes(x.n) })
    ).length
    return tCount + cCount
  }, [resas, activeDate, svc, tables, combos, selSalleName])

  const slotColor = (sl: string): string | null => {
    const data = availability.slotSaturation[sl]
    if (!data || data.resas === 0) return null
    if (data.ratio >= 0.9) return '#ef4444'
    if (data.ratio >= 0.6) return '#f59e0b'
    return '#22c55e'
  }

  // ── Suggestion IA (FIXED) ──
  const suggestedTable = useMemo(() => {
    if (!modeIA || !svc || !slot || cvt < 1) return null
    const occupiedTbls = resas
      .filter(r => r.date === activeDate && r.svc === svc && (r.s === 'reserved' || r.s === 'arrived'))
      .map(r => r.tbl)
    const available = tables
      .filter(tb => tb.active && !tb.blocked && !occupiedTbls.includes(tb.n))
      .filter(tb => tb.capMax >= cvt && tb.capMin <= cvt + 1)
      .filter(tb => !selSalleName || tb.salle === selSalleName)
      .sort((a, b) => a.capMax - b.capMax)
    if (available.length > 0) return available[0].n
    const anyAvail = tables
      .filter(tb => tb.active && !tb.blocked && !occupiedTbls.includes(tb.n))
      .filter(tb => tb.capMax >= cvt && tb.capMin <= cvt + 1)
      .sort((a, b) => a.capMax - b.capMax)
    if (anyAvail.length > 0) return anyAvail[0].n
    const combo = combos.find(c => !occupiedTbls.includes(c.label) && c.cap >= cvt)
    return combo?.label || null
  }, [modeIA, svc, slot, cvt, resas, tables, combos, selSalleName, activeDate])

  // ── Confirmation ──
  const handleConfirm = useCallback(() => {
    if (!nom.trim()) { toast(t('modal.nameRequired'), 'error'); return }
    if (!slot) { toast(t('modal.selectSlot'), 'error'); return }
    if (!svc) { toast(t('modal.selectService'), 'error'); return }
    const finalTbl = modeIA ? (suggestedTable || '') : (manualTable || '')
    const newResa: Resa = {
      id: 'r' + Date.now(), n: nom.trim(), nom: nom.trim(), prenom: '',
      c: cvt, tbl: finalTbl, t: slot, svc, s: finalTbl ? 'reserved' : 'waitlist', note: '', date: activeDate,
      createdAt: Date.now(), statut: 0, mode: modeIA ? 'ia' : 'manuel',
      tel: toE164(tel.trim(), pays), email: '', canal: 'telephone', prisPar: '',
      bebe: 0, pmr: 0, allergie: false,
    }
    // Garde-fou double-booking avec feedback visible
    if (finalTbl && isDoubleBooked(finalTbl, activeDate, svc)) {
      toast(`⛔ ${finalTbl} déjà occupée pour ce service`, 'error')
      return
    }
    addResa(newResa)
    toast(`✓ ${nom.trim()} · ${cvt}p · ${slot.replace('h', ':')} · ${finalTbl || 'liste attente'}`, 'success')
    setNom(''); setTel(''); setCvt(2); setClientMatch(null)
    navigate(`/reservations?edit=${newResa.id}`)
  }, [nom, tel, cvt, svc, slot, modeIA, suggestedTable, manualTable, activeDate, t, navigate])

  if (activeServices.length === 0) {
    return (<div className="card" style={{ padding: '14px 16px', opacity: .5 }}>
      <div style={{ fontSize: 12, color: 'var(--t3)' }}>{t('quick.noService')}</div>
    </div>)
  }

  const nowM = new Date().getHours() * 60 + new Date().getMinutes()
  const nextSlots = slots.filter(s => timeToMins(s) >= nowM - 15).slice(0, 5)
  if (nextSlots.length === 0 && slots.length > 0) nextSlots.push(...slots.slice(-5))

  // ── Styles proto ──
  const CSS = `
@keyframes svcPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.7)}}
@keyframes pop{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
`

  return (
    <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      <style>{CSS}</style>

      {/* ═══ SELECTOR BAR — 2 rangées comme le proto ═══ */}
      <div style={{ background: 'var(--surf)', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>

        {/* ── Rangée 1 : Mode + Date ── */}
        <div style={selRow}>
          {/* Mode IA/Manuel — switch proto */}
          <div style={selGroup}>
            <span style={selLabel}>Mode</span>
            <div style={{
              display: 'flex', background: 'var(--surf3)', borderRadius: 8,
              border: '1px solid var(--border)', overflow: 'hidden',
            }}>
              <button onClick={() => { setModeIA(true); setManualTable(null) }} style={{
                padding: '6px 14px', fontSize: 11, fontWeight: 700, border: 'none',
                cursor: 'pointer', fontFamily: 'var(--ff)', transition: '.15s',
                background: modeIA ? 'linear-gradient(135deg,#6b3fa0,#a855f7)' : 'transparent',
                color: modeIA ? '#fff' : 'var(--t3)',
              }}>🤖 IA</button>
              <button onClick={() => setModeIA(false)} style={{
                padding: '6px 14px', fontSize: 11, fontWeight: 700, border: 'none',
                cursor: 'pointer', fontFamily: 'var(--ff)', transition: '.15s',
                background: !modeIA ? 'linear-gradient(135deg,#c4500a,#e87b20)' : 'transparent',
                color: !modeIA ? '#fff' : 'var(--t3)',
              }}>✋ Manuel</button>
            </div>
          </div>

          {/* Date chips 7j — style proto .date-chip */}
          <div style={{ ...selGroup, borderRight: 'none', flex: 1 }}>
            <span style={selLabel}>Date</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {calendarDays.map(d => (
                <button
                  key={d.iso}
                  onClick={() => setActiveDate(d.iso)}
                  style={{
                    padding: '5px 10px', borderRadius: 7,
                    border: `1.5px solid ${d.isSelected ? 'var(--bl)' : 'var(--border)'}`,
                    background: d.isSelected ? 'rgba(68,128,216,.15)' : 'transparent',
                    color: d.isSelected ? 'var(--ac, var(--bl))' : 'var(--t3)',
                    cursor: 'pointer', fontFamily: 'var(--ff)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: 0, lineHeight: 1.2, transition: '.12s',
                  }}
                >
                  <span style={{
                    fontSize: 7, fontWeight: 600, textTransform: 'uppercase',
                    opacity: .7, color: d.isToday ? 'var(--gn)' : undefined,
                  }}>{d.jour}</span>
                  <span style={{ fontSize: 11, fontWeight: 800 }}>{d.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Rangée 2 : Service + Salle + Couverts ── */}
        <div style={{ ...selRow, borderTop: '1px solid var(--border)' }}>
          {/* Services — chips colonne avec heures + point vert */}
          <div style={selGroup}>
            <span style={selLabel}>Service</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {[...activeServices].sort((a, b) => {
                const aSel = svc === a.name.toLowerCase() ? 0 : 1
                const bSel = svc === b.name.toLowerCase() ? 0 : 1
                return aSel - bSel
              }).map(s => {
                const selected = svc === s.name.toLowerCase()
                const live = isServiceLive(s.name.toLowerCase())
                return (
                  <button
                    key={s.id}
                    onClick={() => { setSvc(s.name.toLowerCase()); setSlot('') }}
                    style={{
                      padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 800,
                      border: `2px solid ${selected ? s.color : 'var(--surf4, var(--border))'}`,
                      background: selected ? 'rgba(68,128,216,.25)' : 'var(--surf3)',
                      color: selected ? s.color : 'var(--t3)',
                      cursor: 'pointer', fontFamily: 'var(--ff)', transition: '.15s',
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      gap: 0, lineHeight: 1.3, position: 'relative', whiteSpace: 'nowrap',
                    }}
                  >
                    {live && (
                      <span style={{
                        position: 'absolute', top: 3, right: 3,
                        width: 7, height: 7, borderRadius: '50%',
                        background: '#3cc870',
                        boxShadow: '0 0 6px rgba(60,200,112,.6)',
                        animation: 'svcPulse 1.5s ease-in-out infinite',
                      }} />
                    )}
                    <span style={{ fontSize: 12, fontWeight: 800 }}>{s.icon} {s.name}</span>
                    <span style={{ fontSize: 8, fontWeight: 600, opacity: .55 }}>
                      {fmtH(s.open)}–{fmtH(s.close)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Salle */}
          {activeSalles.length > 1 && (
            <div style={selGroup}>
              <span style={selLabel}>Salle</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {[...activeSalles].sort((a, b) => {
                  const aSel = salleId === a.id ? 0 : 1
                  const bSel = salleId === b.id ? 0 : 1
                  return aSel - bSel
                }).map(s => {
                  const isSel = salleId === s.id
                  const sd = availability.perSalle[s.id]
                  const icon = s.exterior ? '🌳' : '🏠'
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSalleId(s.id)}
                      style={{
                        padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 800,
                        border: `2px solid ${isSel ? 'var(--ac, var(--bl))' : 'var(--surf4, var(--border))'}`,
                        background: isSel ? 'rgba(68,128,216,.25)' : 'var(--surf3)',
                        color: isSel ? (s.color || '#fff') : 'var(--t3)',
                        cursor: 'pointer', fontFamily: 'var(--ff)', transition: '.15s',
                        whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4,
                      }}
                    >
                      {s.name} <span style={{ fontSize: 9, opacity: .6 }}>{icon}</span>
                      {sd && (
                        <span style={{
                          fontSize: 9, fontWeight: 800, fontFamily: 'var(--fm)',
                          color: sd.free === 0 ? '#ef4444' : sd.free <= 2 ? '#f59e0b' : 'var(--gn)',
                        }}>{sd.free}/{sd.total}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Couverts — carrés comme proto .cvt-chip */}
          <div style={{ ...selGroup, borderRight: 'none', position: 'relative' }}>
            <span style={selLabel}>Couverts</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {[1,2,3,4,5,6].sort((a, b) => {
                const aSel = cvt === a ? 0 : 1
                const bSel = cvt === b ? 0 : 1
                return aSel - bSel
              }).map(n => {
                const isSel = cvt === n
                const avail = cvtAvail(n)
                const isOff = avail === 0
                return (
                  <button
                    key={n}
                    onClick={() => { if (!isOff) setCvt(n) }}
                    style={{
                      width: 34, height: 34, borderRadius: 8,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 15, fontWeight: 900, fontFamily: 'var(--fm)',
                      background: isSel ? 'rgba(68,128,216,.25)' : 'var(--surf2, var(--surf3))',
                      color: isSel ? '#fff' : 'var(--t2, var(--t3))',
                      border: `2px solid ${isSel ? 'var(--ac, var(--bl))' : 'var(--surf4, var(--border))'}`,
                      cursor: isOff ? 'not-allowed' : 'pointer',
                      transition: '.15s', position: 'relative',
                      opacity: isOff ? .3 : 1,
                      pointerEvents: isOff ? 'none' : 'auto',
                    }}
                  >
                    {n}
                    {/* Badge dispo sous le chip */}
                    {!isOff && !isSel && avail > 0 && (
                      <span style={{
                        position: 'absolute', bottom: -2, right: -2,
                        fontSize: 7, fontWeight: 700, fontFamily: 'var(--fm)',
                        color: 'var(--gn)', background: 'var(--bg, #060e1c)',
                        padding: '0 3px', borderRadius: 3, lineHeight: 1.4,
                        border: '1px solid rgba(60,200,112,.3)',
                      }}>{avail}</span>
                    )}
                  </button>
                )
              })}
              {/* Bouton + pour 7+ */}
              <button
                onClick={() => { if (cvt > 6) { /* déjà en mode custom */ } else { setCvtPopVal(9); setShowCvtPop(true) } }}
                style={{
                  width: 34, height: 34, borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: cvt > 6 ? 15 : 18, fontWeight: cvt > 6 ? 900 : 400,
                  fontFamily: 'var(--fm)',
                  background: cvt > 6 ? 'rgba(68,128,216,.25)' : 'var(--surf2, var(--surf3))',
                  color: cvt > 6 ? '#fff' : 'var(--ac, var(--bl))',
                  border: `2px ${cvt > 6 ? 'solid var(--ac, var(--bl))' : 'dashed var(--surf4, var(--border))'}`,
                  cursor: 'pointer', transition: '.15s',
                }}
              >
                {cvt > 6 ? cvt : '+'}
              </button>
            </div>

            {/* Popup stepper 7+ (style proto .cvt-popup) */}
            {showCvtPop && (
              <div style={{
                position: 'absolute', zIndex: 200, top: '100%', left: '50%', transform: 'translateX(-50%)',
                marginTop: 4,
                background: 'var(--surf)', border: '1.5px solid var(--border)', borderRadius: 12,
                boxShadow: '0 10px 30px rgba(0,0,0,.5)', padding: 14, width: 200, textAlign: 'center',
                animation: 'pop .2s ease',
              }}>
                <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 10, color: 'var(--text)' }}>Nombre de couverts</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  <button onClick={() => setCvtPopVal(v => Math.max(7, v - 1))} style={{
                    width: 34, height: 34, borderRadius: 8, fontSize: 18, fontWeight: 800,
                    background: 'var(--surf3)', border: '1.5px solid var(--border)', color: 'var(--t2, var(--t3))',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--ff)',
                  }}>−</button>
                  <span style={{ fontSize: 24, fontWeight: 900, fontFamily: 'var(--fm)', color: 'var(--text)', minWidth: 36, textAlign: 'center' }}>
                    {cvtPopVal}
                  </span>
                  <button onClick={() => setCvtPopVal(v => v + 1)} style={{
                    width: 34, height: 34, borderRadius: 8, fontSize: 18, fontWeight: 800,
                    background: 'var(--surf3)', border: '1.5px solid var(--border)', color: 'var(--t2, var(--t3))',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--ff)',
                  }}>+</button>
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 10, justifyContent: 'center' }}>
                  <button onClick={() => setShowCvtPop(false)} style={{
                    padding: '6px 14px', borderRadius: 7, fontSize: 11, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'var(--ff)',
                    background: 'var(--surf3)', color: 'var(--t3)', border: '1px solid var(--border)',
                  }}>Annuler</button>
                  <button onClick={() => { setCvt(cvtPopVal); setShowCvtPop(false) }} style={{
                    padding: '6px 14px', borderRadius: 7, fontSize: 11, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'var(--ff)',
                    background: 'var(--gn)', color: '#fff', border: 'none',
                  }}>Valider</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ FORMULAIRE — nom, tél, créneau, confirm ═══ */}
      <div style={{
        padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap',
        background: 'var(--surf)',
      }}>
        {/* Nom + détection client */}
        <div style={{ flex: '1 1 180px', minWidth: 140, position: 'relative' }}>
          <label style={selLabel}>{t('quick.name')} *</label>
          <input
            value={nom} onChange={e => setNom(e.target.value)}
            placeholder={t('quick.namePlaceholder')}
            onKeyDown={e => { if (e.key === 'Enter') handleConfirm() }}
            style={{
              width: '100%', height: 34, padding: '0 10px',
              background: 'var(--surf3)', border: `1px solid ${clientMatch ? 'var(--gn)' : 'var(--border)'}`,
              borderRadius: 8, color: 'var(--text)', fontSize: 12, fontFamily: 'var(--ff)', outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {clientMatch && (
            <button onClick={applyClient} style={{
              position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 2,
              padding: '6px 10px', borderRadius: 8, zIndex: 10,
              background: 'var(--surf2, var(--surf))', border: '1px solid rgba(60,200,112,.3)',
              boxShadow: '0 6px 20px rgba(0,0,0,.3)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              fontFamily: 'var(--ff)', fontSize: 11, color: 'var(--text)',
            }}>
              <span style={{ fontSize: 14 }}>👤</span>
              <span style={{ fontWeight: 700 }}>{clientMatch.nom}</span>
              {clientMatch.tel && <span style={{ color: 'var(--t3)' }}>· {clientMatch.tel}</span>}
              <span style={{
                marginLeft: 'auto', fontSize: 9, fontWeight: 800,
                color: 'var(--gn)', background: 'rgba(60,200,112,.12)',
                padding: '2px 6px', borderRadius: 4,
              }}>{clientMatch.count} résa{clientMatch.count > 1 ? 's' : ''}</span>
            </button>
          )}
        </div>

        {/* Téléphone */}
        <div style={{ flex: '1 1 180px', minWidth: 140 }}>
          <label style={selLabel}>{t('quick.phone')}</label>
          <PhoneInput value={tel} onChange={setTel} compact />
        </div>

        {/* Créneau — 5 prochains */}
        <div style={{ flex: '0 0 auto' }}>
          <label style={selLabel}>{t('quick.time')}</label>
          <div style={{ display: 'flex', gap: 4 }}>
            {nextSlots.map(s => {
              const sc = slotColor(s)
              const isSelected = slot === s
              const data = availability.slotSaturation[s]
              const fillPct = data ? Math.min(data.ratio * 100, 100) : 0
              return (
                <button key={s} onClick={() => setSlot(s)} style={{
                  padding: '6px 10px 4px', borderRadius: 6, height: 34,
                  border: `2px solid ${isSelected ? 'var(--ac, var(--bl))' : sc ? `${sc}60` : 'var(--border)'}`,
                  background: isSelected ? 'rgba(91,156,246,.15)' : 'transparent',
                  color: isSelected ? 'var(--ac, var(--bl))' : 'var(--t3)',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--fm)',
                  transition: '.12s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                  position: 'relative', overflow: 'hidden',
                }}>
                  <span style={{ lineHeight: 1 }}>{s.replace('h',':')}</span>
                  {fillPct > 0 && (
                    <div style={{ width: '100%', height: 3, borderRadius: 2, background: 'var(--surf4, var(--border))' }}>
                      <div style={{ width: `${fillPct}%`, height: '100%', borderRadius: 2, background: sc || 'var(--gn)', transition: 'width .2s' }} />
                    </div>
                  )}
                </button>
              )
            })}
            {slots.length > 5 && (
              <select value={!nextSlots.includes(slot) ? slot : ''} onChange={e => { if (e.target.value) setSlot(e.target.value) }} style={{
                padding: '6px 8px', borderRadius: 6, height: 34,
                border: '2px solid var(--border)', background: 'var(--surf3)', color: 'var(--t3)',
                fontSize: 11, fontFamily: 'var(--fm)', cursor: 'pointer',
              }}>
                <option value="">···</option>
                {slots.filter(s => !nextSlots.includes(s)).map(s => (
                  <option key={s} value={s}>{s.replace('h',':')}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Suggestion IA + badge dispo */}
        <div style={{ flex: '0 0 auto', display: 'flex', gap: 6, alignSelf: 'flex-end', alignItems: 'center' }}>
          {modeIA && suggestedTable && (
            <span style={{
              fontSize: 12, color: 'var(--vt, #a855f7)', fontWeight: 700,
              background: 'rgba(168,85,247,.08)', padding: '6px 10px',
              borderRadius: 6, display: 'inline-flex', alignItems: 'center',
              height: 34, boxSizing: 'border-box', fontFamily: 'var(--fm)',
            }}>🤖 {suggestedTable}</span>
          )}
          {(() => {
            const col = availability.saturation >= 0.9 ? '#ef4444'
              : availability.saturation >= 0.7 ? '#f59e0b' : 'var(--gn, #3cc870)'
            return (
              <span style={{
                fontSize: 11, fontWeight: 700, color: col,
                background: `${col === 'var(--gn, #3cc870)' ? 'rgba(60,200,112,.08)' : col + '12'}`,
                padding: '0 10px', borderRadius: 6, height: 34, boxSizing: 'border-box',
                display: 'inline-flex', alignItems: 'center', gap: 4,
                whiteSpace: 'nowrap', fontFamily: 'var(--fm)',
              }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: col, flexShrink: 0 }} />
                {availability.freeCount}/{availability.totalTables}
              </span>
            )
          })()}
        </div>

        {/* Boutons */}
        <div style={{ flex: '0 0 auto', display: 'flex', gap: 6, alignSelf: 'flex-end' }}>
          {onOpenFullModal && (
            <button onClick={onOpenFullModal} style={{
              padding: '0 12px', height: 34, borderRadius: 8,
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--t3)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--ff)',
              display: 'flex', alignItems: 'center',
            }}>{t('quick.moreOptions')} →</button>
          )}
          <button onClick={handleConfirm} style={{
            padding: '0 18px', height: 34, borderRadius: 10,
            border: 'none', background: 'linear-gradient(135deg,#6b3fa0,#a855f7)',
            color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--ff)',
            opacity: nom.trim() ? 1 : .5, display: 'flex', alignItems: 'center', transition: 'opacity .12s',
          }}>✓ {t('quick.confirm')}</button>
        </div>
      </div>

      {/* ═══ GRILLE TABLES + COMBOS — style proto .man-grid-zone ═══ */}
      <TableGrid
        tables={tables} combos={combos} resas={resas}
        activeDate={activeDate} svc={svc} cvt={cvt}
        salles={activeSalles} salleId={salleId} selSalleName={selSalleName}
        modeIA={modeIA} suggestedTable={modeIA ? suggestedTable : manualTable}
        onSelectTable={(tblName) => { if (!modeIA) setManualTable(prev => prev === tblName ? null : tblName) }}
      />
    </div>
  )
}

/* ── Shape symbols (comme le proto) ── */
const SHAPE_SYM: Record<string, string> = {
  round: '●', round_sm: '●', round_lg: '●', oval: '⬮',
  square: '◻', square_sm: '◻', rect: '▬', rect_lg: '▬',
  banquette: '▰', bar: '▮',
}

/* ── Table Grid Sub-component ── */
function TableGrid({ tables, combos, resas, activeDate, svc, cvt, salles, salleId, selSalleName, modeIA: _modeIA, suggestedTable, onSelectTable }: {
  tables: any[]; combos: any[]; resas: any[]; activeDate: string; svc: string; cvt: number;
  salles: any[]; salleId: string; selSalleName: string; modeIA: boolean;
  suggestedTable: string | null; onSelectTable: (n: string) => void;
}) {
  const occupiedTbls = useMemo(() => {
    return resas
      .filter((r: any) => r.date === activeDate && r.svc === svc && (r.s === 'reserved' || r.s === 'arrived'))
      .map((r: any) => r.tbl)
  }, [resas, activeDate, svc])

  // Map des résas par table pour afficher nom + couverts
  const resaByTbl = useMemo(() => {
    const map: Record<string, { n: string; c: number; t: string }> = {}
    resas.filter((r: any) => r.date === activeDate && r.svc === svc && (r.s === 'reserved' || r.s === 'arrived'))
      .forEach((r: any) => { map[r.tbl] = { n: r.nom || r.n, c: r.c, t: r.t } })
    return map
  }, [resas, activeDate, svc])

  // Salles à afficher (la sélectionnée ou toutes)
  const displaySalles = salles.filter(s => !salleId || s.id === salleId)

  // Combos libres pour la salle
  const freeCombos = useMemo(() => {
    return combos.filter((c: any) => {
      if (c.salle !== selSalleName) return false
      if (c.cap < cvt) return false
      return c.tables.every((tid: string) => {
        const tb = tables.find((t: any) => t.id === tid)
        return tb && tb.active && !tb.blocked && !occupiedTbls.includes(tb.n)
      })
    })
  }, [combos, tables, selSalleName, cvt, occupiedTbls])

  // Track rendered tables (to avoid duplication from combos)
  const renderedInCombo = useMemo(() => {
    const set = new Set<string>()
    // Tables occupées formant un combo (même résa sur plusieurs tables d'un combo)
    combos.forEach((c: any) => {
      const allOcc = c.tables.every((tid: string) => {
        const tb = tables.find((t: any) => t.id === tid)
        return tb && occupiedTbls.includes(tb.n)
      })
      if (allOcc) {
        // Vérifier que c'est la même résa
        const resaNames = c.tables.map((tid: string) => {
          const tb = tables.find((t: any) => t.id === tid)
          return tb ? resaByTbl[tb.n]?.n : null
        })
        if (resaNames.length > 1 && resaNames.every((n: string | null) => n && n === resaNames[0])) {
          c.tables.forEach((tid: string) => set.add(tid))
        }
      }
    })
    return set
  }, [combos, tables, occupiedTbls, resaByTbl])

  return (
    <div style={{
      borderTop: '1px solid var(--border)',
      padding: '10px 14px', overflowY: 'auto', maxHeight: 280,
      background: 'var(--surf)',
    }}>
      {displaySalles.map(salle => {
        const salleTables = tables.filter((tb: any) => tb.active && tb.salle === salle.name)
        if (!salleTables.length) return null

        return (
          <div key={salle.id}>
            {/* Room header — style proto .room-hdr */}
            <div style={{
              fontSize: 10, fontWeight: 800, color: 'var(--muted, var(--t4))',
              textTransform: 'uppercase', letterSpacing: '.05em',
              padding: '4px 0', marginBottom: 6,
              borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: salle.color }} />
              {salle.exterior ? '🌳' : '🏠'} {salle.name}
            </div>

            {/* Grid — style proto .tgrid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(115px, 1fr))',
              gap: 6, marginBottom: 14,
            }}>
              {salleTables.map((tb: any) => {
                if (renderedInCombo.has(tb.id)) return null
                const isOcc = occupiedTbls.includes(tb.n)
                const isBlk = tb.blocked
                const isFree = !isOcc && !isBlk
                const fits = isFree && tb.capMax >= cvt && tb.capMin <= cvt + 1
                const isSuggested = suggestedTable === tb.n
                const resa = resaByTbl[tb.n]
                const dim = isFree && !fits && cvt > 0

                // Table card styles matching proto
                let bg = 'var(--surf2, var(--surf3))'
                let borderLeft = '2px solid var(--border)'
                let borderColor = 'var(--border)'
                let nameColor = 'var(--text)'
                let statusText = ''
                let statusBg = 'transparent'
                let statusColor = 'var(--t3)'
                let opacity = 1
                let cursor = 'default'
                let boxShadow = 'none'

                // Source unique : TABLE_STATE (design.ts) — cohérent avec Grille/Plan/Journal
                if (isBlk) {
                  opacity = .35; cursor = 'not-allowed'
                  borderLeft = `5px solid ${TABLE_STATE.blocked.border}`
                  statusText = '🚫 Bloquée'; statusBg = TABLE_STATE.blocked.bg; statusColor = 'var(--muted, var(--t4))'
                } else if (isOcc) {
                  bg = TABLE_STATE.reserved.bg; borderLeft = `5px solid ${TABLE_STATE.reserved.border}`
                  nameColor = '#3b82f6'; boxShadow = `inset 0 0 0 1px ${TABLE_STATE.reserved.border}`
                  statusText = resa ? `${resa.n} · ${resa.c}p` : 'Occupée'
                  statusBg = 'rgba(59,130,246,.85)'; statusColor = '#fff'
                  if (cvt > 0) opacity = .35
                } else if (isSuggested) {
                  // IA suggestion — violet spécifique (pas un état de table)
                  bg = 'rgba(168,85,247,.15)'; borderLeft = '5px solid rgba(168,85,247,.85)'
                  nameColor = '#a855f7'; boxShadow = '0 0 12px rgba(168,85,247,.3)'
                  statusText = '🤖 IA →'; statusBg = 'rgba(168,85,247,.85)'; statusColor = '#fff'
                  cursor = 'pointer'
                } else if (fits) {
                  bg = TABLE_STATE.free.fill; borderLeft = `5px solid ${TABLE_STATE.free.border}`
                  nameColor = 'rgba(68,128,216,.7)'
                  statusText = `${tb.capMax} cvt ✔`; statusBg = 'rgba(91,156,246,.75)'; statusColor = '#fff'
                  cursor = 'pointer'
                } else {
                  bg = TABLE_STATE.free.fill; borderLeft = `5px solid ${TABLE_STATE.free.border}`
                  nameColor = 'rgba(68,128,216,.7)'
                  statusText = '✅ LIBRE'; statusBg = 'rgba(91,156,246,.75)'; statusColor = '#fff'
                  if (dim) opacity = .12
                }

                return (
                  <div
                    key={tb.id}
                    onClick={() => { if (fits || isSuggested) onSelectTable(tb.n) }}
                    style={{
                      background: bg, border: `2px solid ${borderColor}`, borderLeft,
                      borderRadius: 11, padding: 10, cursor, transition: '.2s',
                      position: 'relative', overflow: 'hidden', opacity, boxShadow,
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 900, fontFamily: 'var(--fm)', marginBottom: 2, color: nameColor }}>
                      {tb.n}
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--t3)', fontFamily: 'var(--fm)' }}>
                      {tb.capMin}–{tb.capMax} cvt
                    </div>
                    {/* Shape icon */}
                    <span style={{ fontSize: 14, position: 'absolute', top: 8, right: 8, opacity: .15 }}>
                      {SHAPE_SYM[tb.shape] || '◻'}
                    </span>
                    {/* Status badge */}
                    {statusText && (
                      <div style={{
                        marginTop: 5, fontSize: 10, fontWeight: 800,
                        padding: '3px 8px', borderRadius: 5, display: 'inline-block',
                        background: statusBg, color: statusColor,
                        letterSpacing: '.03em',
                      }}>{statusText}</div>
                    )}
                  </div>
                )
              })}

              {/* Combos libres */}
              {freeCombos.map((c: any) => (
                <div
                  key={c.id}
                  onClick={() => onSelectTable(c.label)}
                  style={{
                    gridColumn: 'span 2',
                    display: 'flex', alignItems: 'stretch', gap: 0,
                    position: 'relative', borderRadius: 13,
                    background: 'rgba(144,96,224,.12)', border: '2px solid rgba(144,96,224,.50)',
                    overflow: 'hidden', borderLeft: '5px solid rgba(144,96,224,.85)',
                    cursor: 'pointer', transition: '.2s',
                  }}
                >
                  {c.tables.map((tid: string, i: number) => {
                    const tb = tables.find((t: any) => t.id === tid)
                    if (!tb) return null
                    return (
                      <div key={tid} style={{
                        flex: 1, padding: 10, background: 'transparent',
                        borderRadius: i === 0 ? '11px 0 0 11px' : i === c.tables.length - 1 ? '0 11px 11px 0' : 0,
                      }}>
                        <div style={{ fontSize: 14, fontWeight: 900, fontFamily: 'var(--fm)', color: '#a855f7', marginBottom: 2 }}>
                          {tb.n}
                        </div>
                        <div style={{ fontSize: 9, color: 'var(--t3)', fontFamily: 'var(--fm)' }}>
                          {tb.capMin}–{tb.capMax} cvt
                        </div>
                      </div>
                    )
                  })}
                  {/* Combo link info */}
                  <div style={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                    fontSize: 9, fontWeight: 800, color: '#a855f7',
                    background: 'rgba(144,96,224,.2)', padding: '2px 8px', borderRadius: 6,
                    whiteSpace: 'nowrap',
                  }}>
                    Combo {c.label} · {c.cap}p
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
