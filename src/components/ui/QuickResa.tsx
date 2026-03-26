// ══════════════════════════════════════════════════
//  R3STO — QuickResa
//  Widget autonome de réservation rapide
//  Tout intégré : date, service, nom, tél, couverts,
//  créneau, mode IA — moins de clics que la modale
// ══════════════════════════════════════════════════

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import { useToast } from '../ui/Toast'
import PhoneInput, { toE164 } from '../ui/PhoneInput'
import { useT } from '../../i18n/useTranslation'
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

interface QuickResaProps {
  onOpenFullModal?: () => void
}

export function QuickResa({ onOpenFullModal }: QuickResaProps) {
  const { resas, tables, services, combos, salles, activeDate, setActiveDate, addResa, resto } = useAppStore()
  const pays = resto.pays || 'CH'
  const navigate = useNavigate()
  const { toast } = useToast()
  const { t, fmtDate } = useT()

  const todayDate = todayISO()
  const isToday = activeDate === todayDate

  // ── Services actifs (mémorisé pour éviter re-render cascadés) ──
  const activeServices = useMemo(() => services.filter(s => s.active), [services])

  // ── Prochain service auto ───────────────────────
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

  // ── Salles actives (mémorisé) ──────────────────
  const activeSalles = useMemo(() => salles.filter(s => s.active), [salles])
  const defaultSalle = activeSalles.find(s => s.openByDefault) || activeSalles[0] || null

  // ── State formulaire ────────────────────────────
  const [nom, setNom] = useState('')
  const [tel, setTel] = useState('')
  const [cvt, setCvt] = useState(2)
  const [svc, setSvc] = useState(autoService?.name.toLowerCase() || '')
  const [slot, setSlot] = useState('')
  const [modeIA, setModeIA] = useState(true)
  const [salleId, setSalleId] = useState(defaultSalle?.id || '')

  useEffect(() => {
    if (autoService) setSvc(autoService.name.toLowerCase())
  }, [autoService])

  // ── Créneaux ────────────────────────────────────
  const slots: string[] = useMemo(() => {
    const svcObj = activeServices.find(s => s.name.toLowerCase() === svc)
    if (!svcObj) return []
    const openM = timeToMins(svcObj.open)
    const loM = timeToMins(svcObj.lastOrder)
    const step = 15
    const result: string[] = []
    for (let m = openM; m <= loM; m += step) {
      result.push(minsToSlot(m))
    }
    return result
  }, [svc, activeServices])

  // Réinitialiser le créneau uniquement quand le service change (pas à chaque render)
  useEffect(() => {
    if (slots.length === 0) { setSlot(''); return }
    const nowM = new Date().getHours() * 60 + new Date().getMinutes()
    const nextSlot = slots.find(s => timeToMins(s) >= nowM) || slots[0]
    setSlot(nextSlot)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svc])

  // ── Disponibilité temps réel ────────────────────
  const availability = useMemo(() => {
    // RÈGLE: seuls 'reserved' et 'arrived' occupent une table
    // 'done' = libérée, 'noshow' = absent, 'cancelled' = annulé → table libre
    const svcResas = resas.filter(r =>
      r.date === activeDate && r.svc === svc && (r.s === 'reserved' || r.s === 'arrived')
    )
    const svcObj = activeServices.find(s => s.name.toLowerCase() === svc)
    const maxCvt = svcObj?.maxCouverts || 80
    const occupiedTbls = svcResas.map(r => r.tbl)
    const allActiveTables = tables.filter(tb => tb.active && !tb.blocked)

    // Tables dispo globales (filtrées par salle si sélectionnée)
    const relevantTables = allActiveTables.filter(tb => !salleId || tb.salle === salleId)
    const freeTables = relevantTables.filter(tb => !occupiedTbls.includes(tb.n))
    const totalCvt = svcResas.reduce((s, r) => s + r.c, 0)
    const remainingCvt = Math.max(0, maxCvt - totalCvt)
    const saturation = maxCvt > 0 ? totalCvt / maxCvt : 0

    // Capacité max dispo (plus grande table/combo libre)
    const maxCapFree = Math.max(
      ...freeTables.map(tb => tb.capMax),
      ...combos.filter(c => !occupiedTbls.includes(c.label)).map(c => c.cap),
      0
    )

    // Saturation par créneau
    const totalTables = relevantTables.length
    const maxPerSlot = svcObj ? Math.ceil(totalTables / (slots.length || 1) * 2) : 3
    const slotSaturation: Record<string, { resas: number; ratio: number }> = {}
    for (const sl of slots) {
      const slotResas = svcResas.filter(r => r.t === sl)
      slotSaturation[sl] = {
        resas: slotResas.length,
        ratio: maxPerSlot > 0 ? slotResas.length / maxPerSlot : 0,
      }
    }

    // Par salle
    const perSalle: Record<string, { free: number; total: number }> = {}
    for (const s of activeSalles) {
      const st = allActiveTables.filter(tb => tb.salle === s.id)
      const sf = st.filter(tb => !occupiedTbls.includes(tb.n))
      perSalle[s.id] = { free: sf.length, total: st.length }
    }

    return {
      freeCount: freeTables.length, totalTables: relevantTables.length,
      totalCvt, remainingCvt, maxCvt, saturation, maxCapFree,
      slotSaturation, perSalle,
    }
  }, [resas, activeDate, svc, tables, combos, salleId, activeServices, slots, activeSalles])

  // Couleur de saturation d'un créneau
  const slotColor = (sl: string): string | null => {
    const data = availability.slotSaturation[sl]
    if (!data || data.resas === 0) return null
    if (data.ratio >= 0.9) return '#ef4444'
    if (data.ratio >= 0.6) return '#f59e0b'
    return '#22c55e'
  }

  // ── Suggestion IA de table (filtrée par salle choisie) ──
  const suggestedTable = useMemo(() => {
    if (!modeIA || !svc || !slot || cvt < 1) return null
    const occupiedTbls = resas
      .filter(r => r.date === activeDate && r.svc === svc && (r.s === 'reserved' || r.s === 'arrived'))
      .map(r => r.tbl)

    // Filtrer par salle sélectionnée
    const available = tables
      .filter(tb => tb.active && !tb.blocked && !occupiedTbls.includes(tb.n))
      .filter(tb => tb.capMax >= cvt && tb.capMin <= cvt + 1)
      .filter(tb => !salleId || tb.salle === salleId)
      .sort((a, b) => a.capMax - b.capMax)
    if (available.length > 0) return available[0].n

    // Fallback : toutes salles
    const anyAvail = tables
      .filter(tb => tb.active && !tb.blocked && !occupiedTbls.includes(tb.n))
      .filter(tb => tb.capMax >= cvt && tb.capMin <= cvt + 1)
      .sort((a, b) => a.capMax - b.capMax)
    if (anyAvail.length > 0) return anyAvail[0].n

    const combo = combos.find(c => !occupiedTbls.includes(c.label) && c.cap >= cvt)
    return combo?.label || null
  }, [modeIA, svc, slot, cvt, resas, tables, combos, salleId, activeDate])

  // ── Confirmation ────────────────────────────────
  const handleConfirm = useCallback(() => {
    if (!nom.trim()) { toast(t('modal.nameRequired'), 'error'); return }
    if (!slot) { toast(t('modal.selectSlot'), 'error'); return }
    if (!svc) { toast(t('modal.selectService'), 'error'); return }

    const finalTbl = suggestedTable || t('modal.toAssign')

    const newResa: Resa = {
      id: 'r' + Date.now(),
      n: nom.trim(),
      nom: nom.trim(),
      prenom: '',
      c: cvt,
      tbl: finalTbl,
      t: slot,
      svc,
      s: 'reserved',
      note: '',
      date: activeDate,
      createdAt: Date.now(),
      statut: 0,
      mode: modeIA ? 'ia' : 'manuel',
      tel: toE164(tel.trim(), pays),
      email: '',
      canal: 'telephone',
      prisPar: '',
      bebe: 0,
      pmr: 0,
      allergie: false,
    }

    addResa(newResa)
    toast(`✓ ${nom.trim()} · ${cvt}p · ${slot.replace('h', ':')} · ${finalTbl}`, 'success')

    setNom('')
    setTel('')
    setCvt(2)

    navigate('/reservations')
  }, [nom, tel, cvt, svc, slot, modeIA, suggestedTable, activeDate, t, navigate])

  // ── Pas de service actif ────────────────────────
  if (activeServices.length === 0) {
    return (
      <div className="card" style={{ padding: '14px 16px', opacity: .5 }}>
        <div style={{ fontSize: 12, color: 'var(--t3)' }}>{t('quick.noService')}</div>
      </div>
    )
  }

  // ── Raccourcis créneaux : 5 prochains ───────────
  const nowM = new Date().getHours() * 60 + new Date().getMinutes()
  const nextSlots = slots.filter(s => timeToMins(s) >= nowM - 15).slice(0, 5)
  if (nextSlots.length === 0 && slots.length > 0) nextSlots.push(...slots.slice(-5))

  const svcObj = activeServices.find(s => s.name.toLowerCase() === svc)

  const navBtnStyle: React.CSSProperties = {
    width: 32, height: 28, borderRadius: 6,
    border: '1px solid var(--border)', background: 'var(--surf3)',
    color: 'var(--t2)', cursor: 'pointer', fontSize: 14,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700,
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '.08em', color: 'var(--t4)', display: 'block', marginBottom: 3,
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>

      {/* ── Barre titre : ⚡ titre | date nav | services ── */}
      <div style={{
        padding: '8px 14px',
        background: svcObj ? `${svcObj.color}12` : 'var(--surf3)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        {/* Titre */}
        <span style={{ fontSize: 16 }}>⚡</span>
        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
          {t('quick.title')}
        </span>

        {/* Séparateur */}
        <div style={{ width: 1, height: 16, background: 'var(--border)', flexShrink: 0 }} />

        {/* Navigation date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button style={navBtnStyle} onClick={() => setActiveDate(shiftISO(activeDate, -1))}>←</button>
          <button
            onClick={() => setActiveDate(todayDate)}
            style={{
              padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700,
              height: 28,
              border: `1.5px solid ${isToday ? 'var(--bl)' : 'var(--am)'}`,
              background: isToday ? 'var(--bp)' : 'var(--ap)',
              color: isToday ? 'var(--bl)' : 'var(--am)',
              cursor: 'pointer', fontFamily: 'var(--ff)',
              whiteSpace: 'nowrap',
              display: 'flex', alignItems: 'center',
            }}
          >
            {isToday ? t('toolbar.today') : fmtDate(activeDate)}
          </button>
          <button style={navBtnStyle} onClick={() => setActiveDate(shiftISO(activeDate, 1))}>→</button>
        </div>

        <div style={{ flex: 1 }} />

        {/* Services */}
        <div style={{ display: 'flex', gap: 3 }}>
          {activeServices.map(s => (
            <button
              key={s.id}
              onClick={() => { setSvc(s.name.toLowerCase()); setSlot('') }}
              style={{
                padding: '2px 8px', borderRadius: 5,
                border: `1px solid ${svc === s.name.toLowerCase() ? s.color : 'var(--border)'}`,
                background: svc === s.name.toLowerCase() ? `${s.color}20` : 'transparent',
                color: svc === s.name.toLowerCase() ? s.color : 'var(--t3)',
                fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--ff)',
              }}
            >
              {s.icon} {s.name}
            </button>
          ))}
        </div>

        {/* Mode IA/Manuel */}
        <div style={{ display: 'flex', gap: 0 }}>
          <button
            onClick={() => setModeIA(true)}
            style={{
              padding: '2px 7px', borderRadius: '5px 0 0 5px',
              border: `1px solid ${modeIA ? 'var(--pu)' : 'var(--border)'}`,
              background: modeIA ? 'rgba(144,96,224,.12)' : 'transparent',
              color: modeIA ? 'var(--pu)' : 'var(--t4)',
              fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--ff)',
            }}
          >🤖 {t('quick.iaMode')}</button>
          <button
            onClick={() => setModeIA(false)}
            style={{
              padding: '2px 7px', borderRadius: '0 5px 5px 0',
              border: `1px solid ${!modeIA ? 'var(--bl)' : 'var(--border)'}`,
              background: !modeIA ? 'var(--bp)' : 'transparent',
              color: !modeIA ? 'var(--bl)' : 'var(--t4)',
              fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--ff)',
            }}
          >✋ {t('quick.manualMode')}</button>
        </div>
      </div>

      {/* ── Formulaire sur une ligne — optimisé tablette ── */}
      <div style={{ padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>

        {/* Nom */}
        <div style={{ flex: '1 1 200px', minWidth: 160 }}>
          <label style={labelStyle}>{t('quick.name')} *</label>
          <input
            value={nom}
            onChange={e => setNom(e.target.value)}
            placeholder={t('quick.namePlaceholder')}
            onKeyDown={e => { if (e.key === 'Enter') handleConfirm() }}
            style={{
              width: '100%', height: 36, padding: '0 12px',
              background: 'var(--surf3)', border: '1.5px solid var(--border)',
              borderRadius: 8, color: 'var(--text)',
              fontSize: 14, fontFamily: 'var(--ff)', outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Téléphone — même largeur que nom */}
        <div style={{ flex: '1 1 200px', minWidth: 160 }}>
          <label style={labelStyle}>{t('quick.phone')}</label>
          <PhoneInput value={tel} onChange={setTel} compact />
        </div>

        {/* Salle + places libres */}
        {activeSalles.length > 1 && (
          <div style={{ flex: '0 0 auto' }}>
            <label style={labelStyle}>{t('quick.room')}</label>
            <div style={{ display: 'flex', gap: 4 }}>
              {activeSalles.map(s => {
                const sd = availability.perSalle[s.id]
                const isSel = salleId === s.id
                const col = s.color || 'var(--bl)'
                return (
                  <button
                    key={s.id}
                    onClick={() => setSalleId(s.id)}
                    style={{
                      padding: '4px 10px', borderRadius: 6, height: 36,
                      border: `2px solid ${isSel ? col : 'var(--border)'}`,
                      background: isSel ? `${col}15` : 'transparent',
                      color: isSel ? col : 'var(--t3)',
                      fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      fontFamily: 'var(--ff)', transition: 'all .12s',
                      whiteSpace: 'nowrap',
                      display: 'flex', alignItems: 'center', gap: 5,
                    }}
                  >
                    {s.name}
                    {sd && (
                      <span style={{
                        fontSize: 10, fontWeight: 800,
                        color: sd.free === 0 ? '#ef4444' : sd.free <= 2 ? '#f59e0b' : isSel ? col : 'var(--t4)',
                        fontFamily: 'var(--fm)',
                      }}>
                        {sd.free}/{sd.total}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Couverts — grisés si dépassent la capacité dispo */}
        <div style={{ flex: '0 0 auto' }}>
          <label style={labelStyle}>{t('quick.covers')}</label>
          <div style={{ display: 'flex', gap: 4 }}>
            {[1,2,3,4,5,6,7,8].map(n => {
              const isSel = cvt === n
              const exceeded = n > availability.maxCapFree
              return (
                <button
                  key={n}
                  onClick={() => setCvt(n)}
                  style={{
                    width: 36, height: 36, borderRadius: '50%',
                    border: `2px solid ${isSel ? (exceeded ? '#f59e0b' : 'var(--bl)') : exceeded ? 'var(--border)' : 'var(--border)'}`,
                    background: isSel ? (exceeded ? 'rgba(245,158,11,.1)' : 'var(--bp)') : 'transparent',
                    color: isSel ? (exceeded ? '#f59e0b' : 'var(--bl)') : exceeded ? 'var(--t5, var(--t4))' : 'var(--t3)',
                    fontSize: 14, fontWeight: 700, cursor: 'pointer',
                    fontFamily: 'var(--fm)',
                    transition: 'all .12s',
                    opacity: exceeded && !isSel ? 0.4 : 1,
                  }}
                >
                  {n}
                </button>
              )
            })}
          </div>
        </div>

        {/* Créneau — barre de saturation visuelle */}
        <div style={{ flex: '0 0 auto' }}>
          <label style={labelStyle}>{t('quick.time')}</label>
          <div style={{ display: 'flex', gap: 4 }}>
            {nextSlots.map(s => {
              const sc = slotColor(s)
              const isSelected = slot === s
              const data = availability.slotSaturation[s]
              const fillPct = data ? Math.min(data.ratio * 100, 100) : 0
              return (
                <button
                  key={s}
                  onClick={() => setSlot(s)}
                  style={{
                    padding: '6px 10px 4px', borderRadius: 6, height: 36,
                    border: `2px solid ${isSelected ? 'var(--bl)' : sc ? `${sc}60` : 'var(--border)'}`,
                    background: isSelected ? 'var(--bp)' : 'transparent',
                    color: isSelected ? 'var(--bl)' : 'var(--t3)',
                    fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    fontFamily: 'var(--fm)', transition: 'all .12s',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: 3,
                    position: 'relative', overflow: 'hidden',
                  }}
                >
                  <span style={{ lineHeight: 1 }}>{s.replace('h',':')}</span>
                  {/* Barre de remplissage */}
                  {fillPct > 0 && (
                    <div style={{
                      width: '100%', height: 3, borderRadius: 2,
                      background: 'var(--border)',
                    }}>
                      <div style={{
                        width: `${fillPct}%`, height: '100%', borderRadius: 2,
                        background: sc || '#22c55e',
                        transition: 'width .2s',
                      }} />
                    </div>
                  )}
                </button>
              )
            })}
            {slots.length > 5 && (
              <select
                value={!nextSlots.includes(slot) ? slot : ''}
                onChange={e => { if (e.target.value) setSlot(e.target.value) }}
                style={{
                  padding: '6px 8px', borderRadius: 6, height: 36,
                  border: '2px solid var(--border)',
                  background: 'var(--surf3)', color: 'var(--t3)',
                  fontSize: 12, fontFamily: 'var(--fm)', cursor: 'pointer',
                }}
              >
                <option value="">···</option>
                {slots.filter(s => !nextSlots.includes(s)).map(s => (
                  <option key={s} value={s}>{s.replace('h',':')}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Suggestion IA + badge dispo compact */}
        <div style={{ flex: '0 0 auto', display: 'flex', gap: 6, alignSelf: 'flex-end', alignItems: 'center' }}>
          {/* Suggestion table IA */}
          {modeIA && suggestedTable && (
            <span style={{
              fontSize: 13, color: 'var(--pu)', fontWeight: 600,
              background: 'rgba(144,96,224,.08)', padding: '7px 10px',
              borderRadius: 6, display: 'inline-flex', alignItems: 'center',
              height: 36, boxSizing: 'border-box',
            }}>
              🤖 {suggestedTable}
            </span>
          )}

          {/* Badge dispo : X/Y tables libres */}
          {(() => {
            const col = availability.saturation >= 0.9 ? '#ef4444'
              : availability.saturation >= 0.7 ? '#f59e0b' : '#22c55e'
            return (
              <span style={{
                fontSize: 11, fontWeight: 700, color: col,
                background: `${col}12`,
                padding: '0 10px', borderRadius: 6,
                height: 36, boxSizing: 'border-box',
                display: 'inline-flex', alignItems: 'center', gap: 4,
                whiteSpace: 'nowrap', fontFamily: 'var(--fm)',
              }}>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: col, flexShrink: 0,
                }} />
                {availability.freeCount}/{availability.totalTables}
              </span>
            )
          })()}
        </div>

        {/* Boutons — taille tablette */}
        <div style={{ flex: '0 0 auto', display: 'flex', gap: 8, alignSelf: 'flex-end' }}>
          {onOpenFullModal && (
            <button
              onClick={onOpenFullModal}
              style={{
                padding: '0 14px', height: 36, borderRadius: 8,
                border: '1.5px solid var(--border)', background: 'transparent',
                color: 'var(--t3)', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'var(--ff)',
                display: 'flex', alignItems: 'center',
              }}
            >
              {t('quick.moreOptions')} →
            </button>
          )}
          <button
            onClick={handleConfirm}
            style={{
              padding: '0 20px', height: 36, borderRadius: 8,
              border: 'none', background: 'var(--bl)',
              color: '#fff', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'var(--ff)',
              opacity: nom.trim() ? 1 : .5,
              display: 'flex', alignItems: 'center',
              transition: 'opacity .12s',
            }}
          >
            ✓ {t('quick.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
