// ══════════════════════════════════════════════════
//  R3STO — ResaFormModal
//  Modale compacte et partagée pour créer / éditer
//  une réservation. Tablet-first, 680px max.
//  Import unique depuis n'importe quelle vue.
// ══════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useTranslation'
import { useToast } from '../ui/Toast'
import { useConfirm } from '../ui/ConfirmDialog'

import PhoneInput, { toE164 } from '../ui/PhoneInput'
import { todayISO, timeToMins, shiftISO } from '../../utils/date'
import { getFreeTables, getFreeCombos, getMaxCapacity, detectTablePref as detectTablePrefCentral, smartPlacement } from '../../utils/placementRules'
import type { Resa, ResaCanal } from '../../types'

// ── Helpers ─────────────────────────────────────────
function fromMin(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}
const toMin = timeToMins

// ── Constantes ──────────────────────────────────────
const T = 44
const SEL   = { bg: 'rgba(91,156,246,.22)', border: 'rgba(91,156,246,.6)', color: '#7bb8ff' }
const UNSEL = { bg: 'rgba(255,255,255,.03)', border: 'var(--border)', color: 'var(--t3)' }



const CANAUX_ALL: { id: ResaCanal; label: string; icon: string }[] = [
  { id: 'telephone', label: 'Tél',      icon: '📞' },
  { id: 'walkin',    label: 'Walk-in',   icon: '🚶' },
  { id: 'email',     label: 'Email',     icon: '📧' },
  { id: 'widget',    label: 'Widget',    icon: '🌐' },
  { id: 'google',    label: 'Google',    icon: '🔍' },
  { id: 'whatsapp',  label: 'WhatsApp',  icon: '💬' },
  { id: 'sms',       label: 'SMS',       icon: '📱' },
]

const STATUT_CLIENT: { value: 0|1|2|3; label: string; icon: string }[] = [
  { value: 0, label: 'Standard',  icon: '☆'  },
  { value: 1, label: 'Habitué',   icon: '🔄' },
  { value: 2, label: 'VIP',       icon: '⭐' },
  { value: 3, label: 'Surveillé', icon: '👁'  },
]

const PERSONNEL = ['—', 'Admin', 'Manager', 'Serveur 1', 'Serveur 2', 'Serveur 3'] as const
const ALLERG = ['Arachides', 'Gluten', 'Lactose', 'Crustacés', 'Oeufs', 'Noix', 'Soja', 'Poisson'] as const

// ── Sub-components ──────────────────────────────────

function Stepper({ value, onChange, min = 0, max = 10, label, icon }: {
  value: number; onChange: (n: number) => void; min?: number; max?: number; label: string; icon: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ fontSize: 13 }}>{icon}</span>
      <span style={{ fontSize: 10, color: 'var(--t3)', textTransform: 'uppercase', minWidth: 28 }}>{label}</span>
      <input type="number" min={min} max={max} value={value}
        onChange={e => onChange(Math.max(min, Math.min(max, Number(e.target.value) || min)))}
        style={{
          width: 56, height: 32, textAlign: 'center', fontSize: 13, fontWeight: 800,
          fontFamily: 'DM Mono,monospace', color: 'var(--text)',
          border: '1px solid var(--border)', borderRadius: 6,
          background: 'var(--surf)', outline: 'none',
        }} />
    </div>
  )
}

function CoverChips({ selected, onSelect, maxCap = 50, softCap }: {
  selected: number; onSelect: (n: number) => void; maxCap?: number; softCap?: number
}) {
  const [big, setBig] = useState(selected > 8)
  useEffect(() => { if (selected > 8) setBig(true) }, [selected])

  if (big) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Stepper value={selected} onChange={onSelect} min={1} max={Math.max(maxCap, 1)} label="" icon="🍽" />
      {softCap && selected > softCap && <span style={{ fontSize: 10, color: 'var(--am)', fontWeight: 600 }}>table max {softCap}p</span>}
      {maxCap < 50 && <span style={{ fontSize: 10, color: 'var(--am)', fontWeight: 600 }}>max {maxCap}p</span>}
      <button type="button" onClick={() => { onSelect(Math.min(2, maxCap)); setBig(false) }}
        style={{ fontSize: 10, color: 'var(--t3)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>← 1-8</button>
    </div>
  )

  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
      {[1, 2, 3, 4, 5, 6, 7, 8].map(n => {
        const on = selected === n
        const over = n > maxCap
        const overSoft = !over && softCap != null && n > softCap
        return (
          <button key={n} type="button" onClick={() => !over && onSelect(n)} style={{
            width: T, height: T, borderRadius: 8, border: '2px solid', fontSize: 15, fontWeight: 700, transition: '.12s',
            cursor: over ? 'not-allowed' : 'pointer', opacity: over ? .3 : 1,
            background: on ? (over ? 'rgba(220,80,80,.15)' : overSoft ? 'rgba(232,165,48,.2)' : SEL.bg) : UNSEL.bg,
            borderColor: on ? (over ? 'rgba(220,80,80,.5)' : overSoft ? 'rgba(232,165,48,.6)' : SEL.border) : over ? 'rgba(220,80,80,.2)' : overSoft ? 'rgba(232,165,48,.3)' : UNSEL.border,
            color: on ? (over ? 'var(--rd)' : overSoft ? 'var(--am)' : SEL.color) : over ? 'var(--rd)' : overSoft ? 'var(--am)' : UNSEL.color,
            boxShadow: on && !over && !overSoft ? `0 0 8px ${SEL.bg}` : 'none',
          }}>{n}</button>
        )
      })}
      {maxCap > 8 && (
        <button type="button" onClick={() => { onSelect(9); setBig(true) }}
          style={{ height: T, padding: '0 14px', borderRadius: 8, border: '1px solid var(--border)', background: UNSEL.bg, color: 'var(--t3)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>9+</button>
      )}
      {maxCap <= 8 && maxCap > 0 && (
        <span style={{ fontSize: 10, color: 'var(--am)', fontWeight: 600, marginLeft: 4 }}>max {maxCap}p</span>
      )}
    </div>
  )
}

// ── Props ───────────────────────────────────────────

export interface ResaFormPresets {
  table?: string
  svc?: string
  mode?: 'ia' | 'manuel'
}

export interface ResaFormModalProps {
  open: boolean
  onClose: () => void
  /** Resa to edit — omit for new */
  editResa?: Resa | null
  /** Pre-fill values when creating new */
  presets?: ResaFormPresets
  /** Where to navigate back (optional) */
  returnTo?: string
}

// ══════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════

export function ResaFormModal({ open, onClose, editResa, presets, returnTo }: ResaFormModalProps) {
  const { t, fmtDate } = useT()
  const { toast } = useToast()
  const { confirm: confirmAction, dialog: confirmDialog } = useConfirm()
  const navigateTo = useNavigate()
  const {
    resas, services, tables, combos, users, activeDate, setActiveDate,
    setResaStatus, addResa, updateResa, resto, blinkResa,
  } = useAppStore()
  const pays = resto.pays || 'CH'

  // ── Form state ──────────────────────────────────
  const [svcId, setSvcId] = useState('')
  const [heure, setHeure] = useState('')
  const [couverts, setCouverts] = useState(2)
  const [bebe, setBebe] = useState(0)
  const [pmr, setPmr] = useState(0)
  const [canal, setCanal] = useState<ResaCanal>('telephone')
  const [nom, setNom] = useState('')
  const [prenom, setPrenom] = useState('')
  const [tel, setTel] = useState('')
  const [email, setEmail] = useState('')
  const [tbl, setTbl] = useState('')
  const [noteResa, setNoteResa] = useState('')
  const [noteProfil, setNoteProfil] = useState('')
  const [modeIA, setModeIA] = useState(true)
  const [statutClient, setStatutClient] = useState<0|1|2|3>(0)
  const [allergieTags, setAllergieTags] = useState<string[]>([])
  const [intolerance, setIntolerance] = useState('')
  const [tablePref, setTablePref] = useState('')
  const [prisPar, setPrisPar] = useState(() => {
    try { return localStorage.getItem('r3sto_lastPrisPar') ?? '—' } catch { return '—' }
  })
  const [matchedProfile, setMatchedProfile] = useState<Resa | null>(null)
  const [showProfil, setShowProfil] = useState(false)
  const [smartWarn, setSmartWarn] = useState<string | null>(null)
  const editingId = editResa?.id ?? null
  const dateRefModal = useRef<HTMLInputElement>(null)

  // ── Derived state ─────────────────────────────────
  const today = todayISO()
  const isToday = activeDate === today
  const activeServices = services.filter(s => s.active)
  const curSvc = activeServices.find(s => s.name.toLowerCase() === svcId)
  const svcOcc = resas.filter(r => r.date === activeDate && r.svc === svcId && (r.s === 'reserved' || r.s === 'arrived')).reduce((s, r) => s + r.c, 0)
  const totalCapMax = tables.filter(t => t.active && !t.blocked && !t.held).reduce((s, tb) => s + tb.capMax, 0)
  const svcLimit = curSvc?.maxCouverts || totalCapMax
  const capPct = svcLimit > 0 ? Math.min(100, Math.round(svcOcc / svcLimit * 100)) : 0
  const capColor = capPct >= 90 ? 'var(--rd)' : capPct >= 60 ? 'var(--am)' : 'var(--gn)'
  const freeTables = getFreeTables(tables, resas, activeDate, svcId, editingId || undefined)
  const freeCombosList = getFreeCombos(combos, tables, resas, activeDate, svcId, editingId || undefined)
  const maxCapFree = getMaxCapacity(tables, combos, resas, activeDate, svcId, editingId || undefined)
  const remainingCvt = svcLimit - svcOcc
  const freeTableCount = freeTables.length
  const totalTableCount = tables.filter(tb => tb.active).length

  const slots = (() => {
    if (!curSvc) return []
    const sm = toMin(curSvc.open ?? '12:00')
    const em = toMin(curSvc.lastOrder ?? curSvc.close ?? '14:00')
    const r: string[] = []
    for (let m = sm; m <= em; m += 15) r.push(fromMin(m))
    return r
  })()

  // ── Init form on open ─────────────────────────────
  useEffect(() => {
    if (!open) return
    if (editResa) {
      // Edit mode
      setSvcId(editResa.svc ?? '')
      setHeure(editResa.t?.replace('h', ':') ?? '')
      setCouverts(editResa.c ?? 2); setBebe(editResa.bebe ?? 0); setPmr(editResa.pmr ?? 0)
      setCanal((editResa.canal as ResaCanal) ?? 'telephone')
      setNom(editResa.nom ?? ''); setPrenom(editResa.prenom ?? ''); setTel(editResa.tel ?? ''); setEmail(editResa.email ?? '')
      setTbl(editResa.tbl ?? ''); setNoteResa(editResa.note ?? ''); setNoteProfil(editResa.noteProfil ?? '')
      setModeIA(editResa.mode === 'ia'); setStatutClient(editResa.statut ?? 0)
      setAllergieTags(editResa.allergie ? ['—'] : []); setIntolerance('')
      setTablePref(detectTablePrefCentral(editResa.tel, editResa.nom || '', editResa.prenom || '', resas) || '')
      setShowProfil(false)
      try { if (editResa.prisPar) setPrisPar(editResa.prisPar) } catch {}
    } else {
      // New mode
      const sid = presets?.svc || activeServices[0]?.name?.toLowerCase() || ''
      setSvcId(sid)
      setHeure(activeServices.find(s => s.name.toLowerCase() === sid)?.open ?? '12:00')
      setCouverts(2); setBebe(0); setPmr(0); setCanal('telephone')
      setNom(''); setPrenom(''); setTel(''); setEmail('')
      setTbl(presets?.table || ''); setNoteResa(''); setNoteProfil('')
      setModeIA(presets?.mode !== 'manuel')
      setStatutClient(0); setAllergieTags([]); setIntolerance('')
      setTablePref(''); setMatchedProfile(null); setShowProfil(false)
      try { const l = localStorage.getItem('r3sto_lastPrisPar'); if (l) setPrisPar(l) } catch {}
      // Pre-fill couverts from table
      if (presets?.table) {
        if (presets.table.includes('+')) {
          const combo = combos.find(c => c.label === presets.table)
          if (combo) setCouverts(combo.cap)
        } else {
          const tb = tables.find(t => t.n === presets.table || t.id === presets.table)
          if (tb) setCouverts(tb.capMax)
        }
      }
    }
  }, [open, editResa?.id])

  // ── Client recognition ────────────────────────────
  useEffect(() => {
    if (tel.length >= 8) {
      const n = tel.replace(/\s/g, '')
      const f = resas.find(r => r.tel && r.tel.replace(/\s/g, '') === n && r.nom && r.nom !== 'Anonyme')
      setMatchedProfile(f ?? null)
    } else setMatchedProfile(null)
  }, [tel, resas])

  // ── Actions ───────────────────────────────────────
  function changeSvc(sid: string) {
    setSvcId(sid)
    setHeure(activeServices.find(s => s.name.toLowerCase() === sid)?.open ?? '12:00')
  }

  function applyProfile(r: Resa) {
    setNom(r.nom); setPrenom(r.prenom); setEmail(r.email ?? '')
    setStatutClient(r.statut)
    if (r.allergie) setAllergieTags(p => p.length ? p : ['—'])
    if (r.note) setNoteProfil(r.note)
    const dp = detectTablePrefCentral(r.tel, r.nom || '', r.prenom || '', resas) || ''
    if (dp) setTablePref(dp)
    setShowProfil(true)
  }

  function handleClose() {
    onClose()
    if (returnTo === 'grille') navigateTo('/grille')
    else if (returnTo === 'plan') navigateTo('/plan')
  }

  function handleSubmit() {
    if (!svcId || !heure || !couverts) return

    // Capacity validation — combo suggestion
    if (!modeIA && tbl) {
      const isCombo = tbl.includes('+')
      const cap = isCombo
        ? combos.find(c => c.label === tbl)?.cap ?? 0
        : tables.find(tb => tb.n === tbl || tb.id === tbl)?.capMax ?? 0
      if (cap > 0 && couverts > cap) {
        const currentTbl = tables.find(tb => tb.n === tbl || tb.id === tbl)
        if (currentTbl && !isCombo) {
          const fittingCombo = combos
            .filter(c => c.tables.includes(currentTbl.id) && (c.capOverride || c.cap) >= couverts)
            .sort((a, b) => (a.capOverride || a.cap) - (b.capOverride || b.cap))[0]
          if (fittingCombo) {
            if (confirm(`${couverts}p dépasse ${tbl} (max ${cap}p).\n\nPasser au combo ${fittingCombo.label} (${fittingCombo.capOverride || fittingCombo.cap}p) ?`)) {
              setTbl(fittingCombo.label)
              return
            }
            return
          }
        }
        toast(`⛔ ${couverts}p dépasse la capacité de ${tbl} (max ${cap}p)`, 'error')
        return
      }
    }

    const pp: string[] = []
    if (allergieTags.length) pp.push(`⚠️ ${allergieTags.join(', ')}`)
    if (intolerance) pp.push(`🚫 ${intolerance}`)
    if (tablePref) pp.push(`🪑 Pref: ${tablePref}`)
    if (noteProfil) pp.push(noteProfil)
    const fullNote = [pp.join(' | '), noteResa].filter(Boolean).join('\n---\n')
    const dn = nom ? (prenom ? `${prenom} ${nom}` : nom) : 'Anonyme'
    const isServiceFull = remainingCvt <= 0 && !editingId

    // Smart Placement IA
    let assignedTbl = isServiceFull ? '' : (modeIA ? tablePref : tbl)
    let forceWaitlist = false
    if (modeIA && !isServiceFull) {
      const sp = smartPlacement(couverts, activeDate, svcId, tables, combos, resas, tablePref || undefined, editingId || undefined)
      if (sp.table) assignedTbl = sp.table
      if (sp.warning) setSmartWarn(sp.warning)
      if (sp.shouldWaitlist && !editingId) {
        if (!confirm(`${sp.suggestion}\n\nPlacer quand même sur ${sp.table} ?`)) return
      }
    }

    // ── P0: JAMAIS de "À assigner" — table obligatoire ou waitlist ──
    if (!assignedTbl && !editingId) {
      // Pas de table trouvée → waitlist automatique
      forceWaitlist = true
      toast('🕐 Aucune table disponible — réservation placée en liste d\'attente', 'warning')
    }
    if (!assignedTbl && editingId) {
      // En édition, on ne peut pas vider la table
      toast('⛔ Une table doit être assignée', 'error')
      return
    }

    const resaData = {
      n: dn, nom: nom || 'Anonyme', prenom,
      c: couverts, bebe, pmr, tbl: assignedTbl || '',
      t: heure.replace(':', 'h'), svc: svcId, s: ((isServiceFull || forceWaitlist) ? 'waitlist' : 'reserved') as Resa['s'], note: fullNote,
      date: activeDate, statut: statutClient,
      mode: (modeIA ? 'ia' : 'manuel') as Resa['mode'], tel: toE164(tel, pays), email, canal,
      prisPar: prisPar === '—' ? '' : prisPar, allergie: allergieTags.length > 0,
      tablePref: tablePref || undefined,
      noteProfil: noteProfil || undefined,
    }

    if (editingId) {
      updateResa(editingId, resaData)
      blinkResa(editingId)
    } else {
      // Clean stale reservations on assigned table
      const at = resaData.tbl
      if (at) {
        const stale = ['noshow', 'done', 'cancelled']
        const chk = at.includes('+') ? at.split('+').map((s: string) => s.trim()) : [at]
        for (const r of resas) {
          if (stale.includes(r.s) && r.tbl && r.date === activeDate) {
            const rt = r.tbl.includes('+') ? r.tbl.split('+').map((s: string) => s.trim()) : [r.tbl]
            if (rt.some(x => chk.includes(x))) updateResa(r.id, { tbl: '' })
          }
        }
      }
      const newId = 'r' + Date.now()
      addResa({ ...resaData, id: newId, createdAt: Date.now() })
      blinkResa(newId)
    }
    try { localStorage.setItem('r3sto_lastPrisPar', prisPar) } catch {}
    handleClose()
  }

  // ── Styles ────────────────────────────────────────
  const inp: React.CSSProperties = {
    background: 'var(--surf3)', border: '1px solid var(--border)', borderRadius: 8,
    padding: '8px 10px', color: 'var(--text)', fontSize: 13, width: '100%',
    outline: 'none', fontFamily: 'var(--ff)', boxSizing: 'border-box', minHeight: T,
  }
  const sep: React.CSSProperties = { borderTop: '1px solid var(--border)', margin: '3px 0' }
  const selBtn = (on: boolean): React.CSSProperties => ({
    minHeight: T, borderRadius: 8, cursor: 'pointer', fontWeight: 700, transition: '.12s',
    border: `2px solid ${on ? SEL.border : UNSEL.border}`,
    background: on ? SEL.bg : UNSEL.bg,
    color: on ? SEL.color : UNSEL.color,
    boxShadow: on ? `0 0 10px ${SEL.bg}` : 'none',
  })

  if (!open) return confirmDialog ? <>{confirmDialog}</> : null

  return (
    <>
      {confirmDialog}
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}
        onClick={() => handleClose()}>
        <div style={{ background: 'var(--surf2)', borderRadius: 14, width: 680, maxWidth: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', border: '1px solid var(--border)', boxShadow: '0 20px 50px var(--shadow)' }}
          onClick={e => e.stopPropagation()}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit() }}>

          {/* ═══ HEADER ═══ */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '8px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0, gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{editingId ? '✏️' : '➕'}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{editingId ? t('modal.edit') : t('modal.new')}</span>

            {/* ◀ date ▶ */}
            <button type="button" onClick={() => setActiveDate(shiftISO(activeDate, -1))}
              style={{ width: 32, height: 32, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surf3)', color: 'var(--t2)', cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 6 }}>◀</button>
            <label style={{ position: 'relative', display: 'inline-flex', cursor: 'pointer' }}>
              <span style={{
                height: 32, padding: '0 12px', borderRadius: 7, fontSize: 12, fontWeight: 700,
                border: `2px solid ${isToday ? SEL.border : 'var(--ab)'}`,
                background: isToday ? SEL.bg : 'var(--ap)',
                color: isToday ? SEL.color : 'var(--am)',
                minWidth: 130, textAlign: 'center',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                pointerEvents: 'none',
              }}>
                {isToday ? t('header.today') : fmtDate(activeDate)}
              </span>
              <input ref={dateRefModal} type="date" value={activeDate}
                onChange={e => { if (e.target.value) setActiveDate(e.target.value) }}
                style={{ position: 'absolute', inset: 0, opacity: 0.01, width: '100%', height: '100%', cursor: 'pointer', zIndex: 2, fontSize: 16 }} />
            </label>
            <button type="button" onClick={() => setActiveDate(shiftISO(activeDate, 1))}
              style={{ width: 32, height: 32, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surf3)', color: 'var(--t2)', cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>▶</button>
            {!isToday && (
              <button type="button" onClick={() => setActiveDate(today)}
                style={{ height: 28, padding: '0 8px', borderRadius: 6, border: '1px solid var(--b2)', background: 'var(--bp)', color: SEL.color, cursor: 'pointer', fontSize: 10, fontWeight: 600 }}>
                {t('toolbar.todayShort')}
              </button>
            )}

            {curSvc && <span style={{ fontSize: 10, color: 'var(--t4)' }}>{t('modal.closes')} {curSvc.close}</span>}
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', gap: 4 }}>
              <button type="button" onClick={() => setModeIA(true)}
                style={{
                  padding: '5px 12px', fontSize: 11, fontWeight: 700, borderRadius: 7, cursor: 'pointer',
                  border: modeIA ? '2px solid rgba(91,156,246,.7)' : '2px solid var(--border)',
                  background: modeIA ? 'rgba(91,156,246,.25)' : 'var(--surf3)',
                  color: modeIA ? '#7bb8ff' : 'var(--t4)',
                }}>🤖 {t('modal.ia')}</button>
              <button type="button" onClick={() => setModeIA(false)}
                style={{
                  padding: '5px 12px', fontSize: 11, fontWeight: 700, borderRadius: 7, cursor: 'pointer',
                  border: !modeIA ? '2px solid rgba(232,165,48,.7)' : '2px solid var(--border)',
                  background: !modeIA ? 'rgba(232,165,48,.25)' : 'var(--surf3)',
                  color: !modeIA ? 'var(--am)' : 'var(--t4)',
                }}>🔒 {t('modal.manual')}</button>
            </div>
            <button type="button" onClick={() => handleClose()}
              style={{ width: 40, height: 40, background: 'none', border: '1px solid rgba(220,80,80,.35)', borderRadius: 7, color: 'var(--rd)', cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>

          {/* ═══ CAPBAR ═══ */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <span style={{ fontSize: 11, color: capColor, fontWeight: 700, fontFamily: 'var(--fm)', minWidth: 50 }}>{svcOcc}/{svcLimit}p</span>
            <div style={{ flex: 1, height: 6, background: 'var(--surf4)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${capPct}%`, background: capColor, borderRadius: 3, transition: 'width .3s ease' }} />
            </div>
            <span style={{ fontSize: 11, color: capColor, fontWeight: 700, fontFamily: 'var(--fm)' }}>{capPct}%</span>
            <div style={{ width: 1, height: 14, background: 'var(--border)' }} />
            <span style={{ fontSize: 10, color: 'var(--gn)', fontWeight: 700, fontFamily: 'var(--fm)' }}>
              🪑 {freeTableCount}/{totalTableCount}
            </span>
            <span style={{ fontSize: 10, color: remainingCvt > 0 ? 'var(--t3)' : 'var(--rd)', fontWeight: 600 }}>
              {remainingCvt > 0 ? `${remainingCvt}p dispo` : 'Complet'}
            </span>
            {maxCapFree > 0 && <span style={{ fontSize: 10, color: 'var(--am)', fontWeight: 600 }}>max {maxCapFree}p</span>}
          </div>

          {/* Bannière complet → waitlist */}
          {remainingCvt <= 0 && !editingId && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'rgba(220,80,80,.1)', borderBottom: '1px solid rgba(220,80,80,.25)', flexShrink: 0 }}>
              <span style={{ fontSize: 14 }}>🚫</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--rd)' }}>Service complet</span>
              <span style={{ fontSize: 11, color: 'var(--t3)' }}>— La réservation sera ajoutée en liste d'attente</span>
              <button type="button" onClick={() => { handleClose(); navigateTo('/waitlist') }}
                style={{ marginLeft: 'auto', padding: '5px 14px', borderRadius: 7, fontSize: 11, fontWeight: 700, border: '1px solid rgba(232,165,48,.5)', background: 'rgba(232,165,48,.12)', color: 'var(--am)', cursor: 'pointer', flexShrink: 0 }}>
                ⏳ Voir la liste
              </button>
            </div>
          )}

          {/* ═══ BODY ═══ */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Service + Heure */}
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 4 }}>
              {activeServices.map(s => {
                const on = svcId === s.name.toLowerCase()
                return (
                  <button key={s.name} type="button" onClick={() => changeSvc(s.name.toLowerCase())}
                    style={{ ...selBtn(on), padding: '6px 12px', fontSize: 13, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                    <span>{s.icon} {s.name}</span>
                    <span style={{ fontSize: 9, fontWeight: 500, opacity: .7 }}>{s.open} - {s.lastOrder}</span>
                  </button>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {slots.map(s => {
                const on = heure === s
                return (
                  <button key={s} type="button" onClick={() => setHeure(s)}
                    style={{ ...selBtn(on), minWidth: 48, padding: '0 6px', fontSize: 12, fontFamily: 'var(--fm)', fontWeight: on ? 700 : 400 }}>{s}</button>
                )
              })}
            </div>

            {/* Couverts + Bébé/PMR */}
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              {(() => {
                const currentTbl = !modeIA && tbl ? tables.find(tb => tb.n === tbl || tb.id === tbl) : null
                const currentComboCap = !modeIA && tbl && tbl.includes('+') ? (combos.find(c => c.label === tbl)?.cap ?? 0) : 0
                const tableSoftCap = currentTbl && !tbl.includes('+') ? currentTbl.capMax : undefined
                const tableCombos = currentTbl ? combos.filter(c => c.tables.includes(currentTbl.id)) : []
                const maxCombo = tableCombos.length > 0 ? Math.max(...tableCombos.map(c => c.capOverride || c.cap)) : 0
                const effectiveMax = !modeIA && tbl
                  ? tbl.includes('+') ? currentComboCap || maxCapFree : Math.max(currentTbl?.capMax ?? 0, maxCombo, maxCapFree)
                  : maxCapFree
                return <CoverChips selected={couverts} onSelect={setCouverts} maxCap={effectiveMax} softCap={tableSoftCap} />
              })()}
              <div style={{ width: 1, height: 24, background: 'var(--border)', flexShrink: 0 }} />
              <div style={{ display: 'flex', gap: 12 }}>
                <Stepper value={bebe} onChange={setBebe} max={6} label="Bébé" icon="👶" />
                <Stepper value={pmr} onChange={setPmr} max={4} label="PMR" icon="♿" />
              </div>
            </div>

            {/* Combo suggestion when couverts > table cap */}
            {(() => {
              if (modeIA || !tbl || tbl.includes('+')) return null
              const currentTbl = tables.find(tb => tb.n === tbl || tb.id === tbl)
              if (!currentTbl || couverts <= currentTbl.capMax) return null
              const fitting = combos.filter(c => c.tables.includes(currentTbl.id) && (c.capOverride || c.cap) >= couverts)
              if (!fitting.length) return null
              const sorted = [...fitting].sort((a, b) => (a.capOverride || a.cap) - (b.capOverride || b.cap))
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, padding: '8px 12px', borderRadius: 8, background: 'rgba(232,165,48,.1)', border: '1.5px solid rgba(232,165,48,.35)' }}>
                  <span style={{ fontSize: 16 }}>🔗</span>
                  <span style={{ fontSize: 12, color: 'var(--am)', fontWeight: 600, flex: 1 }}>
                    {couverts}p dépasse {tbl} ({currentTbl.capMax}p) — passer au combo :
                  </span>
                  {sorted.map(c => (
                    <button key={c.id} type="button" onClick={() => setTbl(c.label)}
                      style={{ fontSize: 12, padding: '5px 12px', borderRadius: 7, fontWeight: 700, border: '1.5px solid rgba(232,165,48,.5)', background: 'rgba(232,165,48,.15)', color: 'var(--am)', cursor: 'pointer', minHeight: 32 }}>
                      {c.label} ({c.capOverride || c.cap}p)
                    </button>
                  ))}
                </div>
              )
            })()}

            <div style={sep} />

            {/* Client — Nom, Prénom, Tél */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
              <input style={{ ...inp, minHeight: 36, height: 36, fontSize: 13 }} value={nom} onChange={e => setNom(e.target.value)} placeholder={t('modal.name')} />
              <input style={{ ...inp, minHeight: 36, height: 36, fontSize: 13 }} value={prenom} onChange={e => setPrenom(e.target.value)} placeholder={t('modal.firstName')} />
              <PhoneInput value={tel} onChange={setTel} compact style={{ minWidth: 0 }} />
            </div>

            {/* Canal */}
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
              {CANAUX_ALL.map(c => {
                const on = canal === c.id
                return (
                  <button key={c.id} type="button" onClick={() => setCanal(c.id)}
                    style={{ ...selBtn(on), padding: '0 10px', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    {c.icon} {c.label}
                  </button>
                )
              })}
            </div>

            {/* Client status + Pris par */}
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
              {STATUT_CLIENT.map(s => {
                const on = statutClient === s.value
                return (
                  <button key={s.value} type="button" onClick={() => setStatutClient(s.value)}
                    style={{ ...selBtn(on), padding: '0 10px', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    {s.icon} {s.label}
                  </button>
                )
              })}
              <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 2px', flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: 'var(--t4)', textTransform: 'uppercase' }}>{t('modal.takenBy')}</span>
              <select style={{
                ...selBtn(prisPar !== '—'), minHeight: T, padding: '0 10px', fontSize: 12,
                fontFamily: 'var(--ff)', appearance: 'none' as const, WebkitAppearance: 'none' as const,
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%236b82a0'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', paddingRight: 22,
              }} value={prisPar} onChange={e => setPrisPar(e.target.value)}>
                {PERSONNEL.map(p => <option key={p} value={p}>{p}</option>)}
                {users.filter(u => u.active).map(u => <option key={u.id} value={u.n}>{u.n}</option>)}
              </select>
            </div>

            {/* Client reconnu */}
            {matchedProfile && (nom !== matchedProfile.nom || !nom) && (
              <button type="button" onClick={() => applyProfile(matchedProfile)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '8px 12px', borderRadius: 8, cursor: 'pointer', minHeight: 40,
                  background: 'rgba(60,200,112,.12)', border: '1px solid rgba(60,200,112,.35)', color: 'var(--gn)', fontSize: 12, fontWeight: 600,
                }}>
                🔗 {matchedProfile.prenom} {matchedProfile.nom}
                {matchedProfile.statut === 1 && <span style={{ fontSize: 11 }}>🔄</span>}
                {matchedProfile.statut === 2 && <span style={{ fontSize: 11 }}>⭐</span>}
                {matchedProfile.allergie && <span style={{ fontSize: 11, color: 'var(--rd)' }}>⚠️</span>}
                <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {(() => {
                    const dp = detectTablePrefCentral(matchedProfile.tel, matchedProfile.nom || '', matchedProfile.prenom || '', resas) || ''
                    return dp ? <span style={{ fontSize: 11, fontFamily: 'var(--fm)', color: 'var(--am)' }}>★ {dp}</span> : null
                  })()}
                  <span style={{ fontSize: 10, opacity: .7 }}>{t('modal.apply')} →</span>
                </span>
              </button>
            )}

            {/* Table préférée — mode IA */}
            {modeIA && tablePref && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 8, background: 'rgba(232,165,48,.1)', border: '1px solid rgba(232,165,48,.3)' }}>
                <span style={{ fontSize: 13 }}>★</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--am)', fontFamily: 'var(--fm)' }}>{tablePref}</span>
                <span style={{ fontSize: 11, color: 'var(--t3)' }}>
                  {(() => {
                    const tb = tables.find(t => t.id === tablePref || t.n === tablePref)
                    return tb ? `${tb.capMin}-${tb.capMax}p` : ''
                  })()}
                </span>
                <span style={{ fontSize: 11, color: 'var(--am)' }}>— {t('modal.tablePrefAuto')}</span>
                <button type="button" onClick={() => setTablePref('')}
                  style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--t4)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>✕</button>
              </div>
            )}

            {/* Table — Manuel mode */}
            {!modeIA && (() => {
              const isCombo = tbl.includes('+')
              const selectedCombo = isCombo ? combos.find(c => c.label === tbl) : null
              const comboTables = selectedCombo ? selectedCombo.tables.map(tid => tables.find(tb => tb.id === tid)).filter(Boolean) : []
              const smallestComboTable = comboTables.length > 0 ? Math.min(...comboTables.map(tb => tb!.capMax)) : 0
              const couldFitOnSingle = isCombo && couverts <= smallestComboTable
              const activeTables = tables.filter(t => t.active)
              const fittingTables = activeTables.filter(tb => tb.capMax >= couverts && !tb.blocked)
              const fittingCombos = combos.filter(c => (c.capOverride || c.cap) >= couverts)
              const freeTableNames = new Set(freeTables.map(t => t.n))
              const freeComboLabels = new Set(freeCombosList.map(c => c.label))

              return (
                <div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: .6 }}>🪑 Table</span>
                    <select value={tbl} onChange={e => setTbl(e.target.value)}
                      style={{
                        ...inp, flex: 1, minHeight: T, fontSize: 13, fontWeight: 700, fontFamily: 'var(--fm)',
                        background: tbl ? SEL.bg : 'var(--surf3)',
                        border: `2px solid ${tbl ? SEL.border : 'var(--border)'}`,
                        color: tbl ? SEL.color : 'var(--t3)',
                        borderRadius: 8, paddingRight: 10,
                      }}>
                      <option value="" disabled>— Choisir une table</option>
                      <optgroup label={`✅ Libres pour ${couverts}p`}>
                        {fittingTables.filter(tb => freeTableNames.has(tb.n)).map(tb => {
                          const isPref = tablePref === tb.id || tablePref === tb.n
                          return <option key={tb.id} value={tb.n}>{tb.n} ({tb.capMin}-{tb.capMax}p){isPref ? ' ★ préf.' : ''} · {tb.salle}</option>
                        })}
                      </optgroup>
                      {fittingCombos.filter(c => freeComboLabels.has(c.label)).length > 0 && (
                        <optgroup label={`🔗 Combos pour ${couverts}p`}>
                          {fittingCombos.filter(c => freeComboLabels.has(c.label)).map(c => (
                            <option key={c.id} value={c.label}>🔗 {c.label} ({c.cap}p)</option>
                          ))}
                        </optgroup>
                      )}
                      {fittingTables.filter(tb => !freeTableNames.has(tb.n)).length > 0 && (
                        <optgroup label={`⛔ Occupées`}>
                          {fittingTables.filter(tb => !freeTableNames.has(tb.n)).map(tb => (
                            <option key={tb.id} value={tb.n} disabled style={{ color: '#888', fontStyle: 'italic' }}>
                              {tb.n} ({tb.capMax}p) — occupée
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  </div>
                  {couldFitOnSingle && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, padding: '6px 12px', borderRadius: 8, background: 'rgba(232,165,48,.1)', border: '1px solid rgba(232,165,48,.3)' }}>
                      <span style={{ fontSize: 14 }}>⚠️</span>
                      <span style={{ fontSize: 12, color: 'var(--am)', fontWeight: 600 }}>
                        {couverts}p tient sur une seule table — combo {tbl} inutile ?
                      </span>
                      {comboTables.filter(tb => tb!.capMax >= couverts).map(tb => (
                        <button key={tb!.id} type="button" onClick={() => setTbl(tb!.n)}
                          style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, fontWeight: 700, border: '1px solid rgba(232,165,48,.5)', background: 'rgba(232,165,48,.15)', color: 'var(--am)', cursor: 'pointer', minHeight: 30 }}>
                          → {tb!.n} ({tb!.capMax}p)
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedCombo && !couldFitOnSingle && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 11, color: 'var(--t3)' }}>
                      <span style={{ color: '#ffd666' }}>🔗</span>
                      Tables {selectedCombo.tables.join(' + ')} réunies — max {selectedCombo.cap}p
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Note */}
            <textarea style={{ ...inp, height: 40, resize: 'none' }}
              value={noteResa} onChange={e => setNoteResa(e.target.value)}
              placeholder={`📌 ${t('modal.notesResa')}`} />

            {/* Profil — collapsible */}
            <button type="button" onClick={() => setShowProfil(!showProfil)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                padding: '6px 10px', borderRadius: 8, cursor: 'pointer', minHeight: 34,
                background: allergieTags.length ? 'rgba(220,80,80,.12)' : 'var(--surf3)',
                border: `1px solid ${allergieTags.length ? 'rgba(220,80,80,.35)' : 'var(--border)'}`,
                color: allergieTags.length ? 'var(--rd)' : 'var(--t3)', fontSize: 12,
              }}>
              <span>{showProfil ? '▾' : '▸'}</span>
              <span style={{ fontWeight: 600 }}>📋 {t('modal.profile')}</span>
              {statutClient === 1 && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--bl)' }}>🔄 Habitué</span>}
              {statutClient === 2 && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--am)' }}>⭐ VIP</span>}
              {statutClient === 3 && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--rd)' }}>👁 Surveillé</span>}
              {allergieTags.length > 0 && <span style={{ fontSize: 11 }}>⚠️ {allergieTags.join(', ')}</span>}
              {tablePref && <span style={{ fontSize: 11, color: 'var(--t3)' }}>🪑 {tablePref}</span>}
            </button>

            {showProfil && (
              <div style={{ background: 'var(--surf3)', borderRadius: 10, padding: '10px 12px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <span style={{ fontSize: 10, color: 'var(--t3)' }}>⚠️ {t('modal.allergies')}</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                    {ALLERG.map(tag => {
                      const on = allergieTags.includes(tag)
                      return (
                        <button key={tag} type="button" onClick={() => setAllergieTags(p => on ? p.filter(t => t !== tag) : [...p, tag])}
                          style={{
                            padding: '4px 10px', borderRadius: 14, fontSize: 11, cursor: 'pointer', minHeight: 30,
                            border: `1.5px solid ${on ? 'rgba(220,80,80,.5)' : 'var(--border)'}`,
                            fontWeight: on ? 700 : 400,
                            background: on ? 'rgba(220,80,80,.18)' : 'transparent',
                            color: on ? 'var(--rd)' : 'var(--t3)',
                          }}>{tag}</button>
                      )
                    })}
                  </div>
                </div>
                <input style={{ ...inp, fontSize: 12, background: 'var(--surf4)' }}
                  value={intolerance} onChange={e => setIntolerance(e.target.value)} placeholder={`🚫 ${t('modal.intolerance')}`} />
                <div>
                  <span style={{ fontSize: 10, color: 'var(--t3)' }}>🪑 {t('modal.preferredTable')}</span>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                    <button type="button" onClick={() => setTablePref('')}
                      style={{ ...selBtn(!tablePref), minWidth: 36, padding: '0 8px', fontSize: 11, opacity: !tablePref ? 1 : .6 }}>—</button>
                    {tables.filter(t => t.active).map(tb => {
                      const on = tablePref === tb.id
                      return (
                        <button key={tb.id} type="button" onClick={() => setTablePref(tb.id)}
                          style={{
                            ...selBtn(on), minWidth: 36, padding: '0 8px', fontSize: 11, fontWeight: on ? 700 : 400,
                            border: `2px solid ${on ? 'rgba(232,165,48,.6)' : UNSEL.border}`,
                            background: on ? 'rgba(232,165,48,.15)' : UNSEL.bg,
                            color: on ? 'var(--am)' : 'var(--t3)',
                          }}>{tb.id}</button>
                      )
                    })}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <input style={{ ...inp, fontSize: 12, background: 'var(--surf4)' }}
                    value={noteProfil} onChange={e => setNoteProfil(e.target.value)} placeholder={`📝 ${t('modal.notesProfil')}`} />
                  <input style={{ ...inp, fontSize: 12, background: 'var(--surf4)' }} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="📧 Email" />
                </div>
              </div>
            )}
          </div>

          {/* Smart Placement Warning */}
          {smartWarn && (
            <div style={{ margin: '0 14px 4px', padding: '6px 10px', borderRadius: 8, background: 'rgba(232,165,48,.1)', border: '1px solid rgba(232,165,48,.3)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--am)', fontWeight: 600 }}>
              <span style={{ fontSize: 14 }}>🧠</span> {smartWarn}
              <button onClick={() => setSmartWarn(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--am)', cursor: 'pointer', fontSize: 14, padding: 0 }}>✕</button>
            </div>
          )}

          {/* ═══ FOOTER ═══ */}
          <div style={{ borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,.08)', flexShrink: 0, padding: '8px 14px' }}>
            <div style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--fm)', marginBottom: 6 }}>
              {isToday ? t('toolbar.todayShort') : fmtDate(activeDate)} · {nom || 'Anonyme'} · {couverts}p{bebe > 0 ? ` 👶${bebe}` : ''}{pmr > 0 ? ` ♿${pmr}` : ''} · {heure} · {svcId}
              {allergieTags.length > 0 && <span style={{ color: 'var(--rd)' }}> · ⚠️{allergieTags.length}</span>}
              {prisPar !== '—' && ` · ${prisPar}`}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              {editingId && (
                <div style={{ display: 'flex', gap: 4, marginRight: 'auto' }}>
                  <button className="btn btn-danger" onClick={async () => {
                    if (await confirmAction({ title: 'Annuler la réservation', message: 'Êtes-vous sûr de vouloir annuler cette réservation ?', danger: true, confirmLabel: 'Annuler la résa' })) {
                      setResaStatus(editingId, 'cancelled'); handleClose()
                    }
                  }} style={{ minHeight: T, padding: '0 16px', fontSize: 13 }}>🚫 Annuler</button>
                </div>
              )}
              <button className="btn btn-secondary" onClick={() => handleClose()}
                style={{ minHeight: T, padding: '0 16px', fontSize: 13 }}>{t('modal.cancel')}</button>
              <button className="btn btn-primary" onClick={handleSubmit}
                disabled={!svcId || !heure || !couverts}
                style={{ opacity: (!svcId || !heure || !couverts) ? .45 : 1, minWidth: 190, minHeight: T, fontWeight: 700, fontSize: 14 }}>
                ✓ {editingId ? t('modal.save') : t('modal.confirm')}
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}

export default ResaFormModal
