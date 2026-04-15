// ══════════════════════════════════════════════════
//  R3STO — ModalResa
//  Modale nouvelle réservation — 3 colonnes
//  Col 1: Client | Col 2: Réservation | Col 3: Options
// ══════════════════════════════════════════════════

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAppStore, isDoubleBooked } from '../../store/useAppStore'
import { useToast } from '../ui/Toast'
import { useT } from '../../i18n/useTranslation'
import PhoneInput, { toE164 } from '../ui/PhoneInput'
import type { Resa, ResaCanal } from '../../types'

interface ModalResaProps {
  isOpen: boolean
  onClose: () => void
  preselectedTable?: string
  preselectedDate?: string
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

// ── Composant ──────────────────────────────────────
export function ModalResa({ isOpen, onClose, preselectedTable, preselectedDate }: ModalResaProps) {
  const { resas, tables, services, combos, salles, options, activeDate, addResa, resto } = useAppStore()
  const pays = resto.pays || 'CH'
  const { toast } = useToast()
  const { t } = useT()

  // Formulaire
  const [nom, setNom] = useState('')
  const [prenom, setPrenom] = useState('')
  const [tel, setTel] = useState('')
  const [email, setEmail] = useState('')
  const [canal, setCanal] = useState<ResaCanal>('telephone')
  const [svc, setSvc] = useState('')
  const [cvt, setCvt] = useState(2)
  const [slot, setSlot] = useState('')
  const [tbl, setTbl] = useState(preselectedTable || '')
  const [note, setNote] = useState('')
  const [statut, setStatut] = useState(0)
  const [bebe, setBebe] = useState(0)
  const [pmr, setPmr] = useState(0)
  const [allergie, setAllergie] = useState(false)
  const [modeIA, setModeIA] = useState(true)

  // ── Mode rapide (4 champs) vs Complet (3 colonnes) — persistance locale ──
  const [quickMode, setQuickMode] = useState<boolean>(() => {
    try { return localStorage.getItem('r3sto_modalresa_mode') !== 'full' } catch { return true }
  })
  useEffect(() => {
    try { localStorage.setItem('r3sto_modalresa_mode', quickMode ? 'quick' : 'full') } catch {}
  }, [quickMode])

  const date = preselectedDate || activeDate

  // Services actifs (filtrés par jour de la semaine)
  const activeServices = (() => {
    const dayOfWeek = new Date(date + 'T12:00:00').getDay()
    return services.filter(s => {
      if (!s.active) return false
      if (s.jours && s.jours.length > 0) return s.jours.includes(dayOfWeek)
      return true
    })
  })()

  // Init service par défaut
  useEffect(() => {
    if (!isOpen) return
    const nowM = new Date().getHours() * 60 + new Date().getMinutes()
    let best = activeServices.find(s => {
      const openM = timeToMins(s.open)
      const closeM = timeToMins(s.close)
      return nowM >= openM - 30 && nowM <= closeM
    }) || activeServices.find(s => {
      const openM = timeToMins(s.open)
      return openM > nowM && openM - nowM <= 180
    }) || activeServices[0]
    if (best) setSvc(best.name.toLowerCase())
    setTbl(preselectedTable || '')
    // Reset form
    setNom(''); setPrenom(''); setTel(''); setEmail('')
    setCvt(2); setSlot(''); setNote(''); setStatut(0 as 0 | 1 | 2 | 3)
    setBebe(0); setPmr(0); setAllergie(false); setModeIA(true)
  }, [isOpen])

  // Créneaux disponibles
  const slots: string[] = (() => {
    const svcObj = activeServices.find(s => s.name.toLowerCase() === svc)
    if (!svcObj) return []
    const openM = timeToMins(svcObj.open)
    const loM = timeToMins(svcObj.lastOrder)
    const step = options.slot_interval_mins || 15
    const result: string[] = []
    for (let m = openM; m <= loM; m += step) {
      result.push(minsToSlot(m))
    }
    return result
  })()

  // Auto-sélectionner premier slot
  useEffect(() => {
    if (slots.length > 0 && !slot) setSlot(slots[0])
  }, [svc, slots.length])

  // Suggestion IA de table
  const suggestedTable = (() => {
    if (!modeIA || !svc || !slot || cvt < 1) return null
    const occupiedTbls = resas
      .filter(r => r.date === date && r.svc === svc && r.s !== 'cancelled' && r.s !== 'noshow')
      .map(r => r.tbl)

    // Chercher une table libre avec la bonne capacité
    const available = tables
      .filter(t => t.active && !t.blocked && !occupiedTbls.includes(t.n))
      .filter(t => t.capMax >= cvt && t.capMin <= cvt + 1)
      .sort((a, b) => a.capMax - b.capMax) // Table la plus petite possible

    if (available.length > 0) return available[0].n

    // Essayer un combo
    const availableCombo = combos.find(c => {
      if (occupiedTbls.includes(c.label)) return false
      return c.cap >= cvt
    })
    return availableCombo?.label || null
  })()

  // Disponibilité temps réel
  const availability = useMemo(() => {
    const svcResas = resas.filter(r =>
      r.date === date && r.svc === svc && r.s !== 'cancelled' && r.s !== 'noshow'
    )
    const svcObj = activeServices.find(s => s.name.toLowerCase() === svc)
    const maxCvt = svcObj?.maxCouverts || 80
    const occupiedTbls = svcResas.map(r => r.tbl)
    const activeTables = tables.filter(tb => tb.active && !tb.blocked)
    const freeTables = activeTables.filter(tb => !occupiedTbls.includes(tb.n))
    const totalCvt = svcResas.reduce((s, r) => s + r.c, 0)
    const remainingCvt = Math.max(0, maxCvt - totalCvt)
    const saturation = maxCvt > 0 ? totalCvt / maxCvt : 0

    // Capacité max dispo
    const maxCapFree = Math.max(
      ...freeTables.map(tb => tb.capMax),
      ...combos.filter(c => !occupiedTbls.includes(c.label)).map(c => c.cap),
      0
    )

    // Saturation par créneau
    const totalTables = activeTables.length
    const maxPerSlot = Math.ceil(totalTables / (slots.length || 1) * 2) || 3
    const slotSaturation: Record<string, { resas: number; ratio: number }> = {}
    for (const sl of slots) {
      const slotResas = svcResas.filter(r => r.t === sl)
      slotSaturation[sl] = {
        resas: slotResas.length,
        ratio: maxPerSlot > 0 ? slotResas.length / maxPerSlot : 0,
      }
    }

    // Par salle — Table.salle = NOM de la salle (cf. types/index.ts:168)
    const activeSalles = salles.filter(s => s.active)
    const perSalle = activeSalles.map(s => {
      const salleTables = activeTables.filter(tb => tb.salle === s.name)
      const salleFreeTables = salleTables.filter(tb => !occupiedTbls.includes(tb.n))
      return { ...s, total: salleTables.length, free: salleFreeTables.length }
    })

    return { freeCount: freeTables.length, totalTables: activeTables.length, totalCvt, remainingCvt, maxCvt, saturation, maxCapFree, slotSaturation, perSalle }
  }, [resas, date, svc, tables, combos, salles, activeServices, slots])

  const slotColor = (sl: string): string | null => {
    const data = availability.slotSaturation[sl]
    if (!data || data.resas === 0) return null
    if (data.ratio >= 0.9) return '#ef4444'
    if (data.ratio >= 0.6) return '#f59e0b'
    return '#22c55e'
  }

  // Validation et sauvegarde
  const handleSave = useCallback(() => {
    if (!nom.trim()) { toast(t('modal.nameRequired'), 'error'); return }
    if (!slot) { toast(t('modal.selectSlot'), 'error'); return }
    if (!svc) { toast(t('modal.selectService'), 'error'); return }
    if (options.require_phone && !tel.trim()) { toast(t('modal.phoneRequired'), 'error'); return }
    // ── Validation date passée ──
    const todayStr = new Date().toISOString().slice(0, 10)
    if (date < todayStr) { toast('⛔ Impossible de réserver dans le passé', 'error'); return }
    // ── Validation couverts > 0 ──
    if (cvt < 1) { toast('⛔ Nombre de couverts requis', 'error'); return }

    const finalTbl = modeIA ? (suggestedTable || t('modal.toAssign')) : (tbl || t('modal.toAssign'))
    const fullName = `${nom.trim()}${prenom.trim() ? ' ' + prenom.trim() : ''}`

    const newResa: Resa = {
      id: 'r' + Date.now(),
      n: fullName,
      nom: nom.trim(),
      prenom: prenom.trim(),
      c: cvt,
      tbl: finalTbl,
      t: slot,
      svc,
      s: 'reserved',
      note: note.trim(),
      date,
      createdAt: Date.now(),
      statut: statut as 0 | 1 | 2 | 3,
      mode: modeIA ? 'ia' : 'manuel',
      tel: toE164(tel.trim(), pays),
      email: email.trim(),
      canal,
      prisPar: '',
      bebe,
      pmr,
      allergie,
    }

    // ── Double-booking check ──
    if (finalTbl && finalTbl !== t('modal.toAssign') && isDoubleBooked(finalTbl, date, svc)) {
      toast(`⛔ ${finalTbl} déjà occupée pour ce service`, 'error')
      return
    }
    addResa(newResa)
    toast(`✓ ${fullName} · ${cvt}p à ${slot.replace('h',':')} · ${finalTbl}`, 'success')
    onClose()
  }, [nom, prenom, tel, email, canal, svc, cvt, slot, tbl, note, statut, bebe, pmr, allergie, modeIA, suggestedTable, date])

  // Fermeture Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (isOpen) window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen])

  if (!isOpen) return null

  const STATUTS = [t('modal.standard'), t('modal.regular'), t('modal.vip'), t('modal.watched')]
  const STATUTS_COL = ['var(--surf3)', 'rgba(68,128,216,.15)', 'rgba(232,165,48,.15)', 'rgba(220,80,80,.15)']
  const STATUTS_BCOL = ['var(--border)', 'var(--b2)', 'rgba(232,165,48,.4)', 'rgba(220,80,80,.4)']
  const STATUTS_TCOL = ['var(--t3)', 'var(--bl)', 'var(--am)', 'var(--rd)']

  const inputStyle = {
    width: '100%', padding: '8px 10px',
    background: 'var(--surf3)', border: '1.5px solid var(--border)',
    borderRadius: 7, color: 'var(--text)',
    fontSize: 12, fontFamily: 'var(--ff)', outline: 'none',
  }

  const labelStyle = {
    fontSize: 10, fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '.08em', color: 'var(--t3)',
    display: 'block', marginBottom: 4,
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', zIndex:1000 }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(860px, 95vw)',
        background: 'var(--surf2)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        zIndex: 1001,
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        maxHeight: '90vh',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>
              ➕ {t('modal.newResa')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
              <span style={{ fontSize: 11, color: 'var(--t3)' }}>
                {date} {svc && `· ${activeServices.find(s => s.name.toLowerCase() === svc)?.icon} ${activeServices.find(s => s.name.toLowerCase() === svc)?.name}`}
              </span>
              {svc && (
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  color: availability.saturation >= 0.9 ? '#ef4444'
                    : availability.saturation >= 0.7 ? '#f59e0b' : '#22c55e',
                  background: availability.saturation >= 0.9 ? 'rgba(239,68,68,.08)'
                    : availability.saturation >= 0.7 ? 'rgba(245,158,11,.08)' : 'rgba(34,197,94,.08)',
                  padding: '2px 8px', borderRadius: 4,
                }}>
                  {availability.freeCount}/{availability.totalTables} tables · {availability.remainingCvt} {t('quick.placesLeft')}
                </span>
              )}
            </div>
          </div>
          {/* Toggle Rapide ↔ Complet */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 2,
            background: 'var(--surf3)', border: '1px solid var(--border)',
            borderRadius: 8, padding: 2,
          }}>
            <button
              onClick={() => setQuickMode(true)}
              title="Mode rapide : 4 champs essentiels"
              style={{
                padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: quickMode ? 'var(--bl)' : 'transparent',
                color: quickMode ? '#fff' : 'var(--t3)',
                fontSize: 11, fontWeight: 700, fontFamily: 'var(--ff)',
              }}>
              ⚡ Rapide
            </button>
            <button
              onClick={() => setQuickMode(false)}
              title="Mode complet : toutes les options"
              style={{
                padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: !quickMode ? 'var(--bl)' : 'transparent',
                color: !quickMode ? '#fff' : 'var(--t3)',
                fontSize: 11, fontWeight: 700, fontFamily: 'var(--ff)',
              }}>
              ⚙ Complet
            </button>
          </div>
          <button onClick={onClose} aria-label="Fermer" title="Fermer" style={{ background:'none', border:'none', color:'var(--t3)', fontSize:20, cursor:'pointer', padding:'0 4px' }}>✕</button>
        </div>

        {/* Corps — Mode RAPIDE (4 champs : Nom · Téléphone · Couverts · Créneau) */}
        {quickMode && (
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, overflow: 'auto', flex: 1 }}>
            <div style={{ fontSize: 11, color: 'var(--t3)', lineHeight: 1.5 }}>
              ⚡ <b>Mode rapide</b> — service <b>{activeServices.find(s => s.name.toLowerCase() === svc)?.name || '…'}</b>, table auto-assignée par l'IA.
              Pour ajouter allergies, bébé, PMR, statut VIP ou une note, passe en <b>Complet</b>.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>{t('modal.name')} *</label>
                <input style={inputStyle} value={nom} onChange={e => setNom(e.target.value)} placeholder="Dupont" autoFocus />
              </div>
              <div>
                <label style={labelStyle}>{t('modal.phone')}{options.require_phone ? ' *' : ''}</label>
                <PhoneInput value={tel} onChange={setTel} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>{t('modal.covers')}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => setCvt(Math.max(1, cvt - 1))}
                    style={{ width: 32, height: 34, borderRadius: 7, border: '1.5px solid var(--border)', background: 'var(--surf3)', color: 'var(--text)', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>−</button>
                  <input
                    type="number"
                    min={1}
                    value={cvt}
                    onChange={e => setCvt(Math.max(1, parseInt(e.target.value) || 1))}
                    style={{ ...inputStyle, textAlign: 'center', fontWeight: 700, fontSize: 14 }}
                  />
                  <button
                    type="button"
                    onClick={() => setCvt(cvt + 1)}
                    style={{ width: 32, height: 34, borderRadius: 7, border: '1.5px solid var(--border)', background: 'var(--surf3)', color: 'var(--text)', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>+</button>
                </div>
              </div>
              <div>
                <label style={labelStyle}>{t('modal.slot')} *</label>
                <select value={slot} onChange={e => setSlot(e.target.value)} style={inputStyle}>
                  <option value="">—</option>
                  {slots.map(sl => {
                    const col = slotColor(sl)
                    const data = availability.slotSaturation[sl]
                    return (
                      <option key={sl} value={sl}>
                        {sl.replace('h',':')}{data?.resas ? ` · ${data.resas} résa${data.resas > 1 ? 's' : ''}` : ''}{col === '#ef4444' ? ' 🔴' : col === '#f59e0b' ? ' 🟡' : col === '#22c55e' ? ' 🟢' : ''}
                      </option>
                    )
                  })}
                </select>
              </div>
            </div>

            {/* Suggestion IA de table */}
            {suggestedTable && (
              <div style={{
                padding: '10px 12px', borderRadius: 8,
                background: 'rgba(68,128,216,.08)', border: '1px solid rgba(68,128,216,.25)',
                fontSize: 12, color: 'var(--bl)',
              }}>
                💡 Table suggérée : <b>{suggestedTable}</b>
              </div>
            )}
          </div>
        )}

        {/* Corps — Mode COMPLET — 3 colonnes */}
        <div style={{ display: quickMode ? 'none' : 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, overflow: 'auto', flex: 1 }}>

          {/* ── Col 1 : Client ── */}
          <div style={{ padding: 16, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>
              👤 {t('modal.clientSection')}
            </div>

            <div>
              <label style={labelStyle}>{t('modal.name')} *</label>
              <input style={inputStyle} value={nom} onChange={e => setNom(e.target.value)} placeholder="Dupont" autoFocus />
            </div>

            <div>
              <label style={labelStyle}>{t('modal.firstName')}</label>
              <input style={inputStyle} value={prenom} onChange={e => setPrenom(e.target.value)} placeholder="Marie" />
            </div>

            <div>
              <label style={labelStyle}>{t('modal.phone')}</label>
              <PhoneInput value={tel} onChange={setTel} />
            </div>

            <div>
              <label style={labelStyle}>{t('modal.email')}</label>
              <input style={inputStyle} value={email} onChange={e => setEmail(e.target.value)} placeholder="client@mail.ch" type="email" />
            </div>

            {/* Canal */}
            <div>
              <label style={labelStyle}>{t('modal.canal')}</label>
              <div style={{ display: 'flex', gap: 5 }}>
                {([['telephone',`📞 ${t('modal.tel')}`],['walkin',`🚶 ${t('modal.walkin')}`],['widget',`🌐 ${t('modal.canalWeb')}`],['email',`✉️ ${t('modal.email')}`],['whatsapp','💬 WhatsApp'],['sms','📱 SMS']] as [ResaCanal, string][]).map(([val, lbl]) => (
                  <button
                    key={val}
                    onClick={() => setCanal(val)}
                    style={{
                      flex: 1, padding: '5px 4px', borderRadius: 6,
                      border: `1.5px solid ${canal === val ? 'var(--bl)' : 'var(--border)'}`,
                      background: canal === val ? 'var(--bp)' : 'transparent',
                      color: canal === val ? 'var(--bl)' : 'var(--t3)',
                      fontSize: 10, fontWeight: 700, cursor: 'pointer',
                      fontFamily: 'var(--ff)',
                    }}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Col 2 : Réservation ── */}
          <div style={{ padding: 16, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>
              📅 {t('modal.resaSection')}
            </div>

            {/* Service */}
            <div>
              <label style={labelStyle}>{t('modal.service')} *</label>
              <div style={{ display: 'flex', gap: 5 }}>
                {activeServices.map(s => (
                  <button
                    key={s.id}
                    onClick={() => { setSvc(s.name.toLowerCase()); setSlot('') }}
                    style={{
                      flex: 1, padding: '6px 4px', borderRadius: 7,
                      border: `1.5px solid ${svc === s.name.toLowerCase() ? s.color : 'var(--border)'}`,
                      background: svc === s.name.toLowerCase() ? `${s.color}20` : 'transparent',
                      color: svc === s.name.toLowerCase() ? s.color : 'var(--t3)',
                      fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      fontFamily: 'var(--ff)',
                    }}
                  >
                    {s.icon} {s.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Couverts — chips + flèches ◀ ▶ */}
            <div>
              <label style={labelStyle}>
                {t('modal.covers')} *
                {availability.maxCapFree > 0 && availability.maxCapFree < 10 && (
                  <span style={{ fontSize: 10, fontWeight: 600, color: availability.maxCapFree <= 2 ? 'var(--rd)' : 'var(--am)', marginLeft: 6 }}>
                    (max {availability.maxCapFree}p dispo)
                  </span>
                )}
              </label>
              {(() => {
                const effectiveMax = availability.maxCapFree > 0 ? Math.min(availability.maxCapFree, availability.remainingCvt) : availability.remainingCvt
                const hardMax = effectiveMax > 0 ? effectiveMax : 20
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      onClick={() => setCvt(Math.max(1, cvt - 1))}
                      style={{
                        width: 32, height: 32, borderRadius: '50%', border: '1.5px solid var(--border)',
                        background: 'var(--sf)', color: cvt <= 1 ? 'var(--t4)' : 'var(--bl)',
                        fontSize: 16, fontWeight: 800, cursor: cvt <= 1 ? 'not-allowed' : 'pointer',
                        fontFamily: 'var(--fm)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: cvt <= 1 ? 0.35 : 1, transition: 'all .12s', flexShrink: 0,
                      }}
                      disabled={cvt <= 1}
                    >◀</button>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, flex: 1 }}>
                      {[1,2,3,4,5,6,7,8,9,10].map(n => {
                        const isSel = cvt === n
                        const exceeded = n > availability.maxCapFree
                        const overCapacity = n > hardMax
                        return (
                          <button
                            key={n}
                            onClick={() => !overCapacity && setCvt(n)}
                            disabled={overCapacity}
                            title={overCapacity ? `Capacité max dispo: ${hardMax}p` : undefined}
                            style={{
                              width: 36, height: 36, borderRadius: '50%',
                              border: `1.5px solid ${overCapacity ? 'var(--border)' : isSel ? (exceeded ? '#f59e0b' : 'var(--bl)') : 'var(--border)'}`,
                              background: overCapacity ? 'var(--surf3)' : isSel ? (exceeded ? 'rgba(245,158,11,.1)' : 'var(--bp)') : 'transparent',
                              color: overCapacity ? 'var(--t4)' : isSel ? (exceeded ? '#f59e0b' : 'var(--bl)') : exceeded ? 'var(--t4)' : 'var(--t3)',
                              fontSize: 12, fontWeight: 700,
                              cursor: overCapacity ? 'not-allowed' : 'pointer',
                              fontFamily: 'var(--fm)',
                              opacity: overCapacity ? 0.25 : exceeded && !isSel ? 0.4 : 1,
                              transition: 'all .12s',
                              textDecoration: overCapacity ? 'line-through' : 'none',
                            }}
                          >
                            {n}
                          </button>
                        )
                      })}
                    </div>
                    <button
                      onClick={() => setCvt(Math.min(hardMax, cvt + 1))}
                      style={{
                        width: 32, height: 32, borderRadius: '50%', border: '1.5px solid var(--border)',
                        background: 'var(--sf)', color: cvt >= hardMax ? 'var(--t4)' : 'var(--bl)',
                        fontSize: 16, fontWeight: 800, cursor: cvt >= hardMax ? 'not-allowed' : 'pointer',
                        fontFamily: 'var(--fm)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: cvt >= hardMax ? 0.35 : 1, transition: 'all .12s', flexShrink: 0,
                      }}
                      disabled={cvt >= hardMax}
                    >▶</button>
                  </div>
                )
              })()}
            </div>

            {/* Créneau — barres de remplissage */}
            <div>
              <label style={labelStyle}>{t('modal.time')} *</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {slots.slice(0, 8).map(s => {
                  const sc = slotColor(s)
                  const isSelected = slot === s
                  const data = availability.slotSaturation[s]
                  const fillPct = data ? Math.min(data.ratio * 100, 100) : 0
                  return (
                    <button
                      key={s}
                      onClick={() => setSlot(s)}
                      style={{
                        padding: '4px 8px 3px', borderRadius: 6,
                        border: `1.5px solid ${isSelected ? 'var(--bl)' : sc ? `${sc}60` : 'var(--border)'}`,
                        background: isSelected ? 'var(--bp)' : 'transparent',
                        color: isSelected ? 'var(--bl)' : 'var(--t3)',
                        fontSize: 11, fontWeight: 700, cursor: 'pointer',
                        fontFamily: 'var(--fm)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        gap: 3, overflow: 'hidden',
                      }}
                    >
                      <span>{s.replace('h',':')}</span>
                      {fillPct > 0 && (
                        <div style={{
                          width: '100%', height: 2, borderRadius: 1,
                          background: 'var(--border)',
                        }}>
                          <div style={{
                            width: `${fillPct}%`, height: '100%', borderRadius: 1,
                            background: sc || '#22c55e',
                          }} />
                        </div>
                      )}
                    </button>
                  )
                })}
                {slots.length > 8 && (
                  <select
                    value={slots.indexOf(slot) >= 8 ? slot : ''}
                    onChange={e => setSlot(e.target.value)}
                    style={{ ...inputStyle, width: 'auto', padding: '5px 8px', fontSize: 11 }}
                  >
                    <option value="">···</option>
                    {slots.slice(8).map(s => (
                      <option key={s} value={s}>{s.replace('h',':')}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Mode placement */}
            <div>
              <label style={labelStyle}>{t('modal.placement')}</label>
              <div style={{ display: 'flex', gap: 5, marginBottom: 8 }}>
                <button
                  onClick={() => setModeIA(true)}
                  style={{
                    flex: 1, padding: '6px', borderRadius: 7,
                    border: `1.5px solid ${modeIA ? 'var(--pu)' : 'var(--border)'}`,
                    background: modeIA ? 'rgba(144,96,224,.12)' : 'transparent',
                    color: modeIA ? 'var(--pu)' : 'var(--t3)',
                    fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--ff)',
                  }}
                >🤖 {t('modal.ia')}</button>
                <button
                  onClick={() => setModeIA(false)}
                  style={{
                    flex: 1, padding: '6px', borderRadius: 7,
                    border: `1.5px solid ${!modeIA ? 'var(--bl)' : 'var(--border)'}`,
                    background: !modeIA ? 'var(--bp)' : 'transparent',
                    color: !modeIA ? 'var(--bl)' : 'var(--t3)',
                    fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--ff)',
                  }}
                >✋ {t('modal.manual')}</button>
              </div>

              {modeIA ? (
                <div style={{
                  padding: '8px 10px', borderRadius: 7,
                  background: suggestedTable ? 'rgba(144,96,224,.08)' : 'var(--surf3)',
                  border: `1px solid ${suggestedTable ? 'rgba(144,96,224,.3)' : 'var(--border)'}`,
                  fontSize: 12, color: suggestedTable ? 'var(--pu)' : 'var(--t4)',
                }}>
                  {suggestedTable
                    ? `🤖 ${t('modal.suggestion')} : ${suggestedTable}`
                    : cvt > 0 ? `⚠️ ${t('modal.noTableAvail')}` : t('modal.selectCovers')
                  }
                </div>
              ) : (
                <select
                  value={tbl}
                  onChange={e => setTbl(e.target.value)}
                  style={{ ...inputStyle }}
                >
                  <option value="">— {t('modal.selectTableOpt')} —</option>
                  {tables.filter(tb => tb.active).map(tb => (
                    <option key={tb.id} value={tb.n}>{tb.n} ({tb.capMin}–{tb.capMax}p) · {tb.salle}</option>
                  ))}
                  {combos.map(c => (
                    <option key={c.id} value={c.label}>{c.label} ({t('modal.upTo')} {c.cap}p)</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* ── Col 3 : Options ── */}
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>
              ⚙️ {t('modal.optionsSection')}
            </div>

            {/* Statut client */}
            <div>
              <label style={labelStyle}>{t('modal.clientStatus')}</label>
              <div 