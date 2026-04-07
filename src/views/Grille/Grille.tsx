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
import { timeToMins, nowMins, todayISO } from '../../utils/date'
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

// ── Ligne de table ───────────────────────────────
function TableRow({ table, resas, combos, svcResas, moveMode, moveTrace, expanded, onToggleExpand,
  onMarkArrived, onMarkNoshow, onMarkDone, onCancel, onRestore,
  onClick, onPlaceResa, onPlaceCombo, onStartMove, onMoveTarget, onToggleBlock, onToggleHeld, blinkResaIds, salleColor,
}: {
  table: Table
  resas: Resa[]
  combos: Combo[]
  svcResas: Resa[]
  moveMode: MoveMode | null
  moveTrace: { from: string; to: string; name: string; svc?: string } | null
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
  onToggleBlock: (tableId: string) => void
  onToggleHeld: (tableId: string) => void
  blinkResaIds: string[]
  salleColor?: string
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
  const isBlinking = resas.some(r => blinkResaIds.includes(r.id))

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

  // ── Trace visuelle post-déplacement ──
  const isTraceFrom = moveTrace && tblMatchesTable(moveTrace.from, table.n)
  const isTraceTo = moveTrace && tblMatchesTable(moveTrace.to, table.n)

  // ── ÉTAT BLOQUÉ ──
  if (table.blocked) {
    const comboNames = table.n.includes('+') ? table.n.split('+') : null
    const comboCount = comboNames ? comboNames.length : 0
    const lineHeight = comboCount >= 4 ? 96 : comboCount >= 3 ? 82 : comboCount === 2 ? 66 : 48
    return (
      <div style={{
        display: 'flex', borderRadius: 9, overflow: 'hidden',
        border: '1px solid rgba(220,80,80,.3)', background: 'rgba(220,80,80,.06)',
        minHeight: lineHeight, opacity: moveMode ? .35 : .7,
      }}>
        {salleColor && (
          <div style={{ width: 3, flexShrink: 0, background: salleColor, borderRadius: '9px 0 0 9px', opacity: .6 }} />
        )}
        <div style={{
          width: 64, flexShrink: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', background: 'rgba(220,80,80,.55)',
          gap: 1, padding: '3px 0', borderRadius: salleColor ? 0 : '9px 0 0 9px',
        }}>
          {comboNames ? (
            <>
              {comboNames.map((tn, i) => (
                <div key={i} style={{ textAlign: 'center', width: '100%' }}>
                  <div style={{ fontSize: 13, fontWeight: 900, fontFamily: 'var(--fm)', color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,.3)', lineHeight: 1.3 }}>{tn}</div>
                  {i < comboNames.length - 1 && <div style={{ fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,.5)', lineHeight: 1 }}>+</div>}
                </div>
              ))}
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,.6)', fontWeight: 600, marginTop: 1 }}>{table.capMax}p</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 14, fontWeight: 900, fontFamily: 'var(--fm)', color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,.3)' }}>{table.n}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.7)', fontWeight: 600 }}>{table.capMax}p</div>
            </>
          )}
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,.8)', lineHeight: 1, marginTop: -1 }}>🚫</div>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 10px', gap: 6 }}>
          <span style={{ fontSize: 14 }}>🚫</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--rd)' }}>Bloquée</span>
          {table.blockedReason && <span style={{ fontSize: 12, color: 'var(--t3)', fontStyle: 'italic' }}>{table.blockedReason}</span>}
          <button
            onClick={(e) => { e.stopPropagation(); onToggleBlock(table.id) }}
            style={{ marginLeft: 'auto', padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(60,200,112,.4)', background: 'rgba(60,200,112,.1)', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: 'var(--gn)' }}
          >🔓 Débloquer</button>
        </div>
      </div>
    )
  }

  // ── ÉTAT RÉSERVE (held) ──
  if (table.held && isFree) {
    const canTarget = moveMode && !isSource && table.capMax >= moveMode.covers
    const comboNames = table.n.includes('+') ? table.n.split('+') : null
    const comboCount = comboNames ? comboNames.length : 0
    const lineHeight = comboCount >= 4 ? 96 : comboCount >= 3 ? 82 : comboCount === 2 ? 66 : 48
    return (
      <div
        onClick={() => {
          if (canTarget) { onMoveTarget(table); return }
          if (!moveMode) {
            if (table.id.startsWith('combo__')) { onPlaceCombo(table.n); return }
            onPlaceResa(table.id)
          }
        }}
        style={{
          display: 'flex', borderRadius: 9, overflow: 'hidden',
          border: canTarget ? '2px solid rgba(60,200,112,.6)' : '1px solid rgba(232,165,48,.4)',
          background: canTarget ? 'rgba(60,200,112,.08)' : 'rgba(232,165,48,.06)',
          minHeight: lineHeight, cursor: canTarget || !moveMode ? 'pointer' : 'default',
          opacity: moveMode && !canTarget ? .35 : 1,
        }}
        title={canTarget ? `${t('grille.moveHere')} → ${table.n}` : `${t('grille.book')} ${table.n}`}
      >
        {salleColor && (
          <div style={{ width: 3, flexShrink: 0, background: salleColor, borderRadius: '9px 0 0 9px', opacity: .6 }} />
        )}
        <div style={{
          width: 64, flexShrink: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', background: 'rgba(232,165,48,.45)',
          gap: 1, padding: '3px 0', borderRadius: salleColor ? 0 : '9px 0 0 9px',
        }}>
          {comboNames ? (
            <>
              {comboNames.map((tn, i) => (
                <div key={i} style={{ textAlign: 'center', width: '100%' }}>
                  <div style={{ fontSize: 13, fontWeight: 900, fontFamily: 'var(--fm)', color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,.3)', lineHeight: 1.3 }}>{tn}</div>
                  {i < comboNames.length - 1 && <div style={{ fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,.5)', lineHeight: 1 }}>+</div>}
                </div>
              ))}
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,.6)', fontWeight: 600, marginTop: 1 }}>{table.capMax}p</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 14, fontWeight: 900, fontFamily: 'var(--fm)', color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,.3)' }}>{table.n}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.7)', fontWeight: 600 }}>{table.capMax}p</div>
            </>
          )}
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,.8)', lineHeight: 1, marginTop: -1 }}>🔒</div>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 10px', gap: 6 }}>
          <span style={{ fontSize: 14 }}>🔒</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#e8a530' }}>De réserve</span>
          {canTarget && <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: 'var(--gn)' }}>→ Ici</span>}
          {!canTarget && !moveMode && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleHeld(table.id) }}
              style={{ marginLeft: 'auto', padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(60,200,112,.4)', background: 'rgba(60,200,112,.1)', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: 'var(--gn)' }}
            >🔓 Lever</button>
          )}
          {!canTarget && hasCombos && (
            <span style={{ fontSize: 12, color: 'var(--t4)', fontFamily: 'var(--fm)' }}>
              🔗 {tableCombos.map(c => c.label).join(' · ')}
            </span>
          )}
        </div>
      </div>
    )
  }

  // ── Couleur selon statut (ou blocked/held) ──
  // Si table libre (done/noshow seulement) → couleur "libre" grise, pas la couleur du ghost
  const activeStatus = isFree ? null : sm
  const statusColor = activeStatus ? activeStatus.hex
    : table.blocked ? 'rgba(220,80,80,.55)'
    : table.held ? 'rgba(232,165,48,.45)'
    : 'rgba(100,116,139,.22)'
  const borderCol = activeStatus ? activeStatus.border
    : table.blocked ? 'rgba(220,80,80,.5)'
    : table.held ? 'rgba(232,165,48,.4)'
    : 'var(--border)'
  const bgCol = activeStatus ? activeStatus.bg
    : table.blocked ? 'rgba(220,80,80,.06)'
    : table.held ? 'rgba(232,165,48,.06)'
    : 'var(--surf)'

  // ── Move mode / trace borders ──
  const moveBorder = isTraceFrom
    ? '2px solid rgba(232,165,48,.7)'
    : isTraceTo
      ? '2px solid rgba(60,200,112,.7)'
      : isSource
        ? '2px solid rgba(91,156,246,.7)'
        : isValidMoveTarget
          ? '2px solid rgba(60,200,112,.6)'
          : isValidSwapTarget
            ? '2px solid rgba(232,165,48,.5)'
            : `1px solid ${isInCombo ? 'rgba(255,214,102,.5)' : borderCol}`

  const moveBgStr = isTraceFrom
    ? 'rgba(232,165,48,.12)'
    : isTraceTo
      ? 'rgba(60,200,112,.12)'
      : isSource
        ? 'rgba(91,156,246,.08)'
        : isValidMoveTarget
          ? 'rgba(60,200,112,.06)'
          : isValidSwapTarget
            ? 'rgba(232,165,48,.06)'
            : bgCol

  const moveOpacity = moveMode && !isSource && !isValidMoveTarget && !isValidSwapTarget ? .35 : 1

  // Style item dropdown action
  const ddItem = (_icon: string, _label: string, col: string): React.CSSProperties => ({
    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 12px', border: 'none', borderBottom: '1px solid rgba(255,255,255,.04)',
    background: 'transparent', cursor: 'pointer', textAlign: 'left' as const,
    fontSize: 13, fontWeight: 700, color: col,
  })

  return (
    <div
      data-table-id={table.id}
      onClick={() => {
        // Move mode : clic sur toute la ligne pour cibler
        if (moveMode && !isSource && (isValidMoveTarget || isValidSwapTarget)) {
          onMoveTarget(table); return
        }
        // Fermer les menus ouverts
        if (showComboMenu) { setShowComboMenu(false); return }
        if (expanded) { onToggleExpand(); return }
        // Clic sur la ligne = résa manuel (libre) ou actions (occupée)
        if (!moveMode && isFree) {
          // Combo row → placer via combo label ; table normale → placer via tableId
          if (table.id.startsWith('combo__')) { onPlaceCombo(table.n); return }
          onPlaceResa(table.id); return
        }
        // Table occupée → ouvrir le dropdown d'actions (comme le badge)
        if (!moveMode && !isFree) { onToggleExpand(); return }
      }}
      style={{
        borderRadius: 9, overflow: 'visible', position: 'relative',
        border: moveBorder, background: moveBgStr,
        transition: 'all .12s',
        animation: isBlinking ? 'resaBlink 1.5s ease-in-out infinite' : undefined,
        boxShadow: isTraceFrom ? '0 0 8px rgba(232,165,48,.35)' : isTraceTo ? '0 0 12px rgba(60,200,112,.4)' : isInCombo && !moveMode ? '0 0 0 1px rgba(255,214,102,.15)' : isSource ? '0 0 0 2px rgba(91,156,246,.3)' : 'none',
        opacity: moveOpacity,
        cursor: moveMode && (isValidMoveTarget || isValidSwapTarget) ? 'pointer' : 'pointer',
      }}
    >
      {/* ── Ligne compacte ── */}
      {(() => {
        const comboNames = table.n.includes('+') ? table.n.split('+') : null
        const comboCount = comboNames ? comboNames.length : 0
        const lineHeight = comboCount >= 4 ? 96 : comboCount >= 3 ? 82 : comboCount === 2 ? 66 : 48
        const badgeW = 64 // largeur uniforme pour aligner toutes les lignes
        return (
      <div style={{ display: 'flex', minHeight: lineHeight }}>
        {/* Bande salle supprimée — info dans badge */}

        {/* ── Badge table (cliquable → dropdown actions seulement si occupée) ── */}
        <div
          ref={badgeRef}
          onClick={(e) => {
            e.stopPropagation()
            if (moveMode) return
            setShowComboMenu(false)
            onToggleExpand()
          }}
          style={{
            width: badgeW, flexShrink: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: isTraceFrom ? 'rgba(232,165,48,.55)' : isTraceTo ? 'rgba(60,200,112,.55)' : isValidMoveTarget ? 'rgba(60,200,112,.35)' : isValidSwapTarget ? 'rgba(232,165,48,.35)' : statusColor,
            gap: comboNames ? 0 : 1, padding: '3px 0',
            cursor: moveMode ? 'default' : 'pointer',
            borderRadius: isInCombo ? 0 : '9px 0 0 9px',
          }}
          title={expanded ? 'Fermer' : isFree ? 'Bloquer / Réserve…' : 'Actions…'}
        >
          {comboNames ? (
            <>
              {comboNames.map((tn, i) => (
                <div key={i} style={{ textAlign: 'center', width: '100%' }}>
                  <div style={{
                    fontSize: 13, fontWeight: 900, fontFamily: 'var(--fm)', color: '#fff',
                    textShadow: '0 1px 2px rgba(0,0,0,.3)', lineHeight: 1.3,
                  }}>{tn}</div>
                  {i < comboNames.length - 1 && (
                    <div style={{ fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,.5)', lineHeight: 1 }}>+</div>
                  )}
                </div>
              ))}
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,.6)', fontWeight: 600, marginTop: 1 }}>{table.capMax}p</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 14, fontWeight: 900, fontFamily: 'var(--fm)', color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,.3)' }}>
                {table.n}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.7)', fontWeight: 600 }}>
                {table.capMax}p
              </div>
            </>
          )}
          {/* Indicateur blocked/held dans le badge */}
          {resas.length === 0 && table.blocked && (
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.8)', lineHeight: 1, marginTop: -1 }}>🚫</div>
          )}
          {resas.length === 0 && table.held && !table.blocked && (
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.8)', lineHeight: 1, marginTop: -1 }}>🔒</div>
          )}
          {/* Chevron */}
          {!moveMode && (
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,.5)', lineHeight: 1, marginTop: -1 }}>
              {expanded ? '▲' : '▼'}
            </div>
          )}
        </div>

        {/* ── Contenu compact (droite) ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2, padding: '4px 10px', minWidth: 0 }}>
          {isFree ? (
            /* ════ TABLE LIBRE (avec ghost done/noshow si applicable) ════ */
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {isValidMoveTarget ? (
                <span style={{ fontSize: 14, color: 'var(--gn)', fontWeight: 700 }}>→ {t('grille.moveHere')}</span>
              ) : (() => {
                const ghost = resas.find(r => r.s === 'done' || r.s === 'noshow')
                if (ghost) {
                  const ghostCol = ghost.s === 'done' ? 'var(--gn)' : 'var(--rd)'
                  const ghostIcon = ghost.s === 'done' ? '🪑' : '👻'
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, opacity: .45, fontStyle: 'italic' }}>
                      <span style={{ fontSize: 13 }}>{ghostIcon}</span>
                      <span style={{ fontSize: 14, color: ghostCol, fontWeight: 600 }}>{ghost.prenom ? `${ghost.nom} ${ghost.prenom}` : ghost.nom || ghost.n}</span>
                      <span style={{ fontSize: 12, color: 'var(--t4)', fontFamily: 'var(--fm)' }}>{ghost.c}p · {ghost.t}</span>
                    </div>
                  )
                }
                return (
                  <>
                    <span style={{ fontSize: 14, color: 'var(--t4)', fontWeight: 600 }}>{t('grid.free')}</span>
                    <span style={{ fontSize: 12, color: 'var(--t4)' }}>{table.shape === 'round' ? '○' : '▭'}</span>
                  </>
                )
              })()}
              {/* Boutons actions table libre — combo / bloquer / réserve */}
              {!moveMode && (
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                  {availableCombos.length > 0 && (
                    <button
                      ref={comboRef}
                      onClick={(e) => { e.stopPropagation(); if (expanded) onToggleExpand(); setShowComboMenu(!showComboMenu) }}
                      style={{
                        padding: '2px 8px', borderRadius: 6,
                        border: '1px solid rgba(255,214,102,.4)',
                        background: showComboMenu ? 'rgba(255,214,102,.2)' : 'rgba(255,214,102,.08)',
                        cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#e8a530',
                        fontFamily: 'var(--fm)', display: 'flex', alignItems: 'center', gap: 4,
                        height: 28, flexShrink: 0,
                      }}
                    >
                      🔗 {availableCombos.length > 1 ? `${availableCombos.length} combos` : availableCombos[0].label}
                      <span style={{ fontSize: 11, color: 'rgba(255,214,102,.7)' }}>{availableCombos.length === 1 ? `${availableCombos[0].capOverride || availableCombos[0].cap}p` : ''}</span>
                      <span style={{ fontSize: 10, marginLeft: 2 }}>{showComboMenu ? '▲' : '▼'}</span>
                    </button>
                  )}
                  {!table.id.startsWith('combo__') && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); onToggleHeld(table.id) }}
                        style={{
                          padding: '2px 6px', borderRadius: 5, height: 26,
                          border: '1px solid rgba(232,165,48,.3)', background: 'rgba(232,165,48,.08)',
                          cursor: 'pointer', fontSize: 11, color: '#e8a530', fontWeight: 700,
                          display: 'flex', alignItems: 'center', gap: 3,
                        }}
                        title="Mettre en réserve"
                      >🔒</button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onToggleBlock(table.id) }}
                        style={{
                          padding: '2px 6px', borderRadius: 5, height: 26,
                          border: '1px solid rgba(220,80,80,.3)', background: 'rgba(220,80,80,.08)',
                          cursor: 'pointer', fontSize: 11, color: 'var(--rd)', fontWeight: 700,
                          display: 'flex', alignItems: 'center', gap: 3,
                        }}
                        title="Bloquer la table"
                      >🚫</button>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : resas.length === 0 ? (
            /* ════ TABLE BLOQUÉE / RÉSERVÉE SANS RÉSA ════ */
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {table.blocked && (
                <span style={{ fontSize: 13, color: 'var(--rd)', fontWeight: 700 }}>🚫 Bloquée{table.blockedReason ? ` — ${table.blockedReason}` : ''}</span>
              )}
              {table.held && !table.blocked && (
                <span style={{ fontSize: 13, color: '#e8a530', fontWeight: 700 }}>🔒 Réservée</span>
              )}
              {!table.blocked && !table.held && (
                <span style={{ fontSize: 13, color: 'var(--t4)' }}>—</span>
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
                <span style={{ fontFamily: 'var(--fm)', fontSize: 13, fontWeight: 800, color: 'var(--text)', flexShrink: 0, width: 46 }}>
                  {r.t.replace('h', ':')}
                </span>
                {/* Nom */}
                <span style={{
                  fontSize: 14, fontWeight: 700, color: 'var(--text)', flex: 1, minWidth: 0,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {r.prenom ? `${r.nom} ${r.prenom}` : r.nom || r.n}
                  {r.statut === 2 && ' ⭐'}
                  {r.statut === 3 && ' 👁'}
                  {r.allergie && ' ⚠️'}
                </span>
                {/* Couverts */}
                <span style={{ fontFamily: 'var(--fm)', fontSize: 13, fontWeight: 800, color: 'var(--t2)', flexShrink: 0 }}>
                  {r.c}p
                </span>
                {/* Swap hint */}
                {isValidSwapTarget && isOccupying(r) && (
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#e8a530', flexShrink: 0 }}>↔</span>
                )}
                {/* Combo indicator */}
                {isInCombo && idx === 0 && (
                  <span style={{ fontSize: 11, color: '#ffd666', fontWeight: 600, flexShrink: 0 }}>🔗</span>
                )}
                {/* Canal de réservation */}
                {r.canal && CANAUX[r.canal] && (
                  <span style={{ fontSize: 11, flexShrink: 0, opacity: .8 }} title={CANAUX[r.canal].label}>
                    {CANAUX[r.canal].icon}
                  </span>
                )}
                {/* Mode IA/Manuel — badge compact coloré */}
                <span style={{
                  fontSize: 9, fontWeight: 800, flexShrink: 0,
                  padding: '1px 5px', borderRadius: 3, letterSpacing: .3,
                  background: r.mode === 'ia' ? 'rgba(91,156,246,.15)' : 'rgba(232,165,48,.12)',
                  color: r.mode === 'ia' ? '#7bb8ff' : '#e8a530',
                  border: `1px solid ${r.mode === 'ia' ? 'rgba(91,156,246,.3)' : 'rgba(232,165,48,.25)'}`,
                }} title={r.mode === 'ia' ? 'Placé par IA' : 'Placement manuel'}>
                  {r.mode === 'ia' ? '🤖 IA' : '✋'}
                </span>
                {/* NEW badge — résa créée il y a moins de 15 min */}
                {(Date.now() - r.createdAt) < 15 * 60 * 1000 && (
                  <span style={{ fontSize: 9, fontWeight: 900, color: '#a78bfa', background: 'rgba(167,139,250,.15)', padding: '1px 5px', borderRadius: 4, flexShrink: 0, letterSpacing: .5 }}>NEW</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
        )
      })()}

      {/* ── Trace badge après déplacement ── */}
      {(isTraceFrom || isTraceTo) && (
        <div style={{
          position: 'absolute', top: 3, right: 8, zIndex: 6,
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '2px 8px', borderRadius: 6,
          background: isTraceFrom ? 'rgba(232,165,48,.85)' : 'rgba(60,200,112,.85)',
          color: '#fff', fontSize: 11, fontWeight: 800, letterSpacing: .3,
          boxShadow: '0 2px 6px rgba(0,0,0,.2)',
          animation: 'traceAppear .3s ease-out',
        }}>
          {isTraceFrom ? `⬅ ${moveTrace!.name} était ici` : `➡ ${moveTrace!.name} ici maintenant`}
        </div>
      )}

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
          {/* ── Actions table libre (bloquer / réserve) ── */}
          {isFree && !table.id.startsWith('combo__') && (
            <>
              <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,.06)', background: 'rgba(0,0,0,.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, fontFamily: 'var(--fm)', color: 'var(--text)' }}>{table.n}</span>
                  <span style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--fm)' }}>{table.capMax}p · {table.salle}</span>
                </div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); onToggleExpand(); onToggleHeld(table.id) }} style={ddItem('🔒', 'Mettre en réserve', '#e8a530')}>🔒 Mettre en réserve</button>
              <button onClick={(e) => { e.stopPropagation(); onToggleExpand(); onToggleBlock(table.id) }} style={ddItem('🚫', 'Bloquer', 'var(--rd)')}>🚫 Bloquer</button>
            </>
          )}
          {/* ── Actions résas ── */}
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
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{r.prenom ? `${r.nom} ${r.prenom}` : r.nom || r.n}</span>
                        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--t2)', fontFamily: 'var(--fm)' }}>{r.c}p</span>
                        <span style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--fm)' }}>{r.t}</span>
                      </div>
                      {r.allergie && <div style={{ fontSize: 10, color: 'var(--am)', marginTop: 2 }}>⚠️ Allergie</div>}
                      {r.note && <div style={{ fontSize: 10, color: 'var(--t3)', fontStyle: 'italic', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.note.split('\n')[0].slice(0, 50)}</div>}
                    </div>
                    {/* ── 1. Modifier (toujours visible) ── */}
                    <button onClick={(e) => { e.stopPropagation(); onToggleExpand(); onClick(r.id) }} style={ddItem('✏️', 'Modifier', '#7bb8ff')}>✏️ Modifier</button>
                    {/* ── 2. Déplacer (reserved / arrived) ── */}
                    {(r.s === 'reserved' || r.s === 'arrived') && (
                      <button onClick={(e) => { e.stopPropagation(); onToggleExpand(); onStartMove(r) }} style={ddItem('↔', 'Déplacer', '#7bb8ff')}>↔ Déplacer</button>
                    )}
                    {/* ── 3. Actions statut ── */}
                    {r.s === 'waitlist' && (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); onToggleExpand(); onRestore(r.id) }} style={ddItem('✓', 'Confirmer', 'var(--gn)')}>✓ Confirmer</button>
                        <button onClick={(e) => { e.stopPropagation(); onToggleExpand(); onCancel(r.id) }} style={ddItem('✗', 'Refuser', 'var(--rd)')}>✗ Refuser</button>
                      </>
                    )}
                    {r.s === 'reserved' && (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); onToggleExpand(); onMarkArrived(r.id) }} style={ddItem('✓', 'Arrivé', 'var(--gn)')}>✓ Arrivé</button>
                        <button onClick={(e) => { e.stopPropagation(); onToggleExpand(); onMarkDone(r.id) }} style={ddItem('🪑', 'Libérer', '#e8a530')}>🪑 Libérer</button>
                        <button onClick={(e) => { e.stopPropagation(); onToggleExpand(); onMarkNoshow(r.id) }} style={ddItem('👻', 'No-show', 'var(--am)')}>👻 No-show</button>
                        <button onClick={(e) => { e.stopPropagation(); onToggleExpand(); onCancel(r.id) }} style={ddItem('🚫', 'Annuler', 'var(--rd)')}>🚫 Annuler</button>
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
function ServiceColumn({ service, tables, resas, combos, moveMode, moveTrace,
  onMarkArrived, onMarkNoshow, onMarkDone, onCancel, onRestore,
  onClickResa, onPlaceResa, onPlaceCombo, onUncombine, onStartMove, onMoveTarget, onMoveIA, onToggleBlock, onToggleHeld, blinkResaIds, salleColorMap,
}: {
  service: Service
  tables: Table[]
  resas: Resa[]
  combos: Combo[]
  allTables: Table[]
  moveMode: MoveMode | null
  moveTrace: { from: string; to: string; name: string; svc?: string } | null
  onMarkArrived: (id: string) => void
  onMarkNoshow: (id: string) => void
  onMarkDone: (id: string) => void
  onCancel: (id: string) => void
  onRestore: (id: string) => void
  onClickResa: (id: string) => void
  onPlaceResa: (tableId: string, svc?: string) => void
  onPlaceCombo: (comboLabel: string, svc?: string) => void
  onUncombine: (tableId: string, resaId: string) => void
  onStartMove: (resa: Resa) => void
  onMoveTarget: (table: Table, targetSvc: string) => void
  onMoveIA: (targetSvc?: string) => void
  onToggleBlock: (tableId: string) => void
  onToggleHeld: (tableId: string) => void
  blinkResaIds: string[]
  salleColorMap: Record<string, string>
}) {
  const { t } = useT()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const now = nowMins()
  const openM = timeToMins(service.open)
  const closeM = timeToMins(service.close)
  const isActive = now >= openM && now <= closeM

  const svcName = service.name.toLowerCase()
  const svcResas = resas.filter(r => r.svc === svcName)
  const svcCvt = svcResas.reduce((s, r) => s + r.c, 0)
  const activeTables = tables.filter(t => !t.blocked)
  const freeCount = activeTables.filter(t => !t.held && !svcResas.some(r => tblMatchesTable(r.tbl, t.n) && (r.s === 'reserved' || r.s === 'arrived'))).length
  const blockedCount = tables.filter(t => t.blocked).length
  const heldCount = tables.filter(t => t.held && !svcResas.some(r => tblMatchesTable(r.tbl, t.n) && (r.s === 'reserved' || r.s === 'arrived'))).length

  const fillPct = activeTables.length > 0 ? Math.round(((activeTables.length - freeCount) / activeTables.length) * 100) : 0
  const isMoveService = moveMode ? moveMode.svc === svcName : true
  const isMoveOtherService = moveMode && !isMoveService
  // Wrap place callbacks to include service name
  const placeResa = (tableId: string) => onPlaceResa(tableId, svcName)
  const placeCombo = (comboLabel: string) => onPlaceCombo(comboLabel, svcName)

  return (
    <div style={{ flex: 1, minWidth: 0, minHeight: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', opacity: 1 }}>
      {/* En-tête service — sticky */}
      <div style={{
        padding: '8px 12px', borderBottom: '1px solid var(--border)',
        background: 'var(--surf)',
        display: 'flex', alignItems: 'center', gap: 8,
        position: 'sticky', top: 0, zIndex: 5, flexShrink: 0,
      }}>
        <span style={{ fontSize: 16 }}>{service.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
            {service.name}
            {isActive && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gn)', display: 'inline-block', boxShadow: '0 0 6px rgba(60,200,112,.5)', animation: 'svcPulse 2s ease-in-out infinite' }} title="En cours" />}
          </div>
          <div style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--fm)' }}>
            {service.open} – {service.close} · LO {service.lastOrder}
          </div>
        </div>
        {/* ── Bouton IA move / indicateur service cible ── */}
        {moveMode && isMoveOtherService ? (
          <button
            onClick={() => onMoveIA(svcName)}
            style={{
              padding: '6px 12px', borderRadius: 8,
              background: 'rgba(232,165,48,.12)', border: '1.5px dashed rgba(232,165,48,.5)',
              fontSize: 11, fontWeight: 700, color: 'var(--am)', flexShrink: 0,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
            }}
            title={`Placer avec IA dans ${service.name}`}
          >
            🤖 IA → {service.name}
          </button>
        ) : moveMode && isMoveService ? (
          <button
            onClick={() => onMoveIA(svcName)}
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
            <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text)', fontFamily: 'var(--fm)', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
              {svcResas.length}
              {fillPct >= 85 && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'rgba(220,80,80,.15)', color: 'var(--rd)', fontWeight: 700, border: '1px solid rgba(220,80,80,.3)' }}>🔥 {fillPct}%</span>}
              {fillPct >= 70 && fillPct < 85 && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'rgba(232,165,48,.12)', color: '#e8a530', fontWeight: 700, border: '1px solid rgba(232,165,48,.3)' }}>⚡ {fillPct}%</span>}
            </div>
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
                    moveMode={moveMode}
                    moveTrace={moveTrace}
                    expanded={expandedId === comboTable.id}
                    onToggleExpand={() => setExpandedId(expandedId === comboTable.id ? null : comboTable.id)}
                    onMarkArrived={onMarkArrived}
                    onMarkNoshow={onMarkNoshow}
                    onMarkDone={onMarkDone}
                    onCancel={onCancel}
                    onRestore={onRestore}
                    onClick={onClickResa}
                    onPlaceResa={placeResa}
                    onPlaceCombo={placeCombo}
                    onUncombine={onUncombine}
                    onStartMove={onStartMove}
                    onMoveTarget={(tbl) => onMoveTarget(tbl, svcName)}
                    onToggleBlock={onToggleBlock}
                    onToggleHeld={onToggleHeld}
                    blinkResaIds={blinkResaIds}
                    salleColor={salleColorMap[comboTable.salle] || undefined}
                  />
                )
              }
              continue // skip les tables individuelles du combo actif
            }

            // ── Table normale (pas dans un combo actif) ──
            // Résas de cette table — si une résa active (reserved/arrived) existe,
            // masquer les stales (noshow/done/cancelled) pour éviter les doublons visuels
            const allTblResas = svcResas.filter(r => r.tbl === table.n)
            const hasActive = allTblResas.some(r => r.s === 'reserved' || r.s === 'arrived')
            const tblResas = hasActive
              ? allTblResas.filter(r => r.s === 'reserved' || r.s === 'arrived' || r.s === 'waitlist')
              : allTblResas
            elements.push(
              <TableRow
                key={table.id}
                table={table}
                resas={tblResas}
                combos={combos}
                svcResas={svcResas}
                moveMode={moveMode}
                moveTrace={moveTrace}
                expanded={expandedId === table.id}
                onToggleExpand={() => setExpandedId(expandedId === table.id ? null : table.id)}
                onMarkArrived={onMarkArrived}
                onMarkNoshow={onMarkNoshow}
                onMarkDone={onMarkDone}
                onCancel={onCancel}
                onRestore={onRestore}
                onClick={onClickResa}
                onPlaceResa={placeResa}
                onPlaceCombo={placeCombo}
                onUncombine={onUncombine}
                onStartMove={onStartMove}
                onMoveTarget={(tbl) => onMoveTarget(tbl, svcName)}
                onToggleBlock={onToggleBlock}
                onToggleHeld={onToggleHeld}
                blinkResaIds={blinkResaIds}
                salleColor={salleColorMap[table.salle] || undefined}
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
  const { resas, tables, services, salles, combos, activeDate, setActiveDate, setResaStatus, updateResa, swapTables, setTables, blinkResa, blinkResaIds } = useAppStore()
  const navigate = useNavigate()
  const [selectedSalle, setSelectedSalle] = useState('toutes')
  const [svcFilter, setSvcFilter] = useState('tous')
  const [search, setSearch] = useState('')
  const [moveMode, setMoveMode] = useState<MoveMode | null>(null)

  const [moveMsg, setMoveMsg] = useState<string | null>(null)
  // ── Trace visuelle de déplacement ──
  const [moveTrace, setMoveTrace] = useState<{ from: string; to: string; name: string; svc?: string } | null>(null)
  const moveTraceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const activeServices = services.filter(s => s.active)
  const dayResas = resas.filter(r => r.date === activeDate)

  // ── Auto-sélection du service : actuel (si avant close) ou prochain ──
  // Aligné avec QuickResa : on utilise close (pas lastOrder) pour la détection
  // du service actif. Sinon entre lastOrder et close, QuickResa crée une resa
  // "midi" mais la Grille affiche "soir" → resa invisible.
  useEffect(() => {
    if (svcFilter !== 'tous') return // user a choisi manuellement
    if (activeDate !== todayISO()) return // pas aujourd'hui → afficher tous
    if (activeServices.length === 0) return

    const now = nowMins()
    // Service en cours = on est entre open et close (cohérent avec QuickResa)
    const current = activeServices.find(s => {
      const open = timeToMins(s.open)
      const close = timeToMins(s.close)
      return now >= open - 30 && now <= close
    })
    if (current) {
      setSvcFilter(current.name.toLowerCase())
      return
    }
    // Prochain service = le premier dont open > now (dans 3h max comme QuickResa)
    const sorted = [...activeServices].sort((a, b) => timeToMins(a.open) - timeToMins(b.open))
    const next = sorted.find(s => {
      const open = timeToMins(s.open)
      return open > now && open - now <= 180
    })
    if (next) {
      setSvcFilter(next.name.toLowerCase())
      return
    }
    // Tous les services sont passés → afficher le dernier (soir)
    const last = sorted[sorted.length - 1]
    if (last) setSvcFilter(last.name.toLowerCase())
  }, [activeDate]) // eslint-disable-line react-hooks/exhaustive-deps

  // Map salle name → color pour bandes colorées
  const salleColorMap = useMemo(() => {
    const m: Record<string, string> = {}
    salles.forEach(s => { if (s.active && s.color) m[s.name] = s.color })
    return m
  }, [salles])

  // ── Auto-scroll global vers la table blinkée ──
  useEffect(() => {
    if (blinkResaIds.length === 0) return
    const blinkR = resas.find(r => blinkResaIds.includes(r.id))
    if (!blinkR || !blinkR.tbl) return
    // Trouver le nom de table cible
    const targetTableName = blinkR.tbl
    const targetTable = tables.find(t => tblMatchesTable(targetTableName, t.n))
    if (!targetTable) return

    const doScroll = () => {
      // Chercher dans tout le DOM l'élément avec data-table-id correspondant
      const el = document.querySelector(`[data-table-id="${targetTable.id}"]`) as HTMLElement | null
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
    // Plusieurs essais pour laisser le DOM se monter (retour de navigation)
    const t1 = setTimeout(doScroll, 300)
    const t2 = setTimeout(doScroll, 700)
    const t3 = setTimeout(doScroll, 1200)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [blinkResaIds, resas, tables])

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

  function handleToggleBlock(tableId: string) {
    setTables(tables.map(t => t.id === tableId ? { ...t, blocked: !t.blocked, held: false } : t))
  }

  function handleToggleHeld(tableId: string) {
    setTables(tables.map(t => t.id === tableId ? { ...t, held: !t.held, blocked: false } : t))
  }

  function handlePlaceResa(tableId: string, svc?: string) {
    const tbl = tables.find(t => t.id === tableId)
    if (tbl) navigate(`/reservations?new=1&table=${tbl.n}&mode=manuel${svc ? `&svc=${svc}` : ''}&from=grille`)
  }

  function handlePlaceCombo(comboLabel: string, svc?: string) {
    navigate(`/reservations?new=1&table=${comboLabel}&mode=manuel${svc ? `&svc=${svc}` : ''}&from=grille`)
  }

  function handleUncombine(tableId: string, resaId: string) {
    const tbl = tables.find(t => t.id === tableId)
    if (tbl) updateResa(resaId, { tbl: tbl.n })
  }

  // ── Trace visuelle : surbrillance source (orange) + destination (vert) ──
  function showMoveTrace(from: string, to: string, name: string, svc?: string) {
    if (moveTraceTimer.current) clearTimeout(moveTraceTimer.current)
    setMoveTrace({ from, to, name, svc })
    moveTraceTimer.current = setTimeout(() => setMoveTrace(null), 4000)
  }

  function handleStartMove(resa: Resa) {
    // Verrouiller la date sur celle de la résa pour afficher la dispo correcte
    if (resa.date && resa.date !== activeDate) {
      setActiveDate(resa.date)
    }
    setMoveMode({ resaId: resa.id, resaName: resa.nom || resa.n, covers: resa.c, fromTbl: resa.tbl, svc: resa.svc })
    setMoveMsg(null)
  }

  function handleCancelMove() { setMoveMode(null); setMoveMsg(null) }

  // ── Déplacer avec IA : placement automatique optimal ──
  function handleMoveIA(targetSvc?: string) {
    if (!moveMode) return
    const sourceResa = resas.find(r => r.id === moveMode.resaId)
    if (!sourceResa) return
    const effectiveSvc = targetSvc || moveMode.svc
    const bestTbl = iaPlacement(
      sourceResa.c, activeDate, effectiveSvc, tables, combos, dayResas,
      undefined, sourceResa.id, selectedSalle !== 'toutes' ? selectedSalle : undefined
    )
    if (!bestTbl) {
      setMoveMsg('❌ Aucune table disponible pour l\'IA')
      setTimeout(() => setMoveMsg(null), 3000)
      return
    }
    const patch: Record<string, any> = { tbl: bestTbl }
    const isServiceChange = effectiveSvc !== moveMode.svc
    if (isServiceChange) patch.svc = effectiveSvc
    updateResa(sourceResa.id, patch)
    if (isServiceChange) setSvcFilter('tous')
    const svcLabel = isServiceChange ? ` (→ ${effectiveSvc})` : ''
    setMoveMsg(`✅ IA → ${sourceResa.nom || sourceResa.n} placé sur ${bestTbl}${svcLabel}`)
    // Trace visuelle : surbrillance source → destination
    showMoveTrace(moveMode.fromTbl, bestTbl, sourceResa.nom || sourceResa.n, isServiceChange ? effectiveSvc : undefined)
    setMoveMode(null); setTimeout(() => setMoveMsg(null), 4000)
  }

  function handleMoveTarget(targetTable: Table, targetSvc?: string) {
    if (!moveMode) return
    const sourceResa = resas.find(r => r.id === moveMode.resaId)
    if (!sourceResa) return

    const effectiveSvc = targetSvc || moveMode.svc
    const isServiceChange = effectiveSvc !== moveMode.svc

    // Exclure la résa source pour ne pas se "swap" avec soi-même
    const targetOccupying = dayResas.filter(r =>
      r.id !== moveMode.resaId && r.svc === effectiveSvc && tblMatchesTable(r.tbl, targetTable.n) && isOccupying(r)
    )

    if (targetOccupying.length === 0) {
      // D'abord essayer table simple
      let check = canMoveResa(sourceResa, { type: 'table', table: targetTable }, tables, combos, resas)
      // Si table trop petite, chercher un combo contenant cette table
      if (!check.valid && sourceResa.c > targetTable.capMax) {
        const fittingCombo = combos.find(c =>
          c.tables.some(tid => { const t = tables.find(tb => tb.id === tid); return t?.n === targetTable.n }) &&
          (c.capOverride || c.cap) >= sourceResa.c
        )
        if (fittingCombo) {
          check = canMoveResa(sourceResa, { type: 'combo', combo: fittingCombo }, tables, combos, resas)
        }
      }
      if (!check.valid) { setMoveMsg(`❌ ${check.reason}`); setTimeout(() => setMoveMsg(null), 3000); return }
      const patch: Record<string, any> = { tbl: check.newTbl! }
      if (isServiceChange) patch.svc = effectiveSvc
      updateResa(sourceResa.id, patch)
      if (isServiceChange) setSvcFilter('tous')
      const svcLabel = isServiceChange ? ` (→ ${effectiveSvc})` : ''
      setMoveMsg(`✅ ${sourceResa.nom || sourceResa.n} → ${check.newTbl}${svcLabel}`)
      showMoveTrace(moveMode.fromTbl, check.newTbl || targetTable.n, sourceResa.nom || sourceResa.n, isServiceChange ? effectiveSvc : undefined)
      setMoveMode(null); setTimeout(() => setMoveMsg(null), 4000)
    } else {
      if (isServiceChange) {
        setMoveMsg('❌ Swap inter-services non supporté — la table cible est occupée')
        setTimeout(() => setMoveMsg(null), 3000)
        return
      }
      const targetResa = targetOccupying[0]
      const check = canSwapResas(sourceResa, targetResa, tables, combos)
      if (!check.valid) { setMoveMsg(`❌ ${check.reason}`); setTimeout(() => setMoveMsg(null), 3000); return }
      swapTables(sourceResa.id, targetResa.id)
      setMoveMsg(`✅ ${sourceResa.nom || sourceResa.n} ↔ ${targetResa.nom || targetResa.n}`)
      showMoveTrace(moveMode.fromTbl, targetTable.n, sourceResa.nom || sourceResa.n)
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
      <style>{`@keyframes traceAppear{from{opacity:0;transform:translateY(-4px) scale(.95)}to{opacity:1;transform:translateY(0) scale(1)}}@keyframes svcPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.7)}}@keyframes resaBlink{0%,100%{box-shadow:0 0 0 0 rgba(91,156,246,0)}50%{box-shadow:0 0 12px 3px rgba(91,156,246,.5)}}`}</style>
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
          padding: '8px 16px', fontSize: 13, fontWeight: 600,
          background: moveMsg.startsWith('✅') ? 'rgba(60,200,112,.1)' : 'rgba(220,80,80,.1)',
          color: moveMsg.startsWith('✅') ? 'var(--gn)' : 'var(--rd)',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span>{moveMsg}</span>
          {moveTrace && moveMsg.startsWith('✅') && (
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--t2)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ background: 'rgba(232,165,48,.2)', color: '#e8a530', padding: '1px 6px', borderRadius: 4 }}>{moveTrace.from}</span>
              <span>→</span>
              <span style={{ background: 'rgba(60,200,112,.2)', color: 'var(--gn)', padding: '1px 6px', borderRadius: 4 }}>{moveTrace.to}</span>
            </span>
          )}
        </div>
      )}

      {/* ═══ VUE GRILLE (colonnes par service) ═══ */}
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
            moveTrace={moveTrace}
            onMarkArrived={(id) => { setResaStatus(id, 'arrived'); blinkResa(id) }}
            onMarkNoshow={(id) => { setResaStatus(id, 'noshow'); blinkResa(id) }}
            onMarkDone={(id) => { setResaStatus(id, 'done'); blinkResa(id) }}
            onCancel={(id) => { setResaStatus(id, 'cancelled'); blinkResa(id) }}
            onRestore={(id) => { setResaStatus(id, 'reserved'); blinkResa(id) }}
            onClickResa={(id) => moveMode ? undefined : navigate(`/reservations?edit=${id}&from=grille`)}
            onPlaceResa={handlePlaceResa}
            onPlaceCombo={handlePlaceCombo}
            onUncombine={handleUncombine}
            onStartMove={handleStartMove}
            onMoveTarget={(tbl, svc) => handleMoveTarget(tbl, svc)}
            onMoveIA={handleMoveIA}
            onToggleBlock={handleToggleBlock}
            onToggleHeld={handleToggleHeld}
            blinkResaIds={blinkResaIds}
            salleColorMap={salleColorMap}
          />
        ))}
      </div>
    </div>
  )
}
