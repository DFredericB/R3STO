import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import { ViewToolbar } from '../../components/ui/ViewToolbar'
import type { Resa, ResaCanal } from '../../types'
import PhoneInput, { toE164, displayPhone } from '../../components/ui/PhoneInput'
import { useT } from '../../i18n/useTranslation'
import { STATUS, CANAUX } from '../../utils/design'
import { todayISO, timeToMins, shiftISO } from '../../utils/date'
import { getFreeTables, getFreeCombos, getMaxCapacity, detectTablePref as detectTablePrefCentral } from '../../utils/placementRules'

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

const STATUS_CYCLE: Record<string, string> = { reserved: 'arrived', arrived: 'done', done: 'reserved' }
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
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))}
        style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surf3)', color: 'var(--t2)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: value <= min ? .3 : 1 }}>−</button>
      <span style={{ minWidth: 22, textAlign: 'center', fontSize: 14, fontWeight: 700, fontFamily: 'var(--fm)', color: value > 0 ? SEL.color : 'var(--t3)' }}>{value}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))}
        style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surf3)', color: 'var(--t2)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: value >= max ? .3 : 1 }}>+</button>
    </div>
  )
}

function CoverChips({ selected, onSelect, maxCap = 50 }: { selected: number; onSelect: (n: number) => void; maxCap?: number }) {
  const [big, setBig] = useState(selected > 8)
  useEffect(() => { if (selected > 8) setBig(true) }, [selected])
  if (big) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Stepper value={selected} onChange={onSelect} min={1} max={Math.max(maxCap, 1)} label="" icon="🍽" />
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
        return (
          <button key={n} type="button" onClick={() => !over && onSelect(n)} style={{
            width: T, height: T, borderRadius: 8, border: '2px solid', fontSize: 15, fontWeight: 700, transition: '.12s',
            cursor: over ? 'not-allowed' : 'pointer',
            opacity: over ? .3 : 1,
            background: on ? (over ? 'rgba(220,80,80,.15)' : SEL.bg) : UNSEL.bg,
            borderColor: on ? (over ? 'rgba(220,80,80,.5)' : SEL.border) : over ? 'rgba(220,80,80,.2)' : UNSEL.border,
            color: on ? (over ? 'var(--rd)' : SEL.color) : over ? 'var(--rd)' : UNSEL.color,
            boxShadow: on && !over ? `0 0 8px ${SEL.bg}` : 'none',
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
    <button type="button" onClick={onClick} title="Changer statut" style={{
      background: m.bg, color: m.color, border: `1px solid ${m.border}`,
      borderRadius: 20, padding: '4px 10px', fontSize: 11, fontWeight: 700,
      cursor: 'pointer', fontFamily: 'var(--fm)', whiteSpace: 'nowrap', minHeight: 30,
      display: 'flex', alignItems: 'center', gap: 4,
    }}>{sm?.icon} {label}</button>
  )
}

// ══════════════════════════════════════════════════════

export function Resas() {
  const { t, fmtDate } = useT()
  const { resas, services, tables, combos, users, activeDate, setActiveDate, setResaStatus, deleteResa, addResa, updateResa, salles, resto } = useAppStore()
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
  const [viewMode, setViewMode] = useState<'table' | 'agenda'>('agenda')
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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [lastEditedId, setLastEditedId] = useState<string | null>(null)

  const today = todayISO()
  const isToday = activeDate === today
  const activeServices = services.filter(s => s.active)
  const activeSalles = salles.filter(s => s.active)

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

  const total    = resas.filter(r => r.date === activeDate).length
  const totalCvt = resas.filter(r => r.date === activeDate).reduce((s, r) => s + r.c, 0)
  const noshows  = resas.filter(r => r.date === activeDate && r.s === 'noshow').length

  const curSvc   = activeServices.find(s => s.name.toLowerCase() === svcId)
  const svcOcc   = resas.filter(r => r.date === activeDate && r.svc === svcId).reduce((s, r) => s + r.c, 0)
  const totalCapMax = tables.filter(t => t.active).reduce((s, tb) => s + tb.capMax, 0)
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
      const f = resas.find(r => r.tel.replace(/\s/g, '') === n && r.nom && r.nom !== 'Anonyme')
      setMatchedProfile(f ?? null)
    } else setMatchedProfile(null)
  }, [tel, resas])

  // Handle query params from other views
  useEffect(() => {
    const editId = searchParams.get('edit')
    const newFlag = searchParams.get('new')
    const preTable = searchParams.get('table')
    const preMode = searchParams.get('mode')
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
    setModeIA(!r.tbl); setStatutClient(r.statut ?? 0)
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

  function handleSubmit() {
    if (!svcId || !heure || !couverts) return

    // ── RÈGLE B4/C5 : validation capacité avant sauvegarde ──
    if (!modeIA && tbl) {
      const isCombo = tbl.includes('+')
      const cap = isCombo
        ? combos.find(c => c.label === tbl)?.cap ?? 0
        : tables.find(tb => tb.n === tbl || tb.id === tbl)?.capMax ?? 0
      if (cap > 0 && couverts > cap) {
        alert(`Impossible : ${couverts}p dépasse la capacité de ${tbl} (max ${cap}p)`)
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
    const resaData = {
      n: dn, nom: nom || 'Anonyme', prenom,
      c: couverts, bebe, pmr, tbl: isServiceFull ? '' : (modeIA ? tablePref : tbl),
      t: heure.replace(':', 'h'), svc: svcId, s: (isServiceFull ? 'waitlist' : 'reserved') as any, note: fullNote,
      date: activeDate, statut: statutClient,
      mode: (modeIA ? 'ia' : 'manuel') as any, tel: toE164(tel, pays), email, canal,
      prisPar: prisPar === '—' ? '' : prisPar, allergie: allergieTags.length > 0,
      tablePref: tablePref || undefined,
      noteProfil: noteProfil || undefined,
    }
    if (editingId) {
      updateResa(editingId, resaData)
      setLastEditedId(editingId)
    } else {
      const newId = Date.now().toString()
      addResa({ ...resaData, id: newId, createdAt: Date.now() })
      setLastEditedId(newId)
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
    const printResas = resas.filter(r => r.date === activeDate).sort((a, b) => a.t < b.t ? -1 : 1)
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<!DOCTYPE html><html><head><title>R3STO — Réservations ${activeDate}</title>
    <style>body{font-family:Arial,sans-serif;padding:20px;color:#1a2332}
    .print-header{display:flex;align-items:center;gap:12px;margin-bottom:16px}
    .print-logo{width:32px;height:32px;object-fit:cover;box-shadow:0 1px 4px rgba(45,92,184,.3)}
    h1{font-size:18px;margin:0}h2{font-size:13px;color:#666;margin:2px 0 0}
    table{width:100%;border-collapse:collapse;font-size:13px}
    th{text-align:left;padding:8px 10px;border-bottom:2px solid #333;font-size:11px;text-transform:uppercase;color:#666}
    td{padding:8px 10px;border-bottom:1px solid #ddd}
    .badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700}
    @media print{body{padding:0}}</style></head><body>
    <div class="print-header"><img src="/logo-r3sto.jpg" class="print-logo" alt="R3STO"><div><h1>Réservations — ${fmtDate(activeDate)}</h1>
    <h2>${printResas.length} réservations · ${printResas.reduce((s,r)=>s+r.c,0)} couverts</h2></div></div>
    <table><thead><tr><th>Heure</th><th>Client</th><th>Cvts</th><th>Table</th><th>Service</th><th>Statut</th><th>Tél</th></tr></thead><tbody>
    ${printResas.map(r => `<tr><td><strong>${r.t}</strong></td><td>${r.n}${r.statut===2?' ⭐':''}${r.allergie?' ⚠️':''}</td><td>${r.c}p${r.bebe>0?` +👶${r.bebe}`:''}${r.pmr>0?` +♿${r.pmr}`:''}</td><td>${r.tbl||'—'}</td><td>${r.svc}</td><td>${STATUS_META[r.s]?.label??r.s}</td><td>${r.tel ? displayPhone(r.tel, pays) : ''}</td></tr>`).join('')}
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

      <ViewToolbar
        title={t('resa.title')}
        subtitle={`${total} ${t('resa.short')} · ${totalCvt}p${noshows > 0 ? ` · ${noshows} ${t('resa.noshow')}` : ''}`}
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

      {/* View toggle: Table vs Agenda */}
      <div style={{ display: 'flex', gap: 4, padding: '4px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <button onClick={() => setViewMode('table')} style={{
          fontSize: 10, padding: '3px 10px', borderRadius: 4, fontWeight: 700, cursor: 'pointer',
          border: `1px solid ${viewMode === 'table' ? 'var(--bl)' : 'var(--border)'}`,
          background: viewMode === 'table' ? 'var(--bp)' : 'transparent',
          color: viewMode === 'table' ? 'var(--bl)' : 'var(--t3)',
        }}>📋 Tableau</button>
        <button onClick={() => setViewMode('agenda')} style={{
          fontSize: 10, padding: '3px 10px', borderRadius: 4, fontWeight: 700, cursor: 'pointer',
          border: `1px solid ${viewMode === 'agenda' ? 'var(--bl)' : 'var(--border)'}`,
          background: viewMode === 'agenda' ? 'var(--bp)' : 'transparent',
          color: viewMode === 'agenda' ? 'var(--bl)' : 'var(--t3)',
        }}>📅 Agenda</button>
      </div>

      {/* Liste — minHeight:0 force le flex child à respecter overflow */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {/* ── AGENDA VIEW ── */}
        {viewMode === 'agenda' && (() => {
          const nowM = new Date().getHours() * 60 + new Date().getMinutes()
          const activeSvcs = services.filter(s => s.active)
          // Build 30min slots
          const agendaSlots: number[] = []
          activeSvcs.forEach(svc => {
            const openM = parseInt(svc.open.split(':')[0]) * 60 + parseInt(svc.open.split(':')[1] || '0')
            const closeM = parseInt(svc.close.split(':')[0]) * 60 + parseInt(svc.close.split(':')[1] || '0')
            for (let m = openM; m < closeM; m += 30) {
              if (!agendaSlots.includes(m)) agendaSlots.push(m)
            }
          })
          agendaSlots.sort((a, b) => a - b)

          // Group resas by slot
          const resaMap: Record<number, typeof dayResas> = {}
          dayResas.forEach(r => {
            const parts = r.t.split(/[h:]/)
            const m = parseInt(parts[0]) * 60 + parseInt(parts[1] || '0')
            const slotKey = Math.floor(m / 30) * 30
            if (!resaMap[slotKey]) resaMap[slotKey] = []
            resaMap[slotKey].push(r)
          })

          const statusBg: Record<string, string> = {
            arrived: 'rgba(60,200,112,.12)', reserved: 'rgba(68,128,216,.1)',
            done: 'rgba(128,128,128,.08)', noshow: 'rgba(220,80,80,.1)', waitlist: 'rgba(232,165,48,.1)',
          }
          const statusTxt: Record<string, string> = {
            arrived: 'var(--gn)', reserved: 'var(--bl)',
            done: 'var(--t4)', noshow: 'var(--rd)', waitlist: 'var(--am)',
          }

          return (
            <div style={{ padding: '8px 14px 20px' }}>
              {agendaSlots.map(slotMin => {
                const hr = Math.floor(slotMin / 60)
                const mn = slotMin % 60
                const label = `${hr}h${String(mn).padStart(2, '0')}`
                const isNow = nowM >= slotMin && nowM < slotMin + 30
                const slotResas = resaMap[slotMin] || []
                const slotCvt = slotResas.reduce((s, r) => s + r.c, 0)

                return (
                  <div key={slotMin} style={{
                    display: 'flex', gap: 10, borderBottom: '1px solid var(--border)',
                    background: isNow ? 'rgba(220,80,80,.04)' : 'transparent',
                    minHeight: 40,
                  }}>
                    {/* Time column */}
                    <div style={{
                      width: 54, flexShrink: 0, padding: '8px 6px', textAlign: 'right',
                      fontSize: 12, fontWeight: 800, fontFamily: 'var(--fm)',
                      color: isNow ? 'var(--rd)' : 'var(--t3)',
                      borderRight: isNow ? '3px solid var(--rd)' : '3px solid var(--border)',
                    }}>
                      {label}
                      {slotCvt > 0 && <div style={{ fontSize: 9, color: 'var(--t4)', fontWeight: 600 }}>{slotCvt}p</div>}
                    </div>
                    {/* Resas */}
                    <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 4, padding: '4px 0', alignItems: 'flex-start' }}>
                      {slotResas.length === 0 && (
                        <span style={{ fontSize: 10, color: 'var(--t4)', padding: '6px 0' }}>—</span>
                      )}
                      {slotResas.map(r => (
                        <div key={r.id}
                          onClick={() => openEdit(r)}
                          style={{
                            padding: '4px 8px', borderRadius: 6, cursor: 'pointer',
                            background: statusBg[r.s] || 'var(--surf2)',
                            border: `1px solid ${(statusTxt[r.s] || 'var(--bl)')}25`,
                            display: 'flex', alignItems: 'center', gap: 5,
                          }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: statusTxt[r.s] || 'var(--bl)' }}>
                            {r.n}
                          </span>
                          <span style={{ fontSize: 10, fontFamily: 'var(--fm)', color: 'var(--t3)' }}>
                            {r.c}p
                          </span>
                          <span style={{ fontSize: 10, color: 'var(--t4)' }}>{r.tbl || '—'}</span>
                          {r.canal && CANAUX[r.canal] && (
                            <span style={{ fontSize: 9, opacity: .7 }}>{CANAUX[r.canal].icon}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })()}

        {/* ── TABLE VIEW ── */}
        {viewMode === 'table' && dayResas.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--t3)', fontSize: 14 }}>{t('resa.noResa')}</div>
        ) : viewMode === 'table' ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 5, background: 'var(--surf)' }}><tr style={{ borderBottom: '1px solid var(--border)' }}>
              {([
                { key: 'heure' as const,    label: t('resa.hour') },
                { key: 'client' as const,   label: t('resa.client') },
                { key: 'couverts' as const, label: t('resa.covers') },
                { key: 'table' as const,    label: t('resa.table') },
                { key: null,                label: t('resa.service') },
                { key: 'statut' as const,   label: t('resa.status') },
                { key: null,                label: '' },
              ]).map(({ key, label }, i) => (
                <th key={i}
                  onClick={key ? () => { if (sortBy === key) setSortAsc(!sortAsc); else { setSortBy(key); setSortAsc(true) } } : undefined}
                  style={{
                    padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                    color: key && sortBy === key ? 'var(--bl)' : 'var(--t3)',
                    cursor: key ? 'pointer' : 'default',
                    userSelect: 'none',
                  }}>
                  {label}{key && sortBy === key ? (sortAsc ? ' ▲' : ' ▼') : ''}
                </th>
              ))}
            </tr></thead>
            <tbody>
              {dayResas.map(r => {
                const isLast = r.id === lastEditedId
                const svcMeta = activeServices.find(s => s.name.toLowerCase() === r.svc)
                return (
                <tr key={r.id}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    background: isLast ? 'rgba(91,156,246,.08)' : hoveredId === r.id ? 'var(--surf2)' : 'transparent',
                    cursor: 'pointer',
                    borderLeft: isLast ? '3px solid rgba(91,156,246,.6)' : '3px solid transparent',
                  }}
                  onMouseEnter={() => setHoveredId(r.id)} onMouseLeave={() => setHoveredId(null)}
                  onClick={() => openEdit(r)}>
                  <td style={{ padding: '10px 12px', fontSize: 14, fontFamily: 'var(--fm)', fontWeight: 600, color: 'var(--t2)' }}>{r.t}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      {r.n}
                      {r.statut === 1 && <span title="Habitué">🔄</span>}
                      {r.statut === 2 && <span title="VIP">⭐</span>}
                      {r.statut === 3 && <span title="Surveillé">👁</span>}
                      {r.allergie && <span title="Allergie">⚠️</span>}
                      {r.canal && <span title={r.canal} style={{ fontSize: 9, opacity: .7 }}>{r.canal === 'telephone' ? '📞' : r.canal === 'walkin' ? '🚶' : r.canal === 'widget' ? '🌐' : r.canal === 'google' ? '🔍' : r.canal === 'email' ? '✉️' : ''}</span>}
                      <span title={r.mode === 'ia' ? 'Placé par IA' : 'Placement manuel'} style={{
                        fontSize: 8, fontWeight: 800, padding: '1px 4px', borderRadius: 3,
                        background: r.mode === 'ia' ? 'rgba(91,156,246,.15)' : 'rgba(232,165,48,.12)',
                        color: r.mode === 'ia' ? '#7bb8ff' : '#e8a530',
                        border: `1px solid ${r.mode === 'ia' ? 'rgba(91,156,246,.3)' : 'rgba(232,165,48,.25)'}`,
                      }}>{r.mode === 'ia' ? '🤖 IA' : '✋'}</span>
                      {(Date.now() - r.createdAt) < 15 * 60 * 1000 && <span title="Nouvelle réservation" style={{ fontSize: 8, fontWeight: 900, color: '#a78bfa', background: 'rgba(167,139,250,.15)', padding: '1px 4px', borderRadius: 4, letterSpacing: .5 }}>NEW</span>}
                    </div>
                    {r.tel && <div style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--fm)' }}>{displayPhone(r.tel, pays)}</div>}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 14, color: 'var(--t2)' }}>
                    {r.c}p
                    {r.bebe > 0 && <span style={{ marginLeft: 4, fontSize: 12, color: 'var(--am)' }}>👶{r.bebe}</span>}
                    {r.pmr > 0 && <span style={{ marginLeft: 4, fontSize: 12, color: 'var(--ac)' }}>♿{r.pmr}</span>}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {r.tbl ? (() => {
                        const tb = tables.find(t => t.id === r.tbl || t.n === r.tbl)
                        const isPref = r.tablePref && r.tbl === r.tablePref
                        return (
                          <span style={{
                            fontSize: 12, fontWeight: 800, padding: '3px 8px', borderRadius: 6, fontFamily: 'var(--fm)',
                            background: isPref ? 'rgba(232,165,48,.15)' : SEL.bg,
                            color: isPref ? '#e8a530' : SEL.color,
                            border: `1px solid ${isPref ? 'rgba(232,165,48,.4)' : SEL.border}`,
                          }}>
                            {isPref && '★ '}{r.tbl}{tb ? <span style={{ fontWeight: 500, opacity: .65, fontSize: 10 }}>/{tb.capMax}p</span> : ''}
                          </span>
                        )
                      })() : <span style={{ color: 'var(--t4)' }}>—</span>}
                      {r.tablePref && r.tbl !== r.tablePref && (
                        <span title={`Table préférée: ${r.tablePref}`} style={{ fontSize: 10, color: 'var(--am)', opacity: .7 }}>★{r.tablePref}</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--t3)' }}>
                    {svcMeta && <span style={{ marginRight: 4 }}>{svcMeta.icon}</span>}{r.svc}
                  </td>
                  <td style={{ padding: '10px 8px' }} onClick={e => e.stopPropagation()}>
                    <StatusPill status={r.s} onClick={() => setResaStatus(r.id, (STATUS_CYCLE[r.s] ?? 'reserved') as any)} />
                  </td>
                  <td style={{ padding: '10px 8px', minWidth: 140 }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {r.tel && (
                        <a href={`tel:${toE164(r.tel, pays) || r.tel}`} title={`Appeler ${displayPhone(r.tel, pays)}`}
                          style={{ width: 34, height: 34, borderRadius: 7, border: '1px solid rgba(60,200,112,.3)', background: 'rgba(60,200,112,.1)', color: 'var(--gn)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>📞</a>
                      )}
                      {(r.s === 'reserved' || r.s === 'arrived') && (
                        <button title="No-show" onClick={() => setResaStatus(r.id, 'noshow')}
                          style={{ width: 34, height: 34, borderRadius: 7, border: '1px solid rgba(220,80,80,.4)', background: 'rgba(220,80,80,.16)', color: 'var(--rd)', cursor: 'pointer', fontSize: 15 }}>🚫</button>
                      )}
                      {r.s !== 'cancelled' && (
                        <button title="Annuler" onClick={() => { if (confirm('Annuler cette réservation ?')) setResaStatus(r.id, 'cancelled') }}
                          style={{ width: 34, height: 34, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surf3)', color: 'var(--t4)', cursor: 'pointer', fontSize: 13 }}>✕</button>
                      )}
                      <button title="Supprimer" onClick={() => { if (confirm(`Supprimer la résa de ${r.n} ?`)) deleteResa(r.id) }}
                        style={{ width: 34, height: 34, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surf3)', color: 'var(--t3)', cursor: 'pointer', fontSize: 14 }}>🗑</button>
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        ) : null}
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
                <CoverChips selected={couverts} onSelect={setCouverts} maxCap={
                  !modeIA && tbl
                    ? tbl.includes('+')
                      ? (combos.find(c => c.label === tbl)?.cap ?? maxCapFree)
                      : (tables.find(tb => tb.n === tbl || tb.id === tbl)?.capMax ?? maxCapFree)
                    : maxCapFree
                } />
                <div style={{ width: 1, height: 24, background: 'var(--border)', flexShrink: 0 }} />
                <div style={{ display: 'flex', gap: 12 }}>
                  <Stepper value={bebe} onChange={setBebe} max={6} label="Bébé" icon="👶" />
                  <Stepper value={pmr} onChange={setPmr} max={4} label="PMR" icon="♿" />
                </div>
              </div>

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
                const selectedCap = selectedCombo ? selectedCombo.cap
                  : tables.find(tb => tb.n === tbl || tb.id === tbl)?.capMax || maxCapFree
                const comboTables = selectedCombo ? selectedCombo.tables.map(tid => tables.find(tb => tb.id === tid)).filter(Boolean) : []
                const smallestComboTable = comboTables.length > 0 ? Math.min(...comboTables.map(tb => tb!.capMax)) : 0
                const couldFitOnSingle = isCombo && couverts <= smallestComboTable
                const activeTables = tables.filter(t => t.active)
                // Filtrer les tables qui correspondent au nb couverts
                const fittingTables = activeTables.filter(tb => tb.capMax >= couverts && !tb.blocked)
                const fittingCombos = combos.filter(c => c.cap >= couverts)

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
                        <optgroup label={`Tables (${fittingTables.length} pour ${couverts}p)`}>
                          {activeTables.map(tb => {
                            const isPref = tablePref === tb.id || tablePref === tb.n
                            const fits = tb.capMax >= couverts && !tb.blocked
                            return (
                              <option key={tb.id} value={tb.n} disabled={!fits}>
                                {tb.n} ({tb.capMin}-{tb.capMax}p){isPref ? ' ★ préf.' : ''}{tb.blocked ? ' 🚫' : ''}{!fits ? ' — trop petite' : ''}
                              </option>
                            )
                          })}
                        </optgroup>
                        {combos.length > 0 && (
                          <optgroup label={`Combos (${fittingCombos.length} pour ${couverts}p)`}>
                            {combos.map(c => (
                              <option key={c.id} value={c.label}>
                                🔗 {c.label} ({c.cap}p)
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
                    <button className="btn btn-danger" onClick={() => { if (confirm('Annuler cette réservation ?')) { setResaStatus(editingId, 'cancelled'); closeModal() } }}
                      style={{ minHeight: T, padding: '0 16px', fontSize: 13 }}>🚫 Annuler</button>
                    <button className="btn btn-danger" onClick={() => { if (confirm('Supprimer définitivement cette réservation ?')) { deleteResa(editingId); closeModal() } }}
                      style={{ minHeight: T, padding: '0 14px', fontSize: 13, opacity: .7 }}>🗑</button>
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
