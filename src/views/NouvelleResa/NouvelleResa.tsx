// ══════════════════════════════════════════════════
//  R3STO — NouvelleResa
//  Vue dédiée "Résa Rapide" — flux séquentiel optimisé
//  Ligne 1 : Mode (IA/Manuel) + Date (7 jours ◀ ▶)
//  Ligne 2 : Service + Salle + Couverts (1-6 + stepper 7+)
//  Zone principale : IA card OU Grille Manuel + Timeline
//  Modal confirmation avec détection client historique
// ══════════════════════════════════════════════════

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useAppStore, isDoubleBooked } from '../../store/useAppStore'
import { useToast } from '../../components/ui/Toast'
import { useT } from '../../i18n/useTranslation'
import PhoneInput, { toE164 } from '../../components/ui/PhoneInput'
import {
  iaPlacement,
  getFreeTables,
  getFreeCombos,
  getOccupiedTableIds,
  isOccupying,
} from '../../utils/placementRules'
import type { Resa, ResaCanal, Table } from '../../types'

// ── Helpers ──────────────────────────────────────
function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function timeToMins(t: string): number {
  const [h, m] = t.replace('h', ':').split(':').map(Number)
  return h * 60 + (m || 0)
}

function minsToSlot(m: number): string {
  const h = Math.floor(m / 60)
  const mm = m % 60
  return `${h}h${String(mm).padStart(2, '0')}`
}

const JOURS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

// ── Styles communs ───────────────────────────────
const S = {
  bg: 'var(--bg)', surf: 'var(--surf)', surf2: 'var(--surf2)', surf3: 'var(--surf3)', surf4: 'var(--surf4)',
  text: 'var(--text)', t2: 'var(--t2)', t3: 'var(--t3)', muted: 'var(--muted)',
  bl: 'var(--bl)', ac: 'var(--ac)', gn: 'var(--gn)', rd: 'var(--rd)', am: 'var(--am)', vt: 'var(--vt)',
  border: 'var(--border)', ff: 'var(--ff)', fm: 'var(--fm)',
}

// ── Composant principal ──────────────────────────
export function NouvelleResa() {
  const {
    resas, tables, services, combos, salles, options, resto, clients,
    addResa, blinkResa,
  } = useAppStore()
  const pays = resto.pays || 'CH'
  const { toast } = useToast()
  const { t } = useT()

  // ── State : sélecteurs ─────────────────────────
  const [mode, setMode] = useState<'ia' | 'manuel'>('ia')
  const [dateOffset, setDateOffset] = useState(0)
  const [selDate, setSelDate] = useState(todayISO())
  const [selSvc, setSelSvc] = useState('')
  const [selSalle, setSelSalle] = useState('')
  const [selCvt, setSelCvt] = useState(2)
  const [selSlot, setSelSlot] = useState('')
  const [selTbl, setSelTbl] = useState<string | null>(null)

  // ── State : stepper popup ──────────────────────
  const [showStepper, setShowStepper] = useState(false)
  const [stepperVal, setStepperVal] = useState(7)

  // ── State : modal ──────────────────────────────
  const [showModal, setShowModal] = useState(false)
  const [showQuickConfirm, setShowQuickConfirm] = useState(false)
  const [modalTblLabel, setModalTblLabel] = useState('')
  const [fNom, setFNom] = useState('')
  const [fPrenom, setFPrenom] = useState('')
  const [fTel, setFTel] = useState('')
  const [fEmail, setFEmail] = useState('')
  const [fCanal, setFCanal] = useState<ResaCanal>('telephone')
  const [fNote, setFNote] = useState('')
  const [fStatut, setFStatut] = useState(0)
  const [fBebe, setFBebe] = useState(0)
  const [fPmr, setFPmr] = useState(0)
  const [fAllergie, setFAllergie] = useState(false)

  // ── State : client historique détecté ──────────
  const [detectedClient, setDetectedClient] = useState<{
    tablePref?: string
    sallePref?: string
    visits: number
    statut: number
    tel?: string
    prenom?: string
  } | null>(null)

  // ── State : placed blink ───────────────────────
  const [placedIds, setPlacedIds] = useState<string[]>([])
  const blinkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Services actifs (filtrés par jour de la semaine) ─
  const activeServices = useMemo(() => {
    const dayOfWeek = new Date(selDate + 'T12:00:00').getDay()
    return services.filter(s => {
      if (!s.active) return false
      // Si jours[] est défini, filtrer par jour de la semaine
      if (s.jours && s.jours.length > 0) return s.jours.includes(dayOfWeek)
      return true
    })
  }, [services, selDate])
  const activeSalles = useMemo(() => salles.filter(s => s.active), [salles])
  const activeTables = useMemo(() => tables.filter(t => t.active && !t.blocked), [tables])

  // ── Init service par défaut ────────────────────
  useEffect(() => {
    if (activeServices.length > 0 && !selSvc) {
      const nowM = new Date().getHours() * 60 + new Date().getMinutes()
      const best = activeServices.find(s => {
        const openM = timeToMins(s.open)
        const closeM = timeToMins(s.close)
        return nowM >= openM - 30 && nowM <= closeM
      }) || activeServices.find(s => timeToMins(s.open) > nowM) || activeServices[0]
      if (best) setSelSvc(best.name.toLowerCase())
    }
  }, [activeServices])

  // ── Init salle par défaut ──────────────────────
  useEffect(() => {
    if (activeSalles.length > 0 && !selSalle) {
      const first = activeSalles.sort((a, b) => a.priority - b.priority)[0]
      if (first) setSelSalle(first.id)
    }
  }, [activeSalles])

  // ── Slots (créneaux) — déclaré AVANT le useEffect qui en dépend ──
  const slots = useMemo(() => {
    const svcObj = activeServices.find(s => s.name.toLowerCase() === selSvc)
    if (!svcObj) return [] as string[]
    const openM = timeToMins(svcObj.open)
    const loM = timeToMins(svcObj.lastOrder)
    const step = options.slot_interval_mins || 15
    const result: string[] = []
    for (let m = openM; m <= loM; m += step) {
      result.push(minsToSlot(m))
    }
    return result
  }, [selSvc, activeServices, options.slot_interval_mins])

  // ── Auto-sélection premier créneau disponible ──
  useEffect(() => {
    if (slots.length > 0) {
      const nowM = new Date().getHours() * 60 + new Date().getMinutes()
      const today = selDate === todayISO()
      const best = today
        ? slots.find(sl => timeToMins(sl) >= nowM) || slots[0]
        : slots[0]
      if (!selSlot || !slots.includes(selSlot)) {
        setSelSlot(best)
      }
    }
  }, [slots, selDate])

  // ── Durée par défaut (pour calcul chevauchement) ──
  const durationMins = options.default_duration_mins || 90

  // ── Occupied tables (par créneau) ─────────────
  const occupiedIds = useMemo(() =>
    getOccupiedTableIds(resas, selDate, selSvc, undefined, selSlot || undefined, durationMins),
    [resas, selDate, selSvc, selSlot, durationMins]
  )

  // ── Nom salle sélectionnée (les tables stockent le nom, pas l'id) ─
  const selSalleName = useMemo(() => {
    const s = activeSalles.find(s => s.id === selSalle)
    return s ? s.name : selSalle
  }, [selSalle, activeSalles])

  // ── Free tables / combos filtrés par salle ET créneau ─
  const freeTables = useMemo(() =>
    getFreeTables(tables, resas, selDate, selSvc, undefined, selSlot || undefined, durationMins).filter(t => t.salle === selSalleName),
    [tables, resas, selDate, selSvc, selSalleName, selSlot, durationMins]
  )

  const freeCombos = useMemo(() =>
    getFreeCombos(combos, tables, resas, selDate, selSvc, undefined, selSlot || undefined, durationMins).filter(c => c.salle === selSalleName),
    [combos, tables, resas, selDate, selSvc, selSalleName, selSlot, durationMins]
  )


  // ── Slot saturation ────────────────────────────
  const slotSaturation = useMemo(() => {
    const svcResas = resas.filter(r =>
      r.date === selDate && r.svc === selSvc && isOccupying(r)
    )
    const map: Record<string, { count: number; ratio: number }> = {}
    const maxPerSlot = Math.ceil(activeTables.filter(t => t.salle === selSalleName).length / (slots.length || 1) * 2) || 3
    for (const sl of slots) {
      const count = svcResas.filter(r => r.t === sl).length
      map[sl] = { count, ratio: maxPerSlot > 0 ? count / maxPerSlot : 0 }
    }
    return map
  }, [resas, selDate, selSvc, selSalle, slots, activeTables])

  // ── Tables pour la salle sélectionnée ──────────
  const salleTables = useMemo(() =>
    activeTables.filter(t => t.salle === selSalleName),
    [activeTables, selSalle]
  )

  // ── IA suggestion ──────────────────────────────
  const iaSuggestion = useMemo(() => {
    if (mode !== 'ia' || selCvt < 1 || !selSlot || !selSvc) return null
    return iaPlacement(selCvt, selDate, selSvc, tables, combos, resas, undefined, undefined, selSalle, selSlot || undefined, durationMins)
  }, [mode, selCvt, selSlot, selSvc, selDate, selSalle, tables, combos, resas])

  // ── Date chips (7 jours) ───────────────────────
  const dateChips = useMemo(() => {
    const now = new Date()
    const chips: { key: string; day: number; label: string; isToday: boolean; month: string }[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(now)
      d.setDate(now.getDate() + dateOffset + i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const isToday = key === todayISO()
      chips.push({
        key,
        day: d.getDate(),
        label: isToday ? 'Auj.' : JOURS[d.getDay()],
        isToday,
        month: MOIS[d.getMonth()],
      })
    }
    return chips
  }, [dateOffset])

  const monthLabel = useMemo(() => {
    const first = dateChips[0]
    const last = dateChips[dateChips.length - 1]
    if (!first || !last) return ''
    const fm = first.month
    const lm = last.month
    return fm === lm ? fm : `${fm}/${lm}`
  }, [dateChips])

  const yearLabel = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + dateOffset)
    return d.getFullYear()
  }, [dateOffset])

  // ── Availability per covers (1-6) ──────────────
  const cvtAvail = useCallback((n: number) => {
    let tCount = 0, cCount = 0
    freeTables.forEach(t => {
      if (t.capMax >= n && t.capMin <= n + 1) tCount++
    })
    freeCombos.forEach(c => {
      if (c.cap >= n) cCount++
    })
    return { tables: tCount, combos: cCount, total: tCount + cCount }
  }, [freeTables, freeCombos])

  // ── Table status for Manuel grid ───────────────
  const tableStatus = useCallback((tbl: Table): 'free' | 'occ' | 'blocked' | 'avail' | 'combo' | 'dim' => {
    if (tbl.blocked) return 'blocked'
    const isOcc = occupiedIds.has(tbl.n)
    if (isOcc) return 'occ'
    // Si pas de sélection couverts/slot → toute table libre est cliquable
    if (selCvt <= 0 || !selSlot) return 'avail'
    // Free — check if fits selection
    const fits = tbl.capMax >= selCvt
    if (fits) return 'avail'
    // Check combo
    const comboMatch = combos.find(c => {
      if (c.cap < selCvt || c.salle !== selSalleName) return false
      if (!c.tables.includes(tbl.id)) return false
      return c.tables.every(tid => {
        const ct = tables.find(x => x.id === tid)
        return ct && ct.active && !ct.blocked && !occupiedIds.has(ct.n)
      })
    })
    if (comboMatch) return 'combo'
    return 'dim'
  }, [occupiedIds, selCvt, selSlot, combos, tables, selSalle])

  // ── Client history detection ───────────────────
  const checkClientRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const checkClient = useCallback((nom: string) => {
    if (checkClientRef.current) clearTimeout(checkClientRef.current)
    checkClientRef.current = setTimeout(() => {
      if (nom.trim().length < 2) { setDetectedClient(null); return }
      // Check via detectTablePref if available, else search clients
      const match = clients.find(c =>
        c.nom?.toLowerCase().startsWith(nom.trim().toLowerCase())
      )
      if (match && match.totalVisits && match.totalVisits >= 2) {
        setDetectedClient({
          tablePref: match.tablePref,
          sallePref: undefined,
          visits: match.totalVisits || 0,
          statut: match.statut || 0,
          tel: match.tel,
          prenom: match.prenom,
        })
        // Auto-fill
        if (match.prenom && !fPrenom) setFPrenom(match.prenom)
        if (match.tel && !fTel) setFTel(match.tel)
        if (match.statut) setFStatut(match.statut)
      } else {
        setDetectedClient(null)
      }
    }, 300)
  }, [clients, fPrenom, fTel])

  // ── Open modal ─────────────────────────────────
  const openModal = useCallback((tblLabel: string) => {
    setModalTblLabel(tblLabel)
    setFNom(''); setFPrenom(''); setFTel(''); setFEmail('')
    setFCanal('telephone'); setFNote(''); setFStatut(0)
    setFBebe(0); setFPmr(0); setFAllergie(false)
    setDetectedClient(null)
    setShowModal(true)
  }, [])

  // ── Confirm reservation ────────────────────────
  const confirmResa = useCallback(() => {
    if (!selSlot) { toast('⛔ Choisissez un créneau horaire', 'error'); return }
    if (selCvt < 1) { toast('⛔ Choisissez le nombre de couverts', 'error'); return }
    // ── Validation téléphone obligatoire (seulement si nom renseigné) ──
    if (options.require_phone && fNom.trim() && !fTel.trim()) { toast(t('modal.phoneRequired'), 'error'); return }
    // ── Validation date passée ──
    const todayStr = new Date().toISOString().slice(0, 10)
    if (selDate < todayStr) { toast('⛔ Impossible de réserver dans le passé', 'error'); return }

    const fullName = fNom.trim() ? `${fNom.trim()}${fPrenom.trim() ? ' ' + fPrenom.trim() : ''}` : 'Anonyme'
    const finalTbl = mode === 'ia' ? (iaSuggestion || modalTblLabel || t('modal.toAssign')) : (selTbl ? modalTblLabel : t('modal.toAssign'))

    const newResa: Resa = {
      id: 'r' + Date.now(),
      n: fullName,
      nom: fNom.trim(),
      prenom: fPrenom.trim(),
      c: selCvt,
      tbl: finalTbl,
      t: selSlot,
      svc: selSvc,
      s: 'reserved',
      note: fNote.trim(),
      date: selDate,
      createdAt: Date.now(),
      statut: fStatut as 0 | 1 | 2 | 3,
      mode: mode === 'ia' ? 'ia' : 'manuel',
      tel: toE164(fTel.trim(), pays),
      email: fEmail.trim(),
      canal: fCanal,
      prisPar: '',
      bebe: fBebe,
      pmr: fPmr,
      allergie: fAllergie,
      tablePref: detectedClient?.tablePref,
    }

    // ── Double-booking check ──
    if (finalTbl && finalTbl !== t('modal.toAssign') && isDoubleBooked(finalTbl, selDate, selSvc)) {
      toast(`⛔ ${finalTbl} déjà occupée pour ce service`, 'error')
      return
    }
    addResa(newResa)
    blinkResa(newResa.id) // Blink global pour auto-scroll dans Grille

    const modeIcon = mode === 'ia' ? '🤖' : '✋'
    toast(`${modeIcon} ${finalTbl} · ${selCvt}p · ${selSlot.replace('h', ':')} ✔`, 'success')

    setShowModal(false)

    // Placed blink local (NouvelleResa)
    if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current)
    const isCombo = finalTbl.includes('+')
    if (isCombo) {
      const parts = finalTbl.split('+').map(s => s.trim())
      const ids = tables.filter(t => parts.includes(t.n)).map(t => t.id)
      setPlacedIds(ids)
    } else {
      const tObj = tables.find(t => t.n === finalTbl)
      setPlacedIds(tObj ? [tObj.id] : [])
    }
    blinkTimerRef.current = setTimeout(() => setPlacedIds([]), 10000)

    // Reset selections for next resa (couverts à 2 par défaut)
    setSelCvt(2)
    setSelSlot('')
    setSelTbl(null)
  }, [fNom, fPrenom, fTel, fEmail, fCanal, fNote, fStatut, fBebe, fPmr, fAllergie,
    mode, iaSuggestion, modalTblLabel, selTbl, selCvt, selSlot, selSvc, selDate,
    detectedClient, tables, pays])

  // ── Manuel: click table ────────────────────────
  const handleTblClick = useCallback((tbl: Table) => {
    const status = tableStatus(tbl)
    if (status !== 'avail' && status !== 'combo') return
    setSelTbl(tbl.id)

    // Check if it's a combo pick
    if (status === 'combo') {
      const comboMatch = combos.find(c => {
        if (c.cap < selCvt || c.salle !== selSalleName) return false
        if (!c.tables.includes(tbl.id)) return false
        return c.tables.every(tid => {
          const ct = tables.find(x => x.id === tid)
          return ct && ct.active && !ct.blocked && !occupiedIds.has(ct.n)
        })
      })
      if (comboMatch) {
        openModal(comboMatch.label)
        return
      }
    }
    openModal(tbl.n)
  }, [tableStatus, combos, selCvt, selSalle, tables, occupiedIds, openModal])

  // ── Quick reserve sans détails (Anonyme) ──────
  const quickReserve = useCallback((tblLabel: string) => {
    if (!selSlot) { toast('⛔ Choisissez un créneau horaire', 'error'); return }
    if (selCvt < 1) { toast('⛔ Choisissez le nombre de couverts', 'error'); return }
    const todayStr = new Date().toISOString().slice(0, 10)
    if (selDate < todayStr) { toast('⛔ Impossible de réserver dans le passé', 'error'); return }

    const newResa: Resa = {
      id: 'r' + Date.now(),
      n: 'Anonyme',
      nom: '',
      prenom: '',
      c: selCvt,
      tbl: tblLabel,
      t: selSlot,
      svc: selSvc,
      s: 'reserved',
      note: '',
      date: selDate,
      createdAt: Date.now(),
      statut: 0,
      mode: mode === 'ia' ? 'ia' : 'manuel',
      tel: '',
      email: '',
      canal: 'telephone' as ResaCanal,
      prisPar: '',
      bebe: 0,
      pmr: 0,
      allergie: false,
    }

    if (tblLabel && tblLabel !== t('modal.toAssign') && isDoubleBooked(tblLabel, selDate, selSvc)) {
      toast(`⛔ ${tblLabel} déjà occupée pour ce service`, 'error')
      return
    }
    addResa(newResa)
    blinkResa(newResa.id) // Blink global pour auto-scroll dans Grille

    const modeIcon = mode === 'ia' ? '🤖' : '✋'
    toast(`${modeIcon} ${tblLabel} · ${selCvt}p · ${selSlot.replace('h', ':')} · Anonyme ✔`, 'success')

    // Placed blink local
    if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current)
    const isCombo = tblLabel.includes('+')
    if (isCombo) {
      const parts = tblLabel.split('+').map(s => s.trim())
      const ids = tables.filter(t => parts.includes(t.n)).map(t => t.id)
      setPlacedIds(ids)
    } else {
      const tObj = tables.find(t => t.n === tblLabel)
      setPlacedIds(tObj ? [tObj.id] : [])
    }
    blinkTimerRef.current = setTimeout(() => setPlacedIds([]), 10000)

    setSelCvt(2); setSelSlot(''); setSelTbl(null)
  }, [selCvt, selSlot, selSvc, selDate, mode, tables, t, addResa, toast])

  // ── IA: confirm (mini-modal rapide) ────────────
  const handleIAConfirm = useCallback(() => {
    if (!iaSuggestion) return
    setModalTblLabel(iaSuggestion)
    setShowQuickConfirm(true)
  }, [iaSuggestion])

  // ── Quick confirm → réserve Anonyme ───────────
  const confirmQuick = useCallback(() => {
    if (!selSlot || selCvt < 1) return
    const todayStr = new Date().toISOString().slice(0, 10)
    if (selDate < todayStr) { toast('⛔ Impossible de réserver dans le passé', 'error'); return }
    const tblLabel = modalTblLabel
    if (tblLabel && tblLabel !== t('modal.toAssign') && isDoubleBooked(tblLabel, selDate, selSvc)) {
      toast(`⛔ ${tblLabel} déjà occupée`, 'error'); return
    }
    const newResa: Resa = {
      id: 'r' + Date.now(), n: 'Anonyme', nom: '', prenom: '',
      c: selCvt, tbl: tblLabel, t: selSlot, svc: selSvc, s: 'reserved',
      note: '', date: selDate, createdAt: Date.now(), statut: 0,
      mode: 'ia', tel: '', email: '', canal: 'telephone' as ResaCanal,
      prisPar: '', bebe: 0, pmr: 0, allergie: false,
    }
    addResa(newResa)
    blinkResa(newResa.id)
    toast(`🤖 ${tblLabel} · ${selCvt}p · ${selSlot.replace('h', ':')} ✔`, 'success')
    setShowQuickConfirm(false)
    // Placed blink
    if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current)
    const isCombo = tblLabel.includes('+')
    if (isCombo) {
      const parts = tblLabel.split('+').map(s => s.trim())
      const ids = tables.filter(t => parts.includes(t.n)).map(t => t.id)
      setPlacedIds(ids)
    } else {
      const tObj = tables.find(t => t.n === tblLabel)
      setPlacedIds(tObj ? [tObj.id] : [])
    }
    blinkTimerRef.current = setTimeout(() => setPlacedIds([]), 10000)
    setSelCvt(2); setSelSlot(''); setSelTbl(null)
  }, [selCvt, selSlot, selSvc, selDate, modalTblLabel, tables, t, addResa, toast])

  // ── Quick → ouvrir détails complets ───────────
  const quickToFull = useCallback(() => {
    setShowQuickConfirm(false)
    openModal(modalTblLabel)
  }, [modalTblLabel, openModal])

  // ── Colors (matching Plan.tsx) ─────────────────
  const tblColors = {
    free:    { border: 'rgba(68,128,216,.4)', bg: 'rgba(68,128,216,.06)', name: 'rgba(68,128,216,.7)', badge: 'rgba(91,156,246,.75)', badgeText: '#fff' },
    occ:     { border: 'rgba(91,156,246,.85)', bg: 'rgba(91,156,246,.12)', name: '#5b9cf6', badge: 'rgba(91,156,246,.15)', badgeText: '#5b9cf6' },
    blocked: { border: 'rgba(100,116,139,.4)', bg: 'rgba(100,116,139,.08)', name: 'rgba(100,116,139,.5)', badge: 'rgba(100,116,139,.1)', badgeText: 'var(--muted)' },
    avail:   { border: 'var(--ac)', bg: 'rgba(68,128,216,.1)', name: 'var(--ac)', badge: 'rgba(68,128,216,.15)', badgeText: 'var(--ac)' },
    combo:   { border: 'var(--vt)', bg: 'rgba(168,85,247,.07)', name: 'var(--vt)', badge: 'rgba(168,85,247,.12)', badgeText: 'var(--vt)' },
    dim:     { border: 'transparent', bg: 'transparent', name: 'var(--muted)', badge: 'transparent', badgeText: 'var(--muted)' },
    placed:  { border: 'var(--gn)', bg: 'rgba(60,200,112,.18)', name: 'var(--gn)', badge: 'rgba(60,200,112,.12)', badgeText: 'var(--gn)' },
  }

  // ── Slot color ─────────────────────────────────
  const slotColor = (sl: string): string | null => {
    const data = slotSaturation[sl]
    if (!data || data.count === 0) return null
    if (data.ratio >= 0.9) return '#ef4444'
    if (data.ratio >= 0.6) return '#f59e0b'
    return '#22c55e'
  }

  // ── Get resa info for occupied table ───────────
  const getResaForTable = useCallback((tbl: Table) => {
    return resas.find(r =>
      r.date === selDate && r.svc === selSvc && isOccupying(r) &&
      (r.tbl === tbl.n || r.tbl.split('+').map(s => s.trim()).includes(tbl.n))
    )
  }, [resas, selDate, selSvc])

  // ── RENDER ─────────────────────────────────────

  // Guard : aucun service actif pour ce jour
  if (activeServices.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', background: S.bg, gap: 12 }}>
        <span style={{ fontSize: 40 }}>📅</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: S.text }}>Aucun service configuré</span>
        <span style={{ fontSize: 12, color: S.t3 }}>Vérifiez les services actifs et leurs jours dans Options.</span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: S.bg, overflow: 'hidden' }}>

      {/* ═══ SELECTOR BAR ═══ */}
      <div style={{ background: S.surf, borderBottom: `1px solid ${S.border}`, flexShrink: 0 }}>

        {/* Ligne 1 : Mode + Date */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', minHeight: 44, borderBottom: `1px solid ${S.border}` }}>

          {/* Mode IA / Manuel */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px', borderRight: `1px solid ${S.border}` }}>
            <span style={{ fontSize: 9, fontWeight: 800, color: S.muted, textTransform: 'uppercase', letterSpacing: '.05em' }}>Mode</span>
            <div style={{ display: 'flex', background: S.surf3, borderRadius: 8, border: `1px solid ${S.border}`, overflow: 'hidden' }}>
              <button
                onClick={() => setMode('ia')}
                style={{
                  padding: '6px 14px', fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer',
                  fontFamily: S.ff, transition: '.15s',
                  background: mode === 'ia' ? 'linear-gradient(135deg,#6b3fa0,#a855f7)' : 'transparent',
                  color: mode === 'ia' ? '#fff' : S.t3,
                }}
              >🤖 IA</button>
              <button
                onClick={() => setMode('manuel')}
                style={{
                  padding: '6px 14px', fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer',
                  fontFamily: S.ff, transition: '.15s',
                  background: mode === 'manuel' ? 'linear-gradient(135deg,#c4500a,#e87b20)' : 'transparent',
                  color: mode === 'manuel' ? '#fff' : S.t3,
                }}
              >✋ Manuel</button>
            </div>
          </div>

          {/* Date — 7 jours */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 10px', flex: 1 }}>
            <span style={{ fontSize: 9, fontWeight: 800, color: S.muted, textTransform: 'uppercase', letterSpacing: '.05em', marginRight: 4 }}>Date</span>
            <button
              onClick={() => dateOffset > 0 && setDateOffset(o => o - 7)}
              style={{
                padding: '5px 8px', borderRadius: 7, fontSize: 11, fontWeight: 700,
                background: 'transparent', border: `1.5px solid ${S.border}`, color: S.t3,
                cursor: dateOffset <= 0 ? 'default' : 'pointer', opacity: dateOffset <= 0 ? .2 : 1,
              }}
            >◀</button>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', alignSelf: 'center' }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: S.muted, textTransform: 'uppercase', letterSpacing: '.03em' }}>{monthLabel}</span>
              <span style={{ fontSize: 7, fontWeight: 600, color: S.muted, opacity: .6 }}>{yearLabel}</span>
            </div>
            {dateChips.map(d => (
              <button
                key={d.key}
                onClick={() => setSelDate(d.key)}
                style={{
                  padding: '5px 10px', borderRadius: 7, fontSize: 10, fontWeight: 700,
                  border: `1.5px solid ${selDate === d.key ? S.bl : S.border}`,
                  background: selDate === d.key ? 'rgba(68,128,216,.15)' : 'transparent',
                  color: selDate === d.key ? S.ac : S.t3,
                  cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, lineHeight: 1.2,
                  fontFamily: S.ff,
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 800 }}>{d.day}</span>
                <span style={{ fontSize: 7, fontWeight: 600, textTransform: 'uppercase', opacity: .7, color: d.isToday ? S.gn : undefined }}>{d.label}</span>
              </button>
            ))}
            <button
              onClick={() => setDateOffset(o => o + 7)}
              style={{
                padding: '5px 8px', borderRadius: 7, fontSize: 11, fontWeight: 700,
                background: 'transparent', border: `1.5px solid ${S.border}`, color: S.t3,
                cursor: 'pointer',
              }}
            >▶</button>
          </div>
        </div>

        {/* Ligne 2 : Service + Salle + Couverts */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', minHeight: 40 }}>

          {/* Service */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px', borderRight: `1px solid ${S.border}` }}>
            <span style={{ fontSize: 9, fontWeight: 800, color: S.muted, textTransform: 'uppercase', letterSpacing: '.05em' }}>Service</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {activeServices.map(s => {
                const isOn = selSvc === s.name.toLowerCase()
                const nowM = new Date().getHours() * 60 + new Date().getMinutes()
                const isLive = selDate === todayISO() && nowM >= timeToMins(s.open) && nowM <= timeToMins(s.close)
                return (
                  <button
                    key={s.id}
                    onClick={() => { setSelSvc(s.name.toLowerCase()); setSelSlot('') }}
                    style={{
                      padding: '4px 12px', borderRadius: 8,
                      border: `2px solid ${isOn ? s.color : S.surf4}`,
                      background: isOn ? `${s.color}25` : S.surf3,
                      color: isOn ? s.color : S.t3,
                      cursor: 'pointer', fontFamily: S.ff,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, lineHeight: 1.3,
                      position: 'relative',
                    }}
                  >
                    {isLive && <span style={{
                      position: 'absolute', top: 3, right: 3, width: 7, height: 7,
                      borderRadius: '50%', background: '#3cc870',
                      boxShadow: '0 0 6px rgba(60,200,112,.6)',
                      animation: 'svcPulse 1.5s ease-in-out infinite',
                    }} />}
                    <span style={{ fontSize: 12, fontWeight: 800 }}>{s.icon} {s.name}</span>
                    <span style={{ fontSize: 8, fontWeight: 600, opacity: .6 }}>{s.open.replace(':','h')}–{s.close.replace(':','h')}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Salle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px', borderRight: `1px solid ${S.border}` }}>
            <span style={{ fontSize: 9, fontWeight: 800, color: S.muted, textTransform: 'uppercase', letterSpacing: '.05em' }}>Salle</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {activeSalles.map(s => {
                const isOn = selSalle === s.id
                const loc = s.exterior ? '🌳' : '🏠'
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelSalle(s.id)}
                    style={{
                      padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 800,
                      border: `2px solid ${isOn ? s.color : S.surf4}`,
                      background: isOn ? `${s.color}25` : S.surf3,
                      color: isOn ? s.color : S.t3,
                      cursor: 'pointer', fontFamily: S.ff,
                    }}
                  >{s.name} <span style={{ fontSize: 9, opacity: .6 }}>{loc}</span></button>
                )
              })}
            </div>
          </div>

          {/* Couverts 1-6 + stepper */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px', position: 'relative' }}>
            <span style={{ fontSize: 9, fontWeight: 800, color: S.muted, textTransform: 'uppercase', letterSpacing: '.05em' }}>Couverts</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {[1, 2, 3, 4, 5, 6].map(n => {
                const avail = cvtAvail(n)
                const isOff = avail.total === 0
                const isOn = selCvt === n
                return (
                  <button
                    key={n}
                    onClick={() => !isOff && setSelCvt(n)}
                    style={{
                      width: 32, height: 32, borderRadius: 8, fontSize: 13, fontWeight: 900,
                      border: `2px solid ${isOn ? S.ac : S.surf4}`,
                      background: isOn ? 'rgba(68,128,216,.25)' : S.surf3,
                      color: isOn ? '#fff' : isOff ? S.muted : S.t3,
                      cursor: isOff ? 'default' : 'pointer', fontFamily: S.fm,
                      opacity: isOff ? .3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      position: 'relative',
                    }}
                  >
                    {n}
                    {!isOff && !isOn && avail.total > 0 && (
                      <span style={{
                        position: 'absolute', bottom: -2, right: -2,
                        fontSize: 7, fontWeight: 800, background: S.surf, color: S.gn,
                        borderRadius: 4, padding: '0 3px', lineHeight: '12px',
                        border: `1px solid ${S.border}`,
                      }}>{avail.total}</span>
                    )}
                  </button>
                )
              })}
              {/* Stepper 7+ */}
              <button
                onClick={() => { setShowStepper(!showStepper); setStepperVal(selCvt > 6 ? selCvt : 7) }}
                style={{
                  width: 32, height: 32, borderRadius: 8, fontSize: 13, fontWeight: 900,
                  border: `2px ${selCvt > 6 ? `solid ${S.ac}` : `dashed ${S.surf4}`}`,
                  background: selCvt > 6 ? 'rgba(68,128,216,.25)' : S.surf3,
                  color: selCvt > 6 ? '#fff' : S.ac,
                  cursor: 'pointer', fontFamily: S.fm,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >{selCvt > 6 ? selCvt : '+'}</button>
            </div>

            {/* Stepper popup */}
            {showStepper && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, zIndex: 200,
                background: S.surf, border: `1.5px solid ${S.border}`, borderRadius: 12,
                boxShadow: '0 10px 30px rgba(0,0,0,.5)', padding: 14, width: 200, textAlign: 'center',
              }}>
                <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 10, color: S.text }}>Nombre de couverts</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  <button onClick={() => setStepperVal(v => Math.max(7, v - 1))} style={stepBtnStyle}>−</button>
                  <span style={{ fontSize: 28, fontWeight: 900, fontFamily: S.fm, color: S.ac, minWidth: 50, textAlign: 'center' }}>{stepperVal}</span>
                  <button onClick={() => setStepperVal(v => Math.min(50, v + 1))} style={stepBtnStyle}>+</button>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button onClick={() => setShowStepper(false)} style={{ flex: 1, padding: '6px', borderRadius: 8, border: `1px solid ${S.border}`, background: 'transparent', color: S.t3, fontSize: 11, cursor: 'pointer', fontFamily: S.ff }}>Annuler</button>
                  <button onClick={() => {
                    if (cvtAvail(stepperVal).total === 0) return
                    setSelCvt(stepperVal); setShowStepper(false)
                  }} style={{ flex: 1, padding: '6px', borderRadius: 8, border: 'none', background: S.bl, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: S.ff }}>Valider</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ MAIN AREA ═══ */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* TIMELINE (left) */}
        <div style={{
          width: 160, borderRight: `1px solid ${S.border}`, background: S.surf,
          overflowY: 'auto', flexShrink: 0, padding: '8px 0',
        }}>
          <div style={{ padding: '4px 12px', fontSize: 10, fontWeight: 800, color: S.muted, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>
            {activeServices.find(s => s.name.toLowerCase() === selSvc)?.icon} {selSvc || 'Service'}
          </div>
          {slots.map(sl => {
            const isOn = selSlot === sl
            const sc = slotColor(sl)
            const data = slotSaturation[sl]
            const pct = data ? Math.min(data.ratio * 100, 100) : 0
            return (
              <div
                key={sl}
                onClick={() => setSelSlot(sl)}
                style={{
                  padding: '6px 12px', cursor: 'pointer',
                  background: isOn ? 'rgba(68,128,216,.12)' : 'transparent',
                  borderLeft: isOn ? `3px solid ${S.ac}` : '3px solid transparent',
                  display: 'flex', alignItems: 'center', gap: 8,
                  transition: '.12s',
                }}
              >
                <span style={{ fontSize: 12, fontWeight: isOn ? 800 : 600, color: isOn ? S.ac : S.t2, fontFamily: S.fm, minWidth: 40 }}>
                  {sl.replace('h', ':')}
                </span>
                <div style={{ flex: 1, height: 4, borderRadius: 2, background: S.surf3 }}>
                  {pct > 0 && <div style={{ width: `${pct}%`, height: '100%', borderRadius: 2, background: sc || '#22c55e' }} />}
                </div>
                {data && data.count > 0 && (
                  <span style={{ fontSize: 9, fontWeight: 700, color: sc || S.t3, fontFamily: S.fm }}>{data.count}</span>
                )}
              </div>
            )
          })}
        </div>

        {/* CONTENT (right) */}
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>

          {/* Mode IA */}
          {mode === 'ia' && (
            <div style={{ maxWidth: 500, margin: '0 auto' }}>
              <div style={{
                background: S.surf2, border: `1px solid ${S.border}`, borderRadius: 14,
                padding: 24, textAlign: 'center',
                opacity: (selCvt > 0 && selSlot) ? 1 : .5,
                transition: '.3s',
              }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>{iaSuggestion ? '✨' : selCvt > 0 && selSlot ? '😔' : '🤖'}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: S.text, marginBottom: 4 }}>
                  {iaSuggestion ? 'Table trouvée !' : selCvt > 0 && selSlot ? 'Complet' : 'Mode IA'}
                </div>
                <div style={{ fontSize: 12, color: S.t3, marginBottom: 16 }}>
                  {iaSuggestion
                    ? `Meilleure table pour ${selCvt} couverts à ${selSlot.replace('h', ':')}`
                    : selCvt > 0 && selSlot
                      ? `Aucune table pour ${selCvt} couverts à ${selSlot.replace('h', ':')}`
                      : 'Choisissez service, couverts et créneau.\nL\'IA place la meilleure table en un clic.'
                  }
                </div>

                {iaSuggestion ? (
                  <>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 12,
                      background: 'rgba(168,85,247,.08)', border: '1px solid rgba(168,85,247,.25)',
                      borderRadius: 10, padding: '12px 20px', marginBottom: 16,
                    }}>
                      <span style={{ fontSize: 20, fontWeight: 900, fontFamily: S.fm, color: S.vt }}>{iaSuggestion}</span>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: 10, color: S.t3 }}>{selSlot.replace('h', ':')}</div>
                        <div style={{ fontSize: 10, color: S.t3 }}>
                          {activeSalles.find(s => s.id === selSalle)?.name}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <button
                        onClick={handleIAConfirm}
                        style={{
                          padding: '10px 28px', borderRadius: 10, border: 'none',
                          background: 'linear-gradient(135deg,#6b3fa0,#a855f7)',
                          color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: S.ff,
                        }}
                      >✅ Valider {iaSuggestion}</button>
                      <button
                        onClick={() => openModal(iaSuggestion)}
                        style={{
                          padding: '4px 14px', borderRadius: 7, border: 'none',
                          background: 'transparent', color: S.vt,
                          fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: S.ff,
                          textDecoration: 'underline', opacity: .8,
                        }}
                      >📝 avec détails client</button>
                    </div>
                  </>
                ) : selCvt > 0 && selSlot ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <button
                      onClick={() => openModal(t('modal.toAssign'))}
                      style={{
                        padding: '10px 28px', borderRadius: 10,
                        border: `2px dashed rgba(168,85,247,.4)`,
                        background: 'rgba(168,85,247,.06)',
                        color: '#a855f7', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: S.ff,
                      }}
                    >📝 Réserver sans table</button>
                    <button
                      onClick={() => quickReserve(t('modal.toAssign'))}
                      style={{
                        padding: '4px 14px', borderRadius: 7, border: 'none',
                        background: 'transparent', color: S.t3,
                        fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: S.ff,
                        textDecoration: 'underline', opacity: .7,
                      }}
                    >sans détails (Anonyme)</button>
                    <div style={{ fontSize: 10, color: S.t3, marginTop: 2 }}>
                      Table assignée plus tard
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* Mode Manuel — Grille */}
          {mode === 'manuel' && (
            <div>
              {/* Info bar */}
              {selCvt > 0 && selSlot ? (
                <div style={{
                  padding: '8px 14px', borderRadius: 10, marginBottom: 12,
                  background: 'rgba(68,128,216,.08)', border: '1px solid rgba(68,128,216,.2)',
                  fontSize: 11, fontWeight: 600, color: S.ac,
                }}>
                  {(() => {
                    const av = freeTables.filter(t => t.capMax >= selCvt).length
                    const cc = freeCombos.filter(c => c.cap >= selCvt).length
                    return `${av} tables${cc ? ` + ${cc} combos` : ''} dispo pour ${selCvt}p à ${selSlot.replace('h', ':')}. Cliquez sur une table.`
                  })()}
                </div>
              ) : (
                <div style={{
                  padding: '8px 14px', borderRadius: 10, marginBottom: 12,
                  background: 'rgba(232,165,48,.08)', border: '1px solid rgba(232,165,48,.2)',
                  fontSize: 11, fontWeight: 600, color: '#e8a530',
                }}>
                  {!selCvt && !selSlot ? 'Choisissez couverts et créneau, ou cliquez directement sur une table libre.' :
                    !selCvt ? 'Choisissez le nombre de couverts, ou cliquez directement sur une table.' :
                      'Choisissez un créneau horaire, ou cliquez directement sur une table.'}
                </div>
              )}

              {/* Room header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: activeSalles.find(s => s.id === selSalle)?.color || S.bl,
                }} />
                <span style={{ fontSize: 13, fontWeight: 800, color: S.text }}>
                  {activeSalles.find(s => s.id === selSalle)?.name || 'Salle'}
                </span>
                <span style={{ fontSize: 11, color: S.t3 }}>
                  {freeTables.length}/{salleTables.length} libres
                </span>
              </div>

              {/* Grid — blocs combos physiquement collés */}
              {(() => {
                // Tous les combos de cette salle
                const salleCombos = combos.filter((c: any) => c.salle === selSalleName)
                // Map table ID → combo(s)
                const tblToCombo = new Map<string, typeof salleCombos[0]>()
                salleCombos.forEach(c => {
                  c.tables.forEach((tid: string) => {
                    // Premier combo trouvé pour cette table gagne
                    if (!tblToCombo.has(tid)) tblToCombo.set(tid, c)
                  })
                })
                // Construire la liste d'éléments à rendre (tables solo + blocs combo)
                const rendered = new Set<string>() // IDs de tables déjà rendues
                const items: React.ReactNode[] = []

                salleTables.forEach(tbl => {
                  if (rendered.has(tbl.id)) return
                  const combo = tblToCombo.get(tbl.id)
                  if (combo) {
                    // Rendre le bloc combo complet, toutes ses tables collées
                    combo.tables.forEach((tid: string) => rendered.add(tid))
                    const comboTbls = combo.tables.map((tid: string) => tables.find(t => t.id === tid)).filter(Boolean) as Table[]
                    // Statut du combo : occupé, libre dispo, libre
                    const allOcc = comboTbls.every(tb => occupiedIds.has(tb.n))
                    const allFree = comboTbls.every(tb => !occupiedIds.has(tb.n) && !tb.blocked)
                    const fits = allFree && combo.cap >= selCvt && selCvt > 0 && !!selSlot
                    // Dim si aucune table individuelle ne convient ET le combo ne convient pas non plus
                    const anyTableFitsAlone = selCvt > 0 && comboTbls.some(tb => !occupiedIds.has(tb.n) && !tb.blocked && tb.capMax >= selCvt)
                    const isDim = selCvt > 0 && !!selSlot && !fits && !anyTableFitsAlone && !allOcc
                    const resa = allOcc ? getResaForTable(comboTbls[0]) : null
                    // Combo cliquable seulement si toutes tables libres ET capacité suffisante ou table seule possible
                    const comboClickable = allFree && (fits || anyTableFitsAlone)

                    // Couleurs du bloc
                    let comboBg = 'rgba(68,128,216,.06)'
                    let comboBorder = 'rgba(68,128,216,.25)'
                    let comboAccent = 'rgba(68,128,216,.4)'
                    let nameCol = 'rgba(68,128,216,.7)'
                    let badgeBg = 'rgba(91,156,246,.75)'
                    let badgeText = '#fff'
                    let statusLabel = `🔗 ${combo.label} · ${combo.cap}p`

                    if (allOcc) {
                      comboBg = 'rgba(91,156,246,.15)'
                      comboBorder = 'rgba(59,130,246,.6)'
                      comboAccent = 'rgba(59,130,246,.95)'
                      nameCol = '#3b82f6'
                      badgeBg = 'rgba(59,130,246,.85)'
                      statusLabel = `🔗 ${resa ? `${resa.n} · ${resa.c}p` : combo.label}`
                    } else if (fits) {
                      comboBg = 'rgba(144,96,224,.12)'
                      comboBorder = 'rgba(144,96,224,.5)'
                      comboAccent = 'rgba(144,96,224,.85)'
                      nameCol = '#a855f7'
                      badgeBg = 'rgba(144,96,224,.85)'
                      statusLabel = `🔗 ${combo.label} · ${combo.cap}p ✔`
                    } else if (allFree) {
                      comboBg = 'rgba(68,128,216,.08)'
                      comboBorder = 'rgba(68,128,216,.35)'
                      comboAccent = 'rgba(68,128,216,.55)'
                      nameCol = 'rgba(68,128,216,.85)'
                    }

                    items.push(
                      <div key={`combo-${combo.id}`}
                        style={{
                          gridColumn: `span ${Math.min(comboTbls.length, 3)}`,
                          display: 'flex', flexDirection: 'column',
                          borderRadius: 12, overflow: 'hidden',
                          background: comboBg, border: `2px solid ${comboBorder}`,
                          borderLeft: `5px solid ${comboAccent}`,
                          opacity: isDim ? .12 : 1, transition: '.15s',
                          animation: fits ? 'pulse 1.2s ease-in-out infinite' : undefined,
                          position: 'relative',
                        }}
                      >
                        {/* Tables individuelles — chacune cliquable séparément */}
                        <div style={{ display: 'flex', alignItems: 'stretch', flex: 1 }}>
                          {comboTbls.map((tb, i) => {
                            const tbFree = !occupiedIds.has(tb.n) && !tb.blocked
                            const tbFits = tbFree && tb.capMax >= selCvt && selCvt > 0
                            const tbResa = occupiedIds.has(tb.n) ? getResaForTable(tb) : null
                            return (
                              <div key={tb.id}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (tbFree) openModal(tb.n)
                                }}
                                style={{
                                  flex: 1, padding: '10px 10px 6px',
                                  borderRight: i < comboTbls.length - 1 ? `1px dashed ${comboBorder}` : 'none',
                                  cursor: tbFree ? 'pointer' : 'default',
                                  transition: 'background .12s',
                                }}
                                onMouseEnter={e => { if (tbFree) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.06)' }}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                              >
                                <div style={{ fontSize: 14, fontWeight: 900, fontFamily: S.fm, color: tbFree ? nameCol : '#3b82f6' }}>{tb.n}</div>
                                <div style={{ fontSize: 9, color: S.t3, fontFamily: S.fm }}>
                                  {tbResa ? `${tbResa.n} · ${tbResa.c}p` : `${tb.capMin}–${tb.capMax}`}
                                </div>
                                {tbFree && tbFits && <div style={{ fontSize: 8, color: 'var(--gn)', fontWeight: 700, marginTop: 2 }}>● seule</div>}
                              </div>
                            )
                          })}
                        </div>
                        {/* Barre combo — cliquer ici = réserver le combo entier */}
                        <div
                          onClick={() => comboClickable && openModal(combo.label)}
                          style={{
                            padding: '4px 8px',
                            fontSize: 9, fontWeight: 800, textAlign: 'center',
                            background: badgeBg, color: badgeText,
                            cursor: comboClickable ? 'pointer' : 'default',
                            transition: 'opacity .12s',
                          }}
                        >
                          {statusLabel}
                        </div>
                      </div>
                    )
                  } else {
                    // Table solo (pas dans un combo)
                    rendered.add(tbl.id)
                    const isPlaced = placedIds.includes(tbl.id)
                    const status = isPlaced ? 'placed' : tableStatus(tbl)
                    const colors = tblColors[status] || tblColors.free
                    const resa = status === 'occ' || status === 'dim' ? getResaForTable(tbl) : null
                    const isDim = status === 'dim'
                    const isClickable = status === 'avail' || status === 'combo'
                    items.push(
                      <div key={tbl.id} onClick={() => isClickable && handleTblClick(tbl)} style={{
                        padding: '10px 12px', borderRadius: 11,
                        borderLeft: `5px solid ${colors.border}`, background: colors.bg,
                        cursor: isClickable ? 'pointer' : 'default',
                        opacity: isDim ? .12 : 1, transition: '.15s',
                        animation: (status === 'avail' || status === 'combo' || isPlaced) ? 'pulse 1.2s ease-in-out infinite' : undefined,
                        position: 'relative',
                      }}>
                        <div style={{ fontSize: 14, fontWeight: 900, fontFamily: S.fm, color: colors.name, marginBottom: 2 }}>{tbl.n}</div>
                        <div style={{ fontSize: 9, color: S.t3, fontFamily: S.fm }}>{tbl.capMin}–{tbl.capMax} cvt</div>
                        <div style={{
                          marginTop: 5, fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 5,
                          display: 'inline-block', background: colors.badge, color: colors.badgeText,
                        }}>
                          {status === 'avail' ? `${tbl.capMax} cvt ✔` :
                            status === 'combo' ? '🔗 Combo' :
                              status === 'occ' && resa ? `${resa.n} · ${resa.c}p` :
                                isPlaced ? '✅ Placé !' :
                                  status === 'free' ? '✅ LIBRE' :
                                    status === 'blocked' ? 'Bloquée' : ''}
                        </div>
                      </div>
                    )
                  }
                })

                return (
                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                    gap: 8,
                  }}>
                    {items}
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      </div>

      {/* ═══ MINI-MODAL IA RAPIDE ═══ */}
      {showQuickConfirm && (
        <>
          <div onClick={() => setShowQuickConfirm(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(6,14,28,.85)', backdropFilter: 'blur(8px)', zIndex: 200 }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: 'min(380px, 90vw)', background: S.surf, border: `1px solid rgba(168,85,247,.3)`,
            borderRadius: 18, padding: 28, zIndex: 201, textAlign: 'center',
            boxShadow: '0 24px 60px rgba(0,0,0,.6), 0 0 40px rgba(168,85,247,.08)',
          }}>
            <div style={{ fontSize: 36, marginBottom: 6 }}>🤖</div>
            <div style={{ fontSize: 17, fontWeight: 900, color: S.text, marginBottom: 4 }}>Confirmer la résa ?</div>
            <div style={{ fontSize: 11, color: S.t3, marginBottom: 20 }}>
              Placement IA · {activeSalles.find(s => s.id === selSalle)?.name}
            </div>

            {/* Récapitulatif */}
            <div style={{
              display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 22,
              padding: '14px 18px', borderRadius: 12,
              background: 'rgba(168,85,247,.06)', border: '1px solid rgba(168,85,247,.2)',
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: S.t3, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 2 }}>Table</div>
                <div style={{ fontSize: 18, fontWeight: 900, fontFamily: S.fm, color: S.vt }}>{modalTblLabel}</div>
              </div>
              <div style={{ width: 1, background: 'rgba(168,85,247,.2)' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: S.t3, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 2 }}>Créneau</div>
                <div style={{ fontSize: 18, fontWeight: 900, fontFamily: S.fm, color: S.text }}>{selSlot?.replace('h', ':')}</div>
              </div>
              <div style={{ width: 1, background: 'rgba(168,85,247,.2)' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: S.t3, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 2 }}>Couverts</div>
                <div style={{ fontSize: 18, fontWeight: 900, fontFamily: S.fm, color: S.text }}>{selCvt}</div>
              </div>
            </div>

            {/* Boutons */}
            <button
              onClick={confirmQuick}
              style={{
                width: '100%', padding: '13px', border: 'none', borderRadius: 12,
                background: 'linear-gradient(135deg,#6b3fa0,#a855f7)',
                color: '#fff', fontSize: 14, fontWeight: 900, cursor: 'pointer', fontFamily: S.ff,
                marginBottom: 8, letterSpacing: '.02em',
              }}
            >✅ Confirmer</button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setShowQuickConfirm(false)}
                style={{
                  flex: 1, padding: '8px', borderRadius: 8, fontSize: 10, fontWeight: 700,
                  background: 'transparent', border: `1px solid ${S.border}`, color: S.t3,
                  cursor: 'pointer', fontFamily: S.ff,
                }}
              >Annuler</button>
              <button
                onClick={quickToFull}
                style={{
                  flex: 1, padding: '8px', borderRadius: 8, fontSize: 10, fontWeight: 700,
                  background: 'transparent', border: `1px solid rgba(168,85,247,.3)`, color: S.vt,
                  cursor: 'pointer', fontFamily: S.ff,
                }}
              >📝 Ajouter détails</button>
            </div>
          </div>
        </>
      )}

      {/* ═══ MODAL RÉSA ═══ */}
      {showModal && (
        <>
          <div onClick={() => setShowModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(6,14,28,.8)', backdropFilter: 'blur(6px)', zIndex: 200 }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: 'min(540px, 95vw)', background: S.surf, border: `1px solid ${S.border}`,
            borderRadius: 16, padding: 20, zIndex: 201, maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 20px 50px rgba(0,0,0,.5)',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>Nouvelle réservation</h2>
              <span style={{
                fontSize: 9, fontWeight: 800, padding: '3px 8px', borderRadius: 5, letterSpacing: '.03em',
                background: mode === 'ia' ? 'rgba(168,85,247,.15)' : 'rgba(232,123,32,.15)',
                color: mode === 'ia' ? S.vt : '#e87b20',
                border: `1px solid ${mode === 'ia' ? 'rgba(168,85,247,.3)' : 'rgba(232,123,32,.3)'}`,
              }}>{mode === 'ia' ? '🤖 IA' : '✋ Manuel'}</span>
            </div>
            <div style={{ fontSize: 11, color: S.t3, marginBottom: 14 }}>{modalTblLabel} · {selCvt} cvt · {selSlot}</div>

            {/* Client */}
            <div style={{ marginBottom: 12, paddingBottom: 10, borderBottom: `1px solid ${S.border}` }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: S.muted, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>👤 Client</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Nom *</label>
                  <input
                    style={inputStyle}
                    value={fNom}
                    onChange={e => { setFNom(e.target.value); checkClient(e.target.value) }}
                    placeholder="Dupont"
                    autoFocus
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Prénom</label>
                  <input style={inputStyle} value={fPrenom} onChange={e => setFPrenom(e.target.value)} placeholder="Jean" />
                </div>
              </div>

              {/* Client history hint */}
              {detectedClient && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8,
                  padding: '7px 10px', borderRadius: 8,
                  background: 'rgba(232,165,48,.08)', border: '1px solid rgba(232,165,48,.25)',
                  animation: 'fadeIn .3s ease',
                }}>
                  <span style={{ fontSize: 14 }}>🪑</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: S.am }}>
                    Table habituelle : <strong>{detectedClient.tablePref || '—'}</strong>
                    {detectedClient.sallePref && ` (${detectedClient.sallePref})`}
                    {' · '}{detectedClient.visits} visites
                    {detectedClient.statut === 2 && ' · ⭐ VIP'}
                    {detectedClient.statut === 1 && ' · 🔵 Régulier'}
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <div style={{ flex: 1.3 }}>
                  <label style={labelStyle}>Tél</label>
                  <PhoneInput value={fTel} onChange={setFTel} compact />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Email</label>
                  <input style={inputStyle} value={fEmail} onChange={e => setFEmail(e.target.value)} placeholder="client@mail.ch" type="email" />
                </div>
              </div>

              {/* Canal */}
              <div>
                <label style={labelStyle}>Canal</label>
                <div style={{ display: 'flex', gap: 4 }}>
                  {([['telephone', '📞 Tél'], ['walkin', '🚶 Walk-in'], ['widget', '🌐 Web'], ['email', '✉️ Email'], ['whatsapp', '💬 WA'], ['sms', '📱 SMS']] as [ResaCanal, string][]).map(([val, lbl]) => (
                    <button
                      key={val}
                      onClick={() => setFCanal(val)}
                      style={{
                        flex: 1, padding: '5px 4px', borderRadius: 6,
                        border: `1.5px solid ${fCanal === val ? S.bl : S.border}`,
                        background: fCanal === val ? 'rgba(68,128,216,.15)' : 'transparent',
                        color: fCanal === val ? S.ac : S.t3,
                        fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: S.ff,
                      }}
                    >{lbl}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Options */}
            <div style={{ marginBottom: 12, paddingBottom: 10, borderBottom: `1px solid ${S.border}` }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: S.muted, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>⚙️ Options</div>

              {/* Statut */}
              <label style={labelStyle}>Statut</label>
              <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                {[
                  { i: 0, lbl: '⬜ Standard', col: S.t3, bg: 'rgba(107,130,168,.1)', bc: S.t3 },
                  { i: 1, lbl: '🔵 Régulier', col: S.ac, bg: 'rgba(68,128,216,.15)', bc: S.bl },
                  { i: 2, lbl: '⭐ VIP', col: S.am, bg: 'rgba(240,165,0,.12)', bc: S.am },
                  { i: 3, lbl: '🔴 Surveillé', col: S.rd, bg: 'rgba(224,85,85,.1)', bc: S.rd },
                ].map(st => (
                  <button
                    key={st.i}
                    onClick={() => setFStatut(st.i)}
                    style={{
                      padding: '5px 10px', borderRadius: 7, fontSize: 10, fontWeight: 700,
                      border: `1.5px solid ${fStatut === st.i ? st.bc : S.border}`,
                      background: fStatut === st.i ? st.bg : 'transparent',
                      color: fStatut === st.i ? st.col : S.t3,
                      cursor: 'pointer', fontFamily: S.ff,
                    }}
                  >{st.lbl}</button>
                ))}
              </div>

              {/* Besoins */}
              <label style={labelStyle}>Besoins</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <NeedStepper label="👶 Chaise bb" value={fBebe} onChange={setFBebe} />
                <NeedStepper label="♿ PMR" value={fPmr} onChange={setFPmr} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: S.t2 }}>
                  <span style={{ fontSize: 14 }}>⚠️</span> Allergie
                  <button
                    onClick={() => setFAllergie(!fAllergie)}
                    style={{
                      padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                      border: `1.5px solid ${fAllergie ? S.rd : S.border}`,
                      background: fAllergie ? 'rgba(224,85,85,.1)' : 'transparent',
                      color: fAllergie ? S.rd : S.t3,
                      cursor: 'pointer', fontFamily: S.ff,
                    }}
                  >{fAllergie ? 'Oui' : 'Non'}</button>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: S.muted, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>📝 Notes</div>
              <textarea
                value={fNote}
                onChange={e => setFNote(e.target.value)}
                placeholder="Allergies, préférences, occasion spéciale..."
                style={{
                  width: '100%', padding: '8px 10px', background: S.surf3, border: `1px solid ${S.border}`,
                  borderRadius: 8, color: S.text, fontFamily: S.ff, fontSize: 12,
                  resize: 'vertical', minHeight: 48, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: '10px 14px', background: 'transparent', border: `1px solid ${S.border}`,
                  color: S.t3, borderRadius: 10, fontSize: 11, cursor: 'pointer', fontFamily: S.ff,
                }}
              >Annuler</button>
              <button
                onClick={confirmResa}
                style={{
                  flex: 1, padding: '10px', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 800,
                  cursor: 'pointer', fontFamily: S.ff, color: '#fff',
                  background: mode === 'ia' ? 'linear-gradient(135deg,#6b3fa0,#a855f7)' : 'linear-gradient(135deg,#c4500a,#e87b20)',
                }}
              >✅ Confirmer</button>
            </div>
          </div>
        </>
      )}

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 rgba(68,128,216,0); }
          50% { box-shadow: 0 0 18px rgba(68,128,216,.2); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes svcPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: .5; transform: scale(.7); }
        }
      `}</style>
    </div>
  )
}

// ── Sub-components ───────────────────────────────

function NeedStepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--t2)' }}>
      <span style={{ fontSize: 14 }}>{label.split(' ')[0]}</span> {label.split(' ').slice(1).join(' ')}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <button onClick={() => onChange(Math.max(0, value - 1))} style={needBtnStyle}>−</button>
        <span style={{ fontSize: 13, fontWeight: 800, fontFamily: 'var(--fm)', minWidth: 18, textAlign: 'center', color: 'var(--text)' }}>{value}</span>
        <button onClick={() => onChange(Math.min(5, value + 1))} style={needBtnStyle}>+</button>
      </div>
    </div>
  )
}

// ── Shared styles ────────────────────────────────
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 9, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '.04em',
  color: 'var(--t3)', marginBottom: 3,
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px',
  background: 'var(--surf3)', border: '1px solid var(--border)',
  borderRadius: 8, color: 'var(--text)',
  fontSize: 12, fontFamily: 'var(--ff)', outline: 'none',
  boxSizing: 'border-box',
}

const needBtnStyle: React.CSSProperties = {
  width: 22, height: 22, borderRadius: 5, fontSize: 12, fontWeight: 700,
  background: 'var(--surf3)', border: '1px solid var(--border)', color: 'var(--t3)',
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontFamily: 'var(--ff)',
}

const stepBtnStyle: React.CSSProperties = {
  width: 34, height: 34, borderRadius: 8, fontSize: 18, fontWeight: 800,
  background: 'var(--surf3)', border: '1.5px solid var(--border)', color: 'var(--t2)',
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontFamily: 'var(--ff)',
}
