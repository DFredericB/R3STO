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
import { STATUS } from '../../utils/design'
import { timeToMins, nowMins, shiftISO } from '../../utils/date'
import {
  isOccupying, tblMatchesTable,
  iaPlacement, getFreeTables, getFreeCombos,
  canMoveResa, canSwapResas
} from '../../utils/placementRules'
import { spRoomBodySvg, spChairsSvg } from '../../utils/roomItemSvg'
import type { Table, Combo, Resa, Service, RoomItem } from '../../types'

// ── Constantes ────────────────────────────────────
// ── Helpers SVG (reprise simplifiée de SetupPlan) ─

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
  ghostInfo?: { name: string; covers: number; time: string; isDone: boolean },
): string {
  const tRef = Math.min(t.w, t.h)
  const cx = t.x + t.w / 2, cy = t.y + t.h / 2

  // Couleurs selon statut — libre = très discret, réservé = bien visible
  const fills: Record<string, string> = {
    free:           'rgba(68,128,216,.06)',
    reserved:       'rgba(91,156,246,.30)',
    arrived:        'rgba(60,200,112,.25)',
    blocked:        'rgba(100,116,139,.15)',
    combo_partial:  'rgba(144,96,224,.18)',
    held:           'rgba(232,165,48,.12)',
  }
  const strokes: Record<string, string> = {
    free:           'rgba(68,128,216,.25)',
    reserved:       'rgba(91,156,246,.85)',
    arrived:        'rgba(60,200,112,.85)',
    blocked:        'rgba(100,116,139,.40)',
    combo_partial:  'rgba(144,96,224,.55)',
    held:           'rgba(232,165,48,.55)',
  }
  const textCols: Record<string, string> = {
    free:           'rgba(68,128,216,.55)',
    reserved:       '#5b9cf6',
    arrived:        '#3cc870',
    blocked:        'rgba(100,116,139,.5)',
    combo_partial:  'rgba(144,96,224,.7)',
    held:           '#e8a530',
  }

  const fill = fills[status] || fills.free
  const stroke = isSelected ? '#facc15' : (strokes[status] || strokes.free)
  const tcol = textCols[status] || textCols.free
  const sw = isSelected ? tRef * 0.125 : (status === 'reserved' || status === 'arrived') ? tRef * 0.092 : tRef * 0.050

  // ── Tables dans un combo occupé → forme fantôme, aucun texte ──
  if (isInOccupiedCombo) {
    let s = `<g data-table="${t.id}" style="cursor:pointer;opacity:.18">`
    // Forme seule, très discrète (pas de chaises, pas de texte)
    if (['round', 'round_sm', 'round_lg'].includes(t.shape)) {
      s += `<circle cx="${cx}" cy="${cy}" r="${t.h/2}" fill="rgba(68,128,216,.08)" stroke="rgba(68,128,216,.2)" stroke-width="${(tRef*0.04).toFixed(2)}"/>`
    } else if (t.shape === 'oval') {
      s += `<ellipse cx="${cx}" cy="${cy}" rx="${t.w/2}" ry="${t.h/2}" fill="rgba(68,128,216,.08)" stroke="rgba(68,128,216,.2)" stroke-width="${(tRef*0.04).toFixed(2)}"/>`
    } else if (t.shape === 'bar') {
      const bh = t.h * 0.5, by = t.y + (t.h - bh) / 2
      s += `<rect x="${t.x}" y="${by}" width="${t.w}" height="${bh}" rx="1" fill="rgba(68,128,216,.08)" stroke="rgba(68,128,216,.2)" stroke-width="${(tRef*0.04).toFixed(2)}"/>`
    } else {
      const rxv = t.shape === 'square' || t.shape === 'square_sm' ? 2.5 : 1.5
      s += `<rect x="${t.x}" y="${t.y}" width="${t.w}" height="${t.h}" rx="${rxv}" fill="rgba(68,128,216,.08)" stroke="rgba(68,128,216,.2)" stroke-width="${(tRef*0.04).toFixed(2)}"/>`
    }
    return s + '</g>'
  }

  let s = `<g data-table="${t.id}" style="cursor:pointer">`

  // Hitbox invisible — garantit le clic même sur tables bloquées/held
  s += `<rect x="${t.x}" y="${t.y}" width="${t.w}" height="${t.h}" fill="transparent" style="pointer-events:all"/>`

  // ── 1. Chaises DERRIÈRE la table (identique éditeur) ──
  const chairFill = status === 'arrived' ? 'rgba(60,200,112,.18)'
    : status === 'held' ? 'rgba(232,165,48,.10)'
    : status === 'reserved' ? 'rgba(91,156,246,.18)'
    : 'rgba(68,128,216,.07)'
  const chairStroke = status === 'arrived' ? 'rgba(60,200,112,.45)'
    : status === 'held' ? 'rgba(232,165,48,.28)'
    : status === 'reserved' ? 'rgba(91,156,246,.50)'
    : 'rgba(68,128,216,.18)'
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

  // Blocked — hachures diagonales clippées dans la forme + X central
  if (status === 'blocked') {
    const clipId = `clip-blk-${t.id}`
    s += `<defs><clipPath id="${clipId}">`
    if (['round', 'round_sm', 'round_lg'].includes(t.shape))
      s += `<circle cx="${cx}" cy="${cy}" r="${t.h/2}"/>`
    else if (t.shape === 'oval')
      s += `<ellipse cx="${cx}" cy="${cy}" rx="${t.w/2}" ry="${t.h/2}"/>`
    else if (t.shape === 'bar') {
      const bh = t.h * 0.5, by = t.y + (t.h - bh) / 2
      s += `<rect x="${t.x}" y="${by}" width="${t.w}" height="${bh}" rx="1"/>`
    } else {
      const rxv = t.shape === 'square' || t.shape === 'square_sm' ? 2.5 : 1.5
      s += `<rect x="${t.x}" y="${t.y}" width="${t.w}" height="${t.h}" rx="${rxv}"/>`
    }
    s += `</clipPath></defs>`
    s += `<g clip-path="url(#${clipId})" style="pointer-events:none">`
    const gap = tRef * 0.18
    const maxDim = Math.max(t.w, t.h)
    const nLines = Math.ceil(maxDim / gap) + 2
    for (let i = -nLines; i <= nLines; i++) {
      const off = i * gap
      s += `<line x1="${t.x + off - t.h}" y1="${t.y}" x2="${t.x + off + t.w}" y2="${t.y + t.h}" stroke="rgba(100,116,139,.25)" stroke-width="0.5"/>`
    }
    s += `</g>`
    s += `<line x1="${cx - tRef*0.18}" y1="${cy - tRef*0.18}" x2="${cx + tRef*0.18}" y2="${cy + tRef*0.18}" stroke="rgba(220,80,80,.55)" stroke-width="${(tRef*0.06).toFixed(2)}" stroke-linecap="round" style="pointer-events:none"/>`
    s += `<line x1="${cx + tRef*0.18}" y1="${cy - tRef*0.18}" x2="${cx - tRef*0.18}" y2="${cy + tRef*0.18}" stroke="rgba(220,80,80,.55)" stroke-width="${(tRef*0.06).toFixed(2)}" stroke-linecap="round" style="pointer-events:none"/>`
  }

  // Held — contour pointillé ambre + icône cadenas
  if (status === 'held') {
    // Contour pointillé ambre autour de la table
    if (['round', 'round_sm', 'round_lg'].includes(t.shape))
      s += `<circle cx="${cx}" cy="${cy}" r="${(t.h/2 + tRef*0.06).toFixed(2)}" fill="none" stroke="rgba(232,165,48,.5)" stroke-width="${(tRef*0.05).toFixed(2)}" stroke-dasharray="1.5,1.2" style="pointer-events:none"/>`
    else if (t.shape === 'oval')
      s += `<ellipse cx="${cx}" cy="${cy}" rx="${(t.w/2 + tRef*0.06).toFixed(2)}" ry="${(t.h/2 + tRef*0.06).toFixed(2)}" fill="none" stroke="rgba(232,165,48,.5)" stroke-width="${(tRef*0.05).toFixed(2)}" stroke-dasharray="1.5,1.2" style="pointer-events:none"/>`
    else
      s += `<rect x="${(t.x - tRef*0.04).toFixed(2)}" y="${(t.y - tRef*0.04).toFixed(2)}" width="${(t.w + tRef*0.08).toFixed(2)}" height="${(t.h + tRef*0.08).toFixed(2)}" rx="3" fill="none" stroke="rgba(232,165,48,.5)" stroke-width="${(tRef*0.05).toFixed(2)}" stroke-dasharray="1.5,1.2" style="pointer-events:none"/>`
    // Cadenas
    s += `<text x="${cx}" y="${(cy - tRef*0.05).toFixed(2)}" text-anchor="middle" dominant-baseline="central" font-size="${(tRef*0.28).toFixed(1)}" style="pointer-events:none">🔒</text>`
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

  if (resaInfo) {
    // Table occupée (solo) — layout adaptatif selon taille
    // GRANDES TABLES : tout à l'intérieur (N° + nom + heure·cvt + mode/canal + badges)
    // PETITES RONDES : N°+nom+cvt intérieur, reste au-dessus

    const isSmall = t.shape === 'round_sm' || tRef < 11
    const isMedium = !isSmall && (t.shape === 'round' || tRef < 16)

    const canalIcons: Record<string, string> = { telephone:'📞', walkin:'🚶', widget:'🌐', google:'🔍', email:'✉️' }
    const modeIcon = resaInfo.isIA ? '🤖' : '✋'
    const canalIcon = (resaInfo.canal && canalIcons[resaInfo.canal]) || ''

    // Badges
    const badges: string[] = []
    if (resaInfo.isNew) badges.push('🆕')
    if (resaInfo.vip) badges.push('⭐')
    if (resaInfo.allergie) badges.push('⚠')
    if (resaInfo.bebe > 0) badges.push('👶')
    if (resaInfo.pmr > 0) badges.push('♿')

    if (isSmall) {
      // ── PETITE TABLE (round_sm, 2p) — minimal intérieur ──
      const fsNum = (tRef * 0.28).toFixed(1)
      const fsNom = (tRef * 0.19).toFixed(1)
      const fsInf = (tRef * 0.15).toFixed(1)
      const fsBdg = (tRef * 0.14).toFixed(1)

      // Intérieur : N° + nom + couverts
      s += `<text x="${cx}" y="${(cy - tRef*0.16).toFixed(2)}" text-anchor="middle" dominant-baseline="central" font-size="${fsNum}" font-family="DM Mono,monospace" font-weight="800" fill="${tcol}" style="pointer-events:none">${t.n}</text>`
      const maxC = Math.max(3, Math.floor(t.w / 1.8))
      const sName = resaInfo.name.length > maxC ? resaInfo.name.slice(0, maxC - 1) + '…' : resaInfo.name
      s += `<text x="${cx}" y="${(cy + tRef*0.10).toFixed(2)}" text-anchor="middle" dominant-baseline="central" font-size="${fsNom}" font-family="DM Mono,monospace" font-weight="700" fill="${tcol}" opacity=".9" style="pointer-events:none">${sName}</text>`
      s += `<text x="${cx}" y="${(cy + tRef*0.30).toFixed(2)}" text-anchor="middle" dominant-baseline="central" font-size="${fsInf}" font-family="DM Mono,monospace" fill="${tcol}" opacity=".55" style="pointer-events:none">${resaInfo.covers}p</text>`

      // Au-dessus : mode + canal + heure + badges
      const above = [modeIcon, canalIcon, resaInfo.time, ...badges].filter(Boolean)
      if (above.length > 0) {
        const hasTopChairs = ['round', 'round_sm', 'round_lg', 'oval'].includes(t.shape)
        const chairCl = hasTopChairs ? tRef * 0.17 : tRef * 0.06
        const tableTop = ['round', 'round_sm', 'round_lg', 'oval'].includes(t.shape) ? (cy - t.h/2) : t.y
        s += `<text x="${cx}" y="${(tableTop - chairCl).toFixed(2)}" text-anchor="middle" dominant-baseline="auto" font-size="${fsBdg}" font-family="DM Mono,monospace" fill="${tcol}" opacity=".7" style="pointer-events:none">${above.join(' ')}</text>`
      }
    } else {
      // ── TABLE MOYENNE/GRANDE — tout à l'intérieur ──
      const fsNum = (tRef * 0.27).toFixed(1)
      const fsNom = (tRef * 0.18).toFixed(1)
      const fsInf = (tRef * 0.14).toFixed(1)
      const fsMod = (tRef * 0.12).toFixed(1)
      const fsBdg = (tRef * 0.12).toFixed(1)

      // Layout vertical centré dans la table :
      // -0.25  N° table (gros, bold)
      // -0.05  Nom client
      // +0.12  Heure · couverts
      // +0.26  Mode + canal
      // coin bas-droit : badges

      // N° table
      s += `<text x="${cx}" y="${(cy - tRef*0.25).toFixed(2)}" text-anchor="middle" dominant-baseline="central" font-size="${fsNum}" font-family="DM Mono,monospace" font-weight="800" fill="${tcol}" style="pointer-events:none">${t.n}</text>`

      // Nom client
      const maxChars = Math.max(4, Math.floor(t.w / 1.5))
      const shortName = resaInfo.name.length > maxChars ? resaInfo.name.slice(0, maxChars - 1) + '…' : resaInfo.name
      s += `<text x="${cx}" y="${(cy - tRef*0.05).toFixed(2)}" text-anchor="middle" dominant-baseline="central" font-size="${fsNom}" font-family="DM Mono,monospace" font-weight="700" fill="${tcol}" opacity=".9" style="pointer-events:none">${shortName}</text>`

      // Heure · couverts
      s += `<text x="${cx}" y="${(cy + tRef*0.12).toFixed(2)}" text-anchor="middle" dominant-baseline="central" font-size="${fsInf}" font-family="DM Mono,monospace" fill="${tcol}" opacity=".55" style="pointer-events:none">${resaInfo.time} · ${resaInfo.covers}p</text>`

      // Mode + canal (petit, sous l'heure)
      const modeLine = [modeIcon, canalIcon].filter(Boolean).join('')
      s += `<text x="${cx}" y="${(cy + tRef*0.26).toFixed(2)}" text-anchor="middle" dominant-baseline="central" font-size="${fsMod}" font-family="DM Mono,monospace" fill="${tcol}" opacity=".45" style="pointer-events:none">${modeLine}</text>`

      // Badges — coin bas-droit intérieur (si présents)
      if (badges.length > 0) {
        const bx = isMedium ? cx : t.x + t.w - tRef * 0.10
        const by = isMedium ? cy + tRef * 0.38 : t.y + t.h - tRef * 0.10
        const anchor = isMedium ? 'middle' : 'end'
        s += `<text x="${bx.toFixed(2)}" y="${by.toFixed(2)}" text-anchor="${anchor}" dominant-baseline="central" font-size="${fsBdg}" fill="${tcol}" opacity=".7" style="pointer-events:none">${badges.join('')}</text>`
      }
    }
  } else if (ghostInfo) {
    // Table libre avec historique fantôme (done/noshow) — en transparence
    const ghostCol = ghostInfo.isDone ? 'rgba(60,200,112,.35)' : 'rgba(220,80,80,.35)'
    const ghostIcon = ghostInfo.isDone ? '🪑' : '👻'
    // Numéro de table (normal)
    s += `<text x="${cx}" y="${(cy - tRef*0.25).toFixed(2)}" text-anchor="middle" dominant-baseline="central" font-size="${fsN}" font-family="DM Mono,monospace" font-weight="800" fill="${tcol}" style="pointer-events:none">${t.n}</text>`
    // Nom client fantôme
    const maxChars = Math.max(4, Math.floor(t.w / 1.8))
    const shortName = ghostInfo.name.length > maxChars ? ghostInfo.name.slice(0, maxChars - 1) + '…' : ghostInfo.name
    s += `<text x="${cx}" y="${(cy + tRef*0.02).toFixed(2)}" text-anchor="middle" dominant-baseline="central" font-size="${(tRef*0.16).toFixed(1)}" font-family="DM Mono,monospace" font-weight="500" fill="${ghostCol}" style="pointer-events:none;font-style:italic">${shortName}</text>`
    // Couverts + heure fantôme
    s += `<text x="${cx}" y="${(cy + tRef*0.22).toFixed(2)}" text-anchor="middle" dominant-baseline="central" font-size="${(tRef*0.13).toFixed(1)}" font-family="DM Mono,monospace" fill="${ghostCol}" style="pointer-events:none">${ghostInfo.covers}p · ${ghostInfo.time}</text>`
    // Icône statut
    s += `<text x="${(t.x + tRef*0.08).toFixed(2)}" y="${(t.y + tRef*0.15).toFixed(2)}" font-size="${(tRef*0.16).toFixed(1)}" opacity=".5" style="pointer-events:none">${ghostIcon}</text>`
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

  const cRef = Math.min(lw, lh)

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
    const txtPadX = Math.min(lw * 0.35, cRef * 1.2), txtPadY = cRef * 0.45
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
    s += `<text x="${lcx.toFixed(1)}" y="${(lcy + cRef*0.28).toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="${fsCov}" font-family="DM Mono,monospace" fill="${tcol}" opacity=".6" style="pointer-events:none">${comboResa.t} · ${comboResa.c}p</text>`

    // Mode + canal — à l'intérieur, sous heure/cvt
    const fsMod = (cRef * 0.12).toFixed(1)
    const modeIcon = comboResa.mode === 'ia' ? '🤖' : '✋'
    const canalIcons: Record<string, string> = { telephone:'📞', walkin:'🚶', widget:'🌐', google:'🔍', email:'✉️' }
    const canalIcon = (comboResa.canal && canalIcons[comboResa.canal]) || ''
    s += `<text x="${lcx.toFixed(1)}" y="${(lcy + cRef*0.44).toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="${fsMod}" font-family="DM Mono,monospace" fill="${tcol}" opacity=".45" style="pointer-events:none">${modeIcon}${canalIcon}</text>`

    // Badges — à l'intérieur, coin bas
    const fsBdg = (cRef * 0.13).toFixed(1)
    const badges: string[] = []
    if ((Date.now() - comboResa.createdAt) < 15 * 60 * 1000) badges.push('🆕')
    if (comboResa.statut === 2) badges.push('⭐')
    if (comboResa.allergie) badges.push('⚠')
    if (comboResa.bebe > 0) badges.push('👶')
    if (comboResa.pmr > 0) badges.push('♿')
    if (badges.length > 0) {
      s += `<text x="${lcx.toFixed(1)}" y="${(lcy + cRef*0.58).toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="${fsBdg}" fill="${tcol}" opacity=".7" style="pointer-events:none">${badges.join('')}</text>`
    }
  } else {
    // ── Combo libre — contour pointillé cliquable ──
    s += `<rect x="${(lx-1).toFixed(1)}" y="${(ly-1).toFixed(1)}" width="${(lw+2).toFixed(1)}" height="${(lh+2).toFixed(1)}" rx="3" fill="none" stroke="rgba(180,130,255,.35)" stroke-width="0.7" stroke-dasharray="2.5,1.5" style="pointer-events:none"/>`
    // Hitbox plein sur toute la zone combo — les tables individuelles sont rendues par-dessus
    // donc elles captent les clics en priorité, et cette zone capte les clics entre les tables
    s += `<rect data-combo-click="${combo.label}" x="${(lx-5).toFixed(1)}" y="${(ly-5).toFixed(1)}" width="${(lw+10).toFixed(1)}" height="${(lh+10).toFixed(1)}" rx="4" fill="transparent" style="cursor:pointer;pointer-events:all"/>`
  }

  return comboResa
    ? `<g style="pointer-events:none">${s}</g>`
    : `<g>${s}</g>`
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
    updateResa, setResaStatus, setTables, swapTables,
  } = useAppStore()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [salle, setSalle] = useState('')
  const [svcFilter, setSvcFilter] = useState('')
  const [search, setSearch] = useState('')
  const [showOrphans, setShowOrphans] = useState(false)
  const orphansAutoShownRef = useRef(false)
  const [popup, setPopup] = useState<{ resa: any; table?: Table; x: number; y: number; flip: boolean } | null>(null)
  // ── Move mode : déplacement visuel (cliquer table cible sur SVG) ──
  const [moveResa, setMoveResa] = useState<{ id: string; name: string; covers: number; fromTbl: string; svc: string } | null>(null)
  const [moveDate, setMoveDate] = useState('')
  const [moveSvc, setMoveSvc] = useState('')
  const [moveMsg, setMoveMsg] = useState<string | null>(null)
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

  // Ghost map — résas done/noshow (historique transparent sur table libre)
  const ghostMap = useMemo(() => {
    const map: Record<string, Resa> = {}
    for (const r of filteredResas) {
      if ((r.s !== 'done' && r.s !== 'noshow') || !r.tbl) continue
      const names = r.tbl.includes('+') ? r.tbl.split('+').map(s => s.trim()) : [r.tbl]
      for (const tn of names) {
        // Ne pas afficher de ghost si la table est occupée par une autre résa
        if (occupiedMap[tn]) continue
        if (!map[tn]) map[tn] = r
      }
    }
    return map
  }, [filteredResas, occupiedMap])

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

      // Ghost info pour tables libres avec historique done/noshow
      const ghost = !resa && !t.blocked && !t.held ? ghostMap[t.n] : undefined
      const ghostInfo = ghost ? {
        name: ghost.nom || ghost.n?.split(' ')[0] || '?',
        covers: ghost.c,
        time: ghost.t,
        isDone: ghost.s === 'done',
      } : undefined

      h += planTableSvg(t, status, !!isHighlighted, resaInfo, isInOccupiedCombo, ghostInfo)
    }

    svg.innerHTML = h
  }, [salleTables, salleRoomItems, occupiedMap, ghostMap, tables, combos, search, filteredResas])

  useEffect(() => { renderPlan() }, [renderPlan, salle, filteredResas, search])

  // Auto-ouvrir la modale réassignation si orphelins détectés (une seule fois)
  useEffect(() => {
    if (orphans.length > 0 && !orphansAutoShownRef.current) {
      orphansAutoShownRef.current = true
      setShowOrphans(true)
    }
    if (orphans.length === 0) orphansAutoShownRef.current = false
  }, [orphans])

  // ── Démarrer le mode déplacement visuel ──
  function startMoveMode(r: Resa) {
    setPopup(null)
    setMoveResa({ id: r.id, name: r.nom || r.n, covers: r.c, fromTbl: r.tbl, svc: r.svc })
    setMoveDate(r.date || activeDate)
    setMoveSvc(r.svc || '')
    setMoveMsg(null)
  }
  function cancelMoveMode() { setMoveResa(null); setMoveMsg(null) }

  // ── Exécuter le déplacement vers une table cible ──
  function executeMoveToTable(targetTbl: Table) {
    if (!moveResa) return
    const sourceResa = resas.find(r => r.id === moveResa.id)
    if (!sourceResa) return
    const dayR = resas.filter(r => r.date === activeDate)
    const targetOccupying = dayR.filter(r =>
      r.svc === sourceResa.svc && tblMatchesTable(r.tbl, targetTbl.n) && isOccupying(r)
    )
    if (targetOccupying.length === 0) {
      // Table libre → déplacer
      const check = canMoveResa(sourceResa, { type: 'table', table: targetTbl }, tables, combos, resas)
      if (!check.valid) { setMoveMsg(`❌ ${check.reason}`); setTimeout(() => setMoveMsg(null), 3000); return }
      updateResa(sourceResa.id, { tbl: check.newTbl! })
      toast(`${sourceResa.nom || sourceResa.n} → ${targetTbl.n} ✓`, 'success')
      setMoveResa(null); setMoveMsg(null)
    } else {
      // Table occupée → swap
      const targetResa = targetOccupying[0]
      const check = canSwapResas(sourceResa, targetResa, tables, combos)
      if (!check.valid) { setMoveMsg(`❌ ${check.reason}`); setTimeout(() => setMoveMsg(null), 3000); return }
      swapTables(sourceResa.id, targetResa.id)
      toast(`${sourceResa.nom || sourceResa.n} ↔ ${targetResa.nom || targetResa.n} ✓`, 'success')
      setMoveResa(null); setMoveMsg(null)
    }
  }

  // ── Déplacer avec IA ──
  function executeMoveIA() {
    if (!moveResa) return
    const sourceResa = resas.find(r => r.id === moveResa.id)
    if (!sourceResa) return
    const dayR = resas.filter(r => r.date === (moveDate || activeDate))
    const targetSvc = moveSvc || sourceResa.svc
    const bestTbl = iaPlacement(
      sourceResa.c, moveDate || activeDate, targetSvc, tables, combos, dayR,
      undefined, sourceResa.id
    )
    if (!bestTbl) { setMoveMsg('❌ Aucune table disponible'); setTimeout(() => setMoveMsg(null), 3000); return }
    const patch: Record<string, any> = { tbl: bestTbl }
    if (moveDate && moveDate !== sourceResa.date) patch.date = moveDate
    if (targetSvc !== sourceResa.svc) patch.svc = targetSvc
    updateResa(sourceResa.id, patch)
    // Post-move: switch view to see result
    if (moveDate && moveDate !== activeDate) setActiveDate(moveDate)
    if (targetSvc !== sourceResa.svc) setSvcFilter(targetSvc)
    toast(`IA → ${sourceResa.nom || sourceResa.n} sur ${bestTbl} ✓`, 'success')
    setMoveResa(null); setMoveMsg(null)
  }

  // ── Confirmer déplacement date/service ──
  function executeMoveDateTime() {
    if (!moveResa) return
    const sourceResa = resas.find(r => r.id === moveResa.id)
    if (!sourceResa) return
    const targetSvc = moveSvc || sourceResa.svc
    const targetDate = moveDate || sourceResa.date
    const svcObj = activeServices.find(s => s.name.toLowerCase() === targetSvc)
    const patch: Record<string, any> = {
      date: targetDate, svc: targetSvc, s: 'reserved',
      t: svcObj ? svcObj.open.replace(':', 'h') : sourceResa.t,
    }
    updateResa(sourceResa.id, patch)
    // Post-move: switch view to see result
    if (targetDate !== activeDate) setActiveDate(targetDate)
    if (targetSvc !== sourceResa.svc) setSvcFilter(targetSvc)
    toast(`Déplacé → ${targetDate} ${targetSvc} ✓`, 'success')
    setMoveResa(null); setMoveMsg(null)
  }

  // ── Click handling ─────────────────────────────
  const handleSvgClick = useCallback((e: React.MouseEvent) => {
    // ── Mode déplacement : clic sur table cible ──
    if (moveResa) {
      const target = e.target as Element
      const tblEl = target.closest('[data-table]')
      if (tblEl) {
        const id = tblEl.getAttribute('data-table')!
        const tbl = tables.find(t => t.id === id)
        if (tbl) { executeMoveToTable(tbl); return }
      }
      // Clic sur combo libre → déplacer vers combo
      const comboEl = target.closest('[data-combo-click]')
      if (comboEl) {
        const comboLabel = comboEl.getAttribute('data-combo-click')!
        const comboTableNames = comboLabel.split('+').map((s: string) => s.trim())
        const firstTbl = tables.find(t => comboTableNames.includes(t.n))
        if (firstTbl) {
          // Trouver le combo et traiter comme déplacement vers combo
          const combo = combos.find(c => c.label === comboLabel)
          if (combo) {
            const sourceResa = resas.find(r => r.id === moveResa.id)
            if (sourceResa) {
              updateResa(sourceResa.id, { tbl: comboLabel })
              toast(`${sourceResa.nom || sourceResa.n} → ${comboLabel} ✓`, 'success')
              setMoveResa(null); setMoveMsg(null)
              return
            }
          }
        }
      }
      return // Ignorer les clics sur zones vides en mode déplacement
    }

    // Fermer le popup si on clique ailleurs
    if (popup) { setPopup(null); return }

    const target = e.target as Element

    // ── Clic sur combo (libre → nouvelle résa, occupée → popup actions) ──
    const comboEl = target.closest('[data-combo-click]')
    if (comboEl) {
      const comboLabel = comboEl.getAttribute('data-combo-click')!
      const comboTableNames = comboLabel.split('+').map((s: string) => s.trim())
      const comboResa = comboTableNames.map((tn: string) => occupiedMap[tn]).find(Boolean)
      if (comboResa) {
        const rect = (comboEl as SVGElement).getBoundingClientRect()
        const flip = rect.bottom + 220 > window.innerHeight
        const firstTable = tables.find(t => comboTableNames.includes(t.n))
        setPopup({ resa: comboResa, table: firstTable || undefined, x: rect.left + rect.width / 2, y: flip ? rect.top : rect.bottom, flip })
        return
      }
      navigate(`/reservations?new=1&table=${encodeURIComponent(comboLabel)}&mode=manuel&svc=${svcFilter}&from=plan`)
      return
    }

    const tblEl = target.closest('[data-table]')
    if (!tblEl) return

    const id = tblEl.getAttribute('data-table')!
    const tbl = tables.find(t => t.id === id)
    if (!tbl) return

    const rect = (tblEl as SVGElement).getBoundingClientRect()
    const flip = rect.bottom + 220 > window.innerHeight

    const resa = occupiedMap[tbl.n]
    if (resa) {
      setPopup({ resa, table: tbl, x: rect.left + rect.width / 2, y: flip ? rect.top : rect.bottom, flip })
    } else {
      setPopup({ resa: null, table: tbl, x: rect.left + rect.width / 2, y: flip ? rect.top : rect.bottom, flip })
    }
  }, [tables, occupiedMap, popup, navigate, moveResa, resas, combos])

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
        {/* Slot vide — les orphelins sont maintenant en bannière fixe */}
      </ViewToolbar>

      {/* ── Bannière réassignation — impossible à louper ── */}
      {orphans.length > 0 && (
        <div onClick={() => setShowOrphans(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', cursor: 'pointer',
            background: 'linear-gradient(90deg, rgba(220,80,80,.18), rgba(220,80,80,.08))',
            borderBottom: '2px solid rgba(220,80,80,.4)',
            animation: 'pulse 2s infinite',
          }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--rd)' }}>
              {orphans.length} réservation{orphans.length > 1 ? 's' : ''} à réassigner
            </div>
            <div style={{ fontSize: 10, color: 'var(--t3)' }}>
              Tables supprimées/modifiées — cliquez pour valider les réassignations
            </div>
          </div>
          <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: 'var(--rd)', padding: '4px 12px', border: '1.5px solid rgba(220,80,80,.4)', borderRadius: 6, background: 'rgba(220,80,80,.12)' }}>
            Traiter →
          </span>
        </div>
      )}

      {/* ── Bannière de déplacement ── */}
      {moveResa && (
        <div style={{
          padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          background: 'rgba(159,122,234,.12)', borderBottom: '2px solid rgba(159,122,234,.4)', flexShrink: 0,
        }}>
          <span style={{ fontSize: 16 }}>↔</span>
          <div style={{ flex: 1, minWidth: 160 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#9f7aea' }}>
              Déplacer {moveResa.name} ({moveResa.covers}p)
            </span>
            <span style={{ fontSize: 12, color: 'var(--t3)', marginLeft: 8 }}>
              depuis {moveResa.fromTbl} — toucher une table cible
            </span>
          </div>
          {/* Date picker */}
          <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
            <button onClick={() => setMoveDate(shiftISO(moveDate, -1))} style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(159,122,234,.3)', background: 'rgba(159,122,234,.1)', color: '#9f7aea', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>◀</button>
            <input type="date" value={moveDate} onChange={e => setMoveDate(e.target.value)}
              style={{ fontSize: 11, fontWeight: 700, padding: '3px 6px', borderRadius: 5, border: '1.5px solid rgba(159,122,234,.3)', background: 'var(--surf2)', color: 'var(--text)', fontFamily: 'var(--fm)' }} />
            <button onClick={() => setMoveDate(shiftISO(moveDate, 1))} style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(159,122,234,.3)', background: 'rgba(159,122,234,.1)', color: '#9f7aea', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>▶</button>
          </div>
          {/* Service selector */}
          <div style={{ display: 'flex', gap: 3 }}>
            {activeServices.map(s => (
              <button key={s.id} onClick={() => setMoveSvc(s.name.toLowerCase())}
                style={{
                  fontSize: 11, fontWeight: moveSvc === s.name.toLowerCase() ? 800 : 600,
                  padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                  border: `1.5px solid ${moveSvc === s.name.toLowerCase() ? s.color : 'var(--border)'}`,
                  background: moveSvc === s.name.toLowerCase() ? `${s.color}20` : 'transparent',
                  color: moveSvc === s.name.toLowerCase() ? s.color : 'var(--t3)',
                }}>
                {s.icon} {s.name}
              </button>
            ))}
          </div>
          {/* IA + Date/Svc confirm */}
          <button onClick={executeMoveIA} style={{
            padding: '6px 14px', borderRadius: 8, border: '2px solid rgba(91,156,246,.5)',
            background: 'rgba(91,156,246,.15)', color: '#7bb8ff', cursor: 'pointer',
            fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap',
          }}>🤖 IA</button>
          {(moveDate !== (resas.find(r => r.id === moveResa.id)?.date || activeDate) || moveSvc !== moveResa.svc) && (
            <button onClick={executeMoveDateTime} style={{
              padding: '6px 14px', borderRadius: 8, border: '2px solid rgba(159,122,234,.5)',
              background: 'rgba(159,122,234,.2)', color: '#9f7aea', cursor: 'pointer',
              fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap',
            }}>✓ Confirmer {moveDate !== (resas.find(r => r.id === moveResa.id)?.date || activeDate) ? 'date' : 'service'}</button>
          )}
          <button onClick={cancelMoveMode} style={{
            padding: '6px 14px', borderRadius: 8,
            border: '1px solid rgba(220,80,80,.4)', background: 'rgba(220,80,80,.1)',
            color: 'var(--rd)', cursor: 'pointer', fontSize: 12, fontWeight: 700,
          }}>✕ Annuler</button>
        </div>
      )}
      {moveMsg && (
        <div style={{ padding: '6px 16px', fontSize: 13, fontWeight: 600, background: moveMsg.startsWith('❌') ? 'rgba(220,80,80,.12)' : 'rgba(60,200,112,.12)', color: moveMsg.startsWith('❌') ? 'var(--rd)' : 'var(--gn)', borderBottom: '1px solid var(--border)' }}>
          {moveMsg}
        </div>
      )}

      {/* SVG Plan — pleine largeur, pas de colonne droite */}
      <div style={{ flex: 1, minWidth: 0, background: 'var(--surf2)', overflow: 'auto', position: 'relative', cursor: moveResa ? 'crosshair' : 'default' }}>
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

      {/* ── Popup actions rapides ── */}
      {popup && (() => {
        const r = popup.resa
        const tbl = popup.table
        const btnStyle = (col: string): React.CSSProperties => ({
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 12px', border: 'none', borderBottom: '1px solid rgba(255,255,255,.04)',
          background: 'transparent', cursor: 'pointer', textAlign: 'left',
          fontSize: 13, fontWeight: 700, color: col,
        })

        const updateTable = (id: string, patch: Partial<Table>) => {
          setTables(tables.map(t => t.id === id ? { ...t, ...patch } : t))
        }

        // Popup border color
        const st = r ? STATUS[r.s as keyof typeof STATUS] : null
        const borderCol = r ? (st?.border || 'var(--border)')
          : tbl?.blocked ? 'rgba(100,116,139,.5)'
          : tbl?.held ? 'rgba(232,165,48,.5)'
          : 'rgba(68,128,216,.4)'

        return createPortal(
          <>
            <div onClick={() => { setPopup(null) }} style={{ position: 'fixed', inset: 0, zIndex: 9998 }} />
            <div onClick={e => e.stopPropagation()} style={{
              position: 'fixed',
              left: Math.min(popup.x - 100, window.innerWidth - 220),
              ...(popup.flip
                ? { bottom: window.innerHeight - popup.y + 8 }
                : { top: popup.y + 8 }),
              zIndex: 9999, minWidth: 200, maxWidth: 260,
              background: 'var(--surf2)', border: `1px solid ${borderCol}`,
              borderRadius: 10, overflow: 'hidden',
              boxShadow: '0 8px 24px rgba(0,0,0,.4)',
            }}>

              {r ? (<>
                {/* ── Table occupée — actions résa ── */}
                <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,.08)', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {st && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 6, background: st.bg, color: st.hex, border: `1px solid ${st.border}` }}>{st.icon}</span>}
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{r.nom || r.n}</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--t2)', fontFamily: 'var(--fm)' }}>{r.c}p</span>
                    <span style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--fm)' }}>{r.t}</span>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 2 }}>{r.tbl}</div>
                </div>
                <button onClick={() => { setPopup(null); navigate(`/reservations?edit=${r.id}&from=plan`) }} style={btnStyle('#7bb8ff')}>✏️ Modifier</button>
                {(r.s === 'reserved' || r.s === 'arrived') && (<>
                  <button onClick={() => startMoveMode(r)} style={btnStyle('#9f7aea')}>↔ Déplacer</button>
                </>)}
                {r.s === 'waitlist' && (
                  <>
                    <button onClick={() => { setPopup(null); setResaStatus(r.id, 'reserved') }} style={btnStyle('var(--gn)')}>✅ Confirmer</button>
                    <button onClick={() => { setPopup(null); setResaStatus(r.id, 'cancelled') }} style={btnStyle('var(--rd)')}>🚫 Refuser</button>
                  </>
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
              </>) : tbl ? (<>
                {/* ── Table non-occupée — actions table ── */}
                <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,.08)', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--fm)' }}>{tbl.n}</span>
                    <span style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--fm)' }}>{tbl.capMax}p</span>
                    {tbl.blocked && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: 'rgba(100,116,139,.2)', color: 'rgba(100,116,139,.8)', border: '1px solid rgba(100,116,139,.3)' }}>BLOQUÉE</span>}
                    {tbl.held && !tbl.blocked && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: 'rgba(232,165,48,.15)', color: '#e8a530', border: '1px solid rgba(232,165,48,.3)' }}>RÉSERVE</span>}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 2 }}>{tbl.salle} · {tbl.shape}</div>
                </div>

                {/* Nouvelle résa */}
                {!tbl.blocked && (
                  <button onClick={() => { setPopup(null); navigate(`/reservations?new=1&table=${tbl.n}&mode=manuel&svc=${svcFilter}&from=plan`) }} style={btnStyle('#7bb8ff')}>➕ Nouvelle résa</button>
                )}

                {/* Bloquer / Débloquer */}
                {tbl.blocked ? (<>
                  <button onClick={() => { setPopup(null); updateTable(tbl.id, { blocked: false }); toast(`${tbl.n} débloquée ✓`, 'success') }} style={btnStyle('var(--gn)')}>🔓 Débloquer</button>
                  <button onClick={() => { setPopup(null); updateTable(tbl.id, { blocked: false, held: true }); toast(`${tbl.n} → réserve 🔒`, 'info') }} style={btnStyle('#e8a530')}>🔒 Passer en réserve</button>
                </>) : (
                  <button onClick={() => { setPopup(null); updateTable(tbl.id, { blocked: true, held: false }); toast(`${tbl.n} bloquée 🚫`, 'warning') }} style={btnStyle('rgba(100,116,139,.8)')}>🚫 Bloquer</button>
                )}

                {/* Réserve (held) / Libérer réserve */}
                {!tbl.blocked && (
                  tbl.held ? (<>
                    <button onClick={() => { setPopup(null); updateTable(tbl.id, { held: false }); toast(`${tbl.n} réserve levée ✓`, 'success') }} style={btnStyle('var(--gn)')}>🔓 Lever réserve</button>
                    <button onClick={() => { setPopup(null); updateTable(tbl.id, { blocked: true, held: false }); toast(`${tbl.n} → bloquée 🚫`, 'warning') }} style={btnStyle('rgba(100,116,139,.8)')}>🚫 Bloquer</button>
                  </>) : (
                    <button onClick={() => { setPopup(null); updateTable(tbl.id, { held: true }); toast(`${tbl.n} mise en réserve 🔒`, 'info') }} style={btnStyle('#e8a530')}>🔒 Mettre en réserve</button>
                  )
                )}
              </>) : null}
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
