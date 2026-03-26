// ══════════════════════════════════════════════════
//  R3STO — Plan.tsx
//  Vue plan de salle interactive (lecture/service)
//  Même disposition SVG que SetupPlan, mais orientée
//  opérations : affichage des réservations, statuts,
//  actions rapides, et réassignation.
//
//  ⚠ RÈGLE D'OR : JAMAIS supprimer une réservation.
//  Si une table est supprimée/modifiée dans l'éditeur,
//  la résa est réassignée (auto ou manuellement),
//  JAMAIS supprimée.
// ══════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import { useToast } from '../../components/ui/Toast'
import { ViewToolbar } from '../../components/ui/ViewToolbar'
import { useT } from '../../i18n/useTranslation'
import { STATUS } from '../../utils/design'
import { todayISO, timeToMins, nowMins } from '../../utils/date'
import {
  isOccupying, tblMatchesTable, getOccupiedTableIds,
  iaPlacement, getFreeTables, getFreeCombos
} from '../../utils/placementRules'
import { spRoomBodySvg } from '../../utils/roomItemSvg'
import type { Table, Combo, Resa, Service, RoomItem } from '../../types'

// ── Constantes ────────────────────────────────────
const CANVAS_SIZES: Record<string, { w: number; h: number }> = {}

// ── Helpers SVG (reprise simplifiée de SetupPlan) ─

function spSnap(v: number) { return Math.round(v) }

/** Table SVG body — shape + fill selon statut */
function planTableSvg(
  t: Table,
  status: 'free' | 'reserved' | 'arrived' | 'blocked' | 'combo_partial' | 'held',
  isSelected: boolean,
  resaInfo?: { name: string; covers: number; time: string; statusIcon: string; vip: boolean; allergie: boolean; bebe: number; pmr: number; isCombo: boolean; isNew: boolean },
): string {
  const tRef = Math.min(t.w, t.h)
  const cx = t.x + t.w / 2, cy = t.y + t.h / 2

  // Couleurs selon statut
  const fills: Record<string, string> = {
    free:           'rgba(68,128,216,.10)',
    reserved:       'rgba(68,128,216,.22)',
    arrived:        'rgba(60,200,112,.22)',
    blocked:        'rgba(100,116,139,.15)',
    combo_partial:  'rgba(144,96,224,.18)',
    held:           'rgba(232,165,48,.12)',
  }
  const strokes: Record<string, string> = {
    free:           'rgba(68,128,216,.40)',
    reserved:       'rgba(68,128,216,.75)',
    arrived:        'rgba(60,200,112,.75)',
    blocked:        'rgba(100,116,139,.40)',
    combo_partial:  'rgba(144,96,224,.55)',
    held:           'rgba(232,165,48,.55)',
  }
  const textCols: Record<string, string> = {
    free:           'rgba(68,128,216,.7)',
    reserved:       '#4480d8',
    arrived:        '#3cc870',
    blocked:        'rgba(100,116,139,.5)',
    combo_partial:  'rgba(144,96,224,.7)',
    held:           '#e8a530',
  }

  const fill = fills[status] || fills.free
  const stroke = isSelected ? '#facc15' : (strokes[status] || strokes.free)
  const tcol = textCols[status] || textCols.free
  const sw = isSelected ? tRef * 0.12 : tRef * 0.07

  let s = `<g data-table="${t.id}" style="cursor:pointer">`

  // Shape
  if (['round', 'round_sm', 'round_lg'].includes(t.shape)) {
    const r = t.h / 2
    s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
  } else if (t.shape === 'oval') {
    s += `<ellipse cx="${cx}" cy="${cy}" rx="${t.w/2}" ry="${t.h/2}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
  } else if (t.shape === 'bar') {
    const bh = t.h * 0.5, by = t.y + (t.h - bh) / 2
    s += `<rect x="${t.x}" y="${by}" width="${t.w}" height="${bh}" rx="1" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
  } else {
    const rxv = t.shape === 'square' || t.shape === 'square_sm' ? 2.5 : 1.5
    s += `<rect x="${t.x}" y="${t.y}" width="${t.w}" height="${t.h}" rx="${rxv}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
  }

  // Blocked hatch
  if (status === 'blocked') {
    s += `<line x1="${t.x}" y1="${t.y}" x2="${t.x+t.w}" y2="${t.y+t.h}" stroke="rgba(100,116,139,.25)" stroke-width="0.5"/>`
    s += `<line x1="${t.x+t.w}" y1="${t.y}" x2="${t.x}" y2="${t.y+t.h}" stroke="rgba(100,116,139,.25)" stroke-width="0.5"/>`
  }

  // Held lock icon
  if (status === 'held') {
    s += `<text x="${cx}" y="${(cy - tRef*0.05).toFixed(2)}" text-anchor="middle" dominant-baseline="central" font-size="${(tRef*0.25).toFixed(1)}" style="pointer-events:none">🔒</text>`
  }

  // Selection glow
  if (isSelected) {
    if (['round', 'round_sm', 'round_lg'].includes(t.shape))
      s += `<circle cx="${cx}" cy="${cy}" r="${t.h/2 + tRef*0.08}" fill="none" stroke="#facc15" stroke-width="${tRef*0.1}" opacity="0.3"/>`
    else
      s += `<rect x="${t.x - tRef*0.05}" y="${t.y - tRef*0.05}" width="${t.w + tRef*0.1}" height="${t.h + tRef*0.1}" rx="3" fill="none" stroke="#facc15" stroke-width="${tRef*0.1}" opacity="0.3"/>`
  }

  const fsN = (tRef * 0.25).toFixed(1)

  if (resaInfo) {
    // Table occupée — afficher nom + heure
    const fsName = (tRef * 0.18).toFixed(1)
    const fsCov  = (tRef * 0.15).toFixed(1)
    s += `<text x="${cx}" y="${(cy - tRef*0.22).toFixed(2)}" text-anchor="middle" dominant-baseline="central" font-size="${fsN}" font-family="DM Mono,monospace" font-weight="800" fill="${tcol}" style="pointer-events:none">${t.n}</text>`
    // Nom client (tronqué)
    const maxChars = Math.max(4, Math.floor(t.w / 1.8))
    const shortName = resaInfo.name.length > maxChars ? resaInfo.name.slice(0, maxChars - 1) + '…' : resaInfo.name
    s += `<text x="${cx}" y="${(cy + tRef*0.08).toFixed(2)}" text-anchor="middle" dominant-baseline="central" font-size="${fsName}" font-family="DM Mono,monospace" font-weight="600" fill="${tcol}" opacity=".85" style="pointer-events:none">${shortName}</text>`
    // Couverts + heure
    s += `<text x="${cx}" y="${(cy + tRef*0.30).toFixed(2)}" text-anchor="middle" dominant-baseline="central" font-size="${fsCov}" font-family="DM Mono,monospace" fill="${tcol}" opacity=".6" style="pointer-events:none">${resaInfo.covers}p · ${resaInfo.time}</text>`
    // Badges top-right : VIP ⭐ Allergie ⚠ Bébé 👶 PMR ♿ Combo 🔗
    const badges: string[] = []
    if (resaInfo.isNew) badges.push('🆕')
    if (resaInfo.vip) badges.push('⭐')
    if (resaInfo.allergie) badges.push('⚠')
    if (resaInfo.bebe > 0) badges.push('👶')
    if (resaInfo.pmr > 0) badges.push('♿')
    if (resaInfo.isCombo) badges.push('🔗')
    if (badges.length > 0) {
      s += `<text x="${(t.x + t.w - tRef*0.08).toFixed(2)}" y="${(t.y + tRef*0.15).toFixed(2)}" text-anchor="end" font-size="${(tRef*0.16).toFixed(1)}" style="pointer-events:none">${badges.join('')}</text>`
    }
    // Status icon top-left
    s += `<text x="${(t.x + tRef*0.1).toFixed(2)}" y="${(t.y + tRef*0.15).toFixed(2)}" font-size="${(tRef*0.18).toFixed(1)}" style="pointer-events:none">${resaInfo.statusIcon}</text>`
  } else {
    // Table libre — numéro + capacité
    s += `<text x="${cx}" y="${(cy - tRef*0.1).toFixed(2)}" text-anchor="middle" dominant-baseline="central" font-size="${fsN}" font-family="DM Mono,monospace" font-weight="800" fill="${tcol}" style="pointer-events:none">${t.n}</text>`
    s += `<text x="${cx}" y="${(cy + tRef*0.2).toFixed(2)}" text-anchor="middle" font-size="${(tRef*0.17).toFixed(1)}" font-family="DM Mono,monospace" fill="${tcol}" opacity=".45" style="pointer-events:none">${t.capMax}p</text>`
  }

  return s + '</g>'
}

/** Combo fusion border (simplified) */
function planComboSvg(combo: Combo, tables: Table[]): string {
  const ctbls = combo.tables.map(id => tables.find(t => t.id === id)).filter(Boolean) as Table[]
  if (ctbls.length < 2) return ''
  const lx = Math.min(...ctbls.map(t => t.x))
  const ly = Math.min(...ctbls.map(t => t.y))
  const lw = Math.max(...ctbls.map(t => t.x + t.w)) - lx
  const lh = Math.max(...ctbls.map(t => t.y + t.h)) - ly
  return `<g style="pointer-events:none"><rect x="${lx-1}" y="${ly-1}" width="${lw+2}" height="${lh+2}" rx="3" fill="none" stroke="rgba(144,96,224,.35)" stroke-width="0.8"/></g>`
}

// ══════════════════════════════════════════════════
//  RÉASSIGNATION — RÈGLE D'OR : JAMAIS SUPPRIMER
// ══════════════════════════════════════════════════

export interface OrphanResa {
  resa: Resa
  reason: string            // pourquoi orpheline
  autoTarget: string | null // suggestion IA
}

/**
 * Détecte les réservations orphelines :
 * - tbl pointe vers une table supprimée
 * - tbl pointe vers une table dont la capacité est insuffisante
 * - tbl pointe vers un combo supprimé
 * Propose une réassignation auto via iaPlacement.
 */
export function detectOrphans(
  resas: Resa[], tables: Table[], combos: Combo[],
  date: string, svc: string,
): OrphanResa[] {
  const orphans: OrphanResa[] = []
  const svcResas = resas.filter(r => r.date === date && r.svc === svc && isOccupying(r))

  for (const r of svcResas) {
    if (!r.tbl) continue // pas encore assignée

    let reason = ''

    if (r.tbl.includes('+')) {
      // Combo — vérifier que le combo existe toujours
      const combo = combos.find(c => c.label === r.tbl ||
        c.tables.map(id => tables.find(t => t.id === id)?.n).filter(Boolean).join('+') === r.tbl)
      if (!combo) {
        reason = `Combo "${r.tbl}" supprimé`
      } else {
        const cap = combo.capOverride ?? combo.cap
        if (cap < r.c) reason = `Combo "${r.tbl}" capacité réduite (${cap}p < ${r.c}p)`
      }
    } else {
      // Table simple
      const tbl = tables.find(t => t.n === r.tbl)
      if (!tbl) {
        reason = `Table "${r.tbl}" supprimée`
      } else if (!tbl.active) {
        reason = `Table "${r.tbl}" désactivée`
      } else if (tbl.capMax < r.c) {
        reason = `Table "${r.tbl}" capacité réduite (${tbl.capMax}p < ${r.c}p)`
      }
    }

    if (reason) {
      const autoTarget = iaPlacement(r.c, date, svc, tables, combos, resas, undefined, r.id)
      orphans.push({ resa: r, reason, autoTarget })
    }
  }
  return orphans
}

/**
 * Réassigne automatiquement toutes les orphelines qui ont un autoTarget.
 * Retourne le nombre de resas réassignées.
 */
export function autoReassign(
  orphans: OrphanResa[],
  updateResa: (id: string, patch: Partial<Resa>) => void,
): number {
  let count = 0
  for (const o of orphans) {
    if (o.autoTarget) {
      updateResa(o.resa.id, { tbl: o.autoTarget })
      count++
    }
  }
  return count
}

// ══════════════════════════════════════════════════
//  Composant principal
// ══════════════════════════════════════════════════

export function Plan() {
  const {
    resas, tables, combos, services, salles, roomItems,
    activeDate, setActiveDate,
    updateResa, setResaStatus,
  } = useAppStore()
  const { toast } = useToast()
  const { t } = useT()
  const navigate = useNavigate()

  const [salle, setSalle] = useState('')
  const [svcFilter, setSvcFilter] = useState('')
  const [search, setSearch] = useState('')
  const [showOrphans, setShowOrphans] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)

  // Init salle
  const activeSalles = useMemo(() =>
    (salles || []).filter((s: any) => s.active).sort((a: any, b: any) => (a.priority || 99) - (b.priority || 99)),
  [salles])

  useEffect(() => {
    if (!salle && activeSalles.length > 0) setSalle(activeSalles[0].name)
  }, [activeSalles])

  // Init service filter
  const activeServices = useMemo(() =>
    (services || []).filter((s: Service) => s.active),
  [services])

  useEffect(() => {
    if (!svcFilter && activeServices.length > 0) {
      const now = nowMins()
      const cur = activeServices.find(s => timeToMins(s.open) <= now && now <= timeToMins(s.close))
      setSvcFilter(cur?.name?.toLowerCase() || activeServices[0]?.name?.toLowerCase() || '')
    }
  }, [activeServices])

  // Canvas size
  const canvasW = 120, canvasH = 80

  // Resas for current date + service
  const filteredResas = useMemo(() =>
    resas.filter(r => r.date === activeDate && (!svcFilter || r.svc === svcFilter)),
  [resas, activeDate, svcFilter])

  // Tables in current salle — filtered by search
  const salleTables = useMemo(() => {
    const q = search.trim().toLowerCase()
    return tables.filter(t => {
      if (t.salle !== salle) return false
      if (!q) return true
      // Search matches table name OR reservation client name
      if (t.n.toLowerCase().includes(q)) return true
      const resa = filteredResas.find(r => isOccupying(r) && r.tbl && tblMatchesTable(r.tbl, t.n))
      if (resa && (resa.n?.toLowerCase().includes(q) || resa.nom?.toLowerCase().includes(q) || resa.prenom?.toLowerCase().includes(q))) return true
      return false
    })
  }, [tables, salle, search, filteredResas])

  // Room items for current salle
  const salleRoomItems = useMemo(() =>
    (roomItems || []).filter((ri: RoomItem) => ri.salle === salle),
  [roomItems, salle])

  // Occupied table names
  // occupiedMap: si deux résas sur la même table, prioriser 'arrived' > 'reserved'
  const occupiedMap = useMemo(() => {
    const map: Record<string, Resa> = {}
    const prio = (s: string) => s === 'arrived' ? 2 : s === 'reserved' ? 1 : 0
    for (const r of filteredResas) {
      if (!isOccupying(r) || !r.tbl) continue
      const names = r.tbl.includes('+') ? r.tbl.split('+').map(s => s.trim()) : [r.tbl]
      for (const tn of names) {
        const existing = map[tn]
        if (!existing || prio(r.s) > prio(existing.s)) {
          map[tn] = r
        }
      }
    }
    return map
  }, [filteredResas])

  // Orphans detection
  const orphans = useMemo(() =>
    detectOrphans(resas, tables, combos, activeDate, svcFilter),
  [resas, tables, combos, activeDate, svcFilter])

  // ── Stats ──────────────────────────────────────
  const stats = useMemo(() => {
    const svcR = filteredResas.filter(r => isOccupying(r))
    const totalCovers = svcR.reduce((s, r) => s + r.c, 0)
    const totalResas = svcR.length
    const totalFree = salleTables.filter(t => t.active && !t.blocked && !occupiedMap[t.n]).length
    const totalTables = salleTables.filter(t => t.active).length
    return { totalResas, totalCovers, totalFree, totalTables }
  }, [filteredResas, salleTables, occupiedMap])

  // Free tables for manual reassignment
  const freeTables = useMemo(() =>
    getFreeTables(tables, resas, activeDate, svcFilter),
  [tables, resas, activeDate, svcFilter])

  const freeCombos = useMemo(() =>
    getFreeCombos(combos, tables, resas, activeDate, svcFilter),
  [combos, tables, resas, activeDate, svcFilter])

  // ── SVG Render ─────────────────────────────────
  const renderPlan = useCallback(() => {
    const svg = svgRef.current
    if (!svg) return
    let h = ''

    h += `<rect x="0" y="0" width="${canvasW}" height="${canvasH}" fill="rgba(0,0,0,0.001)" pointer-events="all"/>`
    h += `<defs><pattern id="pl-dot" width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="0" cy="0" r="0.2" fill="rgba(68,128,216,.1)"/></pattern></defs>`
    h += `<rect x="0" y="0" width="${canvasW}" height="${canvasH}" fill="url(#pl-dot)" pointer-events="none"/>`

    // Room items (decorative objects — behind everything)
    for (const ri of salleRoomItems) {
      h += `<g style="pointer-events:none">${spRoomBodySvg(ri)}</g>`
    }

    // Combo borders (behind tables)
    combos.filter(c => c.tables.some(tid => salleTables.find(t => t.id === tid)))
      .forEach(c => { h += planComboSvg(c, tables) })

    // Tables
    for (const t of salleTables) {
      const resa = occupiedMap[t.n]
      let status: 'free' | 'reserved' | 'arrived' | 'blocked' | 'combo_partial' | 'held' = 'free'
      let resaInfo: Parameters<typeof planTableSvg>[3] = undefined

      if (t.blocked) {
        status = 'blocked'
      } else if (t.held && !resa) {
        status = 'held'
      } else if (resa) {
        status = resa.s === 'arrived' ? 'arrived' : 'reserved'
        resaInfo = {
          name: resa.nom || resa.n?.split(' ')[0] || '?',
          covers: resa.c,
          time: resa.t,
          statusIcon: STATUS[resa.s]?.icon || '',
          vip: resa.statut === 2,
          allergie: !!resa.allergie,
          bebe: resa.bebe || 0,
          pmr: resa.pmr || 0,
          isCombo: !!(resa.tbl && resa.tbl.includes('+')),
          isNew: (Date.now() - resa.createdAt) < 15 * 60 * 1000,
        }
      }

      // Search highlight
      const isHighlighted = search.trim() !== '' && (
        t.n.toLowerCase().includes(search.trim().toLowerCase()) ||
        (resa && (resa.n?.toLowerCase().includes(search.trim().toLowerCase()) || resa.nom?.toLowerCase().includes(search.trim().toLowerCase())))
      )

      h += planTableSvg(t, status, !!isHighlighted, resaInfo)
    }

    svg.innerHTML = h
  }, [salleTables, salleRoomItems, occupiedMap, tables, combos, search])

  useEffect(() => { renderPlan() }, [renderPlan, salle, filteredResas, search])

  // ── Click handling ─────────────────────────────
  // Clic sur table occupée → ouvre modale résa dans /reservations
  // Clic sur table libre → ouvre nouvelle résa pré-remplie
  const handleSvgClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as Element
    const tblEl = target.closest('[data-table]')
    if (!tblEl) return

    const id = tblEl.getAttribute('data-table')!
    const tbl = tables.find(t => t.id === id)
    if (!tbl) return

    const resa = occupiedMap[tbl.n]
    if (resa) {
      // Table occupée → ouvrir la modale d'édition dans Journal
      navigate(`/reservations?edit=${resa.id}&from=plan`)
    } else if (!tbl.blocked) {
      // Table libre → nouvelle résa pré-remplie
      navigate(`/reservations?new=1&table=${tbl.n}&mode=manuel&from=plan`)
    }
  }, [tables, occupiedMap, navigate])

  // ── Auto-réassignation ─────────────────────────
  const handleAutoReassign = () => {
    const count = autoReassign(orphans, updateResa)
    if (count > 0) toast(`${count} résa(s) réassignée(s) ✓`, 'success')
    else toast('Aucune réassignation automatique possible', 'warning')
  }

  const handleManualReassign = (resaId: string, newTbl: string) => {
    updateResa(resaId, { tbl: newTbl })
    toast(`Résa réassignée → ${newTbl} ✓`, 'success')
  }

  // Salle filter handler — switches the SVG salle
  const handleSalleFilter = (name: string) => {
    setSalle(name)
  }

  // ── Render ─────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--hh))', overflow: 'hidden' }}>

      {/* ViewToolbar — uniforme avec Grille et Journal */}
      <ViewToolbar
        title="Plan de salle"
        subtitle={`${stats.totalResas} résas · ${stats.totalCovers} cvts · ${stats.totalFree}/${stats.totalTables} libres`}
        serviceFilter={svcFilter}
        onServiceFilter={setSvcFilter}
        salleFilter={salle}
        onSalleFilter={handleSalleFilter}
        search={search}
        onSearch={setSearch}
        onNewResa={() => navigate('/reservations?new=1&from=plan')}
        hideAllFilter
      >
        {/* Orphan alert — inside toolbar */}
        {orphans.length > 0 && (
          <div style={{ padding: '0 16px 6px' }}>
            <button onClick={() => setShowOrphans(true)}
              style={{ fontSize: 11, padding: '4px 12px', border: '1px solid rgba(220,80,80,.4)', borderRadius: 6, cursor: 'pointer',
                background: 'rgba(220,80,80,.12)', color: 'var(--rd)', fontWeight: 700, animation: 'pulse 2s infinite' }}>
              ⚠ {orphans.length} résa(s) à réassigner
            </button>
          </div>
        )}
      </ViewToolbar>

      {/* SVG Plan — pleine largeur, pas de colonne droite */}
      <div style={{ flex: 1, minWidth: 0, background: 'var(--surf2)', overflow: 'auto', position: 'relative' }}>
        <svg ref={svgRef}
          viewBox={`0 0 ${canvasW} ${canvasH}`}
          style={{ width: '100%', height: '100%' }}
          onClick={handleSvgClick}
          preserveAspectRatio="xMidYMid meet" />

        {/* Légende en bas */}
        <div style={{ position: 'absolute', bottom: 8, left: 8, display: 'flex', gap: 10, fontSize: 10, fontFamily: 'DM Mono,monospace', opacity: .7 }}>
          <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: 'rgba(68,128,216,.22)', border: '1px solid rgba(68,128,216,.6)', marginRight: 3 }} />Réservée</span>
          <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: 'rgba(60,200,112,.22)', border: '1px solid rgba(60,200,112,.6)', marginRight: 3 }} />Arrivée</span>
          <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: 'rgba(68,128,216,.10)', border: '1px solid rgba(68,128,216,.3)', marginRight: 3 }} />Libre</span>
          <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: 'rgba(100,116,139,.15)', border: '1px solid rgba(100,116,139,.3)', marginRight: 3 }} />Bloquée</span>
          <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: 'rgba(232,165,48,.12)', border: '1px solid rgba(232,165,48,.4)', marginRight: 3 }} />Réserve</span>
        </div>
      </div>

      {/* ── Modal réassignation ── */}
      {showOrphans && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowOrphans(false)}>
          <div style={{ background: 'var(--surf)', borderRadius: 12, padding: 20, maxWidth: 540, width: '90vw', maxHeight: '80vh', overflow: 'auto', border: '2px solid rgba(220,80,80,.3)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--rd)', marginBottom: 4 }}>⚠ Réservations à réassigner</div>
            <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 12, lineHeight: 1.5 }}>
              Des modifications dans l'éditeur de plan ont rendu certaines tables indisponibles.
              <br /><strong style={{ color: 'var(--text)' }}>Les réservations ne sont JAMAIS supprimées</strong> — elles doivent être réassignées.
            </div>

            <button onClick={handleAutoReassign}
              style={{ width: '100%', padding: 10, fontSize: 12, fontWeight: 700, border: '1px solid rgba(68,128,216,.4)', borderRadius: 8, background: 'rgba(68,128,216,.12)', color: 'var(--bl)', cursor: 'pointer', marginBottom: 12 }}>
              🤖 Réassigner automatiquement ({orphans.filter(o => o.autoTarget).length}/{orphans.length} possibles)
            </button>

            {orphans.map(o => (
              <div key={o.resa.id} style={{ padding: 10, borderRadius: 8, border: '1px solid rgba(220,80,80,.2)', background: 'rgba(220,80,80,.05)', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{o.resa.n || `${o.resa.prenom} ${o.resa.nom}`}</span>
                  <span style={{ fontSize: 11, color: 'var(--t3)' }}>{o.resa.c}p · {o.resa.t}</span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--rd)', marginBottom: 6 }}>{o.reason}</div>

                {o.autoTarget ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10, color: 'var(--t4)' }}>Suggestion IA :</span>
                    <button onClick={() => { handleManualReassign(o.resa.id, o.autoTarget!); setShowOrphans(false) }}
                      style={{ fontSize: 11, padding: '3px 10px', border: '1px solid rgba(60,200,112,.4)', borderRadius: 4, background: 'rgba(60,200,112,.1)', color: 'var(--gn)', fontWeight: 700, cursor: 'pointer' }}>
                      → {o.autoTarget}
                    </button>
                  </div>
                ) : (
                  <div style={{ marginTop: 4 }}>
                    <div style={{ fontSize: 10, color: 'var(--am)', marginBottom: 4 }}>Aucune table compatible — réassignation manuelle :</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                      {freeTables.filter(ft => ft.active && !ft.blocked).map(ft => (
                        <button key={ft.id} onClick={() => { handleManualReassign(o.resa.id, ft.n); setShowOrphans(false) }}
                          style={{ fontSize: 10, padding: '2px 6px', border: '1px solid var(--border)', borderRadius: 3, background: 'var(--surf2)', color: ft.capMax >= o.resa.c ? 'var(--bl)' : 'var(--rd)', cursor: 'pointer', opacity: ft.capMax >= o.resa.c ? 1 : .5 }}>
                          {ft.n} ({ft.capMax}p)
                        </button>
                      ))}
                      {freeCombos.map(fc => (
                        <button key={fc.id} onClick={() => { handleManualReassign(o.resa.id, fc.label); setShowOrphans(false) }}
                          style={{ fontSize: 10, padding: '2px 6px', border: '1px solid rgba(144,96,224,.3)', borderRadius: 3, background: 'rgba(144,96,224,.08)', color: 'rgba(144,96,224,.8)', cursor: 'pointer' }}>
                          {fc.label} ({fc.cap}p)
                        </button>
                      ))}
                      {freeTables.length === 0 && freeCombos.length === 0 && (
                        <span style={{ fontSize: 10, color: 'var(--t4)', fontStyle: 'italic' }}>Aucune table libre</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            <button onClick={() => setShowOrphans(false)}
              style={{ marginTop: 8, width: '100%', padding: 8, fontSize: 11, fontWeight: 700, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surf2)', color: 'var(--t3)', cursor: 'pointer' }}>
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
