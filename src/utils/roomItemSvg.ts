import type { RoomItem, Table } from '../types'

export function spRoomBodySvg(r: RoomItem): string {
  const { x, y, w, h, shape } = r
  const cx = x + w/2, cy = y + h/2
  const gs = 'rgba(100,116,139,'
  let s = ''
  switch (shape) {
    case 'colonne': {
      const rad = Math.min(w, h)/2 - 0.3
      s += `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="${gs}.45)" stroke="${gs}.75)" stroke-width="0.8"/>`
      s += `<circle cx="${cx}" cy="${cy}" r="${rad*0.52}" fill="${gs}.12)" stroke="${gs}.3)" stroke-width="0.4"/>`
      break
    }
    case 'mur': {
      s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${gs}.52)" stroke="${gs}.75)" stroke-width="0.7"/>`
      s += `<rect x="${x+0.8}" y="${y+0.5}" width="${w-1.6}" height="${h-1.0}" fill="rgba(148,163,184,.1)"/>`
      break
    }
    case 'cloison': {
      s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${gs}.28)" stroke="${gs}.48)" stroke-width="0.7"/>`
      // Hachures diagonales pour distinguer de mur
      const clSteps = Math.floor(w / 2.5)
      for (let i = 0; i < clSteps; i++) {
        const lx = x + (w / clSteps) * i
        s += `<line x1="${lx}" y1="${y+h}" x2="${(lx + h).toFixed(1)}" y2="${y}" stroke="${gs}.2)" stroke-width="0.4"/>`
      }
      break
    }
    case 'fenetre': {
      // Cadre extérieur
      s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="0.5" fill="${gs}.48)" stroke="${gs}.78)" stroke-width="1"/>`
      // Vitre intérieure (inset de 1 unité)
      const fi = 1
      s += `<rect x="${x+fi}" y="${y+fi}" width="${w-fi*2}" height="${h-fi*2}" fill="rgba(147,210,255,.35)" stroke="rgba(147,210,255,.6)" stroke-width="0.4"/>`
      // Croisillons : nombre de panneaux selon largeur
      const cols = Math.max(2, Math.round(w/5))
      const innerW = w - fi*2, innerH = h - fi*2
      for (let i = 1; i < cols; i++) {
        const fx = x + fi + (innerW/cols)*i
        s += `<line x1="${fx}" y1="${y+fi}" x2="${fx}" y2="${y+h-fi}" stroke="${gs}.6)" stroke-width="0.6"/>`
      }
      if (innerH > 4) {
        s += `<line x1="${x+fi}" y1="${cy}" x2="${x+w-fi}" y2="${cy}" stroke="${gs}.5)" stroke-width="0.5"/>`
      }
      break
    }
    case 'porte':
    case 'porte_lg': {
      const sw2 = Math.max(w, h)*1.1
      s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="0.5" fill="${gs}.1)" stroke="${gs}.5)" stroke-width="0.7"/>`
      s += `<path d="M${x+w/2},${y+h} A${sw2},${sw2} 0 0,1 ${(x+w/2+sw2*0.65).toFixed(1)},${(y+h-sw2*0.35).toFixed(1)}" fill="rgba(100,116,139,.06)" stroke="${gs}.35)" stroke-width="0.5"/>`
      break
    }
    case 'escalier': {
      const steps = Math.max(3, Math.floor(h/2.5))
      s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${gs}.06)" stroke="${gs}.48)" stroke-width="0.7"/>`
      for (let i = 1; i < steps; i++) {
        const sy = y+(h/steps)*i
        s += `<line x1="${x}" y1="${sy}" x2="${x+w}" y2="${sy}" stroke="${gs}.28)" stroke-width="0.5"/>`
      }
      s += `<text x="${cx}" y="${y+h*0.72}" text-anchor="middle" font-size="4.5" fill="${gs}.65)" style="pointer-events:none">↑</text>`
      break
    }
    case 'ascenseur': {
      const sz = Math.min(w,h)*0.88
      s += `<rect x="${cx-sz/2}" y="${cy-sz/2}" width="${sz}" height="${sz}" rx="1.5" fill="${gs}.1)" stroke="${gs}.52)" stroke-width="0.7"/>`
      s += `<rect x="${cx-sz/2+1.2}" y="${cy-sz/2+1.2}" width="${sz-2.4}" height="${sz-2.4}" rx="0.8" fill="none" stroke="${gs}.28)" stroke-width="0.45"/>`
      s += `<text x="${cx}" y="${cy+0.5}" text-anchor="middle" dominant-baseline="central" font-size="5.5" fill="${gs}.65)" style="pointer-events:none">⬆</text>`
      break
    }
    case 'sortie': {
      s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1" fill="rgba(50,180,80,.1)" stroke="rgba(50,180,80,.55)" stroke-width="0.8"/>`
      s += `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-size="2.8" font-weight="800" font-family="DM Mono,monospace" fill="rgba(50,200,80,.8)" style="pointer-events:none">SORTIE</text>`
      break
    }
    case 'couloir': {
      s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${gs}.05)" stroke="${gs}.22)" stroke-width="0.5"/>`
      // Flèches directionnelles
      const aw = w * 0.18
      s += `<path d="M${x+aw},${cy} L${x+aw*0.5},${cy-h*0.2} M${x+aw},${cy} L${x+aw*0.5},${cy+h*0.2}" fill="none" stroke="${gs}.3)" stroke-width="0.5"/>`
      s += `<path d="M${x+w-aw},${cy} L${x+w-aw*0.5},${cy-h*0.2} M${x+w-aw},${cy} L${x+w-aw*0.5},${cy+h*0.2}" fill="none" stroke="${gs}.3)" stroke-width="0.5"/>`
      s += `<line x1="${x+aw}" y1="${cy}" x2="${x+w-aw}" y2="${cy}" stroke="${gs}.2)" stroke-width="0.4"/>`
      break
    }
    case 'bar_el': {
      const bh = h*0.52, by = y+(h-h*0.52)/2
      s += `<rect x="${x}" y="${by}" width="${w}" height="${bh}" rx="2" fill="rgba(110,75,40,.3)" stroke="rgba(150,105,55,.6)" stroke-width="0.8"/>`
      s += `<rect x="${x+1}" y="${by+1}" width="${w-2}" height="${bh*0.38}" rx="0.8" fill="rgba(190,150,90,.12)"/>`
      const sN = Math.floor(w/5)
      const sSp = w/(sN+1)
      for (let i = 0; i < sN; i++)
        s += `<circle cx="${(x+sSp*(i+1)).toFixed(1)}" cy="${(by+bh+2.2).toFixed(1)}" r="1.2" fill="${gs}.08)" stroke="${gs}.28)" stroke-width="0.4"/>`
      break
    }
    case 'buffet': {
      s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.5" fill="rgba(130,95,55,.2)" stroke="rgba(155,115,65,.52)" stroke-width="0.7"/>`
      for (let i = 1; i < 3; i++)
        s += `<line x1="${x+1}" y1="${y+h/3*i}" x2="${x+w-1}" y2="${y+h/3*i}" stroke="rgba(155,115,65,.3)" stroke-width="0.4"/>`
      s += `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-size="2.2" font-family="DM Mono,monospace" fill="${gs}.58)" style="pointer-events:none">Buffet</text>`
      break
    }
    case 'caisse': {
      s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="rgba(68,128,216,.12)" stroke="rgba(68,128,216,.5)" stroke-width="0.8"/>`
      s += `<rect x="${x+1.5}" y="${y+1.5}" width="${w-3}" height="${h*0.42}" rx="0.8" fill="rgba(68,128,216,.15)"/>`
      s += `<text x="${cx}" y="${cy+h*0.15}" text-anchor="middle" dominant-baseline="central" font-size="2.3" font-family="DM Mono,monospace" fill="rgba(68,128,216,.8)" style="pointer-events:none">Caisse</text>`
      break
    }
    case 'scene': {
      s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2.5" fill="rgba(90,45,155,.12)" stroke="rgba(120,75,195,.5)" stroke-width="0.8"/>`
      s += `<rect x="${x+2}" y="${y+2}" width="${w-4}" height="${h-4}" rx="1.5" fill="rgba(90,45,155,.06)" stroke="rgba(120,75,195,.22)" stroke-width="0.5"/>`
      // Spots lumineux
      const spots = [0.22, 0.5, 0.78]
      spots.forEach(p => {
        s += `<circle cx="${(x+w*p).toFixed(1)}" cy="${(y+2.5).toFixed(1)}" r="1.8" fill="rgba(245,195,50,.15)" stroke="none"/>`
        s += `<circle cx="${(x+w*p).toFixed(1)}" cy="${(y+2.5).toFixed(1)}" r="0.8" fill="rgba(245,195,50,.45)" stroke="none"/>`
      })
      s += `<text x="${cx}" y="${cy+1}" text-anchor="middle" dominant-baseline="central" font-size="2.5" font-family="DM Mono,monospace" fill="rgba(120,75,195,.7)" style="pointer-events:none">Scène</text>`
      break
    }
    case 'piano': {
      const kW = w*0.28, bX = x+kW
      // Corps (silhouette de piano à queue vu du dessus)
      s += `<path d="M${bX},${y} Q${x+w},${y} ${x+w},${cy} Q${x+w},${y+h} ${bX},${y+h} Z" fill="rgba(18,18,18,.72)" stroke="rgba(100,100,100,.4)" stroke-width="0.5"/>`
      s += `<path d="M${(bX+w*0.1).toFixed(1)},${(y+h*0.12).toFixed(1)} Q${(bX+w*0.5).toFixed(1)},${(y+h*0.04).toFixed(1)} ${(bX+w*0.82).toFixed(1)},${(y+h*0.28).toFixed(1)}" fill="none" stroke="rgba(200,200,200,.2)" stroke-width="0.8"/>`
      // Clavier
      s += `<rect x="${x}" y="${y}" width="${kW}" height="${h}" rx="0.4" fill="rgba(235,230,215,.85)" stroke="${gs}.5)" stroke-width="0.5"/>`
      const nk = Math.floor(kW/1.5)
      for (let i = 0; i < nk; i++) {
        if (i%7===1||i%7===2||i%7===4||i%7===5||i%7===6)
          s += `<rect x="${(x+kW*0.35).toFixed(1)}" y="${(y+(h/nk)*i+0.15).toFixed(1)}" width="${(kW*0.55).toFixed(1)}" height="${(h/nk*0.72).toFixed(1)}" rx="0.18" fill="rgba(18,18,18,.88)"/>`
      }
      break
    }
    case 'plante': {
      const pr = Math.min(w,h)/2 - 0.3
      s += `<ellipse cx="${cx}" cy="${y+h*0.78}" rx="${pr*0.55}" ry="${pr*0.22}" fill="rgba(145,90,50,.38)" stroke="rgba(110,70,35,.5)" stroke-width="0.5"/>`
      s += `<circle cx="${cx}" cy="${cy-pr*0.08}" r="${pr}" fill="rgba(45,165,65,.24)" stroke="rgba(38,140,52,.6)" stroke-width="0.6"/>`
      s += `<circle cx="${(cx-pr*0.32).toFixed(1)}" cy="${(cy-pr*0.28).toFixed(1)}" r="${pr*0.58}" fill="rgba(55,185,70,.2)" stroke="none"/>`
      s += `<circle cx="${(cx+pr*0.3).toFixed(1)}" cy="${(cy-pr*0.18).toFixed(1)}" r="${pr*0.52}" fill="rgba(65,175,60,.2)" stroke="none"/>`
      break
    }
    case 'parasol': {
      const pr = Math.min(w,h)/2 - 0.3
      s += `<circle cx="${cx}" cy="${cy}" r="${pr}" fill="rgba(248,195,48,.12)" stroke="rgba(195,148,28,.42)" stroke-width="0.7"/>`
      // Panneaux du parasol
      for (let i = 0; i < 8; i++) {
        const a = (i/8)*Math.PI*2
        const a2 = ((i+0.5)/8)*Math.PI*2
        s += `<line x1="${cx}" y1="${cy}" x2="${(cx+Math.cos(a)*pr).toFixed(1)}" y2="${(cy+Math.sin(a)*pr).toFixed(1)}" stroke="rgba(195,148,28,.18)" stroke-width="0.4"/>`
        // Alternance de teinte pour les panneaux
        if (i % 2 === 0)
          s += `<path d="M${cx},${cy} L${(cx+Math.cos(a)*pr).toFixed(1)},${(cy+Math.sin(a)*pr).toFixed(1)} A${pr},${pr} 0 0,1 ${(cx+Math.cos(a2)*pr).toFixed(1)},${(cy+Math.sin(a2)*pr).toFixed(1)} Z" fill="rgba(248,195,48,.08)" stroke="none"/>`
      }
      s += `<circle cx="${cx}" cy="${cy}" r="${pr*0.15}" fill="rgba(195,148,28,.48)" stroke="rgba(195,148,28,.6)" stroke-width="0.3"/>`
      break
    }
    case 'wc': {
      s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${gs}.08)" stroke="${gs}.42)" stroke-width="0.7"/>`
      // Pictogramme WC simple
      s += `<circle cx="${cx-w*0.15}" cy="${y+h*0.22}" r="${Math.min(w,h)*0.08}" fill="${gs}.35)"/>`
      s += `<line x1="${cx-w*0.15}" y1="${y+h*0.30}" x2="${cx-w*0.15}" y2="${y+h*0.55}" stroke="${gs}.35)" stroke-width="0.6"/>`
      s += `<circle cx="${cx+w*0.15}" cy="${y+h*0.22}" r="${Math.min(w,h)*0.08}" fill="${gs}.35)"/>`
      s += `<line x1="${cx+w*0.15}" y1="${y+h*0.30}" x2="${cx+w*0.15}" y2="${y+h*0.55}" stroke="${gs}.35)" stroke-width="0.6"/>`
      s += `<text x="${cx}" y="${y+h*0.82}" text-anchor="middle" dominant-baseline="central" font-size="2.2" font-family="DM Mono,monospace" font-weight="700" fill="${gs}.55)" style="pointer-events:none">WC</text>`
      break
    }
    case 'baie_vitree': {
      // Grande baie vitrée — cadre fin + vitrage bleu avec reflets
      s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="0.3" fill="${gs}.42)" stroke="${gs}.7)" stroke-width="0.8"/>`
      const bfi = 0.8
      s += `<rect x="${x+bfi}" y="${y+bfi}" width="${w-bfi*2}" height="${h-bfi*2}" fill="rgba(147,210,255,.32)" stroke="rgba(147,210,255,.55)" stroke-width="0.3"/>`
      // Reflet diagonal
      s += `<line x1="${x+w*0.15}" y1="${y+h}" x2="${x+w*0.35}" y2="${y}" stroke="rgba(255,255,255,.22)" stroke-width="0.8"/>`
      s += `<line x1="${x+w*0.55}" y1="${y+h}" x2="${x+w*0.75}" y2="${y}" stroke="rgba(255,255,255,.15)" stroke-width="0.6"/>`
      break
    }
    case 'garde_corps': {
      // Rambarde / garde-corps — barres verticales
      s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="0.3" fill="${gs}.15)" stroke="${gs}.52)" stroke-width="0.6"/>`
      const gcN = Math.max(3, Math.floor(w / 2.5))
      const gcSp = w / (gcN + 1)
      for (let i = 0; i < gcN; i++)
        s += `<line x1="${(x+gcSp*(i+1)).toFixed(1)}" y1="${y}" x2="${(x+gcSp*(i+1)).toFixed(1)}" y2="${y+h}" stroke="${gs}.35)" stroke-width="0.4"/>`
      break
    }
    case 'cheminee': {
      // Cheminée — foyer + manteau
      s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.5" fill="rgba(120,70,40,.18)" stroke="rgba(140,85,45,.52)" stroke-width="0.7"/>`
      // Foyer
      const fW = w*0.65, fH = h*0.55
      s += `<rect x="${cx-fW/2}" y="${y+h*0.35}" width="${fW}" height="${fH}" rx="1" fill="rgba(25,18,12,.35)" stroke="rgba(100,60,30,.4)" stroke-width="0.5"/>`
      // Flammes
      s += `<path d="M${cx-fW*0.15},${y+h*0.85} Q${cx-fW*0.08},${y+h*0.5} ${cx},${y+h*0.42} Q${cx+fW*0.08},${y+h*0.5} ${cx+fW*0.15},${y+h*0.85}" fill="rgba(235,120,30,.3)" stroke="none"/>`
      s += `<path d="M${cx-fW*0.06},${y+h*0.85} Q${cx},${y+h*0.52} ${cx+fW*0.06},${y+h*0.85}" fill="rgba(248,185,50,.25)" stroke="none"/>`
      // Manteau
      s += `<rect x="${x+1}" y="${y}" width="${w-2}" height="${h*0.2}" rx="0.8" fill="rgba(120,70,40,.25)" stroke="rgba(140,85,45,.35)" stroke-width="0.4"/>`
      break
    }
    case 'vestiaire': {
      // Vestiaire — rangée de cintres
      s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.5" fill="${gs}.1)" stroke="${gs}.45)" stroke-width="0.7"/>`
      // Barre horizontale
      s += `<line x1="${x+1.5}" y1="${y+h*0.3}" x2="${x+w-1.5}" y2="${y+h*0.3}" stroke="${gs}.35)" stroke-width="0.6"/>`
      // Cintres
      const vN = Math.max(2, Math.floor(w / 3.5))
      const vSp = (w - 3) / (vN)
      for (let i = 0; i < vN; i++) {
        const vx = x + 1.5 + vSp * (i + 0.5)
        s += `<path d="M${vx},${y+h*0.3} Q${vx-1.2},${y+h*0.55} ${vx},${y+h*0.58} Q${vx+1.2},${y+h*0.55} ${vx},${y+h*0.3}" fill="none" stroke="${gs}.3)" stroke-width="0.5"/>`
      }
      s += `<text x="${cx}" y="${y+h*0.82}" text-anchor="middle" dominant-baseline="central" font-size="2" font-family="DM Mono,monospace" fill="${gs}.5)" style="pointer-events:none">Vestiaire</text>`
      break
    }
    case 'arbre': {
      // Arbre vu du dessus — canopée circulaire + tronc
      const ar = Math.min(w,h)/2 - 0.5
      // Canopée (trois cercles superposés)
      s += `<circle cx="${cx-ar*0.2}" cy="${cy-ar*0.15}" r="${ar*0.72}" fill="rgba(35,145,55,.2)" stroke="none"/>`
      s += `<circle cx="${cx+ar*0.25}" cy="${cy+ar*0.1}" r="${ar*0.68}" fill="rgba(40,155,50,.18)" stroke="none"/>`
      s += `<circle cx="${cx}" cy="${cy}" r="${ar}" fill="rgba(45,165,60,.15)" stroke="rgba(38,140,52,.5)" stroke-width="0.6"/>`
      // Tronc central
      s += `<circle cx="${cx}" cy="${cy}" r="${ar*0.18}" fill="rgba(130,85,45,.45)" stroke="rgba(110,70,35,.5)" stroke-width="0.3"/>`
      break
    }
    case 'fontaine': {
      // Fontaine vue du dessus — cercles concentriques + eau
      const fr = Math.min(w,h)/2 - 0.5
      s += `<circle cx="${cx}" cy="${cy}" r="${fr}" fill="rgba(100,180,230,.12)" stroke="${gs}.45)" stroke-width="0.7"/>`
      s += `<circle cx="${cx}" cy="${cy}" r="${fr*0.65}" fill="rgba(100,180,230,.18)" stroke="rgba(100,180,230,.4)" stroke-width="0.4"/>`
      s += `<circle cx="${cx}" cy="${cy}" r="${fr*0.3}" fill="rgba(100,180,230,.25)" stroke="rgba(100,180,230,.55)" stroke-width="0.4"/>`
      // Jet central
      s += `<circle cx="${cx}" cy="${cy}" r="${fr*0.12}" fill="rgba(180,220,250,.6)" stroke="none"/>`
      break
    }
    case 'jardiniere': {
      // Jardinière rectangulaire — bac + végétation
      s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1" fill="rgba(130,90,50,.22)" stroke="rgba(140,95,55,.5)" stroke-width="0.6"/>`
      // Végétation — petits cercles verts
      const jN = Math.max(2, Math.floor(w / 3))
      const jSp = w / (jN + 1)
      for (let i = 0; i < jN; i++) {
        const jx = x + jSp * (i + 1)
        const jr = Math.min(h, 3) * 0.45
        s += `<circle cx="${jx.toFixed(1)}" cy="${cy}" r="${jr.toFixed(1)}" fill="rgba(55,175,65,.22)" stroke="rgba(45,150,55,.4)" stroke-width="0.3"/>`
      }
      break
    }
    default: {
      s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.5" fill="${gs}.08)" stroke="${gs}.32)" stroke-width="0.6"/>`
      s += `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-size="${w<8?'3.5':'2.4'}" font-family="DM Mono,monospace" fill="${gs}.65)" style="pointer-events:none">${r.lbl}</text>`
    }
  }
  return s
}

// ── Chaises SVG identiques à l'éditeur (SetupPlan) ──
export function spChairsSvg(t: Table, fillOverride?: string, strokeOverride?: string): string {
  const tRef = Math.min(t.w, t.h)
  const CW   = tRef * 0.183
  const CH   = tRef * 0.104
  const GAP  = tRef * 0.046
  const fill   = fillOverride || 'rgba(68,128,216,.13)'
  const stroke = strokeOverride || 'rgba(68,128,216,.32)'
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
      const d = rad + GAP + CH/2
      if (t.orient === 'H') {
        s += rectChair(cx - d, cy, CH, CW, 0)
        s += rectChair(cx + d, cy, CH, CW, 0)
      } else {
        s += rectChair(cx, cy - d, CW, CH, 0)
        s += rectChair(cx, cy + d, CW, CH, 0)
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
