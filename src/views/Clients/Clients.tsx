// ══════════════════════════════════════════════════
//  R3STO — Vue Clients CRM
//  Liste des clients, fiche détaillée, historique résas
//  Création auto depuis les résas (lookup par tél)
// ══════════════════════════════════════════════════

import { useState, useMemo, useEffect, useRef } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useNavigate } from 'react-router-dom'
import { useT } from '../../i18n/useTranslation'
import { sectionTitle, filterChip } from '../../utils/design'
import type { Client, Resa } from '../../types'
import PhoneInput from '../../components/ui/PhoneInput'
import { useToast } from '../../components/ui/Toast'
import { useConfirm } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'

// ── Statut badge ────────────────────────────────
const STATUT_META: Record<number, { label: string; icon: string; color: string; bg: string }> = {
  0: { label: 'Standard', icon: '👤', color: 'var(--t2)', bg: 'var(--surf3)' },
  1: { label: 'Régulier', icon: '🔄', color: 'var(--bl)', bg: 'var(--bp)' },
  2: { label: 'VIP', icon: '⭐', color: '#D4A017', bg: 'rgba(212,160,23,.1)' },
  3: { label: 'Surveiller', icon: '👁️', color: 'var(--rd)', bg: 'rgba(220,80,80,.08)' },
}

// ── Helper: générer un ID unique ─────────────────
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }

// ═════════════════════════════════════════════════
export function Clients() {
  const { clients, addClient, updateClient, deleteClient, resas } = useAppStore()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { confirm: confirmAction, dialog: confirmDialog } = useConfirm()
  const { t } = useT()

  const [search, setSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState<number | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  // Deeplink ?id=<clientId> depuis SearchModal ⌘K → auto-sélection + clean URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const id = params.get('id')
    if (id && clients.some(c => c.id === id)) {
      setSelectedId(id)
      // Nettoie l'URL pour éviter re-sélection au back/forward
      const clean = window.location.pathname
      window.history.replaceState({}, '', clean)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [showWarning, setShowWarning] = useState(false)

  // ── Batch reassignment state ──
  const [reassignMap, setReassignMap] = useState<Record<string, string>>({})   // clientId → new tablePref
  const [commentMap, setCommentMap] = useState<Record<string, string>>({})     // clientId → comment

  // Form state
  const [fNom, setFNom] = useState('')
  const [fPrenom, setFPrenom] = useState('')
  const [fTel, setFTel] = useState('')
  const [fEmail, setFEmail] = useState('')
  const [fStatut, setFStatut] = useState<0 | 1 | 2 | 3>(0)
  const [fAllergies, setFAllergies] = useState('')
  const [fNotes, setFNotes] = useState('')
  const [fEntreprise, setFEntreprise] = useState('')
  const [fTablePref, setFTablePref] = useState('')
  const [fTags, setFTags] = useState('')
  const [fLangue, setFLangue] = useState('fr')

  // ── Filtered list ──────────────────────────────
  const filtered = useMemo(() => {
    let list = [...clients]
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        c.nom.toLowerCase().includes(q) ||
        c.prenom.toLowerCase().includes(q) ||
        c.tel.includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.entreprise.toLowerCase().includes(q) ||
        c.tags.some(tg => tg.toLowerCase().includes(q))
      )
    }
    if (filterStatut !== null) list = list.filter(c => c.statut === filterStatut)
    list.sort((a, b) => b.totalVisits - a.totalVisits || b.createdAt - a.createdAt)
    return list
  }, [clients, search, filterStatut])

  const selected = selectedId ? clients.find(c => c.id === selectedId) : null

  // ── Résas de ce client (par tel) ──────────────
  const clientResas = useMemo(() => {
    if (!selected) return []
    return resas
      .filter(r => (selected.tel && r.tel === selected.tel) ||
                    (r.nom === selected.nom && r.prenom === selected.prenom))
      .sort((a, b) => b.date < a.date ? -1 : b.date > a.date ? 1 : 0)
  }, [selected, resas])

  // ── Stats client ──────────────────────────────
  const clientStats = useMemo(() => {
    const total = clientResas.length
    const cvt = clientResas.reduce((s, r) => s + r.c, 0)
    const noshows = clientResas.filter(r => r.s === 'noshow').length
    const lastDate = clientResas.length > 0 ? clientResas[0].date : '—'
    return { total, cvt, noshows, lastDate }
  }, [clientResas])

  // ── Open form for new / edit ──────────────────
  function openNew() {
    setSelectedId(null)
    setFNom(''); setFPrenom(''); setFTel(''); setFEmail('')
    setFStatut(0); setFAllergies(''); setFNotes(''); setFEntreprise('')
    setFTablePref(''); setFTags(''); setFLangue('fr')
    setShowForm(true)
  }

  function openEdit(c: Client) {
    setSelectedId(c.id)
    setFNom(c.nom); setFPrenom(c.prenom); setFTel(c.tel); setFEmail(c.email)
    setFStatut(c.statut); setFAllergies(c.allergies); setFNotes(c.notes)
    setFEntreprise(c.entreprise); setFTablePref(c.tablePref)
    setFTags(c.tags.join(', ')); setFLangue(c.langue)
    setShowForm(true)
  }

  function handleSave() {
    if (!fNom.trim()) return
    const data = {
      nom: fNom.trim(), prenom: fPrenom.trim(), tel: fTel.trim(), email: fEmail.trim(),
      statut: fStatut, allergies: fAllergies, notes: fNotes, entreprise: fEntreprise,
      tablePref: fTablePref, tags: fTags.split(',').map(s => s.trim()).filter(Boolean),
      langue: fLangue,
    }
    if (selectedId && clients.find(c => c.id === selectedId)) {
      updateClient(selectedId, { ...data, lastVisit: clientStats.lastDate !== '—' ? clientStats.lastDate : '' })
    } else {
      addClient({
        ...data, id: uid(), createdAt: Date.now(),
        lastVisit: '', totalVisits: 0, totalCouverts: 0, totalNoshows: 0,
        blacklisted: false, blacklistReason: '',
      })
    }
    setShowForm(false)
  }

  // ── Sync clients from resas (auto-create from phone) ──
  function syncFromResas() {
    const existingTels = new Set(clients.map(c => c.tel).filter(Boolean))
    let created = 0
    const byTel: Record<string, Resa[]> = {}
    for (const r of resas) {
      if (!r.tel) continue
      if (!byTel[r.tel]) byTel[r.tel] = []
      byTel[r.tel].push(r)
    }
    for (const [tel, resaList] of Object.entries(byTel)) {
      if (existingTels.has(tel)) continue
      const last = resaList.sort((a, b) => b.createdAt - a.createdAt)[0]
      const visits = resaList.filter(r => r.s !== 'cancelled').length
      const cvt = resaList.reduce((s, r) => s + r.c, 0)
      const noshows = resaList.filter(r => r.s === 'noshow').length
      addClient({
        id: uid(), nom: last.nom || '', prenom: last.prenom || '',
        tel, email: last.email || '', statut: last.statut ?? 0,
        allergies: last.allergie ? 'Oui' : '', notes: last.noteProfil || '',
        langue: 'fr', entreprise: '', tags: [],
        tablePref: last.tablePref || '', createdAt: Date.now(),
        lastVisit: last.date || '', totalVisits: visits, totalCouverts: cvt,
        totalNoshows: noshows, blacklisted: false, blacklistReason: '',
      })
      created++
    }
    return created
  }

  // ── Auto-sync : créer les clients automatiquement depuis les résas ──
  const lastResaCount = useRef(resas.length)
  useEffect(() => {
    if (resas.length !== lastResaCount.current) {
      lastResaCount.current = resas.length
      syncFromResas()
    }
  }, [resas.length])

  // ── Check tablePref valide ──────────────────────
  const tables = useAppStore(s => s.tables)
  const activeTableNames = new Set(tables.filter(t => t.active).map(t => t.n))
  const isTablePrefValid = (pref: string) => {
    if (!pref) return true
    return pref.split('+').every(t => activeTableNames.has(t.trim()))
  }

  // ── Clients avec tablePref invalide ──────────
  const invalidClients = useMemo(() =>
    clients.filter(c => c.tablePref && !isTablePrefValid(c.tablePref)),
    [clients, tables]
  )

  // Active table names pour le select
  const activeTableList = useMemo(() =>
    tables.filter(t => t.active).map(t => t.n).sort(),
    [tables]
  )

  function applyBatchReassign() {
    let count = 0
    for (const c of invalidClients) {
      const newPref = reassignMap[c.id]
      const comment = commentMap[c.id] || ''
      if (newPref !== undefined) {
        const existingNotes = c.notes || ''
        const reassignNote = comment
          ? `[Réassignement ${new Date().toLocaleDateString('fr-CH')}: ${c.tablePref} → ${newPref || '—'} — ${comment}]`
          : `[Réassignement ${new Date().toLocaleDateString('fr-CH')}: ${c.tablePref} → ${newPref || '—'}]`
        const updatedNotes = existingNotes
          ? `${existingNotes}\n${reassignNote}`
          : reassignNote
        updateClient(c.id, { tablePref: newPref, notes: updatedNotes })
        count++
      }
    }
    if (count > 0) {
      toast(`${count} client${count > 1 ? 's' : ''} réassigné${count > 1 ? 's' : ''}`, 'success')
      setReassignMap({})
      setCommentMap({})
    }
  }

  // ── Suggestion IA table préférée ────────────
  const suggestTablePref = useMemo(() => {
    if (!selectedId && !fTel) return null
    // Find matching resas for this client
    const sel = selectedId ? clients.find(c => c.id === selectedId) : null
    const matchResas = resas.filter(r => {
      if (sel) return (sel.tel && r.tel === sel.tel) || (r.nom === sel.nom && r.prenom === sel.prenom)
      if (fTel) return r.tel === fTel
      if (fNom) return r.nom === fNom && r.prenom === fPrenom
      return false
    }).filter(r => r.tbl && r.s !== 'cancelled')

    if (matchResas.length === 0) return null

    // Count table frequency
    const freq: Record<string, number> = {}
    for (const r of matchResas) {
      freq[r.tbl] = (freq[r.tbl] || 0) + 1
    }

    // Sort by frequency
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1])
    const topTable = sorted[0]?.[0]
    const topCount = sorted[0]?.[1] || 0
    const totalResas = matchResas.length

    // Average covers
    const avgCovers = Math.round(matchResas.reduce((s, r) => s + r.c, 0) / matchResas.length)

    // Check if top table is still active
    const isActive = topTable ? activeTableNames.has(topTable) : false

    // Find best table by capacity match if top isn't active
    let bestAlt: string | null = null
    if (!isActive && avgCovers > 0) {
      const matching = tables
        .filter(t => t.active && t.capMin <= avgCovers && t.capMax >= avgCovers)
        .sort((a, b) => a.priority - b.priority)
      bestAlt = matching[0]?.n || null
    }

    return {
      topTable, topCount, totalResas, avgCovers,
      isActive, bestAlt,
      allTables: sorted.slice(0, 3).map(([n, c]) => ({ name: n, count: c })),
    }
  }, [selectedId, fTel, fNom, fPrenom, resas, clients, tables, activeTableNames])

  // ── Styles ────────────────────────────────────
  const inp: React.CSSProperties = {
    padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600,
    border: '2px solid var(--border)', background: 'var(--surf2)', color: 'var(--text)',
    width: '100%', outline: 'none', fontFamily: 'inherit',
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - var(--hh))', overflow: 'hidden' }}>
      {confirmDialog}

      {/* ── COLONNE GAUCHE : liste ── */}
      <div style={{ width: 420, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>👥 Clients</div>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', fontFamily: 'var(--fm)' }}>{clients.length}</span>
            <div style={{ flex: 1 }} />
            <button onClick={openNew}
              style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--bl)', background: 'var(--bp)', color: 'var(--bl)', cursor: 'pointer' }}>
              ➕ Nouveau
            </button>
          </div>
          <input
            type="text" placeholder="🔍 Rechercher nom, tél, email, tag…"
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ ...inp, fontSize: 12, padding: '6px 10px' }}
          />
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {[null, 0, 1, 2, 3].map(s => {
              const on = filterStatut === s
              const meta = s !== null ? STATUT_META[s] : null
              return (
                <button key={String(s)} onClick={() => setFilterStatut(s)}
                  style={{ ...filterChip(on), fontSize: 11, padding: '4px 10px' }}>
                  {s === null ? 'Tous' : `${meta!.icon} ${meta!.label}`}
                </button>
              )
            })}
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            clients.length === 0 ? (
              <EmptyState
                icon="👥"
                title="Aucun client pour l'instant"
                description="Les profils clients se créent automatiquement dès qu'une réservation est saisie. Vous pouvez aussi en ajouter un manuellement."
                cta={{ label: '+ Nouveau client', onClick: openNew }}
              />
            ) : (
              <EmptyState
                icon="🔎"
                title="Aucun client trouvé"
                description={search || filterStatut !== null ? 'Aucun client ne correspond à vos filtres. Essayez de les réinitialiser.' : undefined}
                cta={search || filterStatut !== null ? { label: 'Réinitialiser les filtres', onClick: () => { setSearch(''); setFilterStatut(null) }, variant: 'secondary' } : undefined}
              />
            )
          ) : filtered.map(c => {
            const meta = STATUT_META[c.statut]
            const isActive = selectedId === c.id && !showForm
            return (
              <div key={c.id} onClick={() => { setSelectedId(c.id); setShowForm(false) }}
                style={{
                  padding: '10px 16px', cursor: 'pointer',
                  borderBottom: '1px solid var(--border)',
                  background: isActive ? 'var(--bp)' : 'transparent',
                  borderLeft: isActive ? '3px solid var(--bl)' : '3px solid transparent',
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: meta.bg, color: meta.color, fontWeight: 700 }}>
                    {meta.icon}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                    {c.prenom} {c.nom}
                  </span>
                  {c.blacklisted && <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--rd)', padding: '1px 4px', borderRadius: 3, background: 'rgba(220,80,80,.1)' }}>🚫 BLACKLIST</span>}
                  <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, fontFamily: 'var(--fm)', color: 'var(--t3)' }}>
                    {c.totalVisits} visite{c.totalVisits > 1 ? 's' : ''}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2, display: 'flex', gap: 8 }}>
                  {c.tel && <span>📞 {c.tel}</span>}
                  {c.allergies && <span style={{ color: 'var(--am)' }}>⚠️ {c.allergies}</span>}
                </div>
                {c.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 3, marginTop: 3, flexWrap: 'wrap' }}>
                    {c.tags.slice(0, 4).map(tag => (
                      <span key={tag} style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'var(--surf3)', color: 'var(--t3)' }}>#{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── COLONNE DROITE : fiche ou formulaire ── */}
      <div style={{ flex: 1, overflowY: 'auto', background: 'var(--surf)' }}>

        {/* ── BANDEAU WARNING : tables à réassigner ── */}
        {invalidClients.length > 0 && (
          <div style={{
            margin: '12px 16px 0', borderRadius: 10, border: '1px solid rgba(220,80,80,.25)',
            background: 'rgba(220,80,80,.04)', overflow: 'hidden',
          }}>
            <button onClick={() => setShowWarning(v => !v)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 14px', border: 'none', background: 'transparent',
                cursor: 'pointer', textAlign: 'left',
              }}>
              <span style={{ fontSize: 14 }}>⚠️</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--rd)' }}>
                {invalidClients.length} client{invalidClients.length > 1 ? 's' : ''} — table préférée inactive
              </span>
              <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--t3)', transform: showWarning ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▼</span>
            </button>

            {showWarning && (
              <div style={{ padding: '0 14px 14px' }}>
                <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 10 }}>
                  Réassignez les tables préférées ou videz-les. Un commentaire optionnel sera ajouté aux notes du client.
                </div>

                {invalidClients.map(c => {
                  const meta = STATUT_META[c.statut]
                  return (
                    <div key={c.id} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 0',
                      borderTop: '1px solid var(--border)', flexWrap: 'wrap',
                    }}>
                      {/* Nom + ancien */}
                      <div style={{ minWidth: 140, flex: '0 0 auto' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 10, padding: '1px 4px', borderRadius: 3, background: meta.bg, color: meta.color, fontWeight: 700 }}>{meta.icon}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', cursor: 'pointer' }}
                            onClick={() => { setSelectedId(c.id); setShowForm(false) }}>
                            {c.prenom} {c.nom}
                          </span>
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--rd)', marginTop: 2, fontFamily: 'var(--fm)' }}>
                          ✕ {c.tablePref}
                        </div>
                      </div>

                      {/* Nouvelle table */}
                      <div style={{ flex: '0 0 auto' }}>
                        <select
                          value={reassignMap[c.id] ?? ''}
                          onChange={e => setReassignMap(m => ({ ...m, [c.id]: e.target.value }))}
                          style={{
                            padding: '5px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                            border: '2px solid var(--border)', background: 'var(--surf2)', color: 'var(--text)',
                            fontFamily: 'inherit', minWidth: 100,
                          }}>
                          <option value="">— Vider —</option>
                          {activeTableList.map(n => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </div>

                      {/* Commentaire */}
                      <div style={{ flex: 1, minWidth: 160 }}>
                        <input
                          placeholder="Commentaire (optionnel)"
                          value={commentMap[c.id] || ''}
                          onChange={e => setCommentMap(m => ({ ...m, [c.id]: e.target.value }))}
                          style={{
                            width: '100%', padding: '5px 8px', borderRadius: 6, fontSize: 11,
                            border: '2px solid var(--border)', background: 'var(--surf2)', color: 'var(--text)',
                            fontFamily: 'inherit', outline: 'none',
                          }}
                        />
                      </div>
                    </div>
                  )
                })}

                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button onClick={applyBatchReassign}
                    style={{
                      fontSize: 11, fontWeight: 700, padding: '6px 14px', borderRadius: 6,
                      border: 'none', background: 'var(--bl)', color: '#fff', cursor: 'pointer',
                    }}>
                    ✅ Appliquer ({Object.keys(reassignMap).length}/{invalidClients.length})
                  </button>
                  <button onClick={() => {
                    // Select all to empty
                    const all: Record<string, string> = {}
                    for (const c of invalidClients) all[c.id] = ''
                    setReassignMap(all)
                  }}
                    style={{
                      fontSize: 11, fontWeight: 600, padding: '6px 12px', borderRadius: 6,
                      border: '1px solid var(--border)', background: 'transparent', color: 'var(--t2)', cursor: 'pointer',
                    }}>
                    Tout vider
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {showForm ? (
          /* ── FORMULAIRE ── */
          <div style={{ padding: 20, maxWidth: 600 }}>
            <div style={{ ...sectionTitle, marginBottom: 16 }}>
              {selectedId ? '✏️ Modifier client' : '➕ Nouveau client'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 10, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: .5 }}>Nom *</label>
                <input value={fNom} onChange={e => setFNom(e.target.value)} style={inp} placeholder="Nom" />
              </div>
              <div>
                <label style={{ fontSize: 10, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: .5 }}>Prénom</label>
                <input value={fPrenom} onChange={e => setFPrenom(e.target.value)} style={inp} placeholder="Prénom" />
              </div>
              <div>
                <label style={{ fontSize: 10, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: .5 }}>Téléphone</label>
                <PhoneInput value={fTel} onChange={setFTel} compact />
              </div>
              <div>
                <label style={{ fontSize: 10, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: .5 }}>Email</label>
                <input value={fEmail} onChange={e => setFEmail(e.target.value)} style={inp} placeholder="email@exemple.com" />
              </div>
              <div>
                <label style={{ fontSize: 10, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: .5 }}>Entreprise</label>
                <input value={fEntreprise} onChange={e => setFEntreprise(e.target.value)} style={inp} placeholder="Société" />
              </div>
              <div>
                <label style={{ fontSize: 10, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: .5 }}>Langue</label>
                <select value={fLangue} onChange={e => setFLangue(e.target.value)} style={inp}>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                  <option value="it">Italiano</option>
                  <option value="en">English</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 10, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: .5 }}>Statut</label>
                <select value={fStatut} onChange={e => setFStatut(Number(e.target.value) as any)} style={inp}>
                  {Object.entries(STATUT_META).map(([k, v]) => (
                    <option key={k} value={k}>{v.icon} {v.label}</option>
                  ))}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 10, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: .5 }}>Table préférée</label>

                {/* Current selection + clear */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, minHeight: 34 }}>
                  {fTablePref ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{
                        fontSize: 12, fontWeight: 800, padding: '4px 10px', borderRadius: 6,
                        background: isTablePrefValid(fTablePref) ? 'var(--bp)' : 'rgba(220,80,80,.1)',
                        color: isTablePrefValid(fTablePref) ? 'var(--bl)' : 'var(--rd)',
                        border: `1px solid ${isTablePrefValid(fTablePref) ? 'var(--bl)' : 'var(--rd)'}`,
                        fontFamily: 'var(--fm)',
                      }}>
                        🪑 {fTablePref}
                      </span>
                      <button onClick={() => setFTablePref('')}
                        style={{ padding: '2px 6px', borderRadius: 4, border: 'none', background: 'var(--surf3)', color: 'var(--t3)', fontSize: 10, cursor: 'pointer', fontWeight: 700 }}>
                        ✕
                      </button>
                      {!isTablePrefValid(fTablePref) && (
                        <span style={{ fontSize: 10, color: 'var(--rd)', fontWeight: 700 }}>⚠️ inactive</span>
                      )}
                    </div>
                  ) : (
                    <span style={{ fontSize: 11, color: 'var(--t4)' }}>Aucune — cliquez pour choisir</span>
                  )}
                </div>

                {/* IA suggestion */}
                {suggestTablePref && (
                  <div style={{
                    marginTop: 6, padding: '6px 10px', borderRadius: 6,
                    background: 'rgba(99,102,241,.06)', border: '1px solid rgba(99,102,241,.15)',
                    fontSize: 10, color: 'var(--t2)',
                  }}>
                    <span style={{ fontWeight: 800, color: 'var(--bl)' }}>🤖 Suggestion IA</span>
                    <span style={{ marginLeft: 6 }}>
                      {suggestTablePref.isActive ? (
                        <>
                          <strong>{suggestTablePref.topTable}</strong> ({suggestTablePref.topCount}/{suggestTablePref.totalResas} résas, ~{suggestTablePref.avgCovers}p moy.)
                          <button onClick={() => setFTablePref(suggestTablePref.topTable!)}
                            style={{ marginLeft: 6, padding: '1px 6px', borderRadius: 4, border: '1px solid var(--bl)', background: 'var(--bp)', color: 'var(--bl)', fontSize: 9, fontWeight: 700, cursor: 'pointer' }}>
                            Appliquer
                          </button>
                        </>
                      ) : suggestTablePref.bestAlt ? (
                        <>
                          <span style={{ textDecoration: 'line-through', color: 'var(--rd)' }}>{suggestTablePref.topTable}</span> inactive →{' '}
                          <strong>{suggestTablePref.bestAlt}</strong> (capacité ~{suggestTablePref.avgCovers}p)
                          <button onClick={() => setFTablePref(suggestTablePref.bestAlt!)}
                            style={{ marginLeft: 6, padding: '1px 6px', borderRadius: 4, border: '1px solid var(--bl)', background: 'var(--bp)', color: 'var(--bl)', fontSize: 9, fontWeight: 700, cursor: 'pointer' }}>
                            Appliquer
                          </button>
                        </>
                      ) : (
                        <>
                          Historique : <span style={{ textDecoration: 'line-through', color: 'var(--rd)' }}>{suggestTablePref.topTable}</span> (inactive, pas d'alternative trouvée)
                        </>
                      )}
                    </span>
                  </div>
                )}

                {/* Table chips grid */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                  {activeTableList.map(n => {
                    const tbl = tables.find(t => t.n === n)
                    const isSelected = fTablePref === n || fTablePref.split('+').map(s => s.trim()).includes(n)
                    return (
                      <button key={n}
                        onClick={() => {
                          if (!fTablePref || fTablePref === n) {
                            setFTablePref(isSelected ? '' : n)
                          } else if (isSelected) {
                            // Remove from combo
                            const parts = fTablePref.split('+').map(s => s.trim()).filter(s => s !== n)
                            setFTablePref(parts.join('+'))
                          } else {
                            // Add to combo
                            setFTablePref(fTablePref + '+' + n)
                          }
                        }}
                        style={{
                          padding: '3px 8px', borderRadius: 5, fontSize: 10, fontWeight: 700,
                          fontFamily: 'var(--fm)', cursor: 'pointer',
                          border: isSelected ? '2px solid var(--bl)' : '1px solid var(--border)',
                          background: isSelected ? 'var(--bp)' : 'var(--surf2)',
                          color: isSelected ? 'var(--bl)' : 'var(--t2)',
                        }}>
                        {n}
                        {tbl && <span style={{ fontSize: 8, marginLeft: 2, opacity: .6 }}>{tbl.capMin}-{tbl.capMax}p</span>}
                      </button>
                    )
                  })}
                </div>
                <div style={{ fontSize: 9, color: 'var(--t4)', marginTop: 3 }}>
                  Cliquez plusieurs tables pour créer un combo (ex: T12+T13)
                </div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 10, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: .5 }}>Allergies / Intolérances</label>
                <input value={fAllergies} onChange={e => setFAllergies(e.target.value)} style={inp} placeholder="Gluten, lactose, fruits de mer…" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 10, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: .5 }}>Tags (séparés par virgule)</label>
                <input value={fTags} onChange={e => setFTags(e.target.value)} style={inp} placeholder="terrasse, vin-rouge, anniversaire" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 10, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: .5 }}>Notes internes</label>
                <textarea value={fNotes} onChange={e => setFNotes(e.target.value)} rows={3}
                  style={{ ...inp, resize: 'vertical' }} placeholder="Préférences, remarques…" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={handleSave} className="btn btn-primary" style={{ fontSize: 13 }}>
                {selectedId ? '💾 Sauver' : '➕ Créer'}
              </button>
              <button onClick={() => setShowForm(false)} className="btn btn-secondary" style={{ fontSize: 13 }}>{t('action.cancel')}</button>
              {selectedId && (
                <button onClick={async () => {
                  if (await confirmAction({ title: 'Supprimer le client', message: 'Cette action est irréversible. Supprimer ce client ?', danger: true, confirmLabel: 'Supprimer' })) {
                    deleteClient(selectedId)
                    setSelectedId(null); setShowForm(false)
                  }
                }} className="btn btn-danger" style={{ fontSize: 13, marginLeft: 'auto' }}>🗑 Supprimer</button>
              )}
            </div>
          </div>
        ) : selected ? (
          /* ── FICHE CLIENT ── */
          <div style={{ padding: 20 }}>
            {/* En-tête */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: STATUT_META[selected.statut].bg, border: `2px solid ${STATUT_META[selected.statut].color}`,
                fontSize: 22, fontWeight: 900, color: STATUT_META[selected.statut].color, fontFamily: 'var(--fm)',
              }}>
                {(selected.prenom || selected.nom || '?')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
                  {selected.prenom} {selected.nom}
                  {selected.blacklisted && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--rd)', marginLeft: 8, padding: '2px 6px', borderRadius: 4, background: 'rgba(220,80,80,.1)' }}>🚫 BLACKLISTÉ</span>}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 3 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5,
                    background: STATUT_META[selected.statut].bg, color: STATUT_META[selected.statut].color,
                  }}>
                    {STATUT_META[selected.statut].icon} {STATUT_META[selected.statut].label}
                  </span>
                  {selected.entreprise && <span style={{ fontSize: 10, color: 'var(--t3)', padding: '2px 6px', borderRadius: 4, background: 'var(--surf3)' }}>🏢 {selected.entreprise}</span>}
                </div>
              </div>
              <button onClick={() => openEdit(selected)} className="btn btn-secondary" style={{ fontSize: 12 }}>✏️ Modifier</button>
            </div>

            {/* Stats rapides */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
              <div className="card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 900, fontFamily: 'var(--fm)', color: 'var(--bl)' }}>{clientStats.total}</div>
                <div style={{ fontSize: 10, color: 'var(--t3)' }}>Visites</div>
              </div>
              <div className="card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 900, fontFamily: 'var(--fm)', color: 'var(--gn)' }}>{clientStats.cvt}</div>
                <div style={{ fontSize: 10, color: 'var(--t3)' }}>Couverts</div>
              </div>
              <div className="card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 900, fontFamily: 'var(--fm)', color: clientStats.noshows > 0 ? 'var(--rd)' : 'var(--t3)' }}>{clientStats.noshows}</div>
                <div style={{ fontSize: 10, color: 'var(--t3)' }}>No-shows</div>
              </div>
              <div className="card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 800, fontFamily: 'var(--fm)', color: 'var(--text)' }}>{clientStats.lastDate}</div>
                <div style={{ fontSize: 10, color: 'var(--t3)' }}>Dernière visite</div>
              </div>
            </div>

            {/* Coordonnées */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ ...sectionTitle, marginBottom: 8 }}>Coordonnées</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
                {selected.tel && <div>📞 <a href={`tel:${selected.tel}`} style={{ color: 'var(--bl)' }}>{selected.tel}</a></div>}
                {selected.email && <div>✉️ <a href={`mailto:${selected.email}`} style={{ color: 'var(--bl)' }}>{selected.email}</a></div>}
                {selected.langue && <div>🌐 {selected.langue.toUpperCase()}</div>}
              </div>
            </div>

            {/* Préférences */}
            {(selected.allergies || selected.tablePref || selected.notes || selected.tags.length > 0) && (
              <div className="card" style={{ marginBottom: 16 }}>
                <div style={{ ...sectionTitle, marginBottom: 8 }}>Préférences</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                  {selected.allergies && <div style={{ color: 'var(--am)', fontWeight: 700 }}>⚠️ Allergies : {selected.allergies}</div>}
                  {selected.tablePref && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>🪑 Table préférée :</span>
                        <span style={{
                          fontWeight: 800, fontFamily: 'var(--fm)', padding: '2px 8px', borderRadius: 5,
                          background: isTablePrefValid(selected.tablePref) ? 'var(--bp)' : 'rgba(220,80,80,.1)',
                          color: isTablePrefValid(selected.tablePref) ? 'var(--bl)' : 'var(--rd)',
                          border: `1px solid ${isTablePrefValid(selected.tablePref) ? 'var(--bl)' : 'var(--rd)'}`,
                        }}>
                          {selected.tablePref}
                        </span>
                        {!isTablePrefValid(selected.tablePref) && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--rd)' }}>⚠️ inactive</span>
                        )}
                      </div>
                      {/* IA source info */}
                      {suggestTablePref && suggestTablePref.allTables.length > 0 && (
                        <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 3, paddingLeft: 24 }}>
                          📊 Historique : {suggestTablePref.allTables.map(t =>
                            `${t.name} (${t.count}×)`
                          ).join(', ')} — ~{suggestTablePref.avgCovers}p moy.
                        </div>
                      )}
                    </div>
                  )}
                  {selected.notes && <div style={{ color: 'var(--t2)' }}>📝 {selected.notes}</div>}
                  {selected.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {selected.tags.map(tag => (
                        <span key={tag} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 5, background: 'var(--surf3)', color: 'var(--t2)', fontWeight: 600 }}>#{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Historique résas */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ ...sectionTitle, padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
                📖 Historique ({clientResas.length})
              </div>
              {clientResas.length === 0 ? (
                <div style={{ padding: 16, textAlign: 'center', color: 'var(--t4)', fontSize: 12 }}>Aucune réservation trouvée</div>
              ) : clientResas.slice(0, 20).map((r, i) => {
                const statusColors: Record<string, string> = {
                  reserved: 'var(--bl)', arrived: 'var(--gn)', done: 'var(--t3)',
                  noshow: 'var(--rd)', cancelled: 'var(--t4)', waitlist: 'var(--am)',
                }
                return (
                  <div key={r.id}
                    onClick={() => navigate(`/reservations?edit=${r.id}`)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px',
                      borderBottom: i < Math.min(clientResas.length, 20) - 1 ? '1px solid var(--border)' : 'none',
                      cursor: 'pointer', fontSize: 12,
                    }}>
                    <span style={{ fontFamily: 'var(--fm)', fontWeight: 800, color: 'var(--text)', width: 80 }}>{r.date}</span>
                    <span style={{ fontFamily: 'var(--fm)', fontWeight: 700, color: 'var(--t2)', width: 40 }}>{r.t}</span>
                    <span style={{ fontFamily: 'var(--fm)', color: 'var(--t2)' }}>{r.c}p</span>
                    <span style={{ color: 'var(--t3)' }}>{r.tbl || '—'}</span>
                    <span style={{ fontSize: 10, color: 'var(--t3)' }}>{r.svc}</span>
                    <span style={{
                      marginLeft: 'auto', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                      color: statusColors[r.s] || 'var(--t3)',
                      background: `${statusColors[r.s] || 'var(--t3)'}15`,
                    }}>{r.s}</span>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          /* ── AUCUN CLIENT SÉLECTIONNÉ ── */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--t4)', gap: 12 }}>
            <span style={{ fontSize: 48 }}>👥</span>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Sélectionnez un client</div>
            <div style={{ fontSize: 12 }}>ou créez-en un nouveau</div>
          </div>
        )}
      </div>
    </div>
  )
}
