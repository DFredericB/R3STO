// ══════════════════════════════════════════════════
//  R3STO — Vue Clients CRM
//  Liste des clients, fiche détaillée, historique résas
//  Création auto depuis les résas (lookup par tél)
// ══════════════════════════════════════════════════

import { useState, useMemo } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useNavigate } from 'react-router-dom'
import { useT } from '../../i18n/useTranslation'
import { sectionTitle } from '../../utils/design'
import type { Client, Resa } from '../../types'

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
  const { t } = useT()

  const [search, setSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState<number | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

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

  // ── Styles ────────────────────────────────────
  const inp: React.CSSProperties = {
    padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600,
    border: '2px solid var(--border)', background: 'var(--surf2)', color: 'var(--text)',
    width: '100%', outline: 'none', fontFamily: 'inherit',
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - var(--hh))', overflow: 'hidden' }}>

      {/* ── COLONNE GAUCHE : liste ── */}
      <div style={{ width: 380, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>👥 Clients</div>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', fontFamily: 'var(--fm)' }}>{clients.length}</span>
            <div style={{ flex: 1 }} />
            <button onClick={() => { const n = syncFromResas(); alert(`${n} client(s) créé(s) depuis les résas`) }}
              style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surf3)', color: 'var(--t2)', cursor: 'pointer' }}>
              🔄 Sync résas
            </button>
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
          <div style={{ display: 'flex', gap: 4 }}>
            {[null, 0, 1, 2, 3].map(s => {
              const on = filterStatut === s
              const meta = s !== null ? STATUT_META[s] : null
              return (
                <button key={String(s)} onClick={() => setFilterStatut(s)}
                  style={{
                    fontSize: 10, fontWeight: on ? 800 : 600, padding: '3px 8px', borderRadius: 5,
                    border: `1.5px solid ${on ? 'var(--bl)' : 'var(--border)'}`,
                    background: on ? 'var(--bp)' : 'transparent',
                    color: on ? 'var(--bl)' : 'var(--t3)', cursor: 'pointer',
                  }}>
                  {s === null ? 'Tous' : `${meta!.icon} ${meta!.label}`}
                </button>
              )
            })}
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--t4)', fontSize: 13 }}>
              {clients.length === 0 ? 'Aucun client — cliquez "Sync résas" pour importer depuis vos réservations' : 'Aucun résultat'}
            </div>
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
                <input value={fTel} onChange={e => setFTel(e.target.value)} style={inp} placeholder="+41 79 000 00 00" />
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
              <div>
                <label style={{ fontSize: 10, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: .5 }}>Table préférée</label>
                <input value={fTablePref} onChange={e => setFTablePref(e.target.value)} style={inp} placeholder="T5, T12+T13…" />
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
              <button onClick={() => setShowForm(false)} className="btn btn-secondary" style={{ fontSize: 13 }}>Annuler</button>
              {selectedId && (
                <button onClick={() => {
                  if (confirm('Supprimer ce client ?')) {
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
                  {selected.tablePref && <div>🪑 Table préférée : <strong>{selected.tablePref}</strong></div>}
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
