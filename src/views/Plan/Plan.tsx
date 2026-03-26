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
import { createPortal } from 'react-dom'
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
import { spRoomBodySvg, spChairsSvg } from '../../utils/roomItemSvg'
import type { Table, Combo, Resa, Service, RoomItem } from '../../types'

// ── Constantes ────────────────────────────────────
const CANVAS_SIZES: Record<string, { w: number; h: number }> = {}

// ── Helpers SVG (reprise simplifiée de SetupPlan) ─

function spSnap(v: number) { return Math.round(v) }

/**
 * Table SVG — REPRODUCTION IDENTIQUE AU STYLE ÉDITEUR (SetupPlan)
 * Ordre de rendu : chaises → ombre 3D → forme → basse → sélection → textes → badges
 */
function planTableSvg(
  t: Table,
  status: 'free' | 'reserved' | 'arrived' | 'blocked' | 'combo_partial' | 'held',
  isSelected: boolean,
  resaInfo?: { name: string; covers: number; time: string; statusIcon: string; vip: boolean; allergie: boolean; bebe: number; pmr: number; isCombo: boolean; isNew: boolean; isIA: boolean; canal?: string },
  isInOccupiedCombo?: boolean,
): string {
  const tRef = Math.min(t.w, t.h)
  const cx = t.x + t.w / 2, cy = t.y + t.h / 2

  // Couleurs selon statut — identiques éditeur mais modulées par occupation
  const fills: Record<string, string> = {
    free:           'rgba(68,128,216,.11)',
    reserved:       'rgba(68,128,216,.22)',
    arrived:        'rgba(60,200,112,.22)',
    blocked:        'rgba(100,116,139,.15)',
    combo_partial:  'rgba(144,96,224,.18)',
    held:           'rgba(232,165,48,.12)',
  }
  const strokes: Record<string, string> = {
    free:           'rgba(68,128,216,.45)',
    reserved:       'rgba(68,128,216,.75)',
    arrived:        'rgba(60,200,112,.75)',
    blocked:        'rgba(100,116,139,.40)',
    combo_partial:  'rgba(144,96,224,.55)',
    held:           'rgba(232,165,48,.55)',
  }
  const textCols: Record<string, string> = {
    free:           '#4480d8',
    reserved:       '#4480d8',
    arrived:        '#3cc870',
    blocked:        'rgba(100,116,139,.5)',
    combo_partial:  'rgba(144,96,224,.7)',
    held:           '#e8a530',
  }

  const fill = fills[status] || fills.free
  const stroke = isSelected ? '#facc15' : (strokes[status] || strokes.free)
  const tcol = textCols[status] || textCols.free
  const sw = isSelected ? tRef * 0.125 : tRef * 0.067

  let s = `<g data-table="${t.id}" style="cursor:pointer">`

  // ── 1. Chaises DERRIÈRE la table (identique éditeur) ──
  const chairFill = status === 'arrived' ? 'rgba(60,200,112,.18)'
    : status === 'held' ? 'rgba(232,165,48,.10)'
    : 'rgba(68,128,216,.13)'
  const chairStroke = status === 'arrived' ? 'rgba(60,200,112,.45)'
    : status === 'held' ? 'rgba(232,165,48,.28)'
    : 'rgba(68,128,216,.32)'
  if (!t.blocked) s += spChairsSvg(t, chairFill, chairStroke)

  // ── 2. Ombre 3D pour tables hautes (identique éditeur) ──
  const isHaute = t.tableH === 'haute'
  const isBasse = t.tableH === 'basse'
  if (isHaute) {
    const ex = tRef * 0.117
    if (['round', 'round_sm', 'round_lg'].includes(t.shape))
      s += `<circle cx="${cx+ex}" cy="${cy+ex}" r="${t.h/2+0.3}" fill="rgba(68,128,216,.18)"/>`
    else if (t.shape === 'oval')
      s += `<ellipse cx="${cx+ex}" cy="${cy+ex}" rx="${t.w/2+0.3}" ry="${t.h/2+0.3}" fill="rgba(68,128,216,.18)"/>`
    else
      s += `<rect x="${t.x+ex}" y="${t.y+ex}" width="${t.w+0.3}" height="${t.h+0.3}" rx="3" fill="rgba(68,128,216,.18)"/>`
  }

  // ── 3. Forme de la table (toutes les shapes identiques éditeur) ──
  if (['round', 'round_sm', 'round_lg'].includes(t.shape)) {
    const r = t.h / 2
    s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
    if (isBasse) s += `<circle cx="${cx}" cy="${cy}" r="${(r - tRef*0.10).toFixed(2)}" fill="none" stroke="${stroke}" stroke-width="${(tRef*0.037).toFixed(2)}" stroke-dasharray="1.5,1"/>`
  } else if (t.shape === 'oval') {
    const rxe = t.w / 2, rye = t.h / 2
    s += `<ellipse cx="${cx}" cy="${cy}" rx="${rxe}" ry="${rye}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
    if (isBasse) s += `<ellipse cx="${cx}" cy="${cy}" rx="${(rxe - tRef*0.10).toFixed(2)}" ry="${(rye - tRef*0.083).toFixed(2)}" fill="none" stroke="${stroke}" stroke-width="${(tRef*0.037).toFixed(2)}" stroke-dasharray="1.5,1"/>`
  } else if (t.shape === 'banquette') {
    s += `<rect x="${t.x}" y="${t.y}" width="${t.w}" height="${t.h}" rx="1.5" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
    if (isBasse) s += `<rect x="${(t.x+tRef*0.10).toFixed(2)}" y="${(t.y+tRef*0.083).toFixed(2)}" width="${(t.w-tRef*0.20).toFixed(2)}" height="${(t.h-tRef*0.167).toFixed(2)}" rx="1" fill="none" stroke="${stroke}" stroke-width="${(tRef*0.037).toFixed(2)}" stroke-dasharray="1.5,1"/>`
  } else if (t.shape === 'bar') {
    const bh = t.h * 0.5, by = t.y + (t.h - bh) / 2
    s += `<rect x="${t.x}" y="${by}" width="${t.w}" height="${bh}" rx="1" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
  } else {
    // rect, square, square_sm, rect_lg
    const rxv = t.shape === 'square' || t.shape === 'square_sm' ? 2.5 : 1.5
    s += `<rect x="${t.x}" y="${t.y}" width="${t.w}" height="${t.h}" rx="${rxv}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
    if (isBasse) s += `<rect x="${(t.x+tRef*0.10).toFixed(2)}" y="${(t.y+tRef*0.083).toFixed(2)}" width="${(t.w-tRef*0.20).toFixed(2)}" height="${(t.h-tRef*0.167).toFixed(2)}" rx="${rxv-0.5}" fill="none" stroke="${stroke}" stroke-width="${(tRef*0.037).toFixed(2)}" stroke-dasharray="1.5,1"/>`
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

  // ── 4. Selection glow (identique éditeur) ──
  if (isSelected) {
    if (['round', 'round_sm', 'round_lg'].includes(t.shape))
      s += `<circle cx="${cx}" cy="${cy}" r="${(t.h/2 + tRef*0.075).toFixed(2)}" fill="none" stroke="#facc15" stroke-width="${(tRef*0.10).toFixed(2)}" opacity="0.3"/>`
    else if (t.shape === 'oval')
      s += `<ellipse cx="${cx}" cy="${cy}" rx="${(t.w/2 + tRef*0.067).toFixed(2)}" ry="${(t.h/2 + tRef*0.067).toFixed(2)}" fill="none" stroke="#facc15" stroke-width="${(tRef*0.10).toFixed(2)}" opacity="0.3"/>`
    else
      s += `<rect x="${(t.x - tRef*0.05).toFixed(2)}" y="${(t.y - tRef*0.05).toFixed(2)}" width="${(t.w + tRef*0.10).toFixed(2)}" height="${(t.h + tRef*0.10).toFixed(2)}" rx="3" fill="none" stroke="#facc15" stroke-width="${(tRef*0.10).toFixed(2)}" opacity="0.3"/>`
  }

  // ── 5. Textes — positions identiques éditeur ──
  const fsN = (tRef * 0.25).toFixed(1)
  const fsC = (tRef * 0.167).toFixed(1)

  if (isInOccupiedCombo) {
    // Combo occupé — pas de texte individuel (géré par planComboSvg)
    // Juste le numéro de table discret
    s += `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-size="${(tRef*0.18).toFixed(1)}" font-family="DM Mono,monospace" font-weight="700" fill="${tcol}" opacity=".4" style="pointer-events:none">${t.n}</text>`
  } else if (resaInfo) {
    // Table occupée (solo) — numéro + nom + couverts/heure
    s += `<text x="${cx}" y="${(cy - tRef*0.22).toFixed(2)}" text-anchor="middle" dominant-baseline="central" font-size="${fsN}" font-family="DM Mono,monospace" font-weight="800" fill="${tcol}" style="pointer-events:none">${t.n}</text>`
    const maxChars = Math.max(4, Math.floor(t.w / 1.8))
    const shortName = resaInfo.name.length > maxChars ? resaInfo.name.slice(0, maxChars - 1) + '…' : resaInfo.name
    s += `<text x="${cx}" y="${(cy + tRef*0.08).toFixed(2)}" text-anchor="middle" dominant-baseline="central" font-size="${(tRef*0.18).toFixed(1)}" font-family="DM Mono,monospace" font-weight="600" fill="${tcol}" opacity=".85" style="pointer-events:none">${shortName}</text>`
    s += `<text x="${cx}" y="${(cy + tRef*0.30).toFixed(2)}" text-anchor="middle" dominant-baseline="central" font-size="${(tRef*0.15).toFixed(1)}" font-family="DM Mono,monospace" fill="${tcol}" opacity=".6" style="pointer-events:none">${resaInfo.covers}p · ${resaInfo.time}</text>`

    // Badges au-dessus des chaises
    const badges: string[] = []
    if (resaInfo.isNew) badges.push('🆕')
    if (resaInfo.isIA) badges.push('🤖')
    if (resaInfo.vip) badges.push('⭐')
    if (resaInfo.allergie) badges.push('⚠')
    if (resaInfo.bebe > 0) badges.push('👶')
    if (resaInfo.pmr > 0) badges.push('♿')
    if (resaInfo.isCombo) badges.push('🔗')
    const canalIcons: Record<string, string> = { telephone:'📞', walkin:'🚶', widget:'🌐', google:'🔍', email:'✉️' }
    if (resaInfo.canal && canalIcons[resaInfo.canal]) badges.push(canalIcons[resaInfo.canal])
    if (badges.length > 0) {
      s += `<text x="${cx}" y="${(t.y - tRef*0.25).toFixed(2)}" text-anchor="middle" font-size="${(tRef*0.14).toFixed(1)}" style="pointer-events:none">${badges.join('')}</text>`
    }
    // Status icon
    s += `<text x="${(t.x + tRef*0.1).toFixed(2)}" y="${(t.y + tRef*0.15).toFixed(2)}" font-size="${(tRef*0.18).toFixed(1)}" style="pointer-events:none">${resaInfo.statusIcon}</text>`
  } else {
    // Table libre — numéro + capacité (même positions que éditeur)
    s += `<text x="${cx}" y="${(cy - tRef*0.108).toFixed(2)}" text-anchor="middle" dominant-baseline="central" font-size="${fsN}" font-family="DM Mono,monospace" font-weight="800" fill="${tcol}" style="pointer-events:none">${t.n}</text>`
    s += `<text x="${cx}" y="${(cy + tRef*0.208).toFixed(2)}" text-anchor="middle" font-size="${fsC}" font-family="DM Mono,monospace" fill="${tcol}" opacity=".45" style="pointer-events:none">${t.capMax}p</text>`
  }

  // ── 6. Badge hauteur H/B (identique éditeur) ──
  if (isHaute) s += `<text x="${(t.x + tRef*0.083).toFixed(2)}" y="${(t.y+t.h - tRef*0.067).toFixed(2)}" dominant-baseline="auto" font-size="${fsC}" font-family="DM Mono,monospace" font-weight="800" fill="${tcol}" opacity=".6" style="pointer-events:none">H</text>`
  if (isBasse) s += `<text x="${(t.x + tRef*0.083).toFixed(2)}" y="${(t.y+t.h - tRef*0.067).toFixed(2)}" dominant-baseline="auto" font-size="${fsC}" font-family="DM Mono,monospace" font-weight="800" fill="${tcol}" opacity=".6" style="pointer-events:none">B</text>`

  return s + '</g>'
}

/** Combo fusion border — avec infos résa centralisées quand occupé */
function planComboSvg(
  combo: Combo, tables: Table[], comboResa: Resa | null,
): string {
  const ctbls = combo.tables.map(id => tables.find(t => t.id === id)).filter(Boolean) as Table[]
  if (ctbls.length < 2) return ''

  const lx  = Math.min(...ctbls.map(t => t.x))
  const ly  = Math.min(...ctbls.map(t => t.y))
  const lx2 = Math.max(...ctbls.map(t => t.x + t.w))
  const ly2 = Math.max(...ctbls.map(t => t.y + t.h))
  const lw  = lx2 - lx, lh = ly2 - ly
  const lcx = (lx + lx2) / 2, lcy = (ly + ly2) / 2

  const capTxt = `${combo.capOverride ?? combo.cap}p`
  const cRef = ctbls.reduce((sum, t) => sum + Math.min(t.w, t.h), 0) / ctbls.length

  let s = ''

  if (comboResa) {
    // ── Combo occupé — contour plein coloré + infos résa au centre ──
    const isArrived = comboResa.s === 'arrived'
    const borderCol = isArrived ? 'rgba(60,200,112,.7)' : 'rgba(144,96,224,.6)'
    const fillCol   = isArrived ? 'rgba(60,200,112,.06)' : 'rgba(144,96,224,.06)'
    const tcol      = isArrived ? '#3cc870' : '#b482ff'

    // Fond léger sur tout le groupe
    s += `<rect x="${(lx-1).toFixed(1)}" y="${(ly-1).toFixed(1)}" width="${(lw+2).toFixed(1)}" height="${(lh+2).toFixed(1)}" rx="3" fill="${fillCol}" stroke="${borderCol}" stroke-width="1.1"/>`

    // Fond opaque derrière le texte central (masque la jonction entre tables)
    const txtPadX = lw * 0.4, txtPadY = cRef * 0.45
    s += `<rect x="${(lcx - txtPadX).toFixed(1)}" y="${(lcy - txtPadY).toFixed(1)}" width="${(txtPadX*2).toFixed(1)}" height="${(txtPadY*2).toFixed(1)}" rx="2.5" fill="rgba(30,30,42,.6)" style="pointer-events:none"/>`

    // Combo label (T10+T11)
    const fsN = (cRef * 0.24).toFixed(1)
    s += `<text x="${lcx.toFixed(1)}" y="${(lcy - cRef*0.22).toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="${fsN}" font-family="DM Mono,monospace" font-weight="800" fill="${tcol}" style="pointer-events:none">${combo.label}</text>`

    // Nom client
    const clientName = comboResa.nom || comboResa.n?.split(' ')[0] || '?'
    const maxChars = Math.max(6, Math.floor(lw / 1.5))
    const shortName = clientName.length > maxChars ? clientName.slice(0, maxChars - 1) + '…' : clientName
    const fsName = (cRef * 0.18).toFixed(1)
    s += `<text x="${lcx.toFixed(1)}" y="${(lcy + cRef*0.05).toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="${fsName}" font-family="DM Mono,monospace" font-weight="600" fill="${tcol}" opacity=".85" style="pointer-events:none">${shortName}</text>`

    // Couverts + heure
    const fsCov = (cRef * 0.15).toFixed(1)
    s += `<text x="${lcx.toFixed(1)}" y="${(lcy + cRef*0.28).toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="${fsCov}" font-family="DM Mono,monospace" fill="${tcol}" opacity=".6" style="pointer-events:none">${comboResa.c}p · ${comboResa.t}</text>`

    // Badges au-dessus du groupe
    const badges: string[] = []
    if ((Date.now() - comboResa.createdAt) < 15 * 60 * 1000) badges.push('🆕')
    if (comboResa.mode === 'ia') badges.push('🤖')
    if (comboResa.statut === 2) badges.push('⭐')
    if (comboResa.allergie) badges.push('⚠')
    if (comboResa.bebe > 0) badges.push('👶')
    if (comboResa.pmr > 0) badges.push('♿')
    badges.push('🔗') // toujours montrer l'icône combo
    const canalIcons: Record<string, string> = { telephone:'📞', walkin:'🚶', widget:'🌐', google:'🔍', email:'✉️' }
    if (comboResa.canal && canalIcons[comboResa.canal]) badges.push(canalIcons[comboResa.canal])
    if (badges.length > 0) {
      s += `<text x="${lcx.toFixed(1)}" y="${(ly - cRef*0.25).toFixed(1)}" text-anchor="middle" font-size="${(cRef*0.14).toFixed(1)}" style="pointer-events:none">${badges.join('')}</text>`
    }

    // Status icon
    const stIcon = STATUS[comboResa.s]?.icon || ''
    if (stIcon) {
      s += `<text x="${(lx + cRef*0.1).toFixed(1)}" y="${(ly + cRef*0.15).toFixed(1)}" font-size="${(cRef*0.18).toFixed(1)}" style="pointer-events:none">${stIcon}</text>`
    }
  } else {
    // ── Combo libre — contour pointillé + label ──
    const fsN = (cRef * 0.20).toFixed(1)
    s += `<rect x="${(lx-1).toFixed(1)}" y="${(ly-1).toFixed(1)}" width="${(lw+2).toFixed(1)}" height="${(lh+2).toFixed(1)}" rx="3" fill="none" stroke="rgba(180,130,255,.45)" stroke-width="0.9" stroke-dasharray="2.5,1.5"/>`
    // Label en haut
    const labelY = ly - cRef * 0.35
    const lblW = (combo.label.length + capTxt.length + 3) * cRef * 0.11
    const lblH = cRef * 0.28
    s += `<rect x="${(lcx - lblW/2).toFixed(1)}" y="${(labelY - lblH/2).toFixed(1)}" width="${lblW.toFixed(1)}" height="${lblH.toFixed(1)}" rx="2.5" fill="rgba(30,30,42,.7)" stroke="rgba(180,130,255,.35)" stroke-width="0.5"/>`
    s += `<text x="${lcx.toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="${fsN}" font-family="DM Mono,monospace" font-weight="800" fill="rgba(180,130,255,.95)" style="pointer-events:none">${combo.label} · ${capTxt}</text>`
  }

  return `<g style="pointer-events:none">${s}</g>`
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
  const [popup, setPopup] = useState<{ resa: any; x: number; y: number; flip: boolean } | null>(null)
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

    // ── Pré-calcul : tables faisant partie d'un combo avec résa ──
    // Ces tables ne montrent PAS de texte individuel (la résa est affichée au centre du combo)
    const comboResaMap: Record<string, Resa> = {} // combo.id → resa
    const tableInOccupiedCombo = new Set<string>() // table ids dans un combo occupé
    for (const c of combos) {
      if (!c.tables.some(tid => salleTables.find(t => t.id === tid))) continue
      // Trouver la résa assignée à ce combo (tbl contient le label, ex: "T10+T11")
      const comboResa = filteredResas.find(r => isOccupying(r) && r.tbl === c.label)
      if (comboResa) {
        comboResaMap[c.id] = comboResa
        for (const tid of c.tables) tableInOccupiedCombo.add(tid)
      }
    }

    // Combo borders — APRÈS les room items, AVANT les tables
    combos.filter(c => c.tables.some(tid => salleTables.find(t => t.id === tid)))
      .forEach(c => {
        h += planComboSvg(c, tables, comboResaMap[c.id] || null)
      })

    // Tables
    for (const t of salleTables) {
      const isInOccupiedCombo = tableInOccupiedCombo.has(t.id)
      const resa = occupiedMap[t.n]
      let status: 'free' | 'reserved' | 'arrived' | 'blocked' | 'combo_partial' | 'held' = 'free'
      let resaInfo: Parameters<typeof planTableSvg>[3] = undefined

      if (t.blocked) {
        status = 'blocked'
      } else if (t.held && !resa) {
        status = 'held'
      } else if (resa) {
        status = resa.s === 'arrived' ? 'arrived' : 'reserved'
        // Si table dans un combo occupé → pas de texte individuel (géré par planComboSvg)
        if (!isInOccupiedCombo) {
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
            isIA: resa.mode === 'ia',
            canal: resa.canal,
          }
        }
      }

      // Search highlight
      const isHighlighted = search.trim() !== '' && (
        t.n.toLowerCase().includes(search.trim().toLowerCase()) ||
        (resa && (resa.n?.toLowerCase().includes(search.trim().toLowerCase()) || resa.nom?.toLowerCase().includes(search.trim().toLowerCase())))
      )

      h += planTableSvg(t, status, !!isHighlighted, resaInfo, isInOccupiedCombo)
    }

    svg.innerHTML = h
  }, [salleTables, salleRoomItems, occupiedMap, tables, combos, search, filteredResas])

  useEffect(() => { renderPlan() }, [renderPlan, salle, filteredResas, search])

  // ── Click handling ─────────────────────────────
  // Clic sur table occupée → ouvre modale résa dans /reservations
  // Clic sur table libre → ouvre nouvelle résa pré-remplie
  const handleSvgClick = useCallback((e: React.MouseEvent) => {
    // Fermer le popup si on clique ailleurs
    if (popup) { setPopup(null); return }

    const target = e.target as Element
    const tblEl = target.closest('[data-table]')
    if (!tblEl) return

    const id = tblEl.getAttribute('data-table')!
    const tbl = tables.find(t => t.id === id)
    if (!tbl) return

    const resa = occupiedMap[tbl.n]
    if (resa) {
      // Table occupée → popup actions rapides
      const rect = (tblEl as SVGElement).getBoundingClientRect()
      const flip = rect.bottom + 220 > window.innerHeight
      setPopup({ resa, x: rect.left + rect.width / 2, y: flip ? rect.top : rect.bottom, flip })
    } else if (!tbl.blocked) {
      // Table libre → nouvelle résa pré-remplie
      navigate(`/reservations?new=1&table=${tbl.n}&mode=manuel&from=plan`)
    }
  }, [tables, occupiedMap, navigate, popup])

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

      {/* ── Popup actions rapides (clic table occupée) ── */}
      {popup && (() => {
        const r = popup.resa
        const st = STATUS[r.s as keyof typeof STATUS]
        const btnStyle = (col: string): React.CSSProperties => ({
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 12px', border: 'none', borderBottom: '1px solid rgba(255,255,255,.04)',
          background: 'transparent', cursor: 'pointer', textAlign: 'left',
          fontSize: 13, fontWeight: 700, color: col,
        })
        return createPortal(
          <>
            <div onClick={() => setPopup(null)} style={{ position: 'fixed', inset: 0, zIndex: 9998 }} />
            <div onClick={e => e.stopPropagation()} style={{
              position: 'fixed',
              left: Math.min(popup.x - 100, window.innerWidth - 220),
              ...(popup.flip
                ? { bottom: window.innerHeight - popup.y + 8 }
                : { top: popup.y + 8 }),
              zIndex: 9999, minWidth: 200, maxWidth: 260,
              background: 'var(--surf2)', border: `1px solid ${st?.border || 'var(--border)'}`,
              borderRadius: 10, overflow: 'hidden',
              boxShadow: '0 8px 24px rgba(0,0,0,.4)',
            }}>
              {/* En-tête résa */}
              <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,.08)', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {st && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 6, background: st.bg, color: st.hex, border: `1px solid ${st.border}` }}>{st.icon}</span>}
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{r.nom || r.n}</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--t2)', fontFamily: 'var(--fm)' }}>{r.c}p</span>
                  <span style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--fm)' }}>{r.t}</span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 2 }}>{r.tbl}</div>
              </div>
              {/* Actions */}
              <button onClick={() => { setPopup(null); navigate(`/reservations?edit=${r.id}&from=plan`) }} style={btnStyle('#7bb8ff')}>✏️ Modifier</button>
              {(r.s === 'reserved' || r.s === 'arrived') && (
                <button onClick={() => {
                  setPopup(null)
                  const newTbl = prompt(`Réassigner ${r.nom || r.n} (${r.c}p) → nouvelle table :`)
                  if (newTbl && newTbl.trim()) { updateResa(r.id, { tbl: newTbl.trim() }); toast(`Réassigné → ${newTbl.trim()} ✓`, 'success') }
                }} style={btnStyle('#e8a530')}>↔ Réassigner</button>
              )}
              {r.s === 'reserved' && (
                <>
                  <button onClick={() => { setPopup(null); setResaStatus(r.id, 'arrived') }} style={btnStyle('var(--gn)')}>✓ Arrivé</button>
                  <button onClick={() => { setPopup(null); setResaStatus(r.id, 'noshow') }} style={btnStyle('var(--am)')}>👻 No-show</button>
                  <button onClick={() => { setPopup(null); setResaStatus(r.id, 'cancelled') }} style={btnStyle('var(--rd)')}>🚫 Annuler</button>
                </>
              )}
              {r.s === 'arrived' && (
                <>
                  <button onClick={() => { setPopup(null); setResaStatus(r.id, 'done') }} style={btnStyle('var(--gn)')}>🪑 Libérer</button>
                  <button onClick={() => { setPopup(null); setResaStatus(r.id, 'noshow') }} style={btnStyle('var(--am)')}>👻 No-show</button>
                </>
              )}
              {(r.s === 'noshow' || r.s === 'done' || r.s === 'cancelled') && (
                <button onClick={() => { setPopup(null); setResaStatus(r.id, 'reserved') }} style={btnStyle('#7bb8ff')}>↩ Remettre</button>
              )}
            </div>
          </>,
          document.body
        )
      })()}

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
