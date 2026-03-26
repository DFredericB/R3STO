// ══════════════════════════════════════════════════
//  R3STO — Vue Plan de service (Grille)
//  Colonnes par service, lignes par table
//  UX compact : ligne épurée, actions au tap sur badge
//  Move mode: déplacer ou échanger (switch) des tables
// ══════════════════════════════════════════════════

import { useState, useMemo, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import { ViewToolbar } from '../../components/ui/ViewToolbar'
import { useT } from '../../i18n/useTranslation'
import type { Service, Resa, Table, Combo } from '../../types'
import { STATUS, CANAUX } from '../../utils/design'
import { timeToMins, nowMins } from '../../utils/date'
import { canMoveResa, canSwapResas, isOccupying, tblMatchesTable, iaPlacement } from '../../utils/placementRules'

// Taille boutons iPad 9" — minimum 40px pour confort tactile
const BTN = 40

// ── Types pour le mode déplacement ──
interface MoveMode {
  resaId: string
  resaName: string
  covers: number
  fromTbl: string
  svc: string
}

// Style bouton action uniforme — flex:1 pour remplir la grille
const actionBtn = (border: string, bg: string, color: string): React.CSSProperties => ({
  height: BTN, padding: '0 10px', borderRadius: 8, border: `1px solid ${border}`,
  background: bg, color, cursor: 'pointer', fontSize: 12, fontWeight: 700,
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
  whiteSpace: 'nowrap', flex: 1, minWidth: 0,
})

// ── Ligne de table ───────────────────────────────
function TableRow({ table, resas, combos, svcResas, moveMode, expanded, onToggleExpand,
  onMarkArrived, onMarkNoshow, onMarkDone, onCancel, onRestore,
  onClick, onPlaceResa, onPlaceCombo, onUncombine, onStartMove, onMoveTarget,
}: {
  table: Table
  resas: Resa[]
  combos: Combo[]
  svcResas: Resa[]
  moveMode: MoveMode | null
  expanded: boolean
  onToggleExpand: () => void
  onMarkArrived: (id: string) => void
  onMarkNoshow: (id: string) => void
  onMarkDone: (id: string) => void
  onCancel: (id: string) => void
  onRestore: (id: string) => void
  onClick: (id: string) => void
  onPlaceResa: (tableId: string) => void
  onPlaceCombo: (comboLabel: string) => void
  onUncombine: (tableId: string, resaId: string) => void
  onStartMove: (resa: Resa) => void
  onMoveTarget: (table: Table) => void
}) {
  const { t } = useT()
  const [showComboMenu, setShowComboMenu] = useState(false)
  const badgeRef = useRef<HTMLDivElement>(null)
  const comboRef = useRef<HTMLButtonElement>(null)
  const [badgeRect, setBadgeRect] = useState<DOMRect | null>(null)
  const [comboRect, setComboRect] = useState<DOMRect | null>(null)
  const [ddFlip, setDdFlip] = useState(false)
  const [comboDdFlip, setComboDdFlip] = useState(false)

  // Recalculer la position du badge + décider flip une seule fois à l'ouverture
  useEffect(() => {
    if (expanded && badgeRef.current) {
      const rect = badgeRef.current.getBoundingClientRect()
      setBadgeRect(rect)
      // Estimer ~250px de hauteur dropdown, flip si ça dépasse le viewport
      setDdFlip(rect.bottom + 250 > window.innerHeight)
    } else {
      setDdFlip(false)
    }
  }, [expanded])

  // Recalculer la position du bouton combo + décider flip
  useEffect(() => {
    if (showComboMenu && comboRef.current) {
      const rect = comboRef.current.getBoundingClientRect()
      setComboRect(rect)
      setComboDdFlip(rect.bottom + 150 > window.innerHeight)
    } else {
      setComboDdFlip(false)
    }
  }, [showComboMenu])

  // Fermer dropdowns au scroll
  useEffect(() => {
    if (!expanded && !showComboMenu) return
    const onScroll = () => { if (expanded) onToggleExpand(); setShowComboMenu(false) }
    window.addEventListener('scroll', onScroll, true)
    return () => window.removeEventListener('scroll', onScroll, true)
  }, [expanded, showComboMenu, onToggleExpand])

  const occupying = resas.filter(r => r.s === 'reserved' || r.s === 'arrived')
  const isFree = occupying.length === 0 && !table.blocked && !table.held
  const mainResa = occupying[0] || resas[0]
  const sm = mainResa?.s ? STATUS[mainResa.s as keyof typeof STATUS] : null

  // Combos impliquant cette table
  const tableCombos = combos.filter(c => c.tables.includes(table.id))
  const hasCombos = tableCombos.length > 0
  const isInCombo = !!resas.find(r => r.tbl?.includes('+') && tblMatchesTable(r.tbl, table.n))

  // Combos disponibles (toutes les tables du combo libres pour ce service)
  // combo.label = "T1+T2" → split par '+' donne les noms de tables
  // Un combo est dispo si AUCUNE de ses tables n'est occupée dans ce service
  const availableCombos = isFree ? tableCombos.filter(combo =>
    combo.label.split('+').every(tName =>
      !svcResas.some(r => isOccupying(r) && r.tbl && tblMatchesTable(r.tbl, tName.trim()))
    )
  ) : []

  // ── Move mode visuel ──
  const isSource = moveMode ? resas.some(r => r.id === moveMode.resaId) : false
  const isValidMoveTarget = moveMode && !isSource && isFree && table.capMax >= moveMode.covers
  const isValidSwapTarget = moveMode && !isSource && !isFree && occupying.length > 0

  // ── ÉTAT BLOQUÉ ──
  if (table.blocked) {
    return (
      <div style={{
        display: 'flex', borderRadius: 9, overflow: 'hidden',
        border: '1px solid rgba(220,80,80,.3)', background: 'rgba(220,80,80,.06)',
        minHeight: 44, opacity: moveMode ? .35 : .7,
      }}>
        <div style={{
          width: 52, flexShrink: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', background: 'rgba(220,80,80,.2)',
          padding: '4px 0',
        }}>
          <div style={{ fontSize: 12, fontWeight: 900, fontFamily: 'var(--fm)', color: 'var(--rd)' }}>{table.n}</div>
          <div style={{ fontSize: 8, color: 'var(--rd)', fontWeight: 600 }}>{table.capMax}p</div>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 10px', gap: 6 }}>
          <span style={{ fontSize: 12 }}>🚫</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--rd)' }}>Bloquée</span>
          {table.blockedReason && <span style={{ fontSize: 10, color: 'var(--t3)', fontStyle: 'italic' }}>{table.blockedReason}</span>}
        </div>
      </div>
    )
  }

  // ── ÉTAT RÉSERVE (held) ──
  if (table.held && isFree) {
    const canTarget = moveMode && !isSource && table.capMax >= moveMode.covers
    return (
      <div
        onClick={() => {
          if (canTarget) { onMoveTarget(table); return }
          if (!moveMode) onPlaceResa(table.id)
        }}
        style={{
          display: 'flex', borderRadius: 9, overflow: 'hidden',
          border: canTarget ? '2px solid rgba(60,200,112,.6)' : '1px solid rgba(232,165,48,.4)',
          background: canTarget ? 'rgba(60,200,112,.08)' : 'rgba(232,165,48,.06)',
          minHeight: 44, cursor: canTarget || !moveMode ? 'pointer' : 'default',
          opacity: moveMode && !canTarget ? .35 : 1,
        }}
        title={canTarget ? `Déplacer ici → ${table.n}` : `Réserver ${table.n} (de réserve)`}
      >
        <div style={{
          width: 52, flexShrink: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', background: 'rgba(232,165,48,.18)', padding: '4px 0',
        }}>
          <div style={{ fontSize: 12, fontWeight: 900, fontFamily: 'var(--fm)', color: '#e8a530' }}>{table.n}</div>
          <div style={{ fontSize: 8, color: '#e8a530', fontWeight: 600 }}>{table.capMax}p</div>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 10px', gap: 6 }}>
          <span style={{ fontSize: 12 }}>🔒</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#e8a530' }}>De réserve</span>
          {canTarget && <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: 'var(--gn)' }}>→ Ici</span>}
          {!canTarget && hasCombos && (
            <span style={{ fontSize: 10, color: 'var(--t4)', marginLeft: 'auto', fontFamily: 'var(--fm)' }}>
              🔗 {tableCombos.map(c => c.label).join(' · ')}
            </span>
          )}
        </div>
      </div>
    )
  }

  // ── Couleur selon statut ──
  const statusColor = sm ? sm.hex : 'rgba(100,116,139,.22)'
  const borderCol = sm ? sm.border : 'var(--border)'
  const bgCol = sm ? sm.bg : 'var(--surf)'

  // ── Move mode borders ──
  const moveBorder = isSource
    ? '2px solid rgba(91,156,246,.7)'
    : isValidMoveTarget
      ? '2px solid rgba(60,200,112,.6)'
      : isValidSwapTarget
        ? '2px solid rgba(232,165,48,.5)'
        : `1px solid ${isInCombo ? 'rgba(255,214,102,.5)' : borderCol}`

  const moveBgStr = isSource
    ? 'rgba(91,156,246,.08)'
    : isValidMoveTarget
      ? 'rgba(60,200,112,.06)'
      : isValidSwapTarget
        ? 'rgba(232,165,48,.06)'
        : bgCol

  const moveOpacity = moveMode && !isSource && !isValidMoveTarget && !isValidSwapTarget ? .35 : 1

  // Style item dropdown action
  const ddItem = (icon: string, label: string, col: string): React.CSSProperties => ({
    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 12px', border: 'none', borderBottom: '1px solid rgba(255,255,255,.04)',
    background: 'transparent', cursor: 'pointer', textAlign: 'left' as const,
    fontSize: 13, fontWeight: 700, color: col,
  })

  return (
    <div
      onClick={() => {
        // Move mode : clic sur toute la ligne pour cibler
        if (moveMode && !isSource && (isValidMoveTarget || isValidSwapTarget)) {
          onMoveTarget(table); return
        }
        // Fermer les menus ouverts
        if (showComboMenu) { setShowComboMenu(false); return }
        if (expanded) { onToggleExpand(); return }
        // Clic sur la ligne = résa manuel (libre) ou édition (occupée)
        if (!moveMode && isFree) { onPlaceResa(table.id); return }
        if (!moveMode && mainResa) { onClick(mainResa.id); return }
      }}
      style={{
        borderRadius: 9, overflow: 'visible', position: 'relative',
        border: moveBorder, background: moveBgStr,
        transition: 'all .12s',
        boxShadow: isInCombo && !moveMode ? '0 0 0 1px rgba(255,214,102,.15)' : isSource ? '0 0 0 2px rgba(91,156,246,.3)' : 'none',
        opacity: moveOpacity,
        cursor: moveMode && (isValidMoveTarget || isValidSwapTarget) ? 'pointer' : 'pointer',
      }}
    >
      {/* ── Ligne compacte ── */}
      {(() => {
        const comboNames = table.n.includes('+') ? table.n.split('+') : null
        const comboCount = comboNames ? comboNames.length : 0
        const lineHeight = comboCount >= 4 ? 92 : comboCount >= 3 ? 78 : comboCount === 2 ? 62 : 44
        const badgeW = 60 // largeur uniforme pour aligner toutes les lignes
        return (
      <div style={{ display: 'flex', minHeight: lineHeight }}>
        {/* Bande combo dorée */}
        {isInCombo && (
          <div style={{ width: 3, flexShrink: 0, background: 'linear-gradient(180deg, #ffd666, #e8a530)', borderRadius: '9px 0 0 9px' }} />
        )}

        {/* ── Badge table (cliquable → dropdown actions seulement si occupée) ── */}
        <div
          ref={badgeRef}
          onClick={(e) => {
            e.stopPropagation()
            if (moveMode) return
            if (isFree) return
            setShowComboMenu(false)
            onToggleExpand()
          }}
          style={{
            width: badgeW, flexShrink: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: isValidMoveTarget ? 'rgba(60,200,112,.35)' : isValidSwapTarget ? 'rgba(232,165,48,.35)' : statusColor,
            gap: comboNames ? 0 : 1, padding: '3px 0',
            cursor: moveMode || isFree ? 'default' : 'pointer',
            borderRadius: isInCombo ? 0 : '9px 0 0 9px',
          }}
          title={isFree ? table.n : expanded ? 'Fermer' : 'Actions…'}
        >
          {comboNames ? (
            <>
              {comboNames.map((tn, i) => (
                <div key={i} style={{
                  fontSize: 11, fontWeight: 900, fontFamily: 'var(--fm)', color: '#fff',
                  textShadow: '0 1px 2px rgba(0,0,0,.3)', lineHeight: 1.3,
                  borderBottom: i < comboNames.length - 1 ? '1px solid rgba(255,255,255,.2)' : 'none',
                  padding: '1px 0', width: '100%', textAlign: 'center',
                }}>{tn}</div>
              ))}
              <div style={{ fontSize: 7, color: 'rgba(255,255,255,.6)', fontWeight: 600, marginTop: 1 }}>{table.capMax}p</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 12, fontWeight: 900, fontFamily: 'var(--fm)', color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,.3)' }}>
                {table.n}
              </div>
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,.7)', fontWeight: 600 }}>
                {table.capMax}p
              </div>
            </>
          )}
          {/* Chevron — seulement sur tables occupées */}
          {!moveMode && !isFree && (
            <div style={{ fontSize: 7, color: 'rgba(255,255,255,.5)', lineHeight: 1, marginTop: -1 }}>
              {expanded ? '▲' : '▼'}
            </div>
          )}
        </div>

        {/* ── Contenu compact (droite) ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2, padding: '4px 10px', minWidth: 0 }}>
          {isFree ? (
            /* ════ TABLE LIBRE ════ */
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {isValidMoveTarget ? (
                <span style={{ fontSize: 12, color: 'var(--gn)', fontWeight: 700 }}>→ Déplacer ici</span>
              ) : (
                <>
                  <span style={{ fontSize: 12, color: 'var(--t4)', fontWeight: 600 }}>{t('grid.free')}</span>
                  <span style={{ fontSize: 10, color: 'var(--t4)' }}>{table.shape === 'round' ? '○' : '▭'}</span>
                </>
              )}
              {/* Bouton combo */}
              {availableCombos.length > 0 && !moveMode && (
                <button
                  ref={comboRef}
                  onClick={(e) => { e.stopPropagation(); if (expanded) onToggleExpand(); setShowComboMenu(!showComboMenu) }}
                  style={{
                    marginLeft: 'auto', padding: '2px 8px', borderRadius: 6,
                    border: '1px solid rgba(255,214,102,.4)',
                    background: showComboMenu ? 'rgba(255,214,102,.2)' : 'rgba(255,214,102,.08)',
                    cursor: 'pointer', fontSize: 10, fontWeight: 700, color: '#e8a530',
                    fontFamily: 'var(--fm)', display: 'flex', alignItems: 'center', gap: 4,
                    height: 28, flexShrink: 0,
                  }}
                >
                  🔗 {availableCombos.length > 1 ? `${availableCombos.length} combos` : availableCombos[0].label}
                  <span style={{ fontSize: 9, color: 'rgba(255,214,102,.7)' }}>{availableCombos.length === 1 ? `${availableCombos[0].capOverride || availableCombos[0].cap}p` : ''}</span>
                  <span style={{ fontSize: 8, marginLeft: 2 }}>{showComboMenu ? '▲' : '▼'}</span>
                </button>
              )}
            </div>
          ) : (
            /* ════ RÉSA(S) COMPACT ════ */
            resas.map((r, idx) => (
              <div key={r.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  borderTop: idx > 0 ? '1px solid rgba(255,255,255,.06)' : 'none',
                  paddingTop: idx > 0 ? 3 : 0,
                }}
              >
                {/* Heure */}
                <span style={{ fontFamily: 'var(--fm)', fontSize: 12, fontWeight: 800, color: 'var(--text)', flexShrink: 0, width: 34 }}>
                  {r.t.replace('h', ':')}
                </span>
                {/* Nom */}
                <span style={{
                  fontSize: 12, fontWeight: 700, color: 'var(--text)', flex: 1, minWidth: 0,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {r.nom || r.n.split(' ').slice(-1)[0]}
                  {r.statut === 2 && ' ⭐'}
                  {r.statut === 3 && ' 👁'}
                  {r.allergie && ' ⚠️'}
                </span>
                {/* Couverts */}
                <span style={{ fontFamily: 'var(--fm)', fontSize: 11, fontWeight: 800, color: 'var(--t2)', flexShrink: 0 }}>
                  {r.c}p
                </span>
                {/* Swap hint */}
                {isValidSwapTarget && isOccupying(r) && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#e8a530', flexShrink: 0 }}>↔</span>
                )}
                {/* Combo indicator */}
                {isInCombo && idx === 0 && (
                  <span style={{ fontSize: 9, color: '#ffd666', fontWeight: 600, flexShrink: 0 }}>🔗</span>
                )}
                {/* Canal de réservation */}
                {r.canal && CANAUX[r.canal] && (
                  <span style={{ fontSize: 9, flexShrink: 0, opacity: .8 }} title={CANAUX[r.canal].label}>
                    {CANAUX[r.canal].icon}
                  </span>
                )}
                {/* Mode IA/Manuel — badge compact coloré */}
                <span style={{
                  fontSize: 7, fontWeight: 800, flexShrink: 0,
                  padding: '1px 4px', borderRadius: 3, letterSpacing: .3,
                  background: r.mode === 'ia' ? 'rgba(91,156,246,.15)' : 'rgba(232,165,48,.12)',
                  color: r.mode === 'ia' ? '#7bb8ff' : '#e8a530',
                  border: `1px solid ${r.mode === 'ia' ? 'rgba(91,156,246,.3)' : 'rgba(232,165,48,.25)'}`,
                }} title={r.mode === 'ia' ? 'Placé par IA' : 'Placement manuel'}>
                  {r.mode === 'ia' ? '🤖 IA' : '✋'}
                </span>
                {/* NEW badge — résa créée il y a moins de 15 min */}
                {(Date.now() - r.createdAt) < 15 * 60 * 1000 && (
                  <span style={{ fontSize: 7, fontWeight: 900, color: '#a78bfa', background: 'rgba(167,139,250,.15)', padding: '1px 4px', borderRadius: 4, flexShrink: 0, letterSpacing: .5 }}>NEW</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
        )
      })()}

      {/* ── Dropdown actions (depuis badge) — portal pour éviter clipping overflow ── */}
      {expanded && !moveMode && badgeRect && createPortal(
        <>
          {/* Backdrop invisible pour fermer au clic extérieur */}
          <div onClick={() => onToggleExpand()} style={{ position: 'fixed', inset: 0, zIndex: 9998 }} />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              left: badgeRect.left,
              ...(ddFlip
                ? { bottom: window.innerHeight - badgeRect.top + 4 }
                : { top: badgeRect.bottom + 4 }),
              zIndex: 9999,
              background: 'var(--surf2)', border: `1px solid ${sm ? sm.border : 'var(--border)'}`,
              borderRadius: 10, overflow: 'hidden', minWidth: 200, maxWidth: 280,
              boxShadow: '0 8px 24px rgba(0,0,0,.35)',
              maxHeight: '70vh', overflowY: 'auto',
            }}>
          {/* ── Actions table occupée uniquement ── */}
          <>
              {resas.filter(r => isOccupying(r) || r.s === 'waitlist' || r.s === 'noshow' || r.s === 'done' || r.s === 'cancelled').map(r => {
                const st = STATUS[r.s as keyof typeof STATUS]
                return (
                  <div key={r.id}>
                    {/* En-tête résa */}
                    <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,.06)', background: 'rgba(0,0,0,.08)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 6,
                          background: st?.bg || 'var(--surf3)', color: st?.hex || 'var(--t3)',
                          border: `1px solid ${st?.border || 'var(--border)'}`,
                        }}>
                          {st?.icon}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{r.nom || r.n.split(' ').slice(-1)[0]}</span>
                        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--t2)', fontFamily: 'var(--fm)' }}>{r.c}p</span>
                        <span style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--fm)' }}>{r.t}</span>
                      </div>
                      {r.allergie && <div style={{ fontSize: 10, color: 'var(--am)', marginTop: 2 }}>⚠️ Allergie</div>}
                      {r.note && <div style={{ fontSize: 10, color: 'var(--t3)', fontStyle: 'italic', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.note.split('\n')[0].slice(0, 50)}</div>}
                    </div>
                    {/* ── 1. Modifier (toujours visible) ── */}
                    <button onClick={(e) => { e.stopPropagation(); onToggleExpand(); onClick(r.id) }} style={ddItem('✏️', 'Modifier', '#7bb8ff')}>✏️ Modifier</button>
                    {/* ── 2. Déplacer (reserved / arrived) — pas sur ligne combo fusionnée ── */}
                    {!table.id.startsWith('combo__') && (r.s === 'reserved' || r.s === 'arrived') && (
                      <button onClick={(e) => { e.stopPropagation(); onToggleExpand(); onStartMove(r) }} style={ddItem('↔', 'Déplacer', '#7bb8ff')}>↔ Déplacer</button>
                    )}
                    {/* ── 3. Délier combo — seulement sur table individuelle faisant partie d'un combo ── */}
                    {!table.id.startsWith('combo__') && isInCombo && (r.s === 'reserved' || r.s === 'arrived') && (
                      <button onClick={(e) => { e.stopPropagation(); onToggleExpand(); onUncombine(table.id, r.id) }} style={ddItem('✂', 'Délier combo', '#e8a530')}>✂ Délier combo</button>
                    )}
                    {/* ── 4. Actions statut ── */}
                    {r.s === 'waitlist' && (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); onToggleExpand(); onRestore(r.id) }} style={ddItem('✓', 'Confirmer', 'var(--gn)')}>✓ Confirmer</button>
                        <button onClick={(e) => { e.stopPropagation(); onToggleExpand(); onCancel(r.id) }} style={ddItem('✗', 'Refuser', 'var(--rd)')}>✗ Refuser</button>
                      </>
                    )}
                    {r.s === 'reserved' && (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); onToggleExpand(); onCancel(r.id) }} style={ddItem('🚫', 'Annuler', 'var(--rd)')}>🚫 Annuler</button>
                        <button onClick={(e) => { e.stopPropagation(); onToggleExpand(); onMarkArrived(r.id) }} style={ddItem('✓', 'Arrivé', 'var(--gn)')}>✓ Arrivé</button>
                        <button onClick={(e) => { e.stopPropagation(); onToggleExpand(); onMarkNoshow(r.id) }} style={ddItem('👻', 'No-show', 'var(--am)')}>👻 No-show</button>
                      </>
                    )}
                    {r.s === 'arrived' && (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); onToggleExpand(); onMarkDone(r.id) }} style={ddItem('🪑', 'Libérer', 'var(--gn)')}>🪑 Libérer</button>
                        <button onClick={(e) => { e.stopPropagation(); onToggleExpand(); onMarkNoshow(r.id) }} style={ddItem('👻', 'No-show', 'var(--am)')}>👻 No-show</button>
                      </>
                    )}
                    {(r.s === 'noshow' || r.s === 'done' || r.s === 'cancelled') && (
                      <button onClick={(e) => { e.stopPropagation(); onToggleExpand(); onRestore(r.id) }} style={ddItem('↩', 'Remettre', '#7bb8ff')}>↩ Remettre</button>
                    )}
                  </div>
                )
              })}
          </>
          </div>
        </>,
        document.body
      )}

      {/* ── Dropdown combos (depuis bouton 🔗) — portal ── */}
      {showComboMenu && !expanded && availableCombos.length > 0 && comboRect && createPortal(
        <>
          {/* Backdrop invisible pour fermer au clic extérieur */}
          <div onClick={() => setShowComboMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 9998 }} />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              right: window.innerWidth - comboRect.right,
              ...(comboDdFlip
                ? { bottom: window.innerHeight - comboRect.top + 4 }
                : { top: comboRect.bottom + 4 }),
              zIndex: 9999,
              background: 'var(--surf2)', border: '1px solid rgba(255,214,102,.4)',
              borderRadius: 10, overflow: 'hidden', minWidth: 160,
              boxShadow: '0 8px 24px rgba(0,0,0,.3)',
              maxHeight: '70vh', overflowY: 'auto',
            }}
          >
          <div style={{ padding: '6px 10px', fontSize: 10, color: 'var(--t4)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>
            Combos disponibles
          </div>
          {availableCombos.map(combo => (
            <button
              key={combo.id}
              onClick={(e) => { e.stopPropagation(); setShowComboMenu(false); onPlaceCombo(combo.label) }}
              style={ddItem('🔗', combo.label, '#ffd666')}
            >
              🔗 {combo.label} <span style={{ fontSize: 10, color: 'var(--t3)', marginLeft: 4 }}>{combo.cap}p max</span>
            </button>
          ))}
          </div>
        </>,
        document.body
      )}
    </div>
  )
}

// ── Colonne service ─────────────────────────────
function ServiceColumn({ service, tables, resas, combos, allTables, moveMode,
  onMarkArrived, onMarkNoshow, onMarkDone, onCancel, onRestore,
  onClickResa, onPlaceResa, onPlaceCombo, onUncombine, onStartMove, onMoveTarget, onMoveIA,
}: {
  service: Service
  tables: Table[]
  resas: Resa[]
  combos: Combo[]
  allTables: Table[]
  moveMode: MoveMode | null
  onMarkArrived: (id: string) => void
  onMarkNoshow: (id: string) => void
  onMarkDone: (id: string) => void
  onCancel: (id: string) => void
  onRestore: (id: string) => void
  onClickResa: (id: string) => void
  onPlaceResa: (tableId: string) => void
  onPlaceCombo: (comboLabel: string) => void
  onUncombine: (tableId: string, resaId: string) => void
  onStartMove: (resa: Resa) => void
  onMoveTarget: (table: Table) => void
  onMoveIA: () => void
}) {
  const { t } = useT()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const now = nowMins()
  const openM = timeToMins(service.open)
  const closeM = timeToMins(service.close)
  const isActive = now >= openM && now <= closeM
  const isNext = !isActive && now < openM && now >= openM - 60
  const isDone = now > closeM + 30

  const svcName = service.name.toLowerCase()
  const svcResas = resas.filter(r => r.svc === svcName)
  const svcCvt = svcResas.reduce((s, r) => s + r.c, 0)
  const activeTables = tables.filter(t => !t.blocked)
  const freeCount = activeTables.filter(t => !t.held && !svcResas.some(r => tblMatchesTable(r.tbl, t.n) && (r.s === 'reserved' || r.s === 'arrived'))).length
  const blockedCount = tables.filter(t => t.blocked).length
  const heldCount = tables.filter(t => t.held && !svcResas.some(r => tblMatchesTable(r.tbl, t.n) && (r.s === 'reserved' || r.s === 'arrived'))).length

  const isMoveService = moveMode ? moveMode.svc === svcName : true

  return (
    <div style={{ flex: 1, minWidth: 0, minHeight: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', opacity: moveMode && !isMoveService ? .3 : 1 }}>
      {/* En-tête service — sticky */}
      <div style={{
        padding: '8px 12px', borderBottom: '1px solid var(--border)',
        background: isActive ? `${service.color}15` : isNext ? 'rgba(232,165,48,.06)' : 'var(--surf)',
        display: 'flex', alignItems: 'center', gap: 8,
        position: 'sticky', top: 0, zIndex: 5, flexShrink: 0,
      }}>
        <span style={{ fontSize: 16 }}>{service.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
            {service.name}
            {isActive && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gn)', display: 'inline-block', boxShadow: '0 0 6px rgba(60,200,112,.5)' }} title="En cours" />}
            {isNext && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#e8a530', display: 'inline-block', boxShadow: '0 0 6px rgba(232,165,48,.5)' }} title="Prochain" />}
            {isDone && <span style={{ fontSize: 11, color: 'var(--t4)' }}>{t('grid.done')}</span>}
          </div>
          <div style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--fm)' }}>
            {service.open} – {service.close} · LO {service.lastOrder}
          </div>
        </div>
        {/* ── Bouton IA move (visible en move mode sur le bon service) ── */}
        {moveMode && isMoveService ? (
          <button
            onClick={onMoveIA}
            style={{
              padding: '6px 14px', borderRadius: 10,
              border: '2px solid rgba(91,156,246,.5)',
              background: 'rgba(91,156,246,.15)',
              color: '#7bb8ff', cursor: 'pointer',
              fontSize: 12, fontWeight: 800,
              display: 'flex', alignItems: 'center', gap: 6,
              flexShrink: 0, whiteSpace: 'nowrap',
              boxShadow: '0 0 12px rgba(91,156,246,.2)',
              animation: 'pulse 2s ease-in-out infinite',
            }}
            title="Laisser l'IA choisir la meilleure table"
          >
            🤖 Placer avec IA
          </button>
        ) : (
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text)', fontFamily: 'var(--fm)' }}>{svcResas.length}</div>
            <div style={{ fontSize: 10, color: 'var(--t3)', display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
              <span>{svcCvt}p</span>
              <span style={{ color: 'var(--gn)' }}>{freeCount} 🪑</span>
              {heldCount > 0 && <span style={{ color: '#e8a530' }}>{heldCount} 🔒</span>}
              {blockedCount > 0 && <span style={{ color: 'var(--rd)' }}>{blockedCount} 🚫</span>}
            </div>
          </div>
        )}
      </div>

      {/* Tables */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 6, display: 'flex', flexDirection: 'column', gap: 4, WebkitOverflowScrolling: 'touch' as any }}>
        {tables.length === 0 ? (
          <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: 'var(--t3)' }}>{t('grid.noTable')}</div>
        ) : (() => {
          // ── Détecter les combos actifs : résa placée sur un combo label (ex: "T10+T11") ──
          const activeComboResa = new Map<string, Resa>() // comboId → resa
          const hiddenByCombo = new Set<string>() // tableIds masquées car fusionnées
          svcResas.forEach(r => {
            if (!r.tbl?.includes('+') || !isOccupying(r)) return
            const combo = combos.find(c => c.label === r.tbl)
            if (combo) {
              activeComboResa.set(combo.id, r)
              combo.tables.forEach(tid => hiddenByCombo.add(tid))
            }
          })

          const renderedCombo = new Set<string>()
          const elements: React.ReactNode[] = []

          for (const table of tables) {
            // ── Table absorbée par un combo actif → rendre la ligne combo fusionnée ──
            if (hiddenByCombo.has(table.id)) {
              // Trouver le combo actif pour cette table
              const combo = combos.find(c => c.tables.includes(table.id) && activeComboResa.has(c.id))
              if (combo && !renderedCombo.has(combo.id)) {
                renderedCombo.add(combo.id)
                const comboResa = activeComboResa.get(combo.id)!
                // Créer une "table virtuelle" combo pour le TableRow
                const comboTable: Table = {
                  ...table,
                  id: `combo__${combo.id}`,
                  n: combo.label, // "T10+T11"
                  capMax: combo.capOverride || combo.cap,
                  capMin: combo.cap,
                }
                // Ne passer que la résa combo (pas les individuelles)
                const comboResas = [comboResa]
                elements.push(
                  <TableRow
                    key={`combo-${combo.id}`}
                    table={comboTable}
                    resas={comboResas}
                    combos={combos}
                    svcResas={svcResas}
                    moveMode={isMoveService ? moveMode : null}
                    expanded={expandedId === comboTable.id}
                    onToggleExpand={() => setExpandedId(expandedId === comboTable.id ? null : comboTable.id)}
                    onMarkArrived={onMarkArrived}
                    onMarkNoshow={onMarkNoshow}
                    onMarkDone={onMarkDone}
                    onCancel={onCancel}
                    onRestore={onRestore}
                    onClick={onClickResa}
                    onPlaceResa={onPlaceResa}
                    onPlaceCombo={onPlaceCombo}
                    onUncombine={onUncombine}
                    onStartMove={onStartMove}
                    onMoveTarget={onMoveTarget}
                  />
                )
              }
              continue // skip les tables individuelles du combo actif
            }

            // ── Table normale (pas dans un combo actif) ──
            const tblResas = svcResas.filter(r => r.tbl === table.n) // match exact seulement
            elements.push(
              <TableRow
                key={table.id}
                table={table}
                resas={tblResas}
                combos={combos}
                svcResas={svcResas}
                moveMode={isMoveService ? moveMode : null}
                expanded={expandedId === table.id}
                onToggleExpand={() => setExpandedId(expandedId === table.id ? null : table.id)}
                onMarkArrived={onMarkArrived}
                onMarkNoshow={onMarkNoshow}
                onMarkDone={onMarkDone}
                onCancel={onCancel}
                onRestore={onRestore}
                onClick={onClickResa}
                onPlaceResa={onPlaceResa}
                onPlaceCombo={onPlaceCombo}
                onUncombine={onUncombine}
                onStartMove={onStartMove}
                onMoveTarget={onMoveTarget}
              />
            )
          }
          return elements
        })()}
      </div>
    </div>
  )
}

// ── Vue principale ─────────────────────────────────
export function Grille() {
  const { t } = useT()
  const { resas, tables, services, salles, combos, activeDate, setResaStatus, updateResa, swapTables } = useAppStore()
  const navigate = useNavigate()
  const [selectedSalle, setSelectedSalle] = useState('toutes')
  const [svcFilter, setSvcFilter] = useState('tous')
  const [search, setSearch] = useState('')
  const [moveMode, setMoveMode] = useState<MoveMode | null>(null)
  const [moveMsg, setMoveMsg] = useState<string | null>(null)

  const activeServices = services.filter(s => s.active)
  const dayResas = resas.filter(r => r.date === activeDate)

  const displayServices = svcFilter === 'tous'
    ? activeServices
    : activeServices.filter(s => s.name.toLowerCase() === svcFilter)

  const filteredTables = useMemo(() =>
    tables.filter(tbl =>
      tbl.active &&
      (selectedSalle === 'toutes' || tbl.salle === selectedSalle) &&
      (!search || tbl.n.toLowerCase().includes(search.toLowerCase()) ||
        dayResas.some(r => tblMatchesTable(r.tbl, tbl.n) && r.n.toLowerCase().includes(search.toLowerCase()))
      )
    ).sort((a, b) => a.priority - b.priority),
    [tables, selectedSalle, search, dayResas]
  )

  function handlePlaceResa(tableId: string) {
    const tbl = tables.find(t => t.id === tableId)
    if (tbl) navigate(`/reservations?new=1&table=${tbl.n}&mode=manuel&from=grille`)
  }

  function handlePlaceCombo(comboLabel: string) {
    navigate(`/reservations?new=1&table=${comboLabel}&mode=manuel&from=grille`)
  }

  function handleUncombine(tableId: string, resaId: string) {
    const tbl = tables.find(t => t.id === tableId)
    if (tbl) updateResa(resaId, { tbl: tbl.n })
  }

  function handleStartMove(resa: Resa) {
    setMoveMode({ resaId: resa.id, resaName: resa.nom || resa.n, covers: resa.c, fromTbl: resa.tbl, svc: resa.svc })
    setMoveMsg(null)
  }

  function handleCancelMove() { setMoveMode(null); setMoveMsg(null) }

  // ── Déplacer avec IA : placement automatique optimal ──
  function handleMoveIA() {
    if (!moveMode) return
    const sourceResa = resas.find(r => r.id === moveMode.resaId)
    if (!sourceResa) return
    const bestTbl = iaPlacement(
      sourceResa.c, activeDate, moveMode.svc, tables, combos, dayResas,
      undefined, sourceResa.id, selectedSalle !== 'toutes' ? selectedSalle : undefined
    )
    if (!bestTbl) {
      setMoveMsg('❌ Aucune table disponible pour l\'IA')
      setTimeout(() => setMoveMsg(null), 3000)
      return
    }
    updateResa(sourceResa.id, { tbl: bestTbl })
    setMoveMsg(`✅ IA → ${sourceResa.nom || sourceResa.n} placé sur ${bestTbl}`)
    setMoveMode(null); setTimeout(() => setMoveMsg(null), 2500)
  }

  function handleMoveTarget(targetTable: Table) {
    if (!moveMode) return
    const sourceResa = resas.find(r => r.id === moveMode.resaId)
    if (!sourceResa) return

    const targetOccupying = dayResas.filter(r =>
      r.svc === moveMode.svc && tblMatchesTable(r.tbl, targetTable.n) && isOccupying(r)
    )

    if (targetOccupying.length === 0) {
      const check = canMoveResa(sourceResa, { type: 'table', table: targetTable }, tables, combos, resas)
      if (!check.valid) { setMoveMsg(`❌ ${check.reason}`); setTimeout(() => setMoveMsg(null), 3000); return }
      updateResa(sourceResa.id, { tbl: check.newTbl! })
      setMoveMsg(`✅ ${sourceResa.nom || sourceResa.n} → ${targetTable.n}`)
      setMoveMode(null); setTimeout(() => setMoveMsg(null), 2500)
    } else {
      const targetResa = targetOccupying[0]
      const check = canSwapResas(sourceResa, targetResa, tables, combos)
      if (!check.valid) { setMoveMsg(`❌ ${check.reason}`); setTimeout(() => setMoveMsg(null), 3000); return }
      swapTables(sourceResa.id, targetResa.id)
      setMoveMsg(`✅ ${sourceResa.nom || sourceResa.n} ↔ ${targetResa.nom || targetResa.n}`)
      setMoveMode(null); setTimeout(() => setMoveMsg(null), 2500)
    }
  }

  if (activeServices.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--t3)' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🪑</div>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{t('grid.noService')}</div>
        <div style={{ fontSize: 13 }}>{t('grid.configureIn')} <strong>{t('nav.roomsServices')}</strong></div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--hh))', overflow: 'hidden' }}>
      <ViewToolbar
        title={t('grid.title')}
        serviceFilter={svcFilter}
        onServiceFilter={setSvcFilter}
        salleFilter={selectedSalle}
        onSalleFilter={setSelectedSalle}
        search={search}
        onSearch={setSearch}
        onNewResa={moveMode ? undefined : () => navigate('/reservations?new=1&from=grille')}
      />

      {moveMode && (
        <div style={{
          padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 12,
          background: 'rgba(91,156,246,.12)', borderBottom: '2px solid rgba(91,156,246,.4)',
        }}>
          <span style={{ fontSize: 18 }}>↔</span>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#7bb8ff' }}>
              Déplacer {moveMode.resaName} ({moveMode.covers}p)
            </span>
            <span style={{ fontSize: 12, color: 'var(--t3)', marginLeft: 8 }}>
              depuis {moveMode.fromTbl} — toucher une table ou 🤖 IA
            </span>
          </div>
          <button onClick={handleCancelMove} style={{
            minHeight: BTN, padding: '0 16px', borderRadius: 8,
            border: '1px solid rgba(220,80,80,.4)', background: 'rgba(220,80,80,.1)',
            color: 'var(--rd)', cursor: 'pointer', fontSize: 13, fontWeight: 700,
          }}>
            ✕ Annuler
          </button>
        </div>
      )}

      {moveMsg && (
        <div style={{
          padding: '6px 16px', fontSize: 13, fontWeight: 600,
          background: moveMsg.startsWith('✅') ? 'rgba(60,200,112,.1)' : 'rgba(220,80,80,.1)',
          color: moveMsg.startsWith('✅') ? 'var(--gn)' : 'var(--rd)',
          borderBottom: '1px solid var(--border)',
        }}>
          {moveMsg}
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {displayServices.map(svc => (
          <ServiceColumn
            key={svc.id}
            service={svc}
            tables={filteredTables}
            resas={dayResas}
            combos={combos}
            allTables={tables}
            moveMode={moveMode}
            onMarkArrived={(id) => setResaStatus(id, 'arrived')}
            onMarkNoshow={(id) => setResaStatus(id, 'noshow')}
            onMarkDone={(id) => setResaStatus(id, 'done')}
            onCancel={(id) => setResaStatus(id, 'cancelled')}
            onRestore={(id) => setResaStatus(id, 'reserved')}
            onClickResa={(id) => moveMode ? undefined : navigate(`/reservations?edit=${id}&from=grille`)}
            onPlaceResa={handlePlaceResa}
            onPlaceCombo={handlePlaceCombo}
            onUncombine={handleUncombine}
            onStartMove={handleStartMove}
            onMoveTarget={handleMoveTarget}
            onMoveIA={handleMoveIA}
          />
        ))}
      </div>
    </div>
  )
}
