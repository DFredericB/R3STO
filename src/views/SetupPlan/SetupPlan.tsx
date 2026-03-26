// ══════════════════════════════════════════════════
//  R3STO — SetupPlan.tsx
//  Éditeur de plan de salle interactif (SVG drag & drop)
// ══════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useToast } from '../../components/ui/Toast'
import type { Table, Combo, RoomItem } from '../../types'
import { spRoomBodySvg } from '../../utils/roomItemSvg'

// ── Constantes ────────────────────────────────────

const SP_GRID    = 0.25 // accrochage ultra-fin (0.25 unité SVG — 480 pas sur 120 unités)
const SP_MIN_SZ  = 8   // taille minimale d'une table (px SVG)
const SP_LAY_GAP = 4   // écart entre tables lors de l'ajout automatique

const CANVAS_SIZES = [
  { h: 55, w: 90,  l: 'S'  },
  { h: 80, w: 120, l: 'M'  },
  { h: 110, w: 165, l: 'L' },
  { h: 150, w: 225, l: 'XL'},
]

const TABLE_TYPES = [
  { shape: 'round_sm',  capMin: 1, capMax: 2 },  // ronde 2p
  { shape: 'round',     capMin: 3, capMax: 5 },  // ronde L 5p
  { shape: 'square_sm', capMin: 1, capMax: 2 },  // carré 2p — V ou H
  { shape: 'square',    capMin: 2, capMax: 4 },  // carré 4p — 1 chaise/côté
  { shape: 'rect',      capMin: 2, capMax: 4 },  // rectangle 4p — 2+2 haut/bas
  { shape: 'rect_lg',   capMin: 4, capMax: 8 },  // rectangle L 8p — 4+4 haut/bas
  { shape: 'oval',      capMin: 4, capMax: 6 },  // ovale 6p
  { shape: 'bar',       capMin: 2, capMax: 8 },  // bar / comptoir
]

const ROOM_TYPES = [
  // Circulations
  { sym: '🚪', lbl: 'Porte',         shape: 'porte',       w: 8,  h: 4  },
  { sym: '🚪', lbl: 'Grande porte',  shape: 'porte_lg',    w: 14, h: 4  },
  { sym: '🚶', lbl: 'Couloir',       shape: 'couloir',     w: 20, h: 6  },
  { sym: '↑',  lbl: 'Escalier',      shape: 'escalier',    w: 12, h: 10 },
  { sym: '⬆',  lbl: 'Ascenseur',     shape: 'ascenseur',   w: 8,  h: 8  },
  { sym: '🏁', lbl: 'Sortie secours',shape: 'sortie',      w: 10, h: 4  },
  // Éléments structurels
  { sym: '●',  lbl: 'Colonne',       shape: 'colonne',     w: 5,  h: 5  },
  { sym: '▬',  lbl: 'Cloison',       shape: 'cloison',     w: 20, h: 3  },
  { sym: '▬',  lbl: 'Mur',           shape: 'mur',         w: 20, h: 3  },
  { sym: '▭',  lbl: 'Fenêtre',       shape: 'fenetre',     w: 20, h: 3  },
  { sym: '▭',  lbl: 'Baie vitrée',   shape: 'baie_vitree', w: 30, h: 3  },
  { sym: '━',  lbl: 'Garde-corps',   shape: 'garde_corps', w: 20, h: 2  },
  // Équipements
  { sym: '🍽',  lbl: 'Buffet',        shape: 'buffet',      w: 20, h: 6  },
  { sym: '💰', lbl: 'Caisse',        shape: 'caisse',      w: 10, h: 8  },
  { sym: '🍸', lbl: 'Bar / Comptoir',shape: 'bar_el',      w: 24, h: 8  },
  { sym: '🎤', lbl: 'Scène',         shape: 'scene',       w: 30, h: 14 },
  { sym: '🎹', lbl: 'Piano',         shape: 'piano',       w: 12, h: 10 },
  { sym: '🔥', lbl: 'Cheminée',      shape: 'cheminee',    w: 14, h: 8  },
  { sym: '🧥', lbl: 'Vestiaire',     shape: 'vestiaire',   w: 12, h: 6  },
  // Déco / extérieur
  { sym: '🌿', lbl: 'Plante',        shape: 'plante',      w: 6,  h: 6  },
  { sym: '🌳', lbl: 'Arbre',         shape: 'arbre',       w: 10, h: 10 },
  { sym: '⛱',  lbl: 'Parasol',       shape: 'parasol',     w: 12, h: 12 },
  { sym: '⛲', lbl: 'Fontaine',      shape: 'fontaine',    w: 10, h: 10 },
  { sym: '🚻', lbl: 'WC',            shape: 'wc',          w: 10, h: 12 },
  { sym: '🪴', lbl: 'Jardinière',    shape: 'jardiniere',  w: 16, h: 4  },
]

// ── Helpers SVG ───────────────────────────────────

function shapeLabel(shape: string): string {
  const map: Record<string, string> = {
    round_sm: 'Ronde', round: 'Ronde L', round_lg: 'Ronde XL',
    square_sm: 'Carrée', square: 'Carrée L', rect: 'Rect.', rect_lg: 'Rect. L', oval: 'Ovale',
    banquette: 'Banq.', bar: 'Bar',
  }
  return map[shape] || shape
}

function shapePrev(shape: string, fullWidth = false): string {
  const fill   = 'rgba(68,128,216,.15)'
  const stroke = 'rgba(68,128,216,.7)'
  const sw     = 1.2
  const W      = fullWidth ? 96 : 48
  const vw     = fullWidth ? '0 0 96 24' : '0 0 48 24'
  const h      = fullWidth ? 20 : 28
  let inner    = ''
  if (shape === 'round_sm')
    inner = `<circle cx="${W/2}" cy="12" r="7" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
  else if (shape === 'round')
    inner = `<circle cx="${W/2}" cy="12" r="11" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
  else if (shape === 'round_lg')
    inner = `<circle cx="${W/2}" cy="12" r="11.5" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
  else if (shape === 'square_sm')
    inner = `<rect x="${W/2-7}" y="5" width="14" height="14" rx="2.5" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
  else if (shape === 'square')
    inner = `<rect x="${W/2-10}" y="2" width="20" height="20" rx="3" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
  else if (shape === 'oval')
    inner = `<ellipse cx="${W/2}" cy="12" rx="21" ry="10" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
  else if (shape === 'rect')
    inner = `<rect x="5" y="6" width="${W-10}" height="12" rx="2" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
  else if (shape === 'rect_lg')
    inner = `<rect x="2" y="6" width="${W-4}" height="12" rx="2" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
  else if (shape === 'banquette')
    inner = `<rect x="1" y="7" width="${W-2}" height="10" rx="2" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>` +
            `<line x1="1" y1="5" x2="${W-1}" y2="5" stroke="${stroke}" stroke-width="0.8" opacity=".35"/>`
  else if (shape === 'bar')
    inner = `<rect x="1" y="11" width="${W-2}" height="7" rx="1.5" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>` +
            `<rect x="1" y="2" width="${W-2}" height="5" rx="1" fill="rgba(68,128,216,.07)" stroke="${stroke}" stroke-width="0.7" opacity=".5"/>` // Note: thumbnail fixe, plan SVG utilise barSide
  return `<svg viewBox="${vw}" width="100%" height="${h}" style="display:block;overflow:visible">${inner}</svg>`
}

function defaultSize(shape: string): { w: number; h: number } {
  // Toutes les tables "principales" ont h=12 pour s'aligner sur le plan
  switch (shape) {
    case 'round_sm':  return { w: 9,  h: 9  }  // ronde 2p
    case 'round':     return { w: 14, h: 14 }  // ronde L 5p — grande
    case 'round_lg':  return { w: 16, h: 16 }  // ronde XL
    case 'square_sm': return { w: 9,  h: 9  }  // carré 2p (V ou H)
    case 'square':    return { w: 12, h: 12 }  // carré 4p — 1 chaise/côté
    case 'rect':      return { w: 18, h: 12 }  // rectangle 4p — 2+2 haut/bas
    case 'rect_lg':   return { w: 28, h: 12 }  // rectangle L 8p — 4+4 haut/bas
    case 'oval':      return { w: 20, h: 12 }  // ovale 6p
    case 'banquette': return { w: 24, h: 8  }  // banquette 8p — plate
    case 'bar':       return { w: 40, h: 10 }
    default:          return { w: 12, h: 12 }
  }
}

// ── Chaises autour d'une table ─────────────────────

function spChairsSvg(t: Table): string {
  const tRef = Math.min(t.w, t.h)
  const CW   = tRef * 0.183
  const CH   = tRef * 0.104
  const GAP  = tRef * 0.046
  const fill   = 'rgba(68,128,216,.13)'
  const stroke = 'rgba(68,128,216,.32)'
  const sw     = (tRef * 0.0375).toFixed(3)
  const cap    = Math.min(t.capMax, 12)
  let s        = ''

  const rectChair = (px: number, py: number, rw: number, rh: number, rot?: number) => {
    const base = `<rect x="${(px-rw/2).toFixed(2)}" y="${(py-rh/2).toFixed(2)}" width="${rw.toFixed(2)}" height="${rh.toFixed(2)}" rx="0.35" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" pointer-events="none"`
    return rot !== undefined
      ? `${base} transform="rotate(${rot.toFixed(1)},${px.toFixed(2)},${py.toFixed(2)})"/>`
      : `${base}/>`
  }

  if (t.shape === 'square_sm') {
    // Carré 2p : 2 chaises face à face — V = haut/bas (défaut), H = gauche/droite
    const cx = t.x + t.w / 2, cy = t.y + t.h / 2
    if (t.orient === 'H') {
      s += rectChair(t.x - GAP - CH / 2, cy, CH, CW)
      s += rectChair(t.x + t.w + GAP + CH / 2, cy, CH, CW)
    } else {
      s += rectChair(cx, t.y - GAP - CH / 2, CW, CH)
      s += rectChair(cx, t.y + t.h + GAP + CH / 2, CW, CH)
    }
  } else if (['round', 'round_sm', 'round_lg'].includes(t.shape)) {
    const cx = t.x + t.w/2, cy = t.y + t.h/2, rad = t.h/2
    const n = Math.min(cap, 10)
    if (n <= 2) {
      // Rond 2p : orient contrôle l'axe — V = haut/bas (défaut), H = gauche/droite
      const d = rad + GAP + CH/2
      if (t.orient === 'H') {
        s += rectChair(cx - d, cy, CH, CW, 0)   // gauche
        s += rectChair(cx + d, cy, CH, CW, 0)   // droite
      } else {
        s += rectChair(cx, cy - d, CW, CH, 0)   // haut
        s += rectChair(cx, cy + d, CW, CH, 0)   // bas
      }
    } else {
      for (let i = 0; i < n; i++) {
        const a = (i/n)*Math.PI*2 - Math.PI/2
        const d = rad + GAP + CH/2
        s += rectChair(cx + Math.cos(a)*d, cy + Math.sin(a)*d, CW, CH, (a*180/Math.PI)+90)
      }
    }
  } else if (t.shape === 'oval') {
    const cx = t.x + t.w/2, cy = t.y + t.h/2
    const rx = t.w/2, ry = t.h/2
    const n = Math.min(cap, 10)
    for (let i = 0; i < n; i++) {
      const a = (i/n)*Math.PI*2 - Math.PI/2
      const cos = Math.cos(a), sin = Math.sin(a)
      const nx = cos/rx, ny = sin/ry
      const len = Math.sqrt(nx*nx + ny*ny)
      const d = GAP + CH/2
      s += rectChair(cx + cos*rx + (nx/len)*d, cy + sin*ry + (ny/len)*d, CW, CH, (a*180/Math.PI)+90)
    }
  } else if (t.shape === 'banquette') {
    const n = Math.min(cap, Math.max(1, Math.floor(t.w/(CW + GAP*2))))
    const sp = t.w/(n+1)
    for (let i = 0; i < n; i++) s += rectChair(t.x+sp*(i+1), t.y+t.h+GAP+CH/2, CW, CH)
  } else if (t.shape === 'bar') {
    const sr = tRef * 0.121
    const n = Math.min(cap, Math.max(1, Math.floor(t.w/(sr*3.1))))
    const sp = t.w/(n+1)
    const isTop = t.barSide === 'top'
    const cy = isTop ? t.y + t.h*0.25 - GAP - sr : t.y + t.h*0.75 + GAP + sr
    for (let i = 0; i < n; i++)
      s += `<circle cx="${(t.x+sp*(i+1)).toFixed(2)}" cy="${cy.toFixed(2)}" r="${sr.toFixed(2)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" pointer-events="none"/>`
  } else {
    // rect / square / rect_lg
    const isLand = t.w > t.h + 3, isPort = t.h > t.w + 3
    const maxH = Math.max(1, Math.floor(t.w/(CW + GAP*2)))
    const maxV = Math.max(1, Math.floor(t.h/(CW + GAP*2)))

    if (!isLand && !isPort) {
      // Carré : orient contrôle l'axe — H = gauche/droite, défaut V = haut/bas
      if (t.orient === 'H') {
        const lN = Math.min(maxV, Math.ceil(cap/2)), rN = Math.min(maxV, cap - lN)
        const sL = t.h/(lN+1), sR = t.h/(rN+1)
        for (let i=0;i<lN;i++) s += rectChair(t.x-GAP-CH/2, t.y+sL*(i+1), CH, CW)
        for (let i=0;i<rN;i++) s += rectChair(t.x+t.w+GAP+CH/2, t.y+sR*(i+1), CH, CW)
      } else {
        const tN = Math.min(maxH, Math.ceil(cap/2)), bN = Math.min(maxH, cap - tN)
        const sT = t.w/(tN+1), sB = t.w/(bN+1)
        for (let i=0;i<tN;i++) s += rectChair(t.x+sT*(i+1), t.y-GAP-CH/2, CW, CH)
        for (let i=0;i<bN;i++) s += rectChair(t.x+sB*(i+1), t.y+t.h+GAP+CH/2, CW, CH)
      }
    } else if (isLand) {
      const tN = Math.min(maxH, Math.ceil(cap/2)), bN = Math.min(maxH, cap-tN)
      const sT = t.w/(tN+1), sB = t.w/(bN+1)
      for (let i=0;i<tN;i++) s += rectChair(t.x+sT*(i+1), t.y-GAP-CH/2, CW, CH)
      for (let i=0;i<bN;i++) s += rectChair(t.x+sB*(i+1), t.y+t.h+GAP+CH/2, CW, CH)
    } else {
      const lN = Math.min(maxV, Math.ceil(cap/2)), rN = Math.min(maxV, cap-lN)
      const sL = t.h/(lN+1), sR = t.h/(Math.max(rN,1)+1)
      for (let i=0;i<lN;i++) s += rectChair(t.x-GAP-CH/2, t.y+sL*(i+1), CH, CW)
      for (let i=0;i<rN;i++) s += rectChair(t.x+t.w+GAP+CH/2, t.y+sR*(i+1), CH, CW)
    }
  }
  return s
}

// ── SVG Table rendering ───────────────────────────

interface SvgCtx {
  selId: string | null
  selMulti: string[]
  comboHL: string | null
  combos: Combo[]
  layer: string
}

function spTableSvg(t: Table, ctx: SvgCtx): string {
  const { selId, selMulti, comboHL, combos, layer } = ctx
  const inCombos = combos.filter(c => c.tables.includes(t.id))

  // Layer ghost
  if (layer !== 'all') {
    let isActive = false
    if (layer === 'solo') isActive = inCombos.length === 0
    else if (layer.startsWith('size_')) {
      const n = parseInt(layer.replace('size_', ''))
      isActive = inCombos.some(c => c.tables.length === n)
    }
    if (!isActive) {
      const cx2 = t.x + t.w / 2, cy2 = t.y + t.h / 2
      const isSel2 = t.id === selId
      const op  = isSel2 ? '0.55' : '0.18'
      const gst = isSel2 ? 'rgba(250,204,21,.6)' : 'rgba(68,128,216,.4)'
      const gsw = isSel2 ? '1.2' : '0.5'
      let s2 = `<g data-id="${t.id}" style="cursor:move;opacity:${op}">`
      if (['round', 'round_sm', 'round_lg'].includes(t.shape))
        s2 += `<circle cx="${cx2}" cy="${cy2}" r="${t.h/2}" fill="rgba(68,128,216,.15)" stroke="${gst}" stroke-width="${gsw}"/>`
      else
        s2 += `<rect x="${t.x}" y="${t.y}" width="${t.w}" height="${t.h}" rx="2.5" fill="rgba(68,128,216,.1)" stroke="${gst}" stroke-width="${gsw}"/>`
      s2 += `<text x="${cx2}" y="${cy2}" text-anchor="middle" dominant-baseline="central" font-size="2.5" font-family="DM Mono,monospace" font-weight="700" fill="rgba(68,128,216,.5)" style="pointer-events:none">${t.n}</text>`
      return s2 + '</g>'
    }
  }

  const isSel    = t.id === selId
  const multiSel = selMulti.includes(t.id)
  const hlObj    = comboHL ? combos.find(c => c.id === comboHL) : null
  const inHL     = hlObj ? hlObj.tables.includes(t.id) : false

  const inCombo = inCombos.length > 0
  const tRef   = Math.min(t.w, t.h)
  // Violet quand le combo est actif (HL) — sinon bleu normal
  const fill   = isSel ? 'rgba(250,204,21,.08)' : multiSel ? 'rgba(60,200,112,.12)' : inHL ? 'rgba(144,96,224,.12)' : 'rgba(68,128,216,.11)'
  const stroke = isSel ? '#facc15' : multiSel ? '#4ade80' : inHL ? 'rgba(180,130,255,.55)' : 'rgba(68,128,216,.45)'
  const tcol   = isSel ? '#facc15' : multiSel ? '#4ade80' : inHL ? 'rgba(180,130,255,.85)' : '#4480d8'
  const sw     = isSel ? tRef*0.125 : multiSel ? tRef*0.125 : inHL ? tRef*0.067 : tRef*0.067

  const cx = t.x + t.w / 2, cy = t.y + t.h / 2
  // Tables un peu transparentes quand combo actif — chaises + formes restent visibles
  let s = `<g data-id="${t.id}" style="cursor:move${inHL ? ';opacity:.35' : ''}">`

  // Chaises toujours visibles (y compris quand combo actif)
  s += spChairsSvg(t)

  // Effet 3D selon hauteur de table
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

  if (['round', 'round_sm', 'round_lg'].includes(t.shape)) {
    const r = t.h / 2
    s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
    if (isBasse) s += `<circle cx="${cx}" cy="${cy}" r="${(r - tRef*0.10).toFixed(2)}" fill="none" stroke="${stroke}" stroke-width="${(tRef*0.037).toFixed(2)}" stroke-dasharray="1.5,1"/>`
    if (isSel) s += `<circle cx="${cx}" cy="${cy}" r="${(r + tRef*0.075).toFixed(2)}" fill="none" stroke="#facc15" stroke-width="${(tRef*0.10).toFixed(2)}" opacity="0.3"/>`
  } else if (t.shape === 'oval') {
    const rxe = t.w / 2, rye = t.h / 2
    s += `<ellipse cx="${cx}" cy="${cy}" rx="${rxe}" ry="${rye}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
    if (isBasse) s += `<ellipse cx="${cx}" cy="${cy}" rx="${(rxe - tRef*0.10).toFixed(2)}" ry="${(rye - tRef*0.083).toFixed(2)}" fill="none" stroke="${stroke}" stroke-width="${(tRef*0.037).toFixed(2)}" stroke-dasharray="1.5,1"/>`
    if (isSel) s += `<ellipse cx="${cx}" cy="${cy}" rx="${(rxe + tRef*0.067).toFixed(2)}" ry="${(rye + tRef*0.067).toFixed(2)}" fill="none" stroke="#facc15" stroke-width="${(tRef*0.10).toFixed(2)}" opacity="0.3"/>`
  } else if (t.shape === 'banquette') {
    s += `<rect x="${t.x}" y="${t.y}" width="${t.w}" height="${t.h}" rx="1.5" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
    if (isBasse) s += `<rect x="${(t.x+tRef*0.10).toFixed(2)}" y="${(t.y+tRef*0.083).toFixed(2)}" width="${(t.w-tRef*0.20).toFixed(2)}" height="${(t.h-tRef*0.167).toFixed(2)}" rx="1" fill="none" stroke="${stroke}" stroke-width="${(tRef*0.037).toFixed(2)}" stroke-dasharray="1.5,1"/>`
    if (isSel) s += `<rect x="${(t.x-tRef*0.05).toFixed(2)}" y="${(t.y-tRef*0.05).toFixed(2)}" width="${(t.w+tRef*0.10).toFixed(2)}" height="${(t.h+tRef*0.10).toFixed(2)}" rx="2" fill="none" stroke="#facc15" stroke-width="${(tRef*0.10).toFixed(2)}" opacity="0.3"/>`
  } else if (t.shape === 'bar') {
    const bh = t.h * 0.5, by = t.y + (t.h - t.h * 0.5) / 2
    s += `<rect x="${t.x}" y="${by}" width="${t.w}" height="${bh}" rx="1" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
    if (isSel) s += `<rect x="${(t.x-tRef*0.05).toFixed(2)}" y="${(by-tRef*0.05).toFixed(2)}" width="${(t.w+tRef*0.10).toFixed(2)}" height="${(bh+tRef*0.10).toFixed(2)}" rx="1.5" fill="none" stroke="#facc15" stroke-width="${(tRef*0.10).toFixed(2)}" opacity="0.3"/>`
  } else {
    const rxv = t.shape === 'square' ? 2.5 : 1.5
    s += `<rect x="${t.x}" y="${t.y}" width="${t.w}" height="${t.h}" rx="${rxv}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
    if (isBasse) s += `<rect x="${(t.x+tRef*0.10).toFixed(2)}" y="${(t.y+tRef*0.083).toFixed(2)}" width="${(t.w-tRef*0.20).toFixed(2)}" height="${(t.h-tRef*0.167).toFixed(2)}" rx="${rxv-0.5}" fill="none" stroke="${stroke}" stroke-width="${(tRef*0.037).toFixed(2)}" stroke-dasharray="1.5,1"/>`
    if (isSel) s += `<rect x="${(t.x-tRef*0.05).toFixed(2)}" y="${(t.y-tRef*0.05).toFixed(2)}" width="${(t.w+tRef*0.10).toFixed(2)}" height="${(t.h+tRef*0.10).toFixed(2)}" rx="${rxv+.6}" fill="none" stroke="#facc15" stroke-width="${(tRef*0.10).toFixed(2)}" opacity="0.3"/>`
  }

  // Pas de badge 🔗 — la fusion visuelle permanente remplace

  // ── Blocked : hachures diagonales clippées + X rouge ──
  if (t.blocked) {
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
    for (let i = -4; i <= 4; i++) {
      const off = i * gap
      s += `<line x1="${t.x + off}" y1="${t.y}" x2="${t.x + t.w + off}" y2="${t.y + t.h}" stroke="rgba(100,116,139,.25)" stroke-width="0.5"/>`
    }
    s += `</g>`
    s += `<line x1="${cx - tRef*0.18}" y1="${cy - tRef*0.18}" x2="${cx + tRef*0.18}" y2="${cy + tRef*0.18}" stroke="rgba(220,80,80,.55)" stroke-width="${(tRef*0.06).toFixed(2)}" stroke-linecap="round" style="pointer-events:none"/>`
    s += `<line x1="${cx + tRef*0.18}" y1="${cy - tRef*0.18}" x2="${cx - tRef*0.18}" y2="${cy + tRef*0.18}" stroke="rgba(220,80,80,.55)" stroke-width="${(tRef*0.06).toFixed(2)}" stroke-linecap="round" style="pointer-events:none"/>`
  }

  // ── Held : contour pointillé ambre + cadenas ──
  if (t.held && !t.blocked) {
    if (['round', 'round_sm', 'round_lg'].includes(t.shape))
      s += `<circle cx="${cx}" cy="${cy}" r="${(t.h/2 + tRef*0.06).toFixed(2)}" fill="none" stroke="rgba(232,165,48,.5)" stroke-width="${(tRef*0.05).toFixed(2)}" stroke-dasharray="1.5,1.2" style="pointer-events:none"/>`
    else if (t.shape === 'oval')
      s += `<ellipse cx="${cx}" cy="${cy}" rx="${(t.w/2 + tRef*0.06).toFixed(2)}" ry="${(t.h/2 + tRef*0.06).toFixed(2)}" fill="none" stroke="rgba(232,165,48,.5)" stroke-width="${(tRef*0.05).toFixed(2)}" stroke-dasharray="1.5,1.2" style="pointer-events:none"/>`
    else
      s += `<rect x="${(t.x - tRef*0.04).toFixed(2)}" y="${(t.y - tRef*0.04).toFixed(2)}" width="${(t.w + tRef*0.08).toFixed(2)}" height="${(t.h + tRef*0.08).toFixed(2)}" rx="3" fill="none" stroke="rgba(232,165,48,.5)" stroke-width="${(tRef*0.05).toFixed(2)}" stroke-dasharray="1.5,1.2" style="pointer-events:none"/>`
    s += `<text x="${cx}" y="${(cy - tRef*0.05).toFixed(2)}" text-anchor="middle" dominant-baseline="central" font-size="${(tRef*0.22).toFixed(1)}" style="pointer-events:none">🔒</text>`
  }

  // Labels masqués quand combo actif — seul le label combo s'affiche au centre du groupe
  const fsN = (tRef * 0.25).toFixed(1)
  const fsC = (tRef * 0.167).toFixed(1)
  if (!inHL) {
    s += `<text x="${cx}" y="${(cy - tRef*0.108).toFixed(2)}" text-anchor="middle" dominant-baseline="central" font-size="${fsN}" font-family="DM Mono,monospace" font-weight="800" fill="${tcol}" style="pointer-events:none">${t.n}</text>`
    s += `<text x="${cx}" y="${(cy + tRef*0.208).toFixed(2)}" text-anchor="middle" font-size="${fsC}" font-family="DM Mono,monospace" fill="${tcol}" opacity=".45" style="pointer-events:none">${t.capMax}p</text>`
  }
  // Badge hauteur (H = haute, B = basse) — coin bas-gauche
  const fsB = fsC
  if (t.tableH === 'haute') s += `<text x="${(t.x + tRef*0.083).toFixed(2)}" y="${(t.y+t.h - tRef*0.067).toFixed(2)}" dominant-baseline="auto" font-size="${fsB}" font-family="DM Mono,monospace" font-weight="800" fill="${tcol}" opacity=".6" style="pointer-events:none">H</text>`
  if (t.tableH === 'basse') s += `<text x="${(t.x + tRef*0.083).toFixed(2)}" y="${(t.y+t.h - tRef*0.067).toFixed(2)}" dominant-baseline="auto" font-size="${fsB}" font-family="DM Mono,monospace" font-weight="800" fill="${tcol}" opacity=".6" style="pointer-events:none">B</text>`

  return s + '</g>'
}

// ── Fusion visuelle d'un combo (pont exact entre tables) ──
function renderComboFusion(combo: Combo, tables: Table[], isHL: boolean): string {
  const ctbls = combo.tables.map(id => tables.find(t => t.id === id)).filter(Boolean) as Table[]
  if (ctbls.length < 2) return ''

  const lx  = Math.min(...ctbls.map(t => t.x))
  const ly  = Math.min(...ctbls.map(t => t.y))
  const lx2 = Math.max(...ctbls.map(t => t.x + t.w))
  const ly2 = Math.max(...ctbls.map(t => t.y + t.h))
  const lw  = lx2 - lx, lh = ly2 - ly
  const lcx = (lx + lx2) / 2, lcy = (ly + ly2) / 2

  const capTxt   = `${combo.capOverride ?? combo.cap}p`
  const labelTxt = `${combo.label} · ${capTxt}`
  const lblW     = labelTxt.length * 1.5 + 3  // largeur estimée du label

  // Non-HL : juste un liseré pointillé discret — les tables gardent leurs labels bleus
  if (!isHL) {
    const visual = `<g style="pointer-events:none"><rect x="${(lx-1).toFixed(1)}" y="${(ly-1).toFixed(1)}" width="${(lw+2).toFixed(1)}" height="${(lh+2).toFixed(1)}" rx="3" fill="none" stroke="rgba(180,130,255,.45)" stroke-width="0.8" stroke-dasharray="2.5,1.5"/></g>`
    const hitbox = `<rect data-combo-activate="${combo.id}" x="${(lx-1).toFixed(1)}" y="${(ly-1).toFixed(1)}" width="${(lw+2).toFixed(1)}" height="${(lh+2).toFixed(1)}" rx="3" fill="none" stroke="transparent" stroke-width="4" style="cursor:pointer;pointer-events:stroke"/>`
    return visual + hitbox
  }

  // HL (actif) : contour violet + label combo au centre (même style que les tables, en violet)
  // Taille de référence = moyenne des tables du combo, identique au calcul des tables individuelles
  const cRef = ctbls.reduce((sum, t) => sum + Math.min(t.w, t.h), 0) / ctbls.length
  const fsN  = (cRef * 0.25).toFixed(1)
  const fsC  = (cRef * 0.167).toFixed(1)
  let s = ''
  // Contour violet plein (pas de tirets) quand combo actif
  s += `<rect x="${(lx-1).toFixed(1)}" y="${(ly-1).toFixed(1)}" width="${(lw+2).toFixed(1)}" height="${(lh+2).toFixed(1)}" rx="3" fill="none" stroke="rgba(180,130,255,.7)" stroke-width="1.2"/>`
  // Fond semi-transparent derrière le label pour masquer la jonction des tables paires
  const lblPadX = cRef * 0.6
  const lblPadY = cRef * 0.35
  s += `<rect x="${(lcx - lblPadX).toFixed(1)}" y="${(lcy - lblPadY).toFixed(1)}" width="${(lblPadX*2).toFixed(1)}" height="${(lblPadY*2).toFixed(1)}" rx="2" fill="rgba(30,30,42,.55)" style="pointer-events:none"/>`
  // Label combo — nom + capacité, dimensions identiques aux tables
  s += `<text x="${lcx.toFixed(1)}" y="${(lcy - cRef*0.108).toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="${fsN}" font-family="DM Mono,monospace" font-weight="800" fill="rgba(180,130,255,.95)" style="pointer-events:none">${combo.label}</text>`
  s += `<text x="${lcx.toFixed(1)}" y="${(lcy + cRef*0.208).toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="${fsC}" font-family="DM Mono,monospace" fill="rgba(180,130,255,.6)" style="pointer-events:none">${capTxt}</text>`

  return `<g style="pointer-events:none">${s}</g>`
}


function spRoomSvg(r: RoomItem, sel: boolean): string {
  let s = `<g data-id="${r.id}" style="cursor:move">`
  s += spRoomBodySvg(r)
  if (sel) s += `<rect x="${r.x-.8}" y="${r.y-.8}" width="${r.w+1.6}" height="${r.h+1.6}" rx="2" fill="none" stroke="#facc15" stroke-width="1.5" opacity="0.35"/>`
  return s + '</g>'
}

// ── Composant principal ───────────────────────────

export function SetupPlan() {
  const { tables: storeTables, salles: storeSalles, combos: storeCombos, roomItems: storeRoomItems, setTables, setCombos, setRoomItems: setStoreRoomItems } = useAppStore()
  const { toast } = useToast()

  // Copies locales pour édition
  const [tables,    setLocalTables] = useState<Table[]>(() => (storeTables || []) as Table[])
  const [combos,    setLocalCombos] = useState<Combo[]>(() => (storeCombos || []) as Combo[])
  const [roomItems, setRoomItems]   = useState<RoomItem[]>(() => (storeRoomItems || []) as RoomItem[])

  // État éditeur
  const [salle,     setSalle]     = useState('')
  const [layer,     setLayer]     = useState('all')
  const [showGrid,  setShowGrid]  = useState(true)
  const [selId,     setSelId]     = useState<string | null>(null)
  const [selMulti,  setSelMulti]  = useState<string[]>([])
  const [comboMode, setComboMode] = useState(false)
  const [comboHL,   setComboHL]   = useState<string | null>(null)
  const [canvasSizes, setCanvasSizes] = useState<Record<string, {w:number; h:number}>>({})
  const canvasW = canvasSizes[salle]?.w ?? 120
  const canvasH = canvasSizes[salle]?.h ?? 80
  const [rightTab,  setRightTab]  = useState<'props' | 'combos'>('props')
  const [newTableState, setNewTableState] = useState<'normal' | 'blocked' | 'held'>('normal')
  const [comboPicker, setComboPicker] = useState<{ x: number; y: number; tableId: string; combos: Combo[] } | null>(null)

  // Refs pour drag (pas de re-render pendant le drag)
  const svgRef       = useRef<SVGSVGElement>(null)
  // cntRef démarre au-dessus du plus grand ID existant pour éviter les conflits
  const _existingTables = (storeTables || []) as Table[]
  const _maxExistingId  = _existingTables.length
    ? Math.max(200, ..._existingTables.map(t => parseInt(t.id.replace(/\D/g, '')) || 0))
    : 200
  const cntRef          = useRef(_maxExistingId)
  const lastAddRef   = useRef(0)   // anti-double-add guard
  const dragRef      = useRef({ dragging: false, resizing: false, id: null as string | null, ox: 0, oy: 0, startW: 0, startH: 0, groupIds: [] as string[], lastDx: 0, lastDy: 0 })
  const basePositionsRef = useRef<Record<string, {x: number; y: number}>>({})  // positions de repos avant activation combo

  // Refs miroir pour accès dans les handlers
  const tablesRef    = useRef(tables)
  const roomsRef     = useRef(roomItems)
  const combosRef    = useRef(combos)
  const selIdRef     = useRef(selId)
  const selMultiRef  = useRef(selMulti)
  const comboModeRef = useRef(comboMode)
  const comboHLRef   = useRef(comboHL)
  const layerRef     = useRef(layer)
  const showGridRef  = useRef(showGrid)
  const salleRef     = useRef(salle)
  const canvasWRef      = useRef(120)
  const canvasHRef      = useRef(80)
  const canvasSizesRef  = useRef<Record<string, {w:number; h:number}>>({})
  const snapLinesRef     = useRef<{type:'h'|'v', pos:number}[]>([])
  const groupStartPosRef = useRef<Record<string, {x:number; y:number}>>({})

  useEffect(() => { tablesRef.current    = tables    }, [tables])
  useEffect(() => { roomsRef.current     = roomItems }, [roomItems])
  useEffect(() => { combosRef.current    = combos    }, [combos])
  useEffect(() => { selIdRef.current     = selId     }, [selId])
  useEffect(() => { selMultiRef.current  = selMulti  }, [selMulti])
  useEffect(() => { comboModeRef.current = comboMode }, [comboMode])
  useEffect(() => { comboHLRef.current   = comboHL   }, [comboHL])
  useEffect(() => { layerRef.current     = layer     }, [layer])
  useEffect(() => { showGridRef.current  = showGrid  }, [showGrid])
  useEffect(() => { salleRef.current     = salle     }, [salle])
  useEffect(() => { canvasWRef.current = canvasW }, [canvasW])
  useEffect(() => { canvasHRef.current = canvasH }, [canvasH])
  useEffect(() => { canvasSizesRef.current = canvasSizes }, [canvasSizes])

  // Salles actives
  const activeSalles = (storeSalles || [])
    .filter((s: any) => s.active)
    .sort((a: any, b: any) => (a.priority || 99) - (b.priority || 99))
    .map((s: any) => s.name as string)
  if (!activeSalles.length) activeSalles.push('Principale')

  // Init salle
  useEffect(() => {
    if (!salleRef.current && activeSalles.length) {
      setSalle(activeSalles[0])
      salleRef.current = activeSalles[0]
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSalles.join(',')])

  // ── Snap ──────────────────────────────────────────
  const spSnap = (v: number) => Math.round(v / SP_GRID) * SP_GRID

  // ── Coordonnées SVG ────────────────────────────────
  const getSvgPt = (e: MouseEvent | TouchEvent) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const pt  = svg.createSVGPoint()
    const src = (e as TouchEvent).touches ? (e as TouchEvent).touches[0] : e as MouseEvent
    pt.x = src.clientX; pt.y = src.clientY
    const ctm = svg.getScreenCTM()
    return ctm ? pt.matrixTransform(ctm.inverse()) : { x: 0, y: 0 }
  }

  const isRoom = (id: string) => id.startsWith('ri')

  // ── Rendu SVG ──────────────────────────────────────
  const renderCanvas = useCallback(() => {
    const svg = svgRef.current
    if (!svg) return
    const W = canvasWRef.current, H = canvasHRef.current
    const s = salleRef.current
    const ctx: SvgCtx = {
      selId:    selIdRef.current,
      selMulti: selMultiRef.current,
      comboHL:  comboHLRef.current,
      combos:   combosRef.current,
      layer:    layerRef.current,
    }
    const tbls   = tablesRef.current.filter(t => t.salle === s)
    const ritems = roomsRef.current.filter(r => r.salle === s)

    let h = ''
    // ── Grille SVG (affichage optionnel — snap toujours actif) ─────────
    if (showGridRef.current) {
      // Points discrets tous les 2 unités (fin, non envahissant)
      h += `<defs>
        <pattern id="sp-dot" width="2" height="2" patternUnits="userSpaceOnUse">
          <circle cx="0" cy="0" r="0.2" fill="rgba(68,128,216,.15)"/>
        </pattern>
      </defs>`
      h += `<rect x="0" y="0" width="${W}" height="${H}" fill="url(#sp-dot)" pointer-events="none"/>`
      // Lignes majeures tous les 10 unités (très fines)
      for (let gx = 0; gx <= W; gx += 10)
        h += `<line x1="${gx}" y1="0" x2="${gx}" y2="${H}" stroke="rgba(68,128,216,.07)" stroke-width="0.25" pointer-events="none"/>`
      for (let gy = 0; gy <= H; gy += 10)
        h += `<line x1="0" y1="${gy}" x2="${W}" y2="${gy}" stroke="rgba(68,128,216,.07)" stroke-width="0.25" pointer-events="none"/>`
    }
    // Fond transparent pour capter les clics sur zone vide
    h += `<rect x="0" y="0" width="${W}" height="${H}" fill="rgba(0,0,0,0.001)" pointer-events="all"/>`

    ritems.forEach(r => { h += spRoomSvg(r, r.id === ctx.selId) })

    // Fond draggable du combo actif — AVANT les tables pour que les tables soient cliquables par-dessus
    if (ctx.comboHL) {
      const hlC = combosRef.current.find(c => c.id === ctx.comboHL)
      if (hlC) {
        const salleTblsHL = tablesRef.current.filter(t => t.salle === s)
        const ctblsHL = hlC.tables.map(id => salleTblsHL.find(t => t.id === id)).filter(Boolean) as Table[]
        if (ctblsHL.length >= 2) {
          const bx = Math.min(...ctblsHL.map(t => t.x)) - 2
          const by = Math.min(...ctblsHL.map(t => t.y)) - 2
          const bw = Math.max(...ctblsHL.map(t => t.x + t.w)) - bx + 2
          const bh = Math.max(...ctblsHL.map(t => t.y + t.h)) - by + 2
          h += `<rect data-combo-drag="${hlC.id}" x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" fill="rgba(144,96,224,.05)" rx="3" style="cursor:move" pointer-events="all"/>`
        }
      }
    }

    tbls.forEach(t   => { h += spTableSvg(t, ctx) })

    // Fusion visuelle — filtrée par calque actif
    const salleTblsForFusion = tablesRef.current.filter(t => t.salle === s)
    combosRef.current
      .filter(c => c.tables.some(id => salleTblsForFusion.find(t => t.id === id)))
      .filter(c => {
        const lyr = ctx.layer
        if (lyr === 'all') return true
        if (lyr === 'solo') return false
        if (lyr.startsWith('size_')) return c.tables.length === parseInt(lyr.replace('size_', ''))
        return true
      })
      .forEach(c => { h += renderComboFusion(c, salleTblsForFusion, c.id === ctx.comboHL) })

    // Handles sur sélection
    const sid = ctx.selId
    const selObj = sid ? (isRoom(sid) ? ritems.find(r => r.id === sid) : tbls.find(t => t.id === sid)) : null
    if (selObj) {
      h += `<g data-action="delete" style="cursor:pointer">`
        + `<circle cx="${selObj.x+selObj.w}" cy="${selObj.y}" r="2.5" fill="#e53e3e" stroke="var(--surf2)" stroke-width="0.6"/>`
        + `<text x="${selObj.x+selObj.w}" y="${selObj.y}" text-anchor="middle" dominant-baseline="central" font-size="2.6" font-weight="900" fill="white" style="pointer-events:none">✕</text></g>`
      h += `<g data-action="resize" data-rid="${selObj.id}" style="cursor:se-resize">`
        + `<circle cx="${selObj.x+selObj.w}" cy="${selObj.y+selObj.h}" r="2.5" fill="var(--bl)" stroke="var(--surf2)" stroke-width="0.6"/>`
        + `<text x="${selObj.x+selObj.w}" y="${selObj.y+selObj.h}" text-anchor="middle" dominant-baseline="central" font-size="2.4" fill="white" style="pointer-events:none">⇲</text></g>`
    }

    if (!tbls.length && !ritems.length)
      h += `<text x="${W/2}" y="${H/2}" text-anchor="middle" font-size="3.2" font-family="DM Mono,monospace" fill="rgba(68,128,216,.2)">← Cliquez une forme dans la palette</text>`

    // Snap lines d'alignement (guides visuels lors du drag)
    snapLinesRef.current.forEach(ln => {
      if (ln.type === 'h')
        h += `<line x1="0" y1="${ln.pos.toFixed(2)}" x2="${W}" y2="${ln.pos.toFixed(2)}" stroke="rgba(248,113,113,.9)" stroke-width="0.5" stroke-dasharray="3,1.5" pointer-events="none"/>`
      else
        h += `<line x1="${ln.pos.toFixed(2)}" y1="0" x2="${ln.pos.toFixed(2)}" y2="${H}" stroke="rgba(248,113,113,.9)" stroke-width="0.5" stroke-dasharray="3,1.5" pointer-events="none"/>`
    })

    svg.innerHTML = h
  }, [])

  useEffect(() => { renderCanvas() }, [tables, roomItems, combos, salle, layer, showGrid, selId, selMulti, comboHL, canvasW, canvasH, renderCanvas])

  // ── Delete ─────────────────────────────────────────
  const handleDelete = useCallback(() => {
    const id = selIdRef.current
    if (!id) return
    if (isRoom(id)) setRoomItems(prev => prev.filter(r => r.id !== id))
    else {
      // Mettre à jour le ref immédiatement pour que addTable ait les bonnes données
      tablesRef.current = tablesRef.current.filter(t => t.id !== id)
      setLocalTables(prev => prev.filter(t => t.id !== id))
      setLocalCombos(prev => prev.filter(c => !c.tables.includes(id)))
      combosRef.current = combosRef.current.filter(c => !c.tables.includes(id))
    }
    setSelId(null); selIdRef.current = null
  }, [])

  // ── Activation / désactivation combo avec gestion positions ──
  // ── Coller définitivement les tables d'un combo (appelé à la création + changement align/orient) ──
  function packComboNow(comboId: string) {
    const combo = combosRef.current.find(c => c.id === comboId)
    if (!combo) return
    const ctbls = combo.tables.map(id => tablesRef.current.find(t => t.id === id)).filter(Boolean) as Table[]
    if (ctbls.length < 2) return
    // Utiliser origSpan (positions avant pack) pour que L/C/R soient distincts
    // Si origSpan absent, calculer depuis les positions originales sauvegardées sur le combo
    let span: { x1: number; x2: number; y1: number; y2: number }
    if (combo.origSpan) {
      span = combo.origSpan
    } else if (combo.origPositions) {
      const ops = combo.origPositions
      const ids = ctbls.map(t => t.id)
      const xs = ids.map(id => ops[id]?.x ?? ctbls.find(t2 => t2.id === id)!.x)
      const ys = ids.map(id => ops[id]?.y ?? ctbls.find(t2 => t2.id === id)!.y)
      span = {
        x1: Math.min(...xs),
        x2: Math.max(...xs.map((x, i) => x + ctbls[i].w)),
        y1: Math.min(...ys),
        y2: Math.max(...ys.map((y, i) => y + ctbls[i].h)),
      }
    } else {
      span = {
        x1: Math.min(...ctbls.map(t => t.x)), x2: Math.max(...ctbls.map(t => t.x + t.w)),
        y1: Math.min(...ctbls.map(t => t.y)), y2: Math.max(...ctbls.map(t => t.y + t.h)),
      }
    }
    console.log('[COMBO] packComboNow', comboId, 'orient:', combo.orient, 'align:', combo.align ?? 'L', 'tables:', ctbls.map(t => `${t.n}(${t.id})`), 'span:', span)
    packComboTables(ctbls, span, combo.align ?? 'L', combo.orient)
  }

  function activateComboHL(comboId: string) {
    const combo = combosRef.current.find(c => c.id === comboId)
    if (!combo) return
    // Utiliser les positions originales du combo (sauvées à la création)
    // Si disponibles, ce sont les VRAIES positions individuelles (avant tout pack)
    if (combo.origPositions && Object.keys(combo.origPositions).length > 0) {
      basePositionsRef.current = { ...combo.origPositions }
    } else {
      // Fallback : sauvegarder positions actuelles
      const saved: Record<string, {x: number; y: number}> = {}
      combo.tables.forEach(tid => {
        const t = tablesRef.current.find(t => t.id === tid)
        if (t) saved[tid] = { x: t.x, y: t.y }
      })
      basePositionsRef.current = saved
    }
    // Coller les tables pour la prévisualisation combo
    packComboNow(comboId)
    // Effacer la sélection individuelle : quand le combo est actif, pas de handles delete/resize
    setSelId(null); selIdRef.current = null
    setComboHL(comboId); comboHLRef.current = comboId
  }

  function deactivateComboHL() {
    // Restaurer les positions initiales des tables du combo actif
    const saved = basePositionsRef.current
    if (saved && Object.keys(saved).length > 0) {
      const updated = tablesRef.current.map(t =>
        saved[t.id] ? { ...t, x: saved[t.id].x, y: saved[t.id].y } : t
      )
      tablesRef.current = updated
      setLocalTables(updated)
      setTables(updated)  // Persister les positions restaurées dans le store
      basePositionsRef.current = {}
    }
    setComboHL(null); comboHLRef.current = null
  }

  // ── Mouse / Touch ──────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const target   = e.target as Element
    const actionEl = target.closest('[data-action]') as Element | null
    const groupEl  = target.closest('[data-id]') as Element | null

    if (actionEl?.getAttribute('data-action') === 'delete') { handleDelete(); return }

    if (actionEl?.getAttribute('data-action') === 'resize') {
      const rid = actionEl.getAttribute('data-rid')
      if (!rid) return
      const obj = isRoom(rid) ? roomsRef.current.find(r => r.id === rid) : tablesRef.current.find(t => t.id === rid)
      if (!obj) return
      const pt = getSvgPt(e.nativeEvent as MouseEvent | TouchEvent)
      dragRef.current = { dragging: false, resizing: true, id: rid, ox: pt.x, oy: pt.y, startW: obj.w, startH: obj.h, groupIds: [], lastDx: 0, lastDy: 0 }
      return
    }

    // ── Clic sur le liseré pointillé d'un combo inactif → activer le combo ──
    const comboActivateEl = (target as Element).closest('[data-combo-activate]') as Element | null
    if (comboActivateEl) {
      const comboId = comboActivateEl.getAttribute('data-combo-activate')!
      if (comboHLRef.current && comboHLRef.current !== comboId) deactivateComboHL()
      activateComboHL(comboId)
      setRightTab('combos')
      return
    }

    // ── Drag du groupe combo (clic sur le fond entre les tables) ──────────
    const comboDragEl = (target as Element).closest('[data-combo-drag]') as Element | null
    if (comboDragEl && !groupEl) {
      const comboId = comboDragEl.getAttribute('data-combo-drag')!
      if (comboId === comboHLRef.current) {
        const combo = combosRef.current.find(c => c.id === comboId)
        if (combo) {
          setSelId(null); selIdRef.current = null  // pas de handles delete/resize
          const pt2 = getSvgPt(e.nativeEvent as MouseEvent | TouchEvent)
          const startPos: Record<string, {x:number; y:number}> = {}
          combo.tables.forEach(id => {
            const t = tablesRef.current.find(t => t.id === id)
            if (t) startPos[id] = { x: t.x, y: t.y }
          })
          groupStartPosRef.current = startPos
          dragRef.current = { dragging: true, resizing: false, id: null as any, ox: pt2.x, oy: pt2.y, startW: 0, startH: 0, groupIds: combo.tables, lastDx: 0, lastDy: 0 }
          return
        }
      }
    }

    if (!groupEl) {
      setComboPicker(null)
      if (comboModeRef.current) {
        cancelCombo()
      } else {
        setSelId(null);  selIdRef.current  = null
        setSelMulti([]); selMultiRef.current = []
        deactivateComboHL()
      }
      return
    }
    setComboPicker(null)

    const id = groupEl.getAttribute('data-id')!
    const pt = getSvgPt(e.nativeEvent as MouseEvent | TouchEvent)

    // Mode combo
    if (comboModeRef.current) {
      const tbl = tablesRef.current.find(t => t.id === id)
      console.log('[COMBO-SEL] clicked id:', id, 'name:', tbl?.n, 'salle:', tbl?.salle)
      const cur  = selMultiRef.current
      const next = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]
      setSelMulti(next); selMultiRef.current = next
      setSelId(id); selIdRef.current = id
      return
    }

    // Si table en combo
    if (!isRoom(id)) {
      const myCombos = combosRef.current.filter(c => c.tables.includes(id))
      const activeCombo = myCombos.find(c => c.id === comboHLRef.current)

      if (activeCombo) {
        // Table du combo actif → drag du groupe entier (pas de handles delete/resize)
        setSelId(null); selIdRef.current = null
        const startPos: Record<string, {x:number; y:number}> = {}
        activeCombo.tables.forEach(tid => {
          const t = tablesRef.current.find(t => t.id === tid)
          if (t) startPos[tid] = { x: t.x, y: t.y }
        })
        groupStartPosRef.current = startPos
        dragRef.current = { dragging: true, resizing: false, id: null as any, ox: pt.x, oy: pt.y, startW: 0, startH: 0, groupIds: activeCombo.tables, lastDx: 0, lastDy: 0 }
        return
      } else {
        // Table dans combo NON actif → sélection individuelle normale
        // (pour activer le combo, cliquer sur les tirets pointillés autour du groupe)
        if (comboHLRef.current) deactivateComboHL()
      }
    }

    // Sélection + drag — toujours sélectionner et basculer sur l'onglet props
    setSelId(id); selIdRef.current = id
    setSelMulti([]); selMultiRef.current = []
    if (!isRoom(id)) setRightTab('props')
    const obj = isRoom(id) ? roomsRef.current.find(r => r.id === id) : tablesRef.current.find(t => t.id === id)
    if (!obj) return
    const ne2 = e.nativeEvent as MouseEvent | TouchEvent
    clickStartRef.current = { id, x: 'clientX' in ne2 ? ne2.clientX : ne2.touches[0].clientX, y: 'clientY' in ne2 ? ne2.clientY : ne2.touches[0].clientY }
    dragRef.current = { dragging: true, resizing: false, id, ox: pt.x - obj.x, oy: pt.y - obj.y, startW: obj.w, startH: obj.h, groupIds: [], lastDx: 0, lastDy: 0 }
  }, [handleDelete])

  const handleMouseMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const dr = dragRef.current
    if (!dr.dragging && !dr.resizing) return
    e.preventDefault()
    const pt = getSvgPt(e.nativeEvent as MouseEvent | TouchEvent)
    if (dr.dragging && dr.groupIds.length > 0) {
      // ── Drag du groupe combo — toutes les tables bougent ensemble ──────
      snapLinesRef.current = []
      const dx = pt.x - dr.ox
      const dy = pt.y - dr.oy
      dr.lastDx = dx; dr.lastDy = dy
      const startPos = groupStartPosRef.current
      const newTbls = tablesRef.current.map(t => {
        if (!dr.groupIds.includes(t.id)) return t
        const s0 = startPos[t.id]
        if (!s0) return t
        return { ...t, x: Math.max(0, spSnap(s0.x + dx)), y: Math.max(0, spSnap(s0.y + dy)) }
      })
      tablesRef.current = newTbls
      setLocalTables(newTbls)
    } else if (dr.dragging && dr.id) {
      let nx = spSnap(Math.max(0, pt.x - dr.ox))
      let ny = spSnap(Math.max(0, pt.y - dr.oy))

      // ── Snap d'alignement sur les autres tables ────────────────────────
      if (!dr.id.startsWith('ri')) {
        const dragged = tablesRef.current.find(t => t.id === dr.id)
        if (dragged) {
          const others = tablesRef.current.filter(t => t.id !== dr.id && t.salle === dragged.salle)
          const SNAP_TH = SP_GRID * 3   // 6 unités de tolérance
          const lines: typeof snapLinesRef.current = []
          let bestY: number | null = null, bestYDist = SNAP_TH + 1
          let bestX: number | null = null, bestXDist = SNAP_TH + 1

          for (const o of others) {
            // Candidats Y : top-top, bottom-bottom, centre-centre
            const yC: [number, number][] = [
              [Math.abs(ny - o.y),                                    o.y],
              [Math.abs(ny + dragged.h - o.y - o.h),                  o.y + o.h - dragged.h],
              [Math.abs(ny + dragged.h / 2 - o.y - o.h / 2),          o.y + o.h / 2 - dragged.h / 2],
            ]
            for (const [dist, snap] of yC) {
              if (dist <= SNAP_TH && dist < bestYDist) { bestYDist = dist; bestY = snap }
            }
            // Candidats X : gauche-gauche, droite-droite, centre-centre
            const xC: [number, number][] = [
              [Math.abs(nx - o.x),                                    o.x],
              [Math.abs(nx + dragged.w - o.x - o.w),                  o.x + o.w - dragged.w],
              [Math.abs(nx + dragged.w / 2 - o.x - o.w / 2),          o.x + o.w / 2 - dragged.w / 2],
            ]
            for (const [dist, snap] of xC) {
              if (dist <= SNAP_TH && dist < bestXDist) { bestXDist = dist; bestX = snap }
            }
          }

          if (bestY !== null) {
            ny = Math.max(0, bestY)
            lines.push({ type: 'h', pos: ny })
            lines.push({ type: 'h', pos: ny + dragged.h })
          }
          if (bestX !== null) {
            nx = Math.max(0, bestX)
            lines.push({ type: 'v', pos: nx })
            lines.push({ type: 'v', pos: nx + dragged.w })
          }
          snapLinesRef.current = lines
        }
      } else {
        snapLinesRef.current = []
      }

      if (dr.id.startsWith('ri')) setRoomItems(prev => prev.map(r => r.id === dr.id ? { ...r, x: nx, y: ny } : r))
      else setLocalTables(prev => prev.map(t => t.id === dr.id ? { ...t, x: nx, y: ny } : t))
    } else if (dr.resizing && dr.id) {
      snapLinesRef.current = []
      const newW = Math.max(SP_MIN_SZ, spSnap(dr.startW + (pt.x - dr.ox)))
      const newH = Math.max(SP_MIN_SZ, spSnap(dr.startH + (pt.y - dr.oy)))
      if (dr.id.startsWith('ri')) setRoomItems(prev => prev.map(r => r.id === dr.id ? { ...r, w: newW, h: newH } : r))
      else setLocalTables(prev => prev.map(t => t.id === dr.id ? { ...t, w: newW, h: newH } : t))
    }
  }, [])

  const clickStartRef  = useRef<{ id: string; x: number; y: number } | null>(null)
  const pendingComboRef = useRef<{ tableId: string; combos: Combo[] } | null>(null)

  const handleMouseUp = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const dr = dragRef.current
    clickStartRef.current   = null
    pendingComboRef.current = null
    // Finaliser le drag de groupe — positions déjà mises à jour dans handleMouseMove
    if (dr.groupIds.length > 0) {
      groupStartPosRef.current = {}
      dr.groupIds = []
      dr.lastDx = 0; dr.lastDy = 0
      // Persister les nouvelles positions après drag groupe
      setTables(tablesRef.current)
    }
    dr.dragging  = false
    dr.resizing  = false
    // Effacer les snap lines
    if (snapLinesRef.current.length > 0) {
      snapLinesRef.current = []
      renderCanvas()
    }
  }, [])

  // ── Ajouter table ──────────────────────────────────
  function addTable(shape: string, capMin: number, capMax: number) {
    // Guard anti double-ajout (double-click ou touch+click simulé)
    const now = Date.now()
    if (now - lastAddRef.current < 350) return
    lastAddRef.current = now

    // Guard salle non initialisée (mount rapide) — ne jamais créer une table avec salle=''
    const curSalle = salleRef.current
    if (!curSalle) return

    cntRef.current++
    const { w, h } = defaultSize(shape)  // tailles de référence M — le zoom visuel dépend de la fenêtre canvas
    const salleTbls = tablesRef.current.filter(t => t.salle === curSalle)

    // Numéro : max global (toutes salles) + 1, préfixe "T" si les tables existantes l'utilisent
    const allNums = tablesRef.current.map(t => parseInt(t.n.replace(/\D/g, ''))).filter(n => !isNaN(n) && n > 0)
    const maxNum  = allNums.length ? Math.max(...allNums) : 0
    const usePrefix = tablesRef.current.length > 0
      ? tablesRef.current.some(t => /^T\d/i.test(t.n))  // détecte si les tables existantes utilisent "T"
      : true  // par défaut : "T"
    const nextN = usePrefix ? `T${maxNum + 1}` : String(maxNum + 1)

    // Position : centre du canvas, léger décalage en cascade, clampé dans les limites du plan
    const W = Math.max(60, canvasWRef.current)
    const H = Math.max(40, canvasHRef.current)
    const cascade = salleTbls.length
    const px = spSnap(Math.min(W - w, Math.max(0, W / 2 - w / 2 + (cascade % 6) * SP_LAY_GAP)))
    const py = spSnap(Math.min(H - h, Math.max(0, H / 2 - h / 2 + Math.floor(cascade / 6) * SP_LAY_GAP * 2)))

    const newTable: Table = {
      id: `t${cntRef.current}`,
      n: nextN,
      shape: shape as Table['shape'],
      capMin, capMax,
      x: px,
      y: py,
      w, h,
      salle: curSalle,
      active: true, priority: salleTbls.length + 1,
      blocked: newTableState === 'blocked', held: newTableState === 'held',
    }
    // Mettre à jour le ref immédiatement pour que le prochain appel ait la bonne liste
    tablesRef.current = [...tablesRef.current, newTable]
    setLocalTables(prev => [...prev, newTable])
    setSelId(newTable.id); selIdRef.current = newTable.id
    setSelMulti([]); selMultiRef.current = []
  }

  // ── Ajouter élément de salle ───────────────────────
  function addRoomItem(idx: number) {
    const type = ROOM_TYPES[idx]
    if (!type) return
    cntRef.current++
    const newItem: RoomItem = {
      id: `ri${cntRef.current}`, sym: type.sym, lbl: type.lbl, shape: type.shape,
      x: spSnap(5), y: spSnap(5), w: type.w ?? 10, h: type.h ?? 8, salle: salleRef.current,
    }
    setRoomItems(prev => [...prev, newItem])
    setSelId(newItem.id); selIdRef.current = newItem.id
  }

  // ── Coller les tables d'un combo (L=gauche, C=centré, R=droite) ──
  // L'ordre de tbls = ordre de sélection = ordre visuel gauche→droite (ou haut→bas)
  // Table de base (anchor) = tbls[0] pour L, tbls[last] pour R
  // orient: 'H' = horizontal forcé, 'V' = vertical forcé, undefined = auto
  function packComboTables(
    tbls: Table[],
    span: { x1: number; x2: number; y1: number; y2: number },
    align: 'L' | 'C' | 'R' = 'L',
    orient?: 'H' | 'V',
  ) {
    const spanW = span.x2 - span.x1
    const spanH = span.y2 - span.y1
    const updates: Record<string, { x: number; y: number }> = {}
    const base = tbls[0]
    const last = tbls[tbls.length - 1]

    // Orientation : forcée si définie, sinon défaut = Horizontal
    const isHorizontal = orient === 'V' ? false : true
    console.log('[COMBO] packComboTables', { orient, isHorizontal, align, spanW, spanH, tableOrder: tbls.map(t => `${t.n}(${t.x},${t.y})`) })

    if (isHorizontal) {
      // ── Horizontal ──
      const totalW  = tbls.reduce((s, t) => s + t.w, 0)
      const centerY = base.y + base.h / 2  // ancre verticale = centre de la 1ère table sélectionnée
      let packOrder: Table[]
      let startX: number
      if (align === 'R') {
        // R : ancre = bord DROIT du span original — tables s'empilent vers la gauche
        packOrder = tbls
        startX = spSnap(span.x2 - totalW)
      } else if (align === 'C') {
        packOrder = tbls
        startX = spSnap(span.x1 + (spanW - totalW) / 2)
      } else {
        // L : ancre = bord GAUCHE du span original — tables s'étendent vers la DROITE
        packOrder = tbls
        startX = spSnap(span.x1)
      }
      let cx = startX
      packOrder.forEach(t => {
        updates[t.id] = { x: cx, y: spSnap(centerY - t.h / 2) }
        cx += t.w
      })
    } else {
      // ── Vertical ──
      const totalH  = tbls.reduce((s, t) => s + t.h, 0)
      const centerX = base.x + base.w / 2  // ancre horizontale = centre de la 1ère table
      let packOrder: Table[]
      let startY: number
      if (align === 'R') {
        // R : ancre = bord BAS du span original — tables s'empilent vers le haut
        packOrder = tbls
        startY = spSnap(span.y2 - totalH)
      } else if (align === 'C') {
        packOrder = tbls
        startY = spSnap(span.y1 + (spanH - totalH) / 2)
      } else {
        // L : ancre = bord HAUT du span original — tables s'étendent vers le BAS
        packOrder = tbls
        startY = spSnap(span.y1)
      }
      let cy = startY
      packOrder.forEach(t => {
        updates[t.id] = { x: spSnap(centerX - t.w / 2), y: cy }
        cy += t.h
      })
    }

    tablesRef.current = tablesRef.current.map(t => updates[t.id] ? { ...t, ...updates[t.id] } : t)
    setLocalTables(prev => prev.map(t => updates[t.id] ? { ...t, ...updates[t.id] } : t))
    // Persister immédiatement dans le store Zustand pour survivre aux rechargements HMR / page
    setTables(tablesRef.current)
  }

  // ── Créer combo ────────────────────────────────────
  function createCombo() {
    const multi = selMultiRef.current
    if (multi.length < 2) return
    const tbls  = multi.map(id => tablesRef.current.find(t => t.id === id)).filter(Boolean) as Table[]
    const label = tbls.map(t => t.n).join('+')  // ordre de sélection = ordre visuel
    console.log('[COMBO] createCombo — selection order:', multi, '→ tables:', tbls.map(t => `${t.n}(id=${t.id}, ${t.x},${t.y}, ${t.w}x${t.h})`))
    const cap   = tbls.reduce((s, t) => s + t.capMax, 0)
    // On autorise plusieurs combos partageant des tables (configs alternatives : 24+25, 25+26, 24+25+26)
    // On évite uniquement les doublons exacts (même ensemble de tables)
    const key = [...multi].sort().join(',')
    const filtered = combosRef.current.filter(c => [...c.tables].sort().join(',') !== key)
    const origSpan = {
      x1: Math.min(...tbls.map(t => t.x)),
      x2: Math.max(...tbls.map(t => t.x + t.w)),
      y1: Math.min(...tbls.map(t => t.y)),
      y2: Math.max(...tbls.map(t => t.y + t.h)),
    }
    // Sauvegarder les positions individuelles AVANT le pack
    const origPositions: Record<string, { x: number; y: number }> = {}
    tbls.forEach(t => { origPositions[t.id] = { x: t.x, y: t.y } })
    // Orientation par défaut = H (horizontal, tables côte à côte dans l'ordre de sélection)
    const newCombo: Combo = { id: `combo_${Date.now()}`, label, tables: multi, cap, salle: salleRef.current, origSpan, orient: 'H', origPositions }
    const next = [...filtered, newCombo]
    setLocalCombos(next); combosRef.current = next
    setSelMulti([]); selMultiRef.current = []
    setComboMode(false); comboModeRef.current = false
    // Pack temporaire pour la prévisualisation — les positions individuelles seront restaurées au clic fond
    packComboNow(newCombo.id)
    // Sauvegarder dans basePositionsRef pour que deactivateComboHL restaure les bonnes positions
    basePositionsRef.current = { ...origPositions }
    // Persister combos dans le store
    setCombos(combosRef.current)
    // Vérification compatibilité — on crée quand même, on avertit
    const badShape = tbls.find(t => !COMBO_STRAIGHT.has(t.shape))
    const heights  = [...new Set(tbls.map(t => t.h))]
    if (badShape)          toast(`⚠ Combo ${label} créée — forme non rectangulaire (${badShape.n})`, 'warning')
    else if (heights.length > 1) toast(`⚠ Combo ${label} créée — hauteurs différentes`, 'warning')
    else                   toast(`Combo ${label} créée ✓`, 'success')
    // Activer le combo pour montrer l'overlay et permettre le drag groupé
    setRightTab('combos')
    setComboHL(newCombo.id); comboHLRef.current = newCombo.id
    setSelId(null); selIdRef.current = null
  }

  function cancelCombo() {
    setSelMulti([]); selMultiRef.current = []
    setComboMode(false); comboModeRef.current = false
  }

  // Raccourcis clavier — Échap = annuler, Entrée = valider combo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (comboModeRef.current) {
          cancelCombo()
        } else {
          setSelId(null); selIdRef.current = null
          setSelMulti([]); selMultiRef.current = []
          deactivateComboHL()
        }
      } else if (e.key === 'Enter' && comboModeRef.current && selMultiRef.current.length >= 2) {
        const multi = selMultiRef.current
        const tbls = multi.map(id => tablesRef.current.find(t => t.id === id)).filter(Boolean) as Table[]
        const label = tbls.map(t => t.n).join('+')  // ordre de sélection = ordre visuel
        const cap   = tbls.reduce((s, t) => s + t.capMax, 0)
        const key2 = [...multi].sort().join(',')
        const filtered = combosRef.current.filter(c => [...c.tables].sort().join(',') !== key2)
        const origSpan = {
          x1: Math.min(...tbls.map(t => t.x)), x2: Math.max(...tbls.map(t => t.x + t.w)),
          y1: Math.min(...tbls.map(t => t.y)), y2: Math.max(...tbls.map(t => t.y + t.h)),
        }
        const origPositions: Record<string, { x: number; y: number }> = {}
        tbls.forEach(t => { origPositions[t.id] = { x: t.x, y: t.y } })
        const newCombo: Combo = { id: `combo_${Date.now()}`, label, tables: multi, cap, salle: salleRef.current, origSpan, orient: 'H', origPositions }
        const next = [...filtered, newCombo]
        setLocalCombos(next); combosRef.current = next
        setSelMulti([]); selMultiRef.current = []
        setComboMode(false); comboModeRef.current = false
        packComboNow(newCombo.id)
        basePositionsRef.current = { ...origPositions }
        setCombos(combosRef.current)
        const badShape2 = tbls.find(t => !COMBO_STRAIGHT.has(t.shape))
        const heights2  = [...new Set(tbls.map(t => t.h))]
        if (badShape2)           toast(`⚠ Combo ${label} créée — forme non rectangulaire (${badShape2.n})`, 'warning')
        else if (heights2.length > 1) toast(`⚠ Combo ${label} créée — hauteurs différentes`, 'warning')
        else                     toast(`Combo ${label} créée ✓`, 'success')
        setRightTab('combos')
        setComboHL(newCombo.id); comboHLRef.current = newCombo.id
        setSelId(null); selIdRef.current = null
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Redimensionner le canvas (zoom) ────────────────
  // Scale les positions ET dimensions des tables de la salle en cours,
  // de sorte que le layout reste proportionnellement identique dans le nouveau viewBox.
  function resizeCanvas(newW: number, newH: number) {
    const oldW = canvasWRef.current
    const oldH = canvasHRef.current
    if (oldW === newW && oldH === newH) return
    const sx = newW / oldW
    const sy = newH / oldH
    const cur = salleRef.current
    const scaled = tablesRef.current.map(t => {
      if (t.salle !== cur) return t
      return {
        ...t,
        x: spSnap(t.x * sx),
        y: spSnap(t.y * sy),
        w: Math.max(SP_MIN_SZ, spSnap(t.w * sx)),
        h: Math.max(SP_MIN_SZ, spSnap(t.h * sy)),
      }
    })
    tablesRef.current = scaled
    setLocalTables(scaled)
    // (basePositionsRef plus utilisé — les positions collées sont permanentes)
    const newSz = { w: newW, h: newH }
    setCanvasSizes(prev => ({ ...prev, [cur]: newSz }))
    canvasSizesRef.current = { ...canvasSizesRef.current, [cur]: newSz }
    canvasWRef.current = newW; canvasHRef.current = newH
  }

  // ── Aligner tables d'un combo (L/C/R) ─────────────
  function alignComboTables(comboId: string, align: 'L' | 'C' | 'R') {
    const next = combosRef.current.map(c => c.id !== comboId ? c : { ...c, align })
    setLocalCombos(prev => prev.map(c => c.id !== comboId ? c : { ...c, align }))
    combosRef.current = next
    packComboNow(comboId)
    setCombos(next)
  }

  // ── Orientation combo (H / V) ──────────────────────
  function orientCombo(comboId: string, orient: 'H' | 'V') {
    const next = combosRef.current.map(c => c.id !== comboId ? c : { ...c, orient })
    setLocalCombos(prev => prev.map(c => c.id !== comboId ? c : { ...c, orient }))
    combosRef.current = next
    packComboNow(comboId)
    // Persister combos dans le store
    setCombos(next)
  }

  // ── Compatibilité combo ────────────────────────────
  // Règle : formes à côtés droits uniquement (round/oval non admis), et hauteurs identiques
  const COMBO_STRAIGHT = new Set(['rect', 'rect_lg', 'square', 'square_sm', 'bar'])
  function comboWarn(combo: Combo): string | null {
    const ctbls = combo.tables.map(id => tablesRef.current.find(t => t.id === id)).filter(Boolean) as Table[]
    if (ctbls.length < 2) return null
    const badShape = ctbls.find(t => !COMBO_STRAIGHT.has(t.shape))
    if (badShape) return `Forme incompatible : ${badShape.n} (${badShape.shape})`
    const heights = [...new Set(ctbls.map(t => t.h))]
    if (heights.length > 1) return `Hauteurs différentes : ${ctbls.map(t => `${t.n}=${t.h}`).join(', ')}`
    return null
  }

  // ── Enregistrer ────────────────────────────────────
  function handleSave() {
    // Les positions collées sont maintenant les positions normales — on sauve directement
    setTables(tablesRef.current)
    setCombos(combosRef.current)
    setStoreRoomItems(roomsRef.current)
    toast('Plan enregistré ✓', 'success')
  }

  function handleExportModel() {
    const store = useAppStore.getState()
    const data = {
      tables: store.tables,
      combos: store.combos,
      services: store.services,
      salles: store.salles,
      resto: store.resto,
      roomItems: (store as any).roomItems || [],
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `plan-modele-${new Date().toISOString().slice(0,10)}.json`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast('Modèle exporté ✓', 'success')
  }

  // ── Dérivés UI ─────────────────────────────────────
  const selTable  = selId && !isRoom(selId) ? tables.find(t => t.id === selId) ?? null : null
  const selRoom   = selId && isRoom(selId)  ? roomItems.find(r => r.id === selId) ?? null : null
  const layerSizes: number[] = []
  combos.filter(c => c.tables.some(id => tables.find(x => x.id === id)?.salle === salle))
    .forEach(c => { if (!layerSizes.includes(c.tables.length)) layerSizes.push(c.tables.length) })
  layerSizes.sort((a, b) => a - b)
  const layers = [{ v: 'all', l: 'Toutes' }, { v: 'solo', l: '1 table' }]
  layerSizes.forEach(sz => layers.push({ v: `size_${sz}`, l: `${sz} tables` }))
  const salleCombos = combos.filter(c => c.tables.some(id => tables.find(x => x.id === id)?.salle === salle))

  // ── Render ─────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--hh))', overflow: 'hidden' }}>

      {/* Sélecteur combo (table partagée entre plusieurs combos) */}
      {comboPicker && (
        <div
          style={{ position: 'fixed', top: comboPicker.y + 8, left: comboPicker.x + 8, zIndex: 9999,
            background: 'var(--surf)', border: '1.5px solid var(--border)', borderRadius: 10,
            boxShadow: '0 4px 18px rgba(0,0,0,.18)', padding: '8px 6px', minWidth: 140 }}
          onMouseDown={e => e.stopPropagation()}
        >
          <div style={{ fontSize: 10, color: 'var(--t4)', fontFamily: 'DM Mono,monospace', padding: '0 6px 5px', borderBottom: '1px solid var(--border)', marginBottom: 5 }}>
            Activer le combo
          </div>
          {comboPicker.combos.map(c => (
            <button key={c.id}
              onClick={() => {
                setComboPicker(null)
                if (comboHL === c.id) { deactivateComboHL(); return }
                activateComboHL(c.id)
                setSelId(null); selIdRef.current = null
              }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '5px 10px',
                fontSize: 12, fontWeight: 700, fontFamily: 'DM Mono,monospace',
                background: comboHL === c.id ? 'rgba(144,96,224,.12)' : 'transparent',
                color: comboHL === c.id ? 'rgba(144,96,224,.9)' : 'var(--text)',
                border: 'none', borderRadius: 6, cursor: 'pointer' }}>
              {c.tables.map(tid => tables.find(t => t.id === tid)?.n ?? '?').join('+')} <span style={{ fontWeight: 400, opacity: .6 }}>{c.capOverride ?? c.cap}p</span>
            </button>
          ))}
          <div style={{ borderTop: '1px solid var(--border)', marginTop: 5, paddingTop: 5 }}>
            <button onClick={() => setComboPicker(null)}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '4px 10px',
                fontSize: 11, background: 'transparent', border: 'none', color: 'var(--t4)', cursor: 'pointer', borderRadius: 6 }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ flexShrink: 0, padding: '10px 18px 0' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>Éditeur de plan</div>
          <div style={{ fontSize: 12, color: 'var(--t3)' }}>{salle} · Drag & drop · + Combiner pour les combos</div>
        </div>
      </div>

      {/* Toolbar 1 : salles + save */}
      <div id="sp-tabs" style={{ display: 'flex', gap: 4, padding: '5px 14px', flexShrink: 0, alignItems: 'center', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'DM Mono,monospace' }}>Salle :</span>
        {activeSalles.map(s => (
          <button key={s} onClick={() => {
            setSalle(s); salleRef.current = s
            // Restore canvas size for this salle
            const sz2 = canvasSizesRef.current[s] ?? { w: 120, h: 80 }
            canvasWRef.current = sz2.w; canvasHRef.current = sz2.h
            setSelId(null); selIdRef.current = null
            setSelMulti([]); selMultiRef.current = []
            deactivateComboHL()
          }} style={{
            fontSize: 11, padding: '3px 8px', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer',
            background: salle === s ? 'var(--bl)' : 'var(--surf2)',
            color:      salle === s ? '#fff' : 'var(--t3)', fontWeight: salle === s ? 700 : 400,
          }}>
            {s} <span style={{ opacity: .6 }}>{tables.filter(t => t.salle === s).length}</span>
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={handleExportModel} style={{
          fontSize: 11, padding: '3px 8px', border: '1px solid rgba(68,128,216,.3)', borderRadius: 6,
          background: 'rgba(68,128,216,.08)', color: 'var(--bl)', fontWeight: 700, cursor: 'pointer',
        }}>📤 Exporter</button>
        <button onClick={handleSave} style={{
          fontSize: 11, padding: '3px 12px', border: '1px solid rgba(74,222,128,.4)', borderRadius: 6,
          background: 'rgba(60,200,112,.12)', color: '#4ade80', fontWeight: 800, cursor: 'pointer',
        }}>💾 Enregistrer</button>
      </div>

      {/* Toolbar 2 : calques + taille + combiner */}
      <div style={{ display: 'flex', gap: 4, padding: '3px 14px', flexShrink: 0, alignItems: 'center', borderBottom: '1px solid var(--border)', background: 'rgba(68,128,216,.04)', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'DM Mono,monospace', whiteSpace: 'nowrap' }}>Calques :</span>
        {layers.map(l => (
          <button key={l.v} onClick={() => { setLayer(l.v); layerRef.current = l.v }} style={{
            fontSize: 11, padding: '2px 8px', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap',
            background: layer === l.v ? 'var(--bl)' : 'var(--surf2)',
            color:      layer === l.v ? '#fff' : 'var(--t3)',
          }}>{l.l}</button>
        ))}
        {/* Contrôle de taille canvas : − [S M L XL] + — groupe non sécable, AVANT le spacer */}
        <div style={{ width: 1, height: 14, background: 'var(--border)', margin: '0 4px', flexShrink: 0 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'DM Mono,monospace', marginRight: 2, whiteSpace: 'nowrap' }}>Taille :</span>
          <button onClick={() => resizeCanvas(Math.max(60, canvasWRef.current - 10), Math.max(40, canvasHRef.current - 7))}
            title="Réduire (tables plus grandes)" style={{
              fontSize: 14, fontWeight: 900, padding: '0px 6px', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer',
              background: 'var(--surf2)', color: 'var(--t2)', lineHeight: '20px', minWidth: 22, flexShrink: 0,
            }}>−</button>
          {CANVAS_SIZES.map(sz => (
            <button key={sz.l} onClick={() => resizeCanvas(sz.w, sz.h)} style={{
              fontSize: 11, padding: '2px 7px', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', flexShrink: 0,
              background: canvasW === sz.w ? 'var(--bl)' : 'var(--surf2)',
              color:      canvasW === sz.w ? '#fff' : 'var(--t3)',
            }}>{sz.l}</button>
          ))}
          <button onClick={() => resizeCanvas(Math.min(400, canvasWRef.current + 10), Math.min(267, canvasHRef.current + 7))}
            title="Agrandir (tables plus petites, plus d'espace)" style={{
              fontSize: 14, fontWeight: 900, padding: '0px 6px', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer',
              background: 'var(--surf2)', color: 'var(--t2)', lineHeight: '20px', minWidth: 22, flexShrink: 0,
            }}>+</button>
          {!CANVAS_SIZES.some(sz => sz.w === canvasW) && (
            <span style={{ fontSize: 10, color: 'var(--t4)', fontFamily: 'DM Mono,monospace', whiteSpace: 'nowrap' }}>{canvasW}×{canvasH}</span>
          )}
        </div>
        <div style={{ flex: 1 }} />
        {/* Toggle grille visuelle */}
        <button
          onClick={() => { const next = !showGrid; setShowGrid(next); showGridRef.current = next; renderCanvas() }}
          title={showGrid ? 'Masquer la grille' : 'Afficher la grille'}
          style={{ fontSize: 11, padding: '2px 8px', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer',
            background: showGrid ? 'rgba(68,128,216,.15)' : 'var(--surf2)', color: showGrid ? 'var(--bl)' : 'var(--t4)',
            fontFamily: 'DM Mono,monospace', flexShrink: 0 }}>
          ⊞ Grille
        </button>
        {comboMode && (
          <>
            <div style={{ width: 1, height: 14, background: 'var(--border)', margin: '0 3px' }} />
            <button onClick={cancelCombo} style={{
              fontSize: 11, padding: '3px 9px', border: '1px solid rgba(74,222,128,.4)', borderRadius: 6, cursor: 'pointer',
              background: 'rgba(60,200,112,.12)', color: '#4ade80', fontWeight: 700,
            }}>✕ Annuler combo</button>
          </>
        )}
      </div>

      {/* Corps: palette | canvas | props */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* Palette gauche */}
        <div style={{ width: 172, flexShrink: 0, borderRight: '1px solid var(--border)', overflowY: 'auto', padding: '10px 8px', background: 'var(--surf)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.09em', marginBottom: 7, fontFamily: 'DM Mono,monospace' }}>Tables</div>

          {/* État par défaut des nouvelles tables */}
          <div style={{ display: 'flex', gap: 3, marginBottom: 8 }}>
            {([
              { v: 'normal' as const, lbl: '✓', col: 'var(--bl)', bg: 'rgba(68,128,216,.12)', border: 'rgba(68,128,216,.4)' },
              { v: 'blocked' as const, lbl: '🚫', col: 'var(--rd)', bg: 'rgba(220,80,80,.12)', border: 'rgba(220,80,80,.4)' },
              { v: 'held' as const, lbl: '🔒', col: '#e8a530', bg: 'rgba(232,165,48,.12)', border: 'rgba(232,165,48,.4)' },
            ]).map(({ v, lbl, col, bg, border }) => {
              const on = newTableState === v
              return (
                <button key={v} onClick={() => setNewTableState(v)} style={{
                  flex: 1, padding: '4px 2px', fontSize: 11, fontWeight: 700, border: `1.5px solid ${on ? border : 'var(--border)'}`,
                  borderRadius: 5, cursor: 'pointer', background: on ? bg : 'var(--surf2)', color: on ? col : 'var(--t4)',
                  transition: 'all .15s',
                }}>
                  {lbl}
                </button>
              )
            })}
          </div>
          {newTableState !== 'normal' && (
            <div style={{ fontSize: 10, color: newTableState === 'blocked' ? 'var(--rd)' : '#e8a530', fontWeight: 700, marginBottom: 6, textAlign: 'center', padding: '3px 6px', background: newTableState === 'blocked' ? 'rgba(220,80,80,.08)' : 'rgba(232,165,48,.08)', borderRadius: 5 }}>
              {newTableState === 'blocked' ? '🚫 Nouvelles tables : Bloquées' : '🔒 Nouvelles tables : Réserve'}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 8 }}>
            {TABLE_TYPES.map(it => (
              <div key={it.shape} onClick={() => addTable(it.shape, it.capMin, it.capMax)}
                style={{ background: 'var(--surf2)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 5px 5px', cursor: 'pointer', userSelect: 'none', textAlign: 'center' }}>
                <div dangerouslySetInnerHTML={{ __html: shapePrev(it.shape) }} />
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t2)', fontFamily: 'DM Mono,monospace', marginTop: 4, lineHeight: 1.2 }}>{shapeLabel(it.shape)}</div>
                <div style={{ fontSize: 11, color: 'var(--t4)', fontFamily: 'DM Mono,monospace' }}>{it.capMin}–{it.capMax}p</div>
              </div>
            ))}
          </div>
          {/* Éléments de salle groupés */}
          {[
            { label: 'Circulations', items: ROOM_TYPES.slice(0, 6) },
            { label: 'Structure',    items: ROOM_TYPES.slice(6, 12) },
            { label: 'Équipements', items: ROOM_TYPES.slice(12, 19) },
            { label: 'Déco / Ext.', items: ROOM_TYPES.slice(19) },
          ].map(group => (
            <div key={group.label} style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.09em', marginBottom: 3, fontFamily: 'DM Mono,monospace' }}>{group.label}</div>
              {group.items.map((it, gi) => {
                const idx = ROOM_TYPES.indexOf(it)
                return (
                  <div key={gi} onClick={() => addRoomItem(idx)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', marginBottom: 2, background: 'var(--surf2)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', userSelect: 'none', transition: 'background .15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surf3)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--surf2)')}>
                    <span style={{ fontSize: 12, lineHeight: 1, width: 18, textAlign: 'center' }}>{it.sym}</span>
                    <span style={{ fontSize: 11, color: 'var(--t2)', fontFamily: 'DM Mono,monospace', flex: 1 }}>{it.lbl}</span>
                    <span style={{ fontSize: 9, color: 'var(--t4)', fontFamily: 'DM Mono,monospace', opacity: .6 }}>{it.w}×{it.h}</span>
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Canvas SVG — wrapper colonne pour légende fixe */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)' }}>
          <div id="sp-canvas-wrap" style={{ flex: 1, background: 'var(--surf2)', overflow: 'auto', position: 'relative' }}>

            {/* Bandeau flottant mode combo */}
            {comboMode && (
              <div style={{
                position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
                zIndex: 10, display: 'flex', alignItems: 'center', gap: 8,
                background: 'rgba(16,20,24,.90)', border: '1.5px solid rgba(74,222,128,.5)',
                borderRadius: 10, padding: '7px 13px',
                boxShadow: '0 4px 20px rgba(0,0,0,.3)',
                whiteSpace: 'nowrap', userSelect: 'none',
              }}>
                <span style={{ fontSize: 13 }}>🔗</span>
                <span style={{ fontSize: 11, color: '#4ade80', fontWeight: 700 }}>Combo</span>
                <span style={{ fontSize: 11, color: 'rgba(148,163,184,.8)' }}>
                  {selMulti.length === 0
                    ? 'Cliquez les tables à combiner'
                    : selMulti.length === 1
                      ? '+ une 2e table minimum'
                      : tables.filter(t => selMulti.includes(t.id)).map(t => t.n).join(' + ')
                          + ' · ' + tables.filter(t => selMulti.includes(t.id)).reduce((s, t) => s + t.capMax, 0) + 'p'
                  }
                </span>
                {selMulti.length >= 2 && (
                  <button onClick={createCombo} style={{
                    padding: '4px 13px', borderRadius: 6, border: 'none',
                    background: '#4ade80', color: '#111', fontWeight: 800, fontSize: 11, cursor: 'pointer',
                  }}>✓ Créer</button>
                )}
                <button onClick={cancelCombo} style={{
                  padding: '3px 8px', borderRadius: 5,
                  border: '1px solid rgba(255,255,255,.12)', background: 'transparent',
                  color: 'rgba(148,163,184,.7)', fontSize: 11, cursor: 'pointer',
                }}>✕</button>
                <span style={{ fontSize: 10, color: 'rgba(100,116,139,.6)' }}>↩ · Échap</span>
              </div>
            )}

            <svg
              ref={svgRef}
              viewBox={`0 0 ${canvasW} ${canvasH}`}
              style={{ width: '100%', minHeight: '100%', display: 'block', cursor: comboMode ? 'cell' : 'crosshair', userSelect: 'none', touchAction: 'none' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleMouseDown as any}
              onTouchMove={handleMouseMove as any}
              onTouchEnd={handleMouseUp}
            />
          </div>
          {/* Légende fixe — toujours visible */}
          <div style={{ flexShrink: 0, padding: '5px 14px', borderTop: '1px solid var(--border)', background: 'var(--surf)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontFamily: 'DM Mono,monospace' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(68,128,216,.2)', border: '1.5px solid rgba(68,128,216,.6)', display: 'inline-block' }} />
              <span style={{ color: 'var(--t3)' }}>Table libre</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontFamily: 'DM Mono,monospace' }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(68,128,216,.1)', border: '1px dashed rgba(100,116,139,.5)', display: 'inline-block' }} />
              <span style={{ color: 'var(--t3)' }}>Élément</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontFamily: 'DM Mono,monospace' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', border: '1.5px solid #facc15', display: 'inline-block' }} />
              <span style={{ color: 'var(--t3)' }}>Sélectionné</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontFamily: 'DM Mono,monospace' }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, border: '1.5px dashed rgba(68,128,216,.7)', display: 'inline-block' }} />
              <span style={{ color: 'var(--t3)' }}>Combo actif</span>
            </div>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 11, color: 'var(--t4)', fontFamily: 'DM Mono,monospace' }}>
              {tables.filter(t => t.salle === salle).length} tables · {salleCombos.length} combos
            </span>
          </div>
        </div>

        {/* Panneau droit */}
        <div style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', background: 'var(--surf)', borderLeft: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0, padding: '0 2px' }}>
            {(['props', 'combos'] as const).map(tab => (
              <button key={tab} onClick={() => setRightTab(tab)} style={{
                flex: 1, padding: '8px 4px', fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer',
                background: 'transparent',
                color: rightTab === tab ? 'var(--bl)' : 'var(--t3)',
                borderBottom: rightTab === tab ? '2px solid var(--bl)' : '2px solid transparent',
                transition: 'color .15s, border-color .15s',
              }}>{tab === 'props' ? '⚙️ Propriétés' : `🔗 Combos${salleCombos.length ? ` (${salleCombos.length})` : ''}`}</button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 10, minHeight: 0 }}>
            {rightTab === 'props' ? (
              selTable ? (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', marginBottom: 2, fontFamily: 'DM Mono,monospace' }}>Table {selTable.n}</div>
                  <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 10 }}>{shapeLabel(selTable.shape)} · {selTable.salle}</div>

                  <label style={{ fontSize: 11, color: 'var(--t3)', display: 'block', marginBottom: 2 }}>N° / Nom</label>
                  <input value={selTable.n}
                    onChange={e => setLocalTables(prev => prev.map(t => t.id === selTable.id ? { ...t, n: e.target.value } : t))}
                    style={{ width: '100%', padding: '4px 6px', fontSize: 12, fontFamily: 'DM Mono,monospace', border: '1px solid var(--border)', borderRadius: 5, background: 'var(--surf2)', color: 'var(--text)', boxSizing: 'border-box', marginBottom: 8 }} />

                  <label style={{ fontSize: 11, color: 'var(--t3)', display: 'block', marginBottom: 4 }}>Couverts max</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <button onClick={() => setLocalTables(prev => prev.map(t => t.id === selTable.id ? { ...t, capMax: Math.max(1, t.capMax - 1) } : t))}
                      style={{ width: 28, height: 28, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surf2)', color: 'var(--t2)', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>−</button>
                    <span style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 800, fontFamily: 'DM Mono,monospace', color: 'var(--text)' }}>{selTable.capMax}p</span>
                    <button onClick={() => setLocalTables(prev => prev.map(t => t.id === selTable.id ? { ...t, capMax: Math.min(50, t.capMax + 1) } : t))}
                      style={{ width: 28, height: 28, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surf2)', color: 'var(--t2)', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>+</button>
                  </div>

                  <label style={{ fontSize: 11, color: 'var(--t3)', display: 'block', marginBottom: 2 }}>Salle</label>
                  <select value={selTable.salle}
                    onChange={e => setLocalTables(prev => prev.map(t => t.id === selTable.id ? { ...t, salle: e.target.value } : t))}
                    style={{ width: '100%', padding: '4px 6px', fontSize: 11, border: '1px solid var(--border)', borderRadius: 5, background: 'var(--surf2)', color: 'var(--text)', boxSizing: 'border-box', marginBottom: 10 }}>
                    {activeSalles.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>

                  <label style={{ fontSize: 11, color: 'var(--t3)', display: 'block', marginBottom: 4 }}>Forme</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, marginBottom: 10 }}>
                    {TABLE_TYPES.map(tp => (
                      <button key={tp.shape}
                        onClick={() => setLocalTables(prev => prev.map(t => t.id === selTable.id ? { ...t, shape: tp.shape as Table['shape'] } : t))}
                        style={{ padding: '3px 4px', fontSize: 10, border: `1.5px solid ${selTable.shape === tp.shape ? 'var(--bl)' : 'var(--border)'}`, borderRadius: 4, cursor: 'pointer', background: selTable.shape === tp.shape ? 'var(--bp)' : 'var(--surf2)', color: selTable.shape === tp.shape ? 'var(--bl)' : 'var(--t3)' }}>
                        {shapeLabel(tp.shape)}
                      </button>
                    ))}
                  </div>

                  {/* Toggle V/H pour tables carrées et rondes 2p */}
                  {((['square_sm', 'square'] as string[]).includes(selTable.shape) || (['round_sm', 'round'].includes(selTable.shape) && selTable.capMax <= 2)) && (
                    <>
                      <label style={{ fontSize: 11, color: 'var(--t3)', display: 'block', marginBottom: 4 }}>Orientation chaises</label>
                      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                        {([
                          { v: undefined as 'V' | 'H' | undefined, lbl: '↕ Haut / Bas' },
                          { v: 'H' as const,                        lbl: '↔ Gauche / Droite' },
                        ]).map(({ v, lbl }) => {
                          const active = (selTable.orient ?? 'V') === (v ?? 'V')
                          return (
                            <button key={lbl}
                              onClick={() => setLocalTables(prev => prev.map(t => t.id === selTable.id ? { ...t, orient: v } : t))}
                              style={{ flex: 1, padding: '3px 4px', fontSize: 10, fontWeight: 700,
                                border: `1.5px solid ${active ? 'var(--bl)' : 'var(--border)'}`,
                                borderRadius: 4, cursor: 'pointer',
                                background: active ? 'var(--bp)' : 'var(--surf2)',
                                color: active ? 'var(--bl)' : 'var(--t3)' }}>
                              {lbl}
                            </button>
                          )
                        })}
                      </div>
                    </>
                  )}

                  {/* Pivoter pour tables rectangulaires */}
                  {(['rect', 'rect_lg', 'bar'] as const).includes(selTable.shape as 'rect' | 'rect_lg' | 'bar') && (
                    <>
                      <label style={{ fontSize: 11, color: 'var(--t3)', display: 'block', marginBottom: 4 }}>Orientation</label>
                      <button
                        onClick={() => {
                          const t = selTable
                          tablesRef.current = tablesRef.current.map(tb => tb.id === t.id ? { ...tb, w: tb.h, h: tb.w } : tb)
                          setLocalTables(prev => prev.map(tb => tb.id === t.id ? { ...tb, w: tb.h, h: tb.w } : tb))
                        }}
                        style={{ width: '100%', padding: '4px 0', fontSize: 11, fontWeight: 700, marginBottom: 12,
                          border: '1.5px solid var(--border)', borderRadius: 4, cursor: 'pointer',
                          background: 'var(--surf2)', color: 'var(--t3)' }}>
                        ↻ Pivoter 90°
                      </button>
                    </>
                  )}

                  {/* Inverser côté tabourets pour forme bar */}
                  {selTable.shape === 'bar' && (
                    <>
                      <label style={{ fontSize: 11, color: 'var(--t3)', display: 'block', marginBottom: 4 }}>Côté personnes</label>
                      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                        {([
                          { v: 'bottom' as const, lbl: '↓ En bas' },
                          { v: 'top' as const,    lbl: '↑ En haut' },
                        ]).map(({ v, lbl }) => {
                          const active = (selTable.barSide ?? 'bottom') === v
                          return (
                            <button key={v}
                              onClick={() => {
                                tablesRef.current = tablesRef.current.map(tb => tb.id === selTable.id ? { ...tb, barSide: v } : tb)
                                setLocalTables(prev => prev.map(tb => tb.id === selTable.id ? { ...tb, barSide: v } : tb))
                              }}
                              style={{ flex: 1, padding: '3px 4px', fontSize: 10, fontWeight: 700,
                                border: `1.5px solid ${active ? 'var(--bl)' : 'var(--border)'}`,
                                borderRadius: 4, cursor: 'pointer',
                                background: active ? 'var(--bp)' : 'var(--surf2)',
                                color: active ? 'var(--bl)' : 'var(--t3)' }}>
                              {lbl}
                            </button>
                          )
                        })}
                      </div>
                    </>
                  )}

                  <label style={{ fontSize: 11, color: 'var(--t3)', display: 'block', marginBottom: 4 }}>Hauteur</label>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                    {([undefined, 'basse', 'standard', 'haute'] as const).map((hv, hi) => {
                      const labels = ['Auto', 'Basse', 'Standard', 'Haute']
                      const active = hv === undefined ? !selTable.tableH : (selTable.tableH ?? 'standard') === hv
                      return (
                        <button key={hi}
                          onClick={() => setLocalTables(prev => prev.map(t => t.id === selTable.id ? { ...t, tableH: hv } : t))}
                          style={{ flex: 1, padding: '3px 2px', fontSize: 9.5, fontWeight: 700, border: `1.5px solid ${active ? 'var(--bl)' : 'var(--border)'}`, borderRadius: 4, cursor: 'pointer', background: active ? 'var(--bp)' : 'var(--surf2)', color: active ? 'var(--bl)' : 'var(--t3)' }}>
                          {labels[hi]}
                        </button>
                      )
                    })}
                  </div>

                  {/* ── État initial : Bloquée / Réserve ── */}
                  <label style={{ fontSize: 11, color: 'var(--t3)', display: 'block', marginBottom: 4 }}>État</label>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                    <button
                      onClick={() => {
                        tablesRef.current = tablesRef.current.map(tb => tb.id === selTable.id ? { ...tb, blocked: !tb.blocked, held: tb.blocked ? tb.held : false } : tb)
                        setLocalTables(prev => prev.map(t => t.id === selTable.id ? { ...t, blocked: !t.blocked, held: t.blocked ? t.held : false } : t))
                      }}
                      style={{ flex: 1, padding: '5px 2px', fontSize: 10, fontWeight: 700,
                        border: `1.5px solid ${selTable.blocked ? 'rgba(220,80,80,.5)' : 'var(--border)'}`,
                        borderRadius: 4, cursor: 'pointer',
                        background: selTable.blocked ? 'rgba(220,80,80,.12)' : 'var(--surf2)',
                        color: selTable.blocked ? 'var(--rd)' : 'var(--t3)' }}>
                      🚫 Bloquée
                    </button>
                    <button
                      onClick={() => {
                        if (!selTable.blocked) {
                          tablesRef.current = tablesRef.current.map(tb => tb.id === selTable.id ? { ...tb, held: !tb.held } : tb)
                          setLocalTables(prev => prev.map(t => t.id === selTable.id ? { ...t, held: !t.held } : t))
                        }
                      }}
                      style={{ flex: 1, padding: '5px 2px', fontSize: 10, fontWeight: 700,
                        border: `1.5px solid ${selTable.held ? 'rgba(232,165,48,.5)' : 'var(--border)'}`,
                        borderRadius: 4, cursor: 'pointer',
                        background: selTable.held ? 'rgba(232,165,48,.12)' : 'var(--surf2)',
                        color: selTable.held ? '#e8a530' : 'var(--t3)',
                        opacity: selTable.blocked ? 0.4 : 1 }}>
                      🔒 Réserve
                    </button>
                  </div>

                  <button onClick={handleDelete} style={{ width: '100%', padding: 6, fontSize: 11, border: '1px solid rgba(220,80,80,.3)', borderRadius: 6, background: 'rgba(220,80,80,.08)', color: 'var(--rd)', cursor: 'pointer', fontWeight: 700 }}>
                    🗑 Supprimer
                  </button>
                </div>
              ) : selRoom ? (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>{selRoom.sym} {selRoom.lbl}</div>
                  <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 10 }}>Élément de salle</div>
                  <button onClick={handleDelete} style={{ width: '100%', padding: 6, fontSize: 11, border: '1px solid rgba(220,80,80,.3)', borderRadius: 6, background: 'rgba(220,80,80,.08)', color: 'var(--rd)', cursor: 'pointer', fontWeight: 700 }}>
                    🗑 Supprimer
                  </button>
                </div>
              ) : (
                <div style={{ fontSize: 11, color: 'var(--t4)', textAlign: 'center', padding: '24px 8px', lineHeight: 2 }}>
                  Cliquez une table<br />pour la configurer
                </div>
              )
            ) : (
              <div>
                {/* Bouton créer / annuler */}
                {!comboMode ? (
                  <button onClick={() => { setComboMode(true); comboModeRef.current = true; setSelMulti([]); selMultiRef.current = [] }}
                    style={{ width: '100%', padding: '8px 0', fontSize: 12, border: '1.5px dashed rgba(74,222,128,.5)', borderRadius: 8, background: 'rgba(60,200,112,.07)', color: '#4ade80', cursor: 'pointer', fontWeight: 700, marginBottom: 12, letterSpacing: '.02em' }}>
                    🔗 Nouvelle combinée
                  </button>
                ) : (
                  <div style={{ background: 'rgba(60,200,112,.06)', border: '1.5px solid rgba(60,200,112,.3)', borderRadius: 9, padding: '9px 11px', marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: 'var(--gn)', fontWeight: 700, marginBottom: 2 }}>Mode combo actif</div>
                    <div style={{ fontSize: 11, color: 'var(--t3)', lineHeight: 1.5 }}>
                      Cliquez les tables sur le plan · ↩ valider · Échap annuler
                    </div>
                  </div>
                )}

                {salleCombos.map(c => {
                  const ctbls = c.tables.map(id => tables.find(t => t.id === id)).filter(Boolean) as Table[]
                  const isHL  = comboHL === c.id
                  const warn  = comboWarn(c)
                  return (
                    <div key={c.id} data-combo-id={c.id}
                      ref={el => { if (el && isHL) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50) }}
                      onClick={() => { isHL ? deactivateComboHL() : activateComboHL(c.id) }}
                      style={{ background: isHL ? 'rgba(68,128,216,.08)' : 'var(--surf2)', border: `1.5px solid ${warn ? 'rgba(240,160,32,.55)' : isHL ? 'var(--bl)' : 'var(--border)'}`, borderRadius: 7, padding: 8, marginBottom: 6, cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)', fontFamily: 'DM Mono,monospace', flex: 1 }}>{ctbls.map(t => t.n).join('+')}</div>
                        {warn && <span title={warn} style={{ fontSize: 10, background: 'rgba(240,160,32,.18)', color: 'rgba(200,130,0,1)', border: '1px solid rgba(240,160,32,.4)', borderRadius: 4, padding: '1px 5px', fontWeight: 700, flexShrink: 0 }}>⚠ incompatible</span>}
                      </div>
                      {warn && <div style={{ fontSize: 10, color: 'rgba(200,130,0,.8)', marginBottom: 4, lineHeight: 1.4 }}>{warn}</div>}
                      <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 6 }}>{ctbls.length} tables · auto {c.cap}p</div>
                      {/* Capacité override +/- */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }} onClick={e => e.stopPropagation()}>
                        <span style={{ fontSize: 10, color: 'var(--t4)', flexShrink: 0 }}>Couverts :</span>
                        <button onClick={() => { const next = combosRef.current.map(x => x.id !== c.id ? x : { ...x, capOverride: Math.max(1, (x.capOverride ?? x.cap) - 1) }); setLocalCombos(next); combosRef.current = next; setCombos(next) }}
                          style={{ width: 22, height: 22, border: '1px solid var(--border)', borderRadius: 4, background: 'var(--surf)', color: 'var(--bl)', fontSize: 14, cursor: 'pointer' }}>−</button>
                        <span style={{ minWidth: 28, textAlign: 'center', fontSize: 13, fontWeight: 800, fontFamily: 'DM Mono,monospace', color: 'var(--text)' }}>
                          {c.capOverride ?? c.cap}p
                        </span>
                        <button onClick={() => { const next = combosRef.current.map(x => x.id !== c.id ? x : { ...x, capOverride: Math.min(50, (x.capOverride ?? x.cap) + 1) }); setLocalCombos(next); combosRef.current = next; setCombos(next) }}
                          style={{ width: 22, height: 22, border: '1px solid var(--border)', borderRadius: 4, background: 'var(--surf)', color: 'var(--bl)', fontSize: 14, cursor: 'pointer' }}>+</button>
                        {c.capOverride !== undefined && c.capOverride !== c.cap && (
                          <button onClick={() => { const next = combosRef.current.map(x => x.id !== c.id ? x : { ...x, capOverride: undefined }); setLocalCombos(next); combosRef.current = next; setCombos(next) }}
                            style={{ fontSize: 9, padding: '1px 4px', border: '1px solid var(--border)', borderRadius: 3, background: 'none', color: 'var(--t4)', cursor: 'pointer' }}>↺ auto</button>
                        )}
                      </div>
                      {/* Alignement L/C/R — colle les tables ensemble */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }} onClick={e => e.stopPropagation()}>
                        <span style={{ fontSize: 10, color: 'var(--t4)', flexShrink: 0 }}>Position :</span>
                        {([
                          { a: 'L' as const, tip: 'Table de base (1ère sélectionnée) = ancre gauche' },
                          { a: 'C' as const, tip: 'Groupe centré dans l\'espace d\'origine' },
                          { a: 'R' as const, tip: '1ère table sélectionnée (base) = ancre droite, les autres s\'étendent à gauche' },
                        ]).map(({ a, tip }) => (
                          <button key={a} onClick={() => alignComboTables(c.id, a)} title={tip}
                            style={{ flex: 1, padding: '2px 0', fontSize: 11, fontWeight: 700,
                              border: `1px solid ${(c.align ?? 'L') === a ? 'var(--bl)' : 'var(--border)'}`,
                              borderRadius: 4, cursor: 'pointer',
                              background: (c.align ?? 'L') === a ? 'rgba(68,128,216,.15)' : 'var(--surf)',
                              color: (c.align ?? 'L') === a ? 'var(--bl)' : 'var(--t4)',
                            }}>{a}</button>
                        ))}
                      </div>
                      {/* ── Orientation H / V ── */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6, marginTop: 2, padding: '4px 0', borderTop: '1px dashed var(--border)' }} onClick={e => e.stopPropagation()}>
                        <span style={{ fontSize: 10, color: 'var(--t4)', flexShrink: 0 }}>Orient. :</span>
                        <button onClick={() => orientCombo(c.id, 'H')} title="Horizontal — tables côte à côte"
                          style={{ flex: 1, padding: '3px 0', fontSize: 11, fontWeight: 700,
                            border: `1.5px solid ${c.orient === 'H' ? 'var(--bl)' : 'var(--border)'}`,
                            borderRadius: 4, cursor: 'pointer',
                            background: c.orient === 'H' ? 'rgba(68,128,216,.18)' : 'var(--surf)',
                            color: c.orient === 'H' ? 'var(--bl)' : 'var(--t4)',
                          }}>⟷ H</button>
                        <button onClick={() => orientCombo(c.id, 'V')} title="Vertical — tables empilées"
                          style={{ flex: 1, padding: '3px 0', fontSize: 11, fontWeight: 700,
                            border: `1.5px solid ${c.orient === 'V' ? 'var(--bl)' : 'var(--border)'}`,
                            borderRadius: 4, cursor: 'pointer',
                            background: c.orient === 'V' ? 'rgba(68,128,216,.18)' : 'var(--surf)',
                            color: c.orient === 'V' ? 'var(--bl)' : 'var(--t4)',
                          }}>↕ V</button>
                      </div>
                      <button onClick={e => { e.stopPropagation(); const next = combosRef.current.filter(x => x.id !== c.id); setLocalCombos(next); combosRef.current = next; setCombos(next); if (comboHLRef.current === c.id) deactivateComboHL() }}
                        style={{ fontSize: 10, padding: '2px 6px', border: '1px solid rgba(220,80,80,.3)', borderRadius: 4, background: 'transparent', color: 'var(--rd)', cursor: 'pointer' }}>
                        Supprimer
                      </button>
                    </div>
                  )
                })}

                {salleCombos.length === 0 && selMulti.length < 2 && !comboMode && (
                  <div style={{ fontSize: 11, color: 'var(--t4)', textAlign: 'center', padding: '16px 0' }}>
                    Aucune combinée<br />dans cette salle
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
