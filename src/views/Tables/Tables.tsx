import { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useTranslation'
import { useToast } from '../../components/ui/Toast'
import type { Table, Combo } from '../../types/index'

// Demo data based on v52 configuration
const DEMO_TABLES: Table[] = [
  { id: 't1', n: 'T1', salle: 'Salle principale', shape: 'round', capMin: 2, capMax: 2, x: 12, y: 10, w: 8, h: 8, active: true, priority: 7, blocked: false, held: false },
  { id: 't2', n: 'T2', salle: 'Salle principale', shape: 'round', capMin: 2, capMax: 2, x: 24, y: 10, w: 8, h: 8, active: true, priority: 7, blocked: false, held: false },
  { id: 't3', n: 'T3', salle: 'Salle principale', shape: 'rect', capMin: 2, capMax: 4, x: 38, y: 8, w: 12, h: 8, active: true, priority: 8, blocked: false, held: false },
  { id: 't4', n: 'T4', salle: 'Salle principale', shape: 'rect', capMin: 2, capMax: 4, x: 54, y: 8, w: 12, h: 8, active: true, priority: 8, blocked: false, held: false },
  { id: 't5', n: 'T5', salle: 'Salle principale', shape: 'round_lg', capMin: 4, capMax: 6, x: 12, y: 28, w: 12, h: 12, active: true, priority: 6, blocked: false, held: false },
  { id: 't6', n: 'T6', salle: 'Salle principale', shape: 'round_lg', capMin: 4, capMax: 6, x: 30, y: 28, w: 12, h: 12, active: true, priority: 6, blocked: false, held: false },
  { id: 't7', n: 'T7', salle: 'Salle principale', shape: 'rect', capMin: 6, capMax: 8, x: 50, y: 26, w: 18, h: 10, active: true, priority: 5, blocked: false, held: false },
  { id: 't8', n: 'T8', salle: 'Salle principale', shape: 'banquette', capMin: 4, capMax: 8, x: 10, y: 50, w: 22, h: 8, active: true, priority: 5, blocked: false, held: false },
  { id: 't9', n: 'T9', salle: 'Terrasse', shape: 'round', capMin: 2, capMax: 4, x: 10, y: 10, w: 10, h: 10, active: true, priority: 7, blocked: false, held: false },
  { id: 't10', n: 'T10', salle: 'Terrasse', shape: 'round', capMin: 2, capMax: 4, x: 26, y: 10, w: 10, h: 10, active: true, priority: 7, blocked: false, held: false },
  { id: 't11', n: 'T11', salle: 'Terrasse', shape: 'rect', capMin: 4, capMax: 6, x: 42, y: 8, w: 14, h: 10, active: true, priority: 6, blocked: false, held: false },
]

const DEMO_COMBOS: Combo[] = [
  { id: 'c1', label: 'T3+T4', tables: ['t3', 't4'], cap: 8, capOverride: null, salle: 'Salle principale' },
  { id: 'c2', label: 'T1+T2', tables: ['t1', 't2'], cap: 4, capOverride: null, salle: 'Salle principale' },
]

export function Tables() {
  const { t } = useT()
  const { tables, salles, combos, setCombos } = useAppStore()
  const { toast } = useToast()

  const [comboMode, setComboMode] = useState(false)
  const [selectedForCombo, setSelectedForCombo] = useState<string[]>([])
  const [currentSalle, setCurrentSalle] = useState('Salle principale')
  const [editingTableId, setEditingTableId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'table' | 'combo'; id: string } | null>(null)

  const activeTables = tables.length === 0 ? DEMO_TABLES : tables
  const activeCombos = combos.length === 0 ? DEMO_COMBOS : combos
  const activeSalles = salles.length > 0 ? salles : [{ id: 's1', name: 'Salle principale', color: '#4480d8', active: true }]

  // Calculate stats
  const stats = activeTables.reduce(
    (acc, t) => {
      acc.total++
      acc.caps += t.capMax || 0
      if (t.blocked) acc.blocked++
      if (t.held) acc.held++
      if (activeCombos.some(c => c.tables.includes(t.id))) acc.inCombo++
      return acc
    },
    { total: 0, caps: 0, blocked: 0, held: 0, inCombo: 0 }
  )

  const currentSalleTables = activeTables.filter(t => t.salle === currentSalle && t.active !== false)
  const currentCombos = activeCombos.filter(c => {
    return c.tables.some(tableId => {
      const table = activeTables.find(t => t.id === tableId)
      return table && table.salle === currentSalle
    })
  })

  const getSalleTabs = () => {
    return activeSalles
      .filter(s => s.active)
      .sort((a, b) => (a.priority || 99) - (b.priority || 99))
      .map(s => s.name)
  }

  const getShapeIcon = (table: Table, size: number = 64): string => {
    const pad = 4
    const W = size
    const isHoriz = ['rect', 'banquette', 'bar', 'oval'].includes(table.shape)
    const H = isHoriz ? Math.round(size * 0.65) : size
    const cx = W / 2
    const cy = H / 2

    const fill = 'rgba(68,128,216,.12)'
    const stroke = '#4480d8'
    const sw = 1.8

    let inner = ''
    if (['round_sm', 'round', 'round_lg'].includes(table.shape)) {
      const r = Math.min(W, H) / 2 - pad
      inner = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
    } else if (table.shape === 'square') {
      inner = `<rect x="${pad}" y="${pad}" width="${W - pad * 2}" height="${H - pad * 2}" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
    } else if (table.shape === 'oval') {
      const rxo = W / 2 - pad, ryo = H / 2 - pad
      inner = `<ellipse cx="${cx}" cy="${cy}" rx="${rxo}" ry="${ryo}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
    } else if (table.shape === 'rect') {
      inner = `<rect x="${pad}" y="${pad}" width="${W - pad * 2}" height="${H - pad * 2}" rx="5" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
    } else if (table.shape === 'banquette') {
      inner = `<rect x="${pad}" y="${pad}" width="${W - pad * 2}" height="${H - pad * 2}" rx="3" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/><line x1="${pad}" y1="${pad + 4}" x2="${W - pad}" y2="${pad + 4}" stroke="${stroke}" stroke-width="1" opacity=".3"/>`
    } else if (table.shape === 'bar') {
      const bh = Math.round((H - pad * 2) * 0.5)
      const by = pad + (H - pad * 2 - bh) / 2
      inner = `<rect x="${pad}" y="${by}" width="${W - pad * 2}" height="${bh}" rx="2" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
    } else {
      inner = `<rect x="${pad}" y="${pad}" width="${W - pad * 2}" height="${H - pad * 2}" rx="5" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
    }

    const hasName = table.nm && table.nm.length > 0
    const nyNum = hasName ? cy - 5 : cy - 2
    const nm = hasName ? (table.nm.length > 8 ? table.nm.substring(0, 7) + '…' : table.nm) : `${table.capMax}p`

    const labels = `
      <text x="${cx}" y="${nyNum}" text-anchor="middle" dominant-baseline="middle" font-family="DM Mono,monospace" font-weight="800" font-size="13" fill="${stroke}">${table.n}</text>
      <text x="${cx}" y="${cy + 7}" text-anchor="middle" dominant-baseline="middle" font-family="DM Mono,monospace" font-size="11" fill="${stroke}" opacity="${hasName ? .6 : .55}">${nm}</text>
    `

    return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${inner}${labels}</svg>`
  }

  const handleToggleComboSelection = (tableId: string) => {
    const table = activeTables.find(t => t.id === tableId)
    if (table?.blocked) {
      toast('⚠️ ' + table.n + ' est bloquée — impossible dans un combo', 'warning')
      return
    }
    setSelectedForCombo(prev =>
      prev.includes(tableId) ? prev.filter(id => id !== tableId) : [...prev, tableId]
    )
  }

  const handleConfirmCombo = () => {
    if (selectedForCombo.length < 2) {
      toast('Sélectionnez au moins 2 tables', 'warning')
      return
    }
    const names = selectedForCombo
      .map(id => activeTables.find(t => t.id === id)?.n)
      .filter(Boolean)
      .join('+')
    const cap = selectedForCombo.reduce((sum, id) => sum + (activeTables.find(t => t.id === id)?.capMax || 0), 0)
    const salle = activeTables.find(t => t.id === selectedForCombo[0])?.salle || currentSalle
    // Check for duplicate combo
    if (activeCombos.some(c => c.label === names)) {
      toast(`⚠️ Combo ${names} existe déjà`, 'warning')
      setComboMode(false)
      setSelectedForCombo([])
      return
    }
    const newCombo: Combo = {
      id: `c_${Date.now()}`,
      label: names,
      tables: [...selectedForCombo],
      cap,
      capOverride: null,
      salle,
    }
    setCombos([...activeCombos, newCombo])
    toast(`✓ Combo ${names} · ${cap}p créé`, 'success')
    setComboMode(false)
    setSelectedForCombo([])
  }

  const handleDeleteCombo = (id: string) => {
    const combo = activeCombos.find(c => c.id === id)
    if (combo) {
      setConfirmDelete({ type: 'combo', id })
    }
  }

  const handleDeleteTable = (id: string) => {
    const table = activeTables.find(t => t.id === id)
    if (table) {
      setConfirmDelete({ type: 'table', id })
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--hh))', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ paddingBottom: 8, flexShrink: 0 }}>
        <div style={{ padding: '0 18px', display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>Tables</div>
          <div style={{ fontSize: 11, color: 'var(--t3)', margin: 0 }}>
            {stats.total} tables · {stats.caps}p · {currentCombos.length} combo{currentCombos.length !== 1 ? 's' : ''}
            {stats.blocked > 0 && ` · ${stats.blocked} bloquée${stats.blocked !== 1 ? 's' : ''}`}
          </div>
        </div>
      </div>

      {/* Salle tabs + controls */}
      <div style={{ padding: '5px 18px', display: 'flex', gap: 4, alignItems: 'center', borderBottom: '1px solid var(--border)', flexShrink: 0, overflowX: 'auto' }}>
        {getSalleTabs().map((salle) => {
          const cnt = activeTables.filter(t => t.salle === salle).length
          return (
            <button
              key={salle}
              onClick={() => {
                setCurrentSalle(salle)
                setComboMode(false)
                setSelectedForCombo([])
              }}
              style={{
                fontSize: 11,
                padding: '3px 9px',
                borderRadius: 6,
                border: currentSalle === salle ? '1px solid var(--bl)' : '1px solid var(--border)',
                background: currentSalle === salle ? 'rgba(68,128,216,.1)' : 'transparent',
                color: currentSalle === salle ? 'var(--bl)' : 'var(--text)',
                cursor: 'pointer',
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
            >
              {salle} <span style={{ opacity: 0.6, fontSize: 11 }}>{cnt}</span>
            </button>
          )
        })}
        <div style={{ flex: 1 }} />
        <button
          style={{
            fontSize: 11,
            padding: '3px 11px',
            borderRadius: 6,
            border: '1px solid var(--bl)',
            background: 'rgba(68,128,216,.1)',
            color: 'var(--bl)',
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          ➕ Table
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Combo mode banner */}
        {comboMode && (
          <div style={{ margin: '0 18px 12px', padding: '12px 16px', background: 'rgba(60,200,112,.07)', border: '1.5px solid rgba(60,200,112,.35)', borderRadius: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 14 }}>🔗</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--gn)' }}>Nouvelle combinaison</div>
                <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 1 }}>
                  {selectedForCombo.length >= 2
                    ? `${selectedForCombo.map(id => activeTables.find(t => t.id === id)?.n).join(' + ')} · ${selectedForCombo.reduce((sum, id) => sum + (activeTables.find(t => t.id === id)?.capMax || 0), 0)}p`
                    : 'Sélectionnez au moins 2 tables'}
                </div>
              </div>
              {selectedForCombo.length >= 2 && (
                <button
                  onClick={handleConfirmCombo}
                  style={{
                    fontSize: 11,
                    padding: '4px 12px',
                    background: 'var(--gn)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                >
                  ✓ Créer
                </button>
              )}
              <button
                onClick={() => {
                  setComboMode(false)
                  setSelectedForCombo([])
                }}
                style={{
                  fontSize: 11,
                  padding: '4px 9px',
                  background: 'transparent',
                  color: 'var(--t3)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {currentSalleTables.map((table) => {
                const isSelected = selectedForCombo.includes(table.id)
                const isBlocked = table.blocked
                return (
                  <button
                    key={table.id}
                    onClick={() => handleToggleComboSelection(table.id)}
                    disabled={isBlocked}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: isBlocked ? 'not-allowed' : 'pointer',
                      padding: 3,
                      opacity: isBlocked ? 0.4 : 1,
                    }}
                    title={isBlocked ? `${table.n} · déjà bloquée` : undefined}
                  >
                    <svg width="52" height="52" viewBox="0 0 52 52">
                      <circle cx="26" cy="26" r="22" fill={isSelected ? 'rgba(60,200,112,.25)' : isBlocked ? 'rgba(200,80,80,.1)' : 'rgba(68,128,216,.1)'} stroke={isSelected ? 'rgba(60,200,112,.9)' : isBlocked ? 'rgba(200,80,80,.5)' : 'rgba(68,128,216,.45)'} strokeWidth="1.5"/>
                      <text x="26" y="21" textAnchor="middle" dominantBaseline="central" fontSize="11" fontFamily="DM Mono,monospace" fontWeight="900" fill={isSelected ? '#4ade80' : isBlocked ? 'rgba(200,80,80,.7)' : 'var(--t2)'}>
                        {table.n}{isSelected ? ' ✓' : ''}
                      </text>
                      <text x="26" y="33" textAnchor="middle" fontSize="11" fontFamily="DM Mono,monospace" fill={isSelected ? '#4ade80' : isBlocked ? 'rgba(200,80,80,.7)' : 'var(--t2)'} opacity={0.65}>
                        {table.capMax}p
                      </text>
                    </svg>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Tables grid */}
        {!comboMode && (
          <div style={{ padding: '12px 18px 6px' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.09em', fontFamily: 'DM Mono,monospace', marginBottom: 10 }}>
              Tables
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8 }}>
              {currentSalleTables.length === 0 ? (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '30px', color: 'var(--t3)', fontSize: 12 }}>
                  Aucune table — ajoutez-en via le Setup Plan
                </div>
              ) : (
                currentSalleTables.map((table) => {
                  const inCombo = activeCombos.find(c => c.tables.includes(table.id))
                  const isConfirming = confirmDelete?.type === 'table' && confirmDelete.id === table.id
                  return (
                    <div
                      key={table.id}
                      style={{
                        background: table.blocked ? 'rgba(220,80,80,.05)' : table.held ? 'rgba(230,170,0,.05)' : 'var(--surf2)',
                        border: isConfirming ? '2px solid rgba(220,80,80,.5)' : table.blocked ? '2px solid rgba(220,80,80,.3)' : table.held ? '2px solid rgba(230,170,0,.3)' : '1px solid var(--border)',
                        borderRadius: 12,
                        padding: '12px 10px 10px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      <div style={{ cursor: 'pointer', width: '100%', display: 'flex', justifyContent: 'center' }} dangerouslySetInnerHTML={{ __html: getShapeIcon(table, 64) }} />

                      {(inCombo || table.blocked || table.held) && (
                        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: 'center' }}>
                          {inCombo && <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 5px', borderRadius: 8, background: 'rgba(144,96,224,.15)', color: 'var(--pu)' }}>⊕ {inCombo.label}</span>}
                          {table.blocked && <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 5px', borderRadius: 8, background: 'rgba(220,80,80,.12)', color: 'var(--rd)' }}>🔒</span>}
                          {table.held && <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 5px', borderRadius: 8, background: 'rgba(230,170,0,.15)', color: '#c8900a' }}>⏸</span>}
                        </div>
                      )}

                      {table.blocked && table.blockedReason && (
                        <div style={{ fontSize: 11, color: 'var(--rd)', textAlign: 'center', fontStyle: 'italic', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {table.blockedReason}
                        </div>
                      )}

                      {isConfirming ? (
                        <div style={{ width: '100%', marginTop: 4 }}>
                          <div style={{ fontSize: 11, color: 'var(--rd)', textAlign: 'center', marginBottom: 4 }}>Supprimer ?</div>
                          <div style={{ display: 'flex', gap: 3 }}>
                            <button style={{ fontSize: 11, padding: '3px 0', flex: 1, background: 'rgba(220,80,80,.2)', color: 'var(--rd)', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Oui</button>
                            <button onClick={() => setConfirmDelete(null)} style={{ fontSize: 11, padding: '3px 0', flex: 1, background: 'var(--surf2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer' }}>Non</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 3, width: '100%', marginTop: 4 }}>
                          <button style={{ flex: 1, fontSize: 11, padding: '4px 0', background: 'rgba(91,156,246,.1)', color: 'var(--bl)', border: '1px solid rgba(91,156,246,.3)', borderRadius: 4, cursor: 'pointer' }}>✏️</button>
                          <button style={{ fontSize: 11, padding: '4px 6px', background: table.blocked ? 'rgba(60,200,112,.15)' : 'rgba(220,80,80,.1)', color: table.blocked ? 'var(--gn)' : 'var(--rd)', border: `1px solid ${table.blocked ? 'rgba(60,200,112,.3)' : 'rgba(220,80,80,.2)'}`, borderRadius: 4, cursor: 'pointer' }}>🔒</button>
                          <button style={{ fontSize: 11, padding: '4px 6px', background: table.held ? 'rgba(60,200,112,.15)' : 'rgba(230,170,0,.1)', color: table.held ? 'var(--gn)' : '#c8900a', border: `1px solid ${table.held ? 'rgba(60,200,112,.3)' : 'rgba(230,170,0,.2)'}`, borderRadius: 4, cursor: 'pointer' }}>⏸</button>
                          <button onClick={() => handleDeleteTable(table.id)} style={{ fontSize: 11, padding: '4px 6px', background: 'rgba(220,80,80,.1)', color: 'var(--rd)', border: '1px solid rgba(220,80,80,.2)', borderRadius: 4, cursor: 'pointer' }}>🗑</button>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* Combos section */}
        <div style={{ padding: '10px 18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.09em', fontFamily: 'DM Mono,monospace' }}>
              Combinaisons
            </div>
            <span style={{ fontSize: 11, fontFamily: 'DM Mono,monospace', padding: '1px 6px', borderRadius: 8, background: 'rgba(144,96,224,.12)', color: 'var(--pu)' }}>
              {currentCombos.length}
            </span>
            <div style={{ flex: 1 }} />
            <button
              onClick={() => {
                setComboMode(!comboMode)
                setSelectedForCombo([])
              }}
              style={{
                fontSize: 11,
                padding: '4px 12px',
                background: comboMode ? 'var(--gn)' : 'rgba(144,96,224,.1)',
                color: comboMode ? '#fff' : 'var(--pu)',
                border: comboMode ? 'none' : '1px solid rgba(144,96,224,.35)',
                borderRadius: 6,
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              🔗 Nouvelle combinaison
            </button>
          </div>

          {!comboMode && (
            <div>
              {currentCombos.length === 0 ? (
                <div style={{ color: 'var(--t3)', fontSize: 11, padding: '8px 0' }}>
                  Aucune combinée — cliquez <strong style={{ color: 'var(--text)' }}>🔗 Nouvelle combinaison</strong> et sélectionnez les tables à combiner.
                </div>
              ) : (
                currentCombos.map((combo) => {
                  const comboTables = activeTables.filter(t => combo.tables.includes(t.id))
                  const hasBlocked = comboTables.some(t => t.blocked)
                  const isConfirming = confirmDelete?.type === 'combo' && confirmDelete.id === combo.id
                  const capDisplay = combo.capOverride || combo.cap

                  return (
                    <div
                      key={combo.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 14px',
                        background: hasBlocked ? 'rgba(220,80,80,.05)' : 'rgba(144,96,224,.06)',
                        border: `1px solid ${hasBlocked ? 'rgba(220,80,80,.25)' : 'rgba(144,96,224,.18)'}`,
                        borderRadius: 10,
                        marginBottom: 6,
                      }}
                    >
                      {isConfirming ? (
                        <>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
                              Supprimer <strong>{combo.label}</strong> ?
                            </div>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={() => {
                                setCombos(activeCombos.filter(c => c.id !== combo.id))
                                toast(`✓ Combo ${combo.label} supprimé`, 'success')
                                setConfirmDelete(null)
                              }} style={{ fontSize: 11, flex: 1, background: 'rgba(220,80,80,.2)', color: 'var(--rd)', border: 'none', borderRadius: 4, cursor: 'pointer', padding: '6px' }}>
                                Oui, supprimer
                              </button>
                              <button onClick={() => setConfirmDelete(null)} style={{ fontSize: 11, flex: 1, background: 'var(--surf2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', padding: '6px' }}>
                                Annuler
                              </button>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginBottom: 4 }}>
                              {comboTables.map((t) => (
                                <span
                                  key={t.id}
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 800,
                                    fontFamily: 'DM Mono,monospace',
                                    padding: '3px 8px',
                                    borderRadius: 6,
                                    background: 'rgba(144,96,224,.14)',
                                    color: 'var(--pu)',
                                    border: '1px solid rgba(144,96,224,.25)',
                                    opacity: t.blocked ? 0.4 : 1,
                                    textDecoration: t.blocked ? 'line-through' : 'none',
                                  }}
                                >
                                  {t.n}
                                </span>
                              ))}
                              {hasBlocked && <span style={{ fontSize: 11, color: 'var(--rd)', fontWeight: 700 }}>⚠️ bloquée</span>}
                            </div>
                            <input
                              type="text"
                              defaultValue={combo.label}
                              style={{
                                fontSize: 11,
                                fontFamily: 'DM Mono,monospace',
                                fontWeight: 700,
                                color: 'var(--pu)',
                                background: 'transparent',
                                border: 'none',
                                borderBottom: '1px solid rgba(144,96,224,.25)',
                                outline: 'none',
                                width: '100%',
                                padding: '1px 0',
                              }}
                              placeholder="Nom du combo…"
                            />
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                            <div style={{ fontSize: 11, color: 'var(--t3)', textAlign: 'center', marginBottom: 1 }}>Couverts</div>
                            <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid var(--border)', borderRadius: 9, overflow: 'hidden', background: 'var(--surf2)', height: 32 }}>
                              <button style={{ width: 28, height: 32, border: 'none', background: 'transparent', color: 'var(--bl)', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, disabled: capDisplay <= 2 }}>−</button>
                              <div style={{ padding: '0 6px', minWidth: 28, textAlign: 'center', fontSize: 13, fontWeight: 800, fontFamily: 'DM Mono,monospace', color: 'var(--text)', userSelect: 'none' }}>{capDisplay}</div>
                              <button style={{ width: 28, height: 32, border: 'none', background: 'transparent', color: 'var(--bl)', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, disabled: capDisplay >= 50 }}>+</button>
                              <span style={{ fontSize: 11, color: 'var(--t3)', paddingRight: 8, fontFamily: 'DM Mono,monospace' }}>p</span>
                            </div>
                          </div>

                          <button
                            onClick={() => handleDeleteCombo(combo.id)}
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 7,
                              background: 'rgba(220,80,80,.1)',
                              border: '1px solid rgba(220,80,80,.25)',
                              color: 'var(--rd)',
                              cursor: 'pointer',
                              fontSize: 13,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              fontFamily: 'var(--ff)',
                            }}
                            title="Supprimer"
                          >
                            ✕
                          </button>
                        </>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
