import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import { ViewToolbar } from '../../components/ui/ViewToolbar'
import { EmptyState } from '../../components/ui/EmptyState'
import type { Resa, ResaCanal } from '../../types'
import PhoneInput, { toE164, displayPhone } from '../../components/ui/PhoneInput'
import { useT } from '../../i18n/useTranslation'
import { STATUS, CANAUX } from '../../utils/design'
import { useToast } from '../../components/ui/Toast'
import { useConfirm } from '../../components/ui/ConfirmDialog'
import { todayISO, timeToMins, shiftISO, nowMins } from '../../utils/date'
import { getFreeTables, getFreeCombos, getMaxCapacity, detectTablePref as detectTablePrefCentral, smartPlacement } from '../../utils/placementRules'

// ── Helpers ────────────────────────────────────────
const toMin = timeToMins
const shiftDate = shiftISO
function fromMin(m: number): string {
  return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`
}

// ── Constantes ─────────────────────────────────────
const T = 44

const SEL   = { bg: 'rgba(91,156,246,.22)', border: 'rgba(91,156,246,.6)', color: '#7bb8ff' }
const UNSEL = { bg: 'rgba(255,255,255,.03)', border: 'var(--border)', color: 'var(--t3)' }

// Cycle principal : reserved → arrived → done (s'arrête)
const STATUS_CYCLE: Record<string, string> = { reserved: 'arrived', arrived: 'done' }
// STATUS_META unifié via design system
const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string }> = Object.fromEntries(
  Object.entries(STATUS).map(([k, v]) => [k, { label: v.label, color: v.color, bg: v.bg, border: v.border }])
)

const CANAUX_BTN: { id: ResaCanal; label: string; icon: string }[] = [
  { id: 'telephone', label: 'Tél', icon: '📞' },
  { id: 'walkin',    label: 'Walk-in', icon: '🚶' },
]
const CANAUX_OTHER: { id: ResaCanal; label: string; icon: string }[] = [
  { id: 'email', label: 'Email', icon: '📧' },
  { id: 'widget', label: 'Widget', icon: '🌐' },
  { id: 'google', label: 'Google', icon: '🔍' },
  { id: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { id: 'sms', label: 'SMS', icon: '📱' },
]

const STATUT_CLIENT: { value: 0|1|2|3; label: string; icon: string }[] = [
  { value: 0, label: 'Standard', icon: '☆' },
  { value: 1, label: 'Habitué',  icon: '🔄' },
  { value: 2, label: 'VIP',      icon: '⭐' },
  { value: 3, label: 'Surveillé', icon: '👁' },
]

const PERSONNEL = ['—', 'Admin', 'Manager', 'Serveur 1', 'Serveur 2', 'Serveur 3'] as const
const ALLERG = ['Arachides', 'Gluten', 'Lactose', 'Crustacés', 'Oeufs', 'Noix', 'Soja', 'Poisson'] as const

// ── Composants ─────────────────────────────────────

function Stepper({ value, onChange, min = 0, max = 10, label, icon }: {
  value: number; onChange: (n: number) => void; min?: number; max?: number; label: string; icon: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ fontSize: 13 }}>{icon}</span>
      <span style={{ fontSize: 10, color: 'var(--t3)', textTransform: 'uppercase', minWidth: 28 }}>{label}</span>
      <input type="number" min={min} max={max} value={value} onChange={e => onChange(Math.max(min, Math.min(max, Number(e.target.value) || min)))} style={{ width: 56, height: 32, textAlign: 'center', fontSize: 13, fontWeight: 800, fontFamily: 'DM Mono,monospace', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surf)', outline: 'none' }} />
    </div>
  )
}

function CoverChips({ selected, onSelect, maxCap = 50, softCap }: { selected: number; onSelect: (n: number) => void; maxCap?: number; softCap?: number }) {
  // softCap = capacité de la table actuelle (au-delà → orange, suggestion combo)
  // maxCap = capacité max absolue (au-delà → désactivé)
  const [big, setBig] = useState(selected > 8)
  useEffect(() => { if (selected > 8) setBig(true) }, [selected])
  if (big) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Stepper value={selected} onChange={onSelect} min={1} max={Math.max(maxCap, 1)} label="" icon="🍽" />
      {softCap && selected > softCap && <span style={{ fontSize: 10, color: '#e8a530', fontWeight: 600 }}>table max {softCap}p</span>}
      {maxCap < 50 && <span style={{ fontSize: 10, color: 'var(--am)', fontWeight: 600 }}>max {maxCap}p</span>}
      <button type="button" onClick={() => { onSelect(Math.min(2, maxCap)); setBig(false) }}
        style={{ fontSize: 10, color: 'var(--t3)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>← 1-8</button>
    </div>
  )
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
      {[1,2,3,4,5,6,7,8].map(n => {
        const on = selected === n
        const over = n > maxCap
        const overSoft = !over && softCap != null && n > softCap // au-delà de la table mais pas du max → orange
        return (
          <button key={n} type="button" onClick={() => !over && onSelect(n)} style={{
            width: T, height: T, borderRadius: 8, border: '2px solid', fontSize: 15, fontWeight: 700, transition: '.12s',
            cursor: over ? 'not-allowed' : 'pointer',
            opacity: over ? .3 : 1,
            background: on ? (over ? 'rgba(220,80,80,.15)' : overSoft ? 'rgba(232,165,48,.2)' : SEL.bg) : UNSEL.bg,
            borderColor: on ? (over ? 'rgba(220,80,80,.5)' : overSoft ? 'rgba(232,165,48,.6)' : SEL.border) : over ? 'rgba(220,80,80,.2)' : overSoft ? 'rgba(232,165,48,.3)' : UNSEL.border,
            color: on ? (over ? 'var(--rd)' : overSoft ? '#e8a530' : SEL.color) : over ? 'var(--rd)' : overSoft ? '#e8a530' : UNSEL.color,
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

function StatusPill({ status, onClick }: { status: string; onClick: () => void }) {
  const { t } = useT()
  const m = STATUS_META[status] ?? STATUS_META.reserved
  const sm = STATUS[status as keyof typeof STATUS]
  const label = sm ? t(sm.label) : t('status.reserved')
  return (
    <button type="button" onClick={onClick} title={`${label} — cliquer pour changer`} style={{
      background: m.bg, color: m.color, border: `1px solid ${m.border}`,
      borderRadius: 14, padding: '3px 7px', fontSize: 10, fontWeight: 700,
      cursor: 'pointer', fontFamily: 'var(--fm)', whiteSpace: 'nowrap',
      display: 'inline-flex', alignItems: 'center', gap: 3, lineHeight: 1.3,
      maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis',
    }}>
      <span style={{ flexShrink: 0 }}>{sm?.icon}</span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
    </button>
  )
}

// ══════════════════════════════════════════════════════

export function Resas() {
  const { t, fmtDate } = useT()
  const { toast } = useToast()
  const { confirm: confirmAction, dialog: confirmDialog } = useConfirm()
  const { resas, services, tables, combos, users, activeDate, setActiveDate, setResaStatus, addResa, updateResa, resto, blinkResa, blinkResaIds } = useAppStore()
  const pays = resto.pays || 'CH'
  const [searchParams, setSearchParams] = useSearchParams()
  const navigateTo = useNavigate()
  // Stocker returnTo dans un ref — les searchParams sont vidés après lecture
  const returnToRef = useRef<string | null>(null)
  if (!returnToRef.current) returnToRef.current = searchParams.get('from')
  const [filter, setFilter] = useState<string>('tous')
  const [salleFilter, setSalleFilter] = useState<string>('toutes')  // filtre par salle.id
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'heure' | 'table' | 'client' | 'couverts' | 'statut'>('heure')
  const [sortAsc, setSortAsc] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const dateRefModal = useRef<HTMLInputElement>(null)

  // Form
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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [lastEditedId, setLastEditedId] = useState<string | null>(null)

  const today = todayISO()
  const isToday = activeDate === today
  const activeServices = services.filter(s => s.active)

  const dayResas = resas
    .filter(r => r.date === activeDate)
    .filter(r => filter === 'tous' || r.svc === filter)
    .filter(r => salleFilter === 'toutes' || tables.find(t => t.n === r.tbl)?.salle === salleFilter)
    .filter(r => !search || r.n.toLowerCase().includes(search.toLowerCase()) || r.tbl.toLowerCase().includes(search.toLowerCase()) || r.tel?.includes(search))
    .sort((a, b) => {
      const dir = sortAsc ? 1 : -1
      switch (sortBy) {
        case 'table':    return (a.tbl || 'zzz').localeCompare(b.tbl || 'zzz') * dir
        case 'client':   return (a.nom || a.n).localeCompare(b.nom || b.n) * dir
        case 'couverts': return (a.c - b.c) * dir
        case 'statut': {
          const ord: Record<string, number> = { arrived: 0, reserved: 1, waitlist: 2, noshow: 3, done: 4, cancelled: 5 }
          return ((ord[a.s] ?? 9) - (ord[b.s] ?? 9)) * dir
        }
        default:         return a.t.localeCompare(b.t) * dir
      }
    })

  // KPI stats – reserved for future toolbar display
  // const total    = resas.filter(r => r.date === activeDate).length
  // const totalCvt = resas.filter(r => r.date === activeDate).reduce((s, r) => s + r.c, 0)
  // const noshows  = resas.filter(r => r.date === activeDate && r.s === 'noshow').length

  const curSvc   = activeServices.find(s => s.name.toLowerCase() === svcId)
  const svcOcc   = resas.filter(r => r.date === activeDate && r.svc === svcId && (r.s === 'reserved' || r.s === 'arrived')).reduce((s, r) => s + r.c, 0)
  const totalCapMax = tables.filter(t => t.active && !t.blocked && !t.held).reduce((s, tb) => s + tb.capMax, 0)
  const svcLimit = curSvc?.maxCouverts || totalCapMax
  const capPct   = svcLimit > 0 ? Math.min(100, Math.round(svcOcc / svcLimit * 100)) : 0
  const capColor = capPct >= 90 ? 'var(--rd)' : capPct >= 60 ? 'var(--am)' : 'var(--gn)'

  // ══ RÈGLE CAPACITÉ — via utils/placementRules.ts ══
  // Voir placementRules.ts pour les 9 règles centralisées (occupation, combos, IA, etc.)
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

  // Reconnaissance client
  useEffect(() => {
    if (tel.length >= 8) {
      const n = tel.replace(/\s/g, '')
      const f = resas.find(r => r.tel && r.tel.replace(/\s/g, '') === n && r.nom && r.nom !== 'Anonyme')
      setMatchedProfile(f ?? null)
    } else setMatchedProfile(null)
  }, [tel, resas])

  // Handle query params from other views
  useEffect(() => {
    const editId = searchParams.get('edit')
    const newFlag = searchParams.get('new')
    const preTable = searchParams.get('table')
    const preMode = searchParams.get('mode')
    const preSvc = searchParams.get('svc')
    if (editId) {
      const r = resas.find(res => res.id === editId)
      if (r) {
        openEdit(r)
        setSearchParams({}, { replace: true })
      }
    } else if (newFlag) {
      // D'abord ouvrir la modale (reset tous les champs à 2p, mode IA, etc.)
      openModal()
      // Puis écraser avec les valeurs pré-remplies depuis la Grille
      if (preTable) {
        setTbl(preTable)
        setModeIA(false)
        // Pré-remplir couverts au max de la table/combo sélectionnée
        if (preTable.includes('+')) {
          const combo = combos.find(c => c.label === preTable)
          if (combo) setCouverts(combo.cap)
        } else {
          const tb = tables.find(t => t.n === preTable || t.id === preTable)
          if (tb) setCouverts(tb.capMax)
        }
      }
      if (preMode === 'manuel') setModeIA(false)
      if (preSvc) setSvcId(preSvc)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, resas])

  // Délègue à la version centralisée (utils/placementRules.ts — Règle 9)
  function detectTablePref(clientTel: string, clientNom?: string, clientPrenom?: string): string {
    return detectTablePrefCentral(clientTel, clientNom || '', clientPrenom || '', resas) || ''
  }

  function applyProfile(r: Resa) {
    setNom(r.nom); setPrenom(r.prenom); setEmail(r.email ?? '')
    setStatutClient(r.statut)
    if (r.allergie) setAllergieTags(p => p.length ? p : ['—'])
    if (r.note) setNoteProfil(r.note)
    const detectedTable = detectTablePref(r.tel, r.nom, r.prenom)
    if (detectedTable) setTablePref(detectedTable)
    setShowProfil(true)
  }

  function openModal() {
    setEditingId(null)
    const sid = activeServices[0]?.name?.toLowerCase() ?? ''
    setSvcId(sid)
    setHeure(activeServices.find(s => s.name.toLowerCase() === sid)?.open ?? '12:00')
    setCouverts(2); setBebe(0); setPmr(0); setCanal('telephone')
    setNom(''); setPrenom(''); setTel(''); setEmail('')
    setTbl(''); setNoteResa(''); setNoteProfil('')
    setModeIA(true); setStatutClient(0); setAllergieTags([]); setIntolerance('')
    setTablePref(''); setMatchedProfile(null); setShowProfil(false)
    try { const l = localStorage.getItem('r3sto_lastPrisPar'); if (l) setPrisPar(l) } catch {}
    setShowModal(true)
  }

  function openEdit(r: Resa) {
    setEditingId(r.id)
    setSvcId(r.svc ?? '')
    setHeure(r.t?.replace('h', ':') ?? '')
    setCouverts(r.c ?? 2); setBebe(r.bebe ?? 0); setPmr(r.pmr ?? 0)
    setCanal((r.canal as ResaCanal) ?? 'telephone')
    setNom(r.nom ?? ''); setPrenom(r.prenom ?? ''); setTel(r.tel ?? ''); setEmail(r.email ?? '')
    setTbl(r.tbl ?? ''); setNoteResa(r.note ?? ''); setNoteProfil(r.noteProfil ?? '')
    setModeIA(r.mode === 'ia'); setStatutClient(r.statut ?? 0)
    setAllergieTags(r.allergie ? [r.allergie as any] : []); setIntolerance('')
    setTablePref(detectTablePref(r.tel, r.nom, r.prenom))
    setShowProfil(false)
    try { if (r.prisPar) setPrisPar(r.prisPar) } catch {}
    setShowModal(true)
  }

  function changeSvc(sid: string) {
    setSvcId(sid)
    setHeure(activeServices.find(s => s.name.toLowerCase() === sid)?.open ?? '12:00')
  }

  async function handleSubmit() {
    if (!svcId || !heure || !couverts) return

    // ── RÈGLE B4/C5 : validation capacité — proposer combo si dépasse ──
    if (!modeIA && tbl) {
      const isCombo = tbl.includes('+')
      const cap = isCombo
        ? combos.find(c => c.label === tbl)?.cap ?? 0
        : tables.find(tb => tb.n === tbl || tb.id === tbl)?.capMax ?? 0
      if (cap > 0 && couverts > cap) {
        // Chercher un combo contenant cette table
        const currentTbl = tables.find(tb => tb.n === tbl || tb.id === tbl)
        if (currentTbl && !isCombo) {
          const fittingCombo = combos
            .filter(c => c.tables.includes(currentTbl.id) && (c.capOverride || c.cap) >= couverts)
            .sort((a, b) => (a.capOverride || a.cap) - (b.capOverride || b.cap))[0]
          if (fittingCombo) {
            const ok = await confirmAction({
              title: 'Capacité dépassée',
              message: `${couverts}p dépasse ${tbl} (max ${cap}p).\n\nPasser au combo ${fittingCombo.label} (${fittingCombo.capOverride || fittingCombo.cap}p) ?`,
              confirmLabel: `Utiliser ${fittingCombo.label}`,
            })
            if (ok) {
              setTbl(fittingCombo.label)
              return // re-submit sera fait par l'utilisateur
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
    // Si restaurant complet et nouvelle résa → statut waitlist auto
    const isServiceFull = remainingCvt <= 0 && !editingId

    // ── Smart Placement IA : éviter gaspillage dernières grandes tables ──
    let assignedTbl = isServiceFull ? '' : (modeIA ? tablePref : tbl)
    if (modeIA && !isServiceFull) {
      const sp = smartPlacement(couverts, activeDate, svcId, tables, combos, resas, tablePref || undefined, editingId || undefined)
      if (sp.table) assignedTbl = sp.table
      if (sp.warning) setSmartWarn(sp.warning)
      if (sp.shouldWaitlist && !editingId) {
        // Recommander waitlist — mais laisser le choix
        const forcePlace = await confirmAction({
          title: 'Placement déconseillé',
          message: `${sp.suggestion}\n\nPlacer quand même sur ${sp.table} ?`,
          confirmLabel: 'Placer quand même',
          danger: true,
        })
        if (!forcePlace) return
      }
    }

    const resaData = {
      n: dn, nom: nom || 'Anonyme', prenom,
      c: couverts, bebe, pmr, tbl: assignedTbl || '',
      t: heure.replace(':', 'h'), svc: svcId, s: (isServiceFull ? 'waitlist' : 'reserved') as Resa['s'], note: fullNote,
      date: activeDate, statut: statutClient,
      mode: (modeIA ? 'ia' : 'manuel') as Resa['mode'], tel: toE164(tel, pays), email, canal,
      prisPar: prisPar === '—' ? '' : prisPar, allergie: allergieTags.length > 0,
      tablePref: tablePref || undefined,
      noteProfil: noteProfil || undefined,
    }
    if (editingId) {
      updateResa(editingId, resaData)
      setLastEditedId(editingId)
      blinkResa(editingId)
    } else {
      // ── Nettoyage : libérer les anciennes résas noshow/done/cancelled sur cette table ──
      const assignedTable = resaData.tbl
      if (assignedTable) {
        const staleStatuses = ['noshow', 'done', 'cancelled']
        const tablesToCheck = assignedTable.includes('+')
          ? assignedTable.split('+').map((s: string) => s.trim())
          : [assignedTable]
        for (const r of resas) {
          if (staleStatuses.includes(r.s) && r.tbl && r.date === activeDate) {
            const rTables = r.tbl.includes('+') ? r.tbl.split('+').map((s: string) => s.trim()) : [r.tbl]
            if (rTables.some(rt => tablesToCheck.includes(rt))) {
              updateResa(r.id, { tbl: '' })  // libère la table de l'ancienne résa
            }
          }
        }
      }
      const newId = Date.now().toString()
      addResa({ ...resaData, id: newId, createdAt: Date.now() })
      setLastEditedId(newId)
      blinkResa(newId)
    }
    try { localStorage.setItem('r3sto_lastPrisPar', prisPar) } catch {}
    closeModal()
  }

  // Fermer la modale — retour à la vue d'origine si on vient d'ailleurs
  function closeModal() {
    setShowModal(false)
    if (returnToRef.current === 'grille') navigateTo('/grille')
    else if (returnToRef.current === 'plan') navigateTo('/plan')
  }

  function handlePrint() {
    const printResas = resas.filter(r => r.date === activeDate && r.s !== 'cancelled').sort((a, b) => a.t < b.t ? -1 : 1)
    const cancelled = resas.filter(r => r.date === activeDate && r.s === 'cancelled').length
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<!DOCTYPE html><html><head><title>R3STO — Journal ${activeDate}</title>
    <style>
      body{font-family:'Segoe UI',Arial,sans-serif;padding:24px 28px;color:#1a2332;font-size:12px;line-height:1.4}
      .print-header{display:flex;align-items:center;gap:14px;margin-bottom:20px;padding-bottom:12px;border-bottom:2px solid #1a2332}
      .print-logo{width:36px;height:36px;object-fit:cover;border-radius:6px}
      h1{font-size:16px;margin:0;letter-spacing:-.02em}
      h2{font-size:11px;color:#666;margin:2px 0 0;font-weight:400}
      table{width:100%;border-collapse:collapse;font-size:11px}
      th{text-align:left;padding:6px 8px;border-bottom:2px solid #333;font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#666}
      td{padding:8px 8px;border-bottom:1px solid #e5e5e5;vertical-align:top}
      tr:nth-child(even){background:#fafafa}
      .name{font-weight:700;font-size:12px}
      .sub{font-size:10px;color:#888;margin-top:1px}
      .badge{display:inline-block;padding:1px 6px;border-radius:8px;font-size:10px;font-weight:600}
      .svc{font-size:10px;color:#888}
      @media print{body{padding:12px}@page{margin:12mm}}
    </style></head><body>
    <div class="print-header">
      <img src="/logo-r3sto.jpg" class="print-logo" alt="R3STO">
      <div style="flex:1">
        <h1>Journal — ${fmtDate(activeDate)}</h1>
        <h2>${printResas.length} réservations · ${printResas.reduce((s,r)=>s+r.c,0)} couverts${cancelled > 0 ? ` · ${cancelled} annulées` : ''}</h2>
      </div>
      <div style="text-align:right;font-size:10px;color:#999">${resto.name || 'R3STO'}<br>${new Date().toLocaleTimeString('fr-CH',{hour:'2-digit',minute:'2-digit'})}</div>
    </div>
    <table><thead><tr>
      <th style="width:60px">Heure</th><th>Client</th><th style="width:50px">Cvt</th>
      <th style="width:70px">Table</th><th style="width:70px">Statut</th><th style="width:90px">Tél</th>
    </tr></thead><tbody>
    ${printResas.map(r => {
      const svcM = activeServices.find(s => s.name.toLowerCase() === r.svc)
      const tbObj = tables.find(t => t.n === r.tbl || t.id === r.tbl)
      return `<tr>
        <td><strong>${r.t}</strong><br><span class="svc">${svcM?.icon || ''} ${r.svc}</span></td>
        <td><span class="name">${r.n || 'Anonyme'}</span>${r.statut===2?' ⭐':''}${r.allergie?' ⚠️':''}<br>
          <span class="sub">${[r.canal === 'walkin' ? '🚶 Walk-in' : '', r.mode === 'ia' ? '🤖 IA' : '✋ Manuel', r.bebe > 0 ? `👶${r.bebe}` : '', r.pmr > 0 ? `♿${r.pmr}` : ''].filter(Boolean).join(' · ')}</span></td>
        <td><strong>${r.c}p</strong>${tbObj ? `<span class="sub">/${tbObj.capMax}</span>` : ''}</td>
        <td>${r.tbl || '—'}</td>
        <td><span class="badge" style="background:${STATUS_META[r.s]?.bg || '#f0f0f0'};color:${STATUS_META[r.s]?.color || '#333'}">${STATUS[r.s as keyof typeof STATUS]?.icon || ''} ${STATUS_META[r.s]?.label ?? r.s}</span></td>
        <td style="font-size:10px;font-family:monospace">${r.tel ? displayPhone(r.tel, pays) : '—'}</td>
      </tr>`
    }).join('')}
    </tbody></table></body></html>`)
    w.document.close()
    w.print()
  }

  // Styles
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--hh))', overflow: 'hidden' }}>
      {confirmDialog}
      <style>{`@keyframes resaBlink{0%,100%{box-shadow:0 0 0 0 rgba(91,156,246,0)}50%{box-shadow:0 0 12px 3px rgba(91,156,246,.5)}}`}</style>

      <ViewToolbar
        title="Journal"
        serviceFilter={filter}
        onServiceFilter={setFilter}
        salleFilter={salleFilter}
        onSalleFilter={setSalleFilter}
        search={search}
        onSearch={setSearch}
        onSearchSubmit={() => {
          if (dayResas.length === 1) openEdit(dayResas[0])
        }}
        onNewResa={openModal}
        onPrint={handlePrint}
      />

      {/* ═══ VUE JOURNAL (liste tableau) ═══ */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {dayResas.length === 0 ? (
          (() => {
            const hasAnyForDate = resas.some(r => r.date === activeDate)
            const hasFilters = filter !== 'tous' || salleFilter !== 'toutes' || !!search
            if (!hasAnyForDate && !hasFilters) {
              return (
                <EmptyState
                  icon="📅"
                  title={t('resa.noResa') || "Aucune réservation ce jour"}
                  description="Commencez par créer votre première réservation manuellement ou attendez que vos clients réservent via le widget."
                  cta={{ label: '+ Nouvelle réservation', onClick: openModal }}
                  secondary={{ label: 'Voir la semaine', onClick: () => navigate('/agenda') }}
                />
              )
            }
            return (
              <EmptyState
                icon="🔎"
                title="Aucun résultat"
                description={hasFilters ? "Aucune réservation ne correspond aux filtres actuels. Essayez de les réinitialiser." : undefined}
                cta={hasFilters ? { label: 'Réinitialiser les filtres', onClick: () => { setFilter('tous'); setSalleFilter('toutes'); setSearch('') }, variant: 'secondary' } : undefined}
              />
            )
          })()
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <colgroup>
              {/* Heure+svc / Client / Cvt / Table / Statut / Actions — largeurs ajustées pour éviter chevauchement */}
              <col style={{ width: 68 }} />
              <col />
              <col style={{ width: 58 }} />
              <col style={{ width: 76 }} />
              <col style={{ width: 104 }} />
              <col style={{ width: 118 }} />
            </colgroup>
            <thead style={{ position: 'sticky', top: 0, zIndex: 5, background: 'var(--surf)' }}><tr style={{ borderBottom: '1px solid var(--border)' }}>
              {([
                { key: 'heure' as const,    label: t('resa.hour') },
                { key: 'client' as const,   label: t('resa.client') },
                { key: 'couverts' as const, label: 'Cvt' },
                { key: 'table' as const,    label: t('resa.table') },
                { key: 'statut' as const,   label: t('resa.status') },
                { key: null,                label: '' },
              ]).map(({ key, label }, i) => (
                <th key={i}
                  onClick={key ? () => { if (sortBy === key) setSortAsc(!sortAsc); else { setSortBy(key); setSortAsc(true) } } : undefined}
                  style={{
                    padding: '8px 8px', textAlign: 'left', fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                    color: key && sortBy === key ? 'var(--bl)' : 'var(--t3)',
                    cursor: key ? 'pointer' : 'default',
                    userSelect: 'none', whiteSpace: 'nowrap', overflow: 'hidden',
                  }}>
                  {label}{key && sortBy === key ? (sortAsc ? ' ▲' : ' ▼') : ''}
                </th>
              ))}
            </tr></thead>
            <tbody>
              {dayResas.map(r => {
                const isLast = r.id === lastEditedId
                const isBlink = blinkResaIds.includes(r.id)
                const svcMeta = activeServices.find(s => s.name.toLowerCase() === r.svc)
                const tb = tables.find(t => t.id === r.tbl || t.n === r.tbl)
                return (
                <tr key={r.id}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    background: isLast || isBlink ? 'rgba(91,156,246,.08)' : hoveredId === r.id ? 'var(--surf2)' : 'transparent',
                    cursor: 'pointer',
                    boxShadow: isLast || isBlink ? 'inset 3px 0 0 rgba(91,156,246,.6)' : 'none',
                    animation: isBlink ? 'resaBlink 1s ease-in-out 3' : undefined,
                  }}
                  onMouseEnter={() => setHoveredId(r.id)} onMouseLeave={() => setHoveredId(null)}
                  onClick={() => openEdit(r)}>
                  {/* Heure + service dessous */}
                  <td style={{ padding: '6px 8px', overflow: 'hidden' }}>
                    <div style={{ fontSize: 13, fontFamily: 'var(--fm)', fontWeight: 700, color: 'var(--text)', lineHeight: 1.2, whiteSpace: 'nowrap' }}>{r.t}</div>
                    <div style={{ fontSize: 10, color: svcMeta?.color || 'var(--t4)', fontWeight: 600, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {svcMeta?.icon} {r.svc}
                    </div>
                  </td>
                  {/* Client */}
                  <td style={{ padding: '6px 8px', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: r.nom ? 'var(--text)' : 'var(--t4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontStyle: r.nom ? 'normal' : 'italic' }}>{r.n || 'Anonyme'}</span>
                      <span style={{ display: 'inline-flex', gap: 2, alignItems: 'center', flexShrink: 0 }}>
                        {r.statut === 1 && <span title="Habitué" style={{ fontSize: 10 }}>🔄</span>}
                        {r.statut === 2 && <span title="VIP" style={{ fontSize: 10 }}>⭐</span>}
                        {r.statut === 3 && <span title="Surveillé" style={{ fontSize: 10 }}>👁</span>}
                        {r.allergie && <span title="Allergie" style={{ fontSize: 10 }}>⚠️</span>}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 1 }}>
                      {r.tel && <span style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--fm)' }}>{displayPhone(r.tel, pays)}</span>}
                      {r.canal && <span title={r.canal} style={{ fontSize: 9, opacity: .6 }}>{CANAUX[r.canal]?.icon}</span>}
                      <span title={r.mode === 'ia' ? 'IA' : 'Manuel'} style={{
                        fontSize: 8, fontWeight: 800, padding: '1px 3px', borderRadius: 3,
                        background: r.mode === 'ia' ? 'rgba(91,156,246,.15)' : 'rgba(232,165,48,.12)',
                        color: r.mode === 'ia' ? '#7bb8ff' : '#e8a530',
                      }}>{r.mode === 'ia' ? '🤖' : '✋'}</span>
                      {(Date.now() - r.createdAt) < 15 * 60 * 1000 && <span style={{ fontSize: 7, fontWeight: 900, color: '#a78bfa', background: 'rgba(167,139,250,.15)', padding: '1px 4px', borderRadius: 3 }}>NEW</span>}
                      {r.confirmed === false && r.canal === 'email' && <span title="Modifié par client" style={{ fontSize: 7, fontWeight: 900, color: 'var(--am)', background: 'rgba(232,165,48,.12)', padding: '1px 4px', borderRadius: 3 }}>MODIF</span>}
                    </div>
                  </td>
                  {/* Couverts */}
                  <td style={{ padding: '6px 8px', overflow: 'hidden' }}>
                    <div style={{ fontSize: 13, fontFamily: 'var(--fm)', fontWeight: 700, color: 'var(--t2)', whiteSpace: 'nowrap', lineHeight: 1.2 }}>
                      {r.c}p{tb ? <span style={{ fontWeight: 500, opacity: .5, fontSize: 10 }}>/{tb.capMax}</span> : ''}
                    </div>
                    {(r.bebe > 0 || r.pmr > 0) && (
                      <div style={{ fontSize: 9, marginTop: 1, whiteSpace: 'nowrap' }}>
                        {r.bebe > 0 && <span style={{ color: 'var(--am)' }}>👶{r.bebe}</span>}
                        {r.pmr > 0 && <span style={{ marginLeft: r.bebe > 0 ? 2 : 0 }}>♿{r.pmr}</span>}
                      </div>
                    )}
                  </td>
                  {/* Table */}
                  <td style={{ padding: '6px 8px', overflow: 'hidden' }}>
                    {r.tbl ? (() => {
                      const isPref = r.tablePref && r.tbl === r.tablePref
                      const isBlocked = tb?.blocked
                      const isHeld = tb?.held && !isBlocked
                      return (
                        <span style={{
                          display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis',
                          fontSize: 11, fontWeight: 800, padding: '2px 5px', borderRadius: 5, fontFamily: 'var(--fm)',
                          background: isBlocked ? 'rgba(220,80,80,.12)' : isHeld ? 'rgba(232,165,48,.12)' : isPref ? 'rgba(232,165,48,.15)' : SEL.bg,
                          color: isBlocked ? 'var(--rd)' : isHeld ? '#e8a530' : isPref ? '#e8a530' : SEL.color,
                          border: `1px solid ${isBlocked ? 'rgba(220,80,80,.4)' : isHeld ? 'rgba(232,165,48,.4)' : isPref ? 'rgba(232,165,48,.4)' : SEL.border}`,
                          textDecoration: isBlocked ? 'line-through' : 'none', whiteSpace: 'nowrap',
                        }}>
                          {isBlocked ? '🚫' : isHeld ? '🔒' : isPref ? '★' : ''}{r.tbl}
                        </span>
                      )
                    })() : <span style={{ color: 'var(--t4)', fontSize: 11 }}>—</span>}
                  </td>
                  {/* Statut */}
                  <td style={{ padding: '6px 2px 6px 6px', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                    <StatusPill status={r.s} onClick={() => { const next = STATUS_CYCLE[r.s]; if (next) setResaStatus(r.id, next as Resa['s']); else toast(`${r.s} est un état final`, 'info') }} />
                  </td>
                  {/* Actions */}
                  <td style={{ padding: '6px 4px 6px 2px', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                      {r.tel && (
                        <a href={`tel:${toE164(r.tel, pays) || r.tel}`} title={`Appeler ${displayPhone(r.tel, pays)}`}
                          style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(60,200,112,.3)', background: 'rgba(60,200,112,.1)', color: 'var(--gn)', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>📞</a>
                      )}
                      {r.s === 'arrived' && (
                        <button title="Libérer la table" onClick={() => setResaStatus(r.id, 'done')}
                          style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(60,200,112,.4)', background: 'rgba(60,200,112,.12)', color: 'var(--gn)', cursor: 'pointer', fontSize: 12 }}>🏁</button>
                      )}
                      {(r.s === 'reserved' || r.s === 'arrived') && (
                        <button title="No-show" onClick={() => setResaStatus(r.id, 'noshow')}
                          style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(220,80,80,.4)', background: 'rgba(220,80,80,.16)', color: 'var(--rd)', cursor: 'pointer', fontSize: 12 }}>🚫</button>
                      )}
                      {r.s === 'cancelled' ? (
                        <button title="Réactiver" onClick={() => setResaStatus(r.id, 'reserved')}
                          style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(91,156,246,.4)', background: 'rgba(91,156,246,.1)', color: 'var(--bl)', cursor: 'pointer', fontSize: 11 }}>↩️</button>
                      ) : r.s === 'noshow' ? (
                        <button title="Réactiver" onClick={() => setResaStatus(r.id, 'reserved')}
                          style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(91,156,246,.4)', background: 'rgba(91,156,246,.1)', color: 'var(--bl)', cursor: 'pointer', fontSize: 11 }}>↩️</button>
                      ) : r.s !== 'done' ? (
                        <button title="Annuler" onClick={async () => { if (await confirmAction({ title: 'Annuler la réservation', message: `Annuler la réservation de ${r.n || 'Anonyme'} (${r.c}p à ${r.t}) ?`, danger: true, confirmLabel: 'Annuler la résa' })) setResaStatus(r.id, 'cancelled') }}
                          style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surf3)', color: 'var(--t4)', cursor: 'pointer', fontSize: 11 }}>✕</button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        )}
      </div>

      {/* ═══════ MODALE COMPACTE ═══════ */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}
          onClick={() => closeModal()}>
          <div style={{ background: 'var(--surf2)', borderRadius: 14, width: 680, maxWidth: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', border: '1px solid var(--border)', boxShadow: '0 20px 50px var(--shadow)' }}
            onClick={e => e.stopPropagation()}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit() }}>

            {/* Header avec nav date ◀ calendrier ▶ */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '8px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0, gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{editingId ? '✏️' : '➕'}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{editingId ? t('modal.edit') : t('modal.new')}</span>

              {/* ◀ date ▶ */}
              <button type="button" onClick={() => setActiveDate(shiftDate(activeDate, -1))}
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
              <button type="button" onClick={() => setActiveDate(shiftDate(activeDate, 1))}
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
                    color: !modeIA ? '#e8a530' : 'var(--t4)',
                  }}>🔒 {t('modal.manual')}</button>
              </div>
              <button type="button" onClick={() => closeModal()}
                style={{ width: 40, height: 40, background: 'none', border: '1px solid rgba(220,80,80,.35)', borderRadius: 7, color: 'var(--rd)', cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>

            {/* Capbar — toujours visible + tables libres + max couverts */}
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
              {maxCapFree > 0 && (
                <span style={{ fontSize: 10, color: 'var(--am)', fontWeight: 600 }}>max {maxCapFree}p</span>
              )}
            </div>

            {/* Bannière Complet → Liste d'attente auto */}
            {remainingCvt <= 0 && !editingId && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                background: 'rgba(220,80,80,.1)', borderBottom: '1px solid rgba(220,80,80,.25)', flexShrink: 0,
              }}>
                <span style={{ fontSize: 14 }}>🚫</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--rd)' }}>Service complet</span>
                <span style={{ fontSize: 11, color: 'var(--t3)' }}>— La réservation sera ajoutée en liste d'attente</span>
                <button type="button" onClick={() => { closeModal(); navigateTo('/waitlist') }}
                  style={{
                    marginLeft: 'auto', padding: '5px 14px', borderRadius: 7, fontSize: 11, fontWeight: 700,
                    border: '1px solid rgba(232,165,48,.5)', background: 'rgba(232,165,48,.12)',
                    color: '#e8a530', cursor: 'pointer', flexShrink: 0,
                  }}>
                  ⏳ Voir la liste
                </button>
              </div>
            )}

            {/* Corps scrollable */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>

              {/* L1 : Service + Heure */}
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
                      style={{
                        ...selBtn(on), minWidth: 48, padding: '0 6px', fontSize: 12,
                        fontFamily: 'var(--fm)',
                        fontWeight: on ? 700 : 400,
                      }}>{s}</button>
                  )
                })}
              </div>

              {/* L2 : Couverts + Bébé/PMR — tout aligné à gauche */}
              {/* RÈGLE: en mode manuel, couverts limités par table/combo sélectionnée ; sinon par max libre */}
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                {(() => {
                  // softCap = cap de la table actuellement sélectionnée (on peut dépasser → suggestion combo)
                  // maxCap = cap max possible (table + combos de cette table)
                  const currentTbl = !modeIA && tbl ? tables.find(tb => tb.n === tbl || tb.id === tbl) : null
                  const currentComboCap = !modeIA && tbl && tbl.includes('+') ? (combos.find(c => c.label === tbl)?.cap ?? 0) : 0
                  const tableSoftCap = currentTbl && !tbl.includes('+') ? currentTbl.capMax : undefined
                  // Max = plus grand combo contenant cette table, ou maxCapFree
                  const tableCombos = currentTbl ? combos.filter(c => c.tables.includes(currentTbl.id)) : []
                  const maxCombo = tableCombos.length > 0 ? Math.max(...tableCombos.map(c => c.capOverride || c.cap)) : 0
                  const effectiveMax = !modeIA && tbl
                    ? tbl.includes('+')
                      ? currentComboCap || maxCapFree
                      : Math.max(currentTbl?.capMax ?? 0, maxCombo, maxCapFree)
                    : maxCapFree
                  return <CoverChips selected={couverts} onSelect={setCouverts} maxCap={effectiveMax} softCap={tableSoftCap} />
                })()}
                <div style={{ width: 1, height: 24, background: 'var(--border)', flexShrink: 0 }} />
                <div style={{ display: 'flex', gap: 12 }}>
                  <Stepper value={bebe} onChange={setBebe} max={6} label="Bébé" icon="👶" />
                  <Stepper value={pmr} onChange={setPmr} max={4} label="PMR" icon="♿" />
                </div>
              </div>

              {/* ── Suggestion combo quand couverts > capTable ── */}
              {(() => {
                if (modeIA || !tbl || tbl.includes('+')) return null
                const currentTbl = tables.find(tb => tb.n === tbl || tb.id === tbl)
                if (!currentTbl || couverts <= currentTbl.capMax) return null
                // Chercher les combos contenant cette table qui peuvent accueillir les couverts
                const fitting = combos.filter(c =>
                  c.tables.includes(currentTbl.id) && (c.capOverride || c.cap) >= couverts
                )
                if (fitting.length === 0) return null
                // Trier par capacité croissante (le plus petit combo suffisant d'abord)
                const sorted = [...fitting].sort((a, b) => (a.capOverride || a.cap) - (b.capOverride || b.cap))
                return (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, marginTop: 6,
                    padding: '8px 12px', borderRadius: 8,
                    background: 'rgba(232,165,48,.1)', border: '1.5px solid rgba(232,165,48,.35)',
                  }}>
                    <span style={{ fontSize: 16 }}>🔗</span>
                    <span style={{ fontSize: 12, color: '#e8a530', fontWeight: 600, flex: 1 }}>
                      {couverts}p dépasse {tbl} ({currentTbl.capMax}p) — passer au combo :
                    </span>
                    {sorted.map(c => (
                      <button key={c.id} type="button" onClick={() => setTbl(c.label)}
                        style={{
                          fontSize: 12, padding: '5px 12px', borderRadius: 7, fontWeight: 700,
                          border: '1.5px solid rgba(232,165,48,.5)', background: 'rgba(232,165,48,.15)',
                          color: '#e8a530', cursor: 'pointer', minHeight: 32,
                        }}>
                        {c.label} ({c.capOverride || c.cap}p)
                      </button>
                    ))}
                  </div>
                )
              })()}

              <div style={sep} />

              {/* L3 : Client — Nom, Prénom, Tél — 3 colonnes égales */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                <input style={{ ...inp, minHeight: 36, height: 36, fontSize: 13 }} value={nom} onChange={e => setNom(e.target.value)} placeholder={t('modal.name')} />
                <input style={{ ...inp, minHeight: 36, height: 36, fontSize: 13 }} value={prenom} onChange={e => setPrenom(e.target.value)} placeholder={t('modal.firstName')} />
                <PhoneInput value={tel} onChange={setTel} compact style={{ minWidth: 0 }} />
              </div>

              {/* L4 : Canal — tous en boutons uniformes */}
              <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                {[...CANAUX_BTN, ...CANAUX_OTHER].map(c => {
                  const on = canal === c.id
                  return (
                    <button key={c.id} type="button" onClick={() => setCanal(c.id)}
                      style={{ ...selBtn(on), padding: '0 10px', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      {c.icon} {c.label}
                    </button>
                  )
                })}
              </div>

              {/* L5 : Statut client + Pris par — boutons uniformes */}
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
                  fontFamily: 'var(--ff)', appearance: 'none' as const,
                  WebkitAppearance: 'none' as const,
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%236b82a0'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 8px center',
                  paddingRight: 22,
                }} value={prisPar} onChange={e => setPrisPar(e.target.value)}>
                  {PERSONNEL.map(p => <option key={p} value={p}>{p}</option>)}
                  {users.filter(u => u.active).map(u => <option key={u.id} value={u.n}>{u.n}</option>)}
                </select>
              </div>

              {/* Client reconnu — bandeau complet avec table préférée */}
              {matchedProfile && !nom && (
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
                      const dp = detectTablePref(matchedProfile.tel, matchedProfile.nom, matchedProfile.prenom)
                      return dp ? <span style={{ fontSize: 11, fontFamily: 'var(--fm)', color: '#e8a530' }}>★ {dp}</span> : null
                    })()}
                    <span style={{ fontSize: 10, opacity: .7 }}>{t('modal.apply')} →</span>
                  </span>
                </button>
              )}

              {/* Table préférée détectée — bandeau dédié en mode IA */}
              {modeIA && tablePref && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 12px', borderRadius: 8,
                  background: 'rgba(232,165,48,.1)', border: '1px solid rgba(232,165,48,.3)',
                }}>
                  <span style={{ fontSize: 13 }}>★</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#e8a530', fontFamily: 'var(--fm)' }}>{tablePref}</span>
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

              {/* Table — Manuel: menu déroulant compact + combos (optimisé tablette) */}
              {!modeIA && (() => {
                const isCombo = tbl.includes('+')
                const selectedCombo = isCombo ? combos.find(c => c.label === tbl) : null
                const comboTables = selectedCombo ? selectedCombo.tables.map(tid => tables.find(tb => tb.id === tid)).filter(Boolean) : []
                const smallestComboTable = comboTables.length > 0 ? Math.min(...comboTables.map(tb => tb!.capMax)) : 0
                const couldFitOnSingle = isCombo && couverts <= smallestComboTable
                const activeTables = tables.filter(t => t.active)
                // Filtrer les tables qui correspondent au nb couverts
                const fittingTables = activeTables.filter(tb => tb.capMax >= couverts && !tb.blocked)
                const fittingCombos = combos.filter(c => (c.capOverride || c.cap) >= couverts)
                // Set des tables libres pour marquer les occupées
                const freeTableNames = new Set(freeTables.map(t => t.n))
                const freeComboLabels = new Set(freeCombosList.map(c => c.label))

                return (
                  <div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: .6 }}>🪑 Table</span>
                      {/* Menu déroulant principal — compact pour tablette */}
                      <select
                        value={tbl}
                        onChange={e => setTbl(e.target.value)}
                        style={{
                          ...inp, flex: 1, minHeight: T, fontSize: 13, fontWeight: 700,
                          fontFamily: 'var(--fm)',
                          background: tbl ? SEL.bg : 'var(--surf3)',
                          border: `2px solid ${tbl ? SEL.border : 'var(--border)'}`,
                          color: tbl ? SEL.color : 'var(--t3)',
                          borderRadius: 8, paddingRight: 10,
                        }}
                      >
                        <option value="">— {t('modal.toAssign')}</option>
                        {/* Tables libres qui ont la capacité */}
                        <optgroup label={`✅ Libres pour ${couverts}p`}>
                          {fittingTables.filter(tb => freeTableNames.has(tb.n)).map(tb => {
                            const isPref = tablePref === tb.id || tablePref === tb.n
                            return (
                              <option key={tb.id} value={tb.n}>
                                {tb.n} ({tb.capMin}-{tb.capMax}p){isPref ? ' ★ préf.' : ''} · {tb.salle}
                              </option>
                            )
                          })}
                        </optgroup>
                        {/* Combos libres qui ont la capacité */}
                        {fittingCombos.filter(c => freeComboLabels.has(c.label)).length > 0 && (
                          <optgroup label={`🔗 Combos pour ${couverts}p`}>
                            {fittingCombos.filter(c => freeComboLabels.has(c.label)).map(c => (
                              <option key={c.id} value={c.label}>
                                🔗 {c.label} ({c.cap}p)
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {/* Tables occupées (capacité OK mais prises) */}
                        {fittingTables.filter(tb => !freeTableNames.has(tb.n)).length > 0 && (
                          <optgroup label={`⛔ Occupées`}>
                            {fittingTables.filter(tb => !freeTableNames.has(tb.n)).map(tb => (
                              <option key={tb.id} value={tb.n} disabled
                                style={{ color: '#888', fontStyle: 'italic' }}>
                                {tb.n} ({tb.capMax}p) — occupée
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                      {/* Chips rapides pour les 4 meilleures tables */}
                      {fittingTables.slice(0, 4).map(tb => {
                        const on = tbl === tb.n || tbl === tb.id
                        const isPref = tablePref === tb.id || tablePref === tb.n
                        return (
                          <button key={tb.id} type="button" onClick={() => setTbl(tb.n)}
                            style={{
                              ...selBtn(on), minWidth: 44, padding: '0 8px', fontSize: 12,
                              fontWeight: on ? 700 : 400, flexShrink: 0, display: 'none',
                              // Visible only on wider screens (hidden by default for tablet)
                              border: `2px solid ${on ? SEL.border : isPref ? 'rgba(232,165,48,.4)' : UNSEL.border}`,
                              background: on ? SEL.bg : isPref ? 'rgba(232,165,48,.08)' : UNSEL.bg,
                            }}>
                            {tb.n} {isPref && '★'}
                          </button>
                        )
                      })}
                    </div>
                    {/* ⚠️ Warning: couverts pourraient tenir sur une seule table */}
                    {couldFitOnSingle && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 8, marginTop: 6,
                        padding: '6px 12px', borderRadius: 8,
                        background: 'rgba(232,165,48,.1)', border: '1px solid rgba(232,165,48,.3)',
                      }}>
                        <span style={{ fontSize: 14 }}>⚠️</span>
                        <span style={{ fontSize: 12, color: '#e8a530', fontWeight: 600 }}>
                          {couverts}p tient sur une seule table — combo {tbl} inutile ?
                        </span>
                        {comboTables.filter(tb => tb!.capMax >= couverts).map(tb => (
                          <button key={tb!.id} type="button" onClick={() => setTbl(tb!.n)}
                            style={{
                              fontSize: 11, padding: '3px 10px', borderRadius: 6, fontWeight: 700,
                              border: '1px solid rgba(232,165,48,.5)', background: 'rgba(232,165,48,.15)',
                              color: '#e8a530', cursor: 'pointer', minHeight: 30,
                            }}>
                            → {tb!.n} ({tb!.capMax}p)
                          </button>
                        ))}
                      </div>
                    )}
                    {/* Info capacité combo sélectionné */}
                    {selectedCombo && !couldFitOnSingle && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 6, marginTop: 4,
                        fontSize: 11, color: 'var(--t3)',
                      }}>
                        <span style={{ color: '#ffd666' }}>🔗</span>
                        Tables {selectedCombo.tables.join(' + ')} réunies — max {selectedCombo.cap}p
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* Note résa */}
              <textarea style={{ ...inp, height: 40, resize: 'none' }}
                value={noteResa} onChange={e => setNoteResa(e.target.value)}
                placeholder={`📌 ${t('modal.notesResa')}`} />

              {/* Fiche profil — dépliable */}
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
                {statutClient === 1 && <span style={{ fontSize: 11, fontWeight: 700, color: '#6ba3e8' }}>🔄 Habitué</span>}
                {statutClient === 2 && <span style={{ fontSize: 11, fontWeight: 700, color: '#e8a530' }}>⭐ VIP</span>}
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
                              ...selBtn(on), minWidth: 36, padding: '0 8px', fontSize: 11,
                              fontWeight: on ? 700 : 400,
                              border: `2px solid ${on ? 'rgba(232,165,48,.6)' : UNSEL.border}`,
                              background: on ? 'rgba(232,165,48,.15)' : UNSEL.bg,
                              color: on ? '#e8a530' : 'var(--t3)',
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
              <div style={{ margin: '0 14px 4px', padding: '6px 10px', borderRadius: 8, background: 'rgba(232,165,48,.1)', border: '1px solid rgba(232,165,48,.3)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#e8a530', fontWeight: 600 }}>
                <span style={{ fontSize: 14 }}>🧠</span> {smartWarn}
                <button onClick={() => setSmartWarn(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#e8a530', cursor: 'pointer', fontSize: 14, padding: 0 }}>✕</button>
              </div>
            )}

            {/* Footer sticky */}
            <div style={{ borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,.08)', flexShrink: 0, padding: '8px 14px' }}>
              <div style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--fm)', marginBottom: 6 }}>
                {isToday ? t('toolbar.todayShort') : fmtDate(activeDate)} · {nom || 'Anonyme'} · {couverts}p{bebe > 0 ? ` 👶${bebe}` : ''}{pmr > 0 ? ` ♿${pmr}` : ''} · {heure} · {svcId}
                {allergieTags.length > 0 && <span style={{ color: 'var(--rd)' }}> · ⚠️{allergieTags.length}</span>}
                {prisPar !== '—' && ` · ${prisPar}`}
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                {editingId && (
                  <div style={{ display: 'flex', gap: 4, marginRight: 'auto' }}>
                    <button className="btn btn-danger" onClick={async () => { if (await confirmAction({ title: 'Annuler la réservation', message: 'Êtes-vous sûr de vouloir annuler cette réservation ?', danger: true, confirmLabel: 'Annuler la résa' })) { setResaStatus(editingId, 'cancelled'); closeModal() } }}
                      style={{ minHeight: T, padding: '0 16px', fontSize: 13 }}>🚫 Annuler</button>
                  </div>
                )}
                <button className="btn btn-secondary" onClick={() => closeModal()}
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
      )}
    </div>
  )
}
