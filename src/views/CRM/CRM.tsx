// ══════════════════════════════════════════════════
//  R3STO — Vue CRM Prospects
//  Gestion des 6800+ contacts B2B (restaurants)
//  Recherche, filtres canton/status/source, pagination
// ══════════════════════════════════════════════════

import { useState, useEffect, useCallback, useMemo } from 'react'
import { getToken } from '../../auth/useAuth'
import { RADIUS, sectionTitle, filterChip, inputStyle, labelStyle } from '../../utils/design'
import { useToast } from '../../components/ui/Toast'

const API = (import.meta as any).env?.VITE_API_BASE || 'https://api.r3sto.ch/api'

interface Contact {
  id: number
  email: string | null
  first_name: string | null
  last_name: string | null
  company: string | null
  raison_sociale: string | null
  phone: string | null
  address: string | null
  postal_code: string | null
  city: string | null
  canton: string | null
  country: string
  website: string | null
  couverts: string | null
  type_cuisine: string | null
  concurrence: string | null
  source: string
  status: string
  notes: string | null
  consent: number
  unsubscribed: number
  created_at: string
}

interface Stats {
  total: number
  withEmail: number
  withPhone: number
  unsubscribed: number
  byStatus: Record<string, number>
  bySource: Record<string, number>
  byCanton: Record<string, number>
}

const PAGE_SIZE = 50

const CANTONS = ['GE','VD','VS','FR','NE','JU','BE','ZH','LU','BS','AG','SG','TI','TG','SO','BL','GR','SZ','ZG','SH','AR','AI','GL','NW','OW','UR']
const STATUSES = ['Prospect','Client','Partenaire','Inactif','lead','active','lost']

const cardS: React.CSSProperties = {
  background: 'var(--surf)', border: '1px solid var(--border)',
  borderRadius: RADIUS.md, padding: 14,
}
const btnPrimary: React.CSSProperties = {
  padding: '8px 16px', borderRadius: RADIUS.sm,
  background: 'var(--bl)', color: '#fff', border: 'none',
  fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'var(--ff)',
}
const btnSecondary: React.CSSProperties = {
  ...btnPrimary, background: 'var(--surf3)', color: 'var(--t2)',
  border: '1px solid var(--border)',
}
const statCard: React.CSSProperties = {
  ...cardS, textAlign: 'center', flex: '1 1 140px', minWidth: 120,
}

async function apiFetch(path: string, opts?: RequestInit) {
  const token = getToken()
  const r = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts?.headers || {}),
    },
  })
  return r.json()
}

// ═════════════════════════════════════════════════
export function CRM() {
  const { toast } = useToast()

  // ── State ──
  const [contacts, setContacts] = useState<Contact[]>([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [filterCanton, setFilterCanton] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSource, setFilterSource] = useState('')
  const [selected, setSelected] = useState<Contact | null>(null)
  const [showEdit, setShowEdit] = useState(false)
  const [tab, setTab] = useState<'list' | 'stats'>('list')

  // ── Debounce search ──
  useEffect(() => {
    const t = setTimeout(() => { setSearchDebounced(search); setPage(0) }, 350)
    return () => clearTimeout(t)
  }, [search])

  // ── Fetch contacts ──
  const fetchContacts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('limit', String(PAGE_SIZE))
      params.set('offset', String(page * PAGE_SIZE))
      if (searchDebounced) params.set('search', searchDebounced)
      if (filterCanton) params.set('canton', filterCanton)
      if (filterStatus) params.set('status', filterStatus)
      if (filterSource) params.set('source', filterSource)
      const data = await apiFetch(`/crm/contacts?${params}`)
      if (data.ok) {
        setContacts(data.contacts || [])
        setTotal(data.total || 0)
      }
    } catch (e) {
      console.error('CRM fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [page, searchDebounced, filterCanton, filterStatus, filterSource])

  useEffect(() => { fetchContacts() }, [fetchContacts])

  // ── Fetch stats ──
  useEffect(() => {
    apiFetch('/crm/stats').then(d => { if (d.ok) setStats(d.stats || d) }).catch(() => {})
  }, [])

  // ── Edit contact ──
  const [editForm, setEditForm] = useState<Partial<Contact>>({})

  const openEdit = (c: Contact) => {
    setSelected(c)
    setEditForm({ ...c })
    setShowEdit(true)
  }

  const saveEdit = async () => {
    if (!selected) return
    try {
      const data = await apiFetch(`/crm/contacts/${selected.id}`, {
        method: 'PATCH',
        body: JSON.stringify(editForm),
      })
      if (data.ok) {
        toast('Contact mis a jour')
        setShowEdit(false)
        fetchContacts()
      } else {
        toast(data.error || 'Erreur')
      }
    } catch { toast('Erreur réseau') }
  }

  const deleteContact = async (id: number) => {
    if (!confirm('Supprimer ce contact ?')) return
    try {
      const data = await apiFetch(`/crm/contacts/${id}`, { method: 'DELETE' })
      if (data.ok) { toast('Supprimé'); fetchContacts() }
    } catch { toast('Erreur') }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  // ── Sources list from stats ──
  const sources = useMemo(() => {
    if (!stats?.bySource) return ['import', 'manual', 'linkedin', 'minotel']
    return Object.keys(stats.bySource)
  }, [stats])

  return (
    <div style={{ padding: '16px 20px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', margin: 0, fontFamily: 'var(--ff)' }}>
            📇 CRM Prospects
          </h1>
          <p style={{ fontSize: 11, color: 'var(--t3)', margin: '2px 0 0', fontFamily: 'var(--ff)' }}>
            {total.toLocaleString()} contacts · Base unifiée R3STO
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={filterChip(tab === 'list')} onClick={() => setTab('list')}>📋 Liste</button>
          <button style={filterChip(tab === 'stats')} onClick={() => setTab('stats')}>📊 Stats</button>
        </div>
      </div>

      {/* Stats cards */}
      {stats && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={statCard}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--bl)' }}>{stats.total?.toLocaleString()}</div>
            <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 600 }}>CONTACTS TOTAL</div>
          </div>
          <div style={statCard}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--gn)' }}>{stats.withEmail?.toLocaleString()}</div>
            <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 600 }}>AVEC EMAIL</div>
          </div>
          <div style={statCard}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--am)' }}>{stats.withPhone?.toLocaleString()}</div>
            <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 600 }}>AVEC TEL</div>
          </div>
          <div style={statCard}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--rd)' }}>{stats.unsubscribed || 0}</div>
            <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 600 }}>DESINSCRITS</div>
          </div>
        </div>
      )}

      {tab === 'stats' && stats ? (
        <StatsView stats={stats} />
      ) : (
        <>
          {/* Search + Filters */}
          <div style={{ ...cardS, marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher nom, email, ville, entreprise..."
              style={{ ...inputStyle, flex: '2 1 250px', minWidth: 200 }}
            />
            <select
              value={filterCanton}
              onChange={e => { setFilterCanton(e.target.value); setPage(0) }}
              style={{ ...inputStyle, flex: '0 1 100px', minWidth: 80 }}
            >
              <option value="">Canton</option>
              {CANTONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={filterStatus}
              onChange={e => { setFilterStatus(e.target.value); setPage(0) }}
              style={{ ...inputStyle, flex: '0 1 120px', minWidth: 100 }}
            >
              <option value="">Statut</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={filterSource}
              onChange={e => { setFilterSource(e.target.value); setPage(0) }}
              style={{ ...inputStyle, flex: '0 1 120px', minWidth: 100 }}
            >
              <option value="">Source</option>
              {sources.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {(filterCanton || filterStatus || filterSource || search) && (
              <button
                onClick={() => { setSearch(''); setFilterCanton(''); setFilterStatus(''); setFilterSource(''); setPage(0) }}
                style={{ ...btnSecondary, fontSize: 11, padding: '6px 10px' }}
              >✕ Reset</button>
            )}
          </div>

          {/* Table */}
          <div style={{ ...cardS, padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'var(--ff)' }}>
                <thead>
                  <tr style={{ background: 'var(--surf3)', borderBottom: '1.5px solid var(--border)' }}>
                    {['Entreprise','Contact','Email','Tel','Ville','Canton','Source','Statut',''].map(h => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--t4)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: 'var(--t3)' }}>Chargement...</td></tr>
                  )}
                  {!loading && contacts.length === 0 && (
                    <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: 'var(--t4)' }}>Aucun contact trouvé</td></tr>
                  )}
                  {!loading && contacts.map(c => (
                    <tr
                      key={c.id}
                      onClick={() => openEdit(c)}
                      style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background .1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surf3)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '8px 10px', fontWeight: 700, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.company || '—'}
                      </td>
                      <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                        {[c.first_name, c.last_name].filter(Boolean).join(' ') || '—'}
                      </td>
                      <td style={{ padding: '8px 10px', color: c.email ? 'var(--bl)' : 'var(--t4)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.email || '—'}
                      </td>
                      <td style={{ padding: '8px 10px', fontFamily: 'var(--fm)', fontSize: 10, whiteSpace: 'nowrap' }}>
                        {c.phone || '—'}
                      </td>
                      <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>{c.city || '—'}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 700 }}>
                        {c.canton ? (
                          <span style={{ padding: '2px 6px', borderRadius: 4, background: 'var(--bp)', color: 'var(--bl)', fontSize: 10, fontWeight: 800 }}>{c.canton}</span>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '8px 10px', fontSize: 10, color: 'var(--t3)' }}>{c.source}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700,
                          background: c.status === 'Client' ? 'var(--gp)' : c.status === 'Prospect' ? 'var(--bp)' : 'var(--surf3)',
                          color: c.status === 'Client' ? 'var(--gn)' : c.status === 'Prospect' ? 'var(--bl)' : 'var(--t3)',
                        }}>{c.status}</span>
                      </td>
                      <td style={{ padding: '8px 6px', whiteSpace: 'nowrap' }}>
                        <button
                          onClick={e => { e.stopPropagation(); deleteContact(c.id) }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--t4)', padding: 2 }}
                          title="Supprimer"
                        >🗑</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderTop: '1px solid var(--border)', fontSize: 11 }}>
                <span style={{ color: 'var(--t3)' }}>
                  {(page * PAGE_SIZE + 1)}–{Math.min((page + 1) * PAGE_SIZE, total)} sur {total.toLocaleString()}
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    disabled={page === 0}
                    onClick={() => setPage(p => p - 1)}
                    style={{ ...btnSecondary, padding: '4px 10px', opacity: page === 0 ? 0.4 : 1 }}
                  >← Préc.</button>
                  {totalPages <= 7 ? (
                    Array.from({ length: totalPages }, (_, i) => (
                      <button key={i} onClick={() => setPage(i)}
                        style={{ ...btnSecondary, padding: '4px 8px', minWidth: 28, ...(i === page ? { background: 'var(--bl)', color: '#fff', borderColor: 'var(--bl)' } : {}) }}
                      >{i + 1}</button>
                    ))
                  ) : (
                    <>
                      {[0, 1].map(i => (
                        <button key={i} onClick={() => setPage(i)}
                          style={{ ...btnSecondary, padding: '4px 8px', minWidth: 28, ...(i === page ? { background: 'var(--bl)', color: '#fff', borderColor: 'var(--bl)' } : {}) }}
                        >{i + 1}</button>
                      ))}
                      <span style={{ padding: '4px 4px', color: 'var(--t4)' }}>…</span>
                      {page > 2 && page < totalPages - 3 && (
                        <button onClick={() => {}}
                          style={{ ...btnSecondary, padding: '4px 8px', minWidth: 28, background: 'var(--bl)', color: '#fff', borderColor: 'var(--bl)' }}
                        >{page + 1}</button>
                      )}
                      {page > 2 && page < totalPages - 3 && <span style={{ padding: '4px 4px', color: 'var(--t4)' }}>…</span>}
                      {[totalPages - 2, totalPages - 1].map(i => (
                        <button key={i} onClick={() => setPage(i)}
                          style={{ ...btnSecondary, padding: '4px 8px', minWidth: 28, ...(i === page ? { background: 'var(--bl)', color: '#fff', borderColor: 'var(--bl)' } : {}) }}
                        >{i + 1}</button>
                      ))}
                    </>
                  )}
                  <button
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage(p => p + 1)}
                    style={{ ...btnSecondary, padding: '4px 10px', opacity: page >= totalPages - 1 ? 0.4 : 1 }}
                  >Suiv. →</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Edit Modal ── */}
      {showEdit && selected && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }} onClick={() => setShowEdit(false)}>
          <div style={{
            background: 'var(--surf)', borderRadius: RADIUS.lg, padding: 24,
            width: '100%', maxWidth: 600, maxHeight: '85vh', overflowY: 'auto',
            scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent',
            border: '1px solid var(--border)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0, fontFamily: 'var(--ff)', color: 'var(--text)' }}>
                Modifier le contact
              </h2>
              <button onClick={() => setShowEdit(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--t3)' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {([
                ['company', 'Entreprise'],
                ['raison_sociale', 'Raison sociale'],
                ['first_name', 'Prenom'],
                ['last_name', 'Nom'],
                ['email', 'Email'],
                ['phone', 'Telephone'],
                ['address', 'Adresse'],
                ['postal_code', 'NPA'],
                ['city', 'Ville'],
                ['canton', 'Canton'],
                ['country', 'Pays'],
                ['website', 'Site web'],
                ['couverts', 'Couverts'],
                ['type_cuisine', 'Type cuisine'],
                ['concurrence', 'Concurrence'],
                ['source', 'Source'],
                ['status', 'Statut'],
              ] as [string, string][]).map(([key, label]) => (
                <div key={key} style={key === 'address' ? { gridColumn: '1 / -1' } : {}}>
                  <label style={labelStyle}>{label}</label>
                  {key === 'canton' ? (
                    <select
                      value={(editForm as any)[key] || ''}
                      onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value || null }))}
                      style={inputStyle}
                    >
                      <option value="">—</option>
                      {CANTONS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  ) : key === 'status' ? (
                    <select
                      value={(editForm as any)[key] || ''}
                      onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                      style={inputStyle}
                    >
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : (
                    <input
                      value={(editForm as any)[key] || ''}
                      onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value || null }))}
                      style={inputStyle}
                    />
                  )}
                </div>
              ))}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Notes</label>
                <textarea
                  value={editForm.notes || ''}
                  onChange={e => setEditForm(f => ({ ...f, notes: e.target.value || null }))}
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button style={btnSecondary} onClick={() => setShowEdit(false)}>Annuler</button>
              <button style={btnPrimary} onClick={saveEdit}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Stats Sub-view ──────────────────────────────
function StatsView({ stats }: { stats: Stats }) {
  const barStyle = (pct: number, color: string): React.CSSProperties => ({
    height: 18, borderRadius: 3,
    background: color, width: `${Math.max(pct, 2)}%`,
    transition: 'width .3s',
  })

  const maxCanton = Math.max(...Object.values(stats.byCanton || {}), 1)
  const maxStatus = Math.max(...Object.values(stats.byStatus || {}), 1)
  const maxSource = Math.max(...Object.values(stats.bySource || {}), 1)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 14 }}>
      {/* By Canton */}
      <div style={cardS}>
        <div style={sectionTitle}>Par canton</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 400, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}>
          {Object.entries(stats.byCanton || {})
            .sort((a, b) => b[1] - a[1])
            .map(([canton, count]) => (
              <div key={canton} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 28, fontWeight: 800, fontSize: 10, color: 'var(--bl)', textAlign: 'right' }}>{canton}</span>
                <div style={{ flex: 1, background: 'var(--surf3)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={barStyle((count / maxCanton) * 100, 'var(--bl)')} />
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--t2)', minWidth: 32, textAlign: 'right', fontFamily: 'var(--fm)' }}>{count}</span>
              </div>
            ))}
        </div>
      </div>

      {/* By Status */}
      <div style={cardS}>
        <div style={sectionTitle}>Par statut</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {Object.entries(stats.byStatus || {})
            .sort((a, b) => b[1] - a[1])
            .map(([status, count]) => (
              <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 70, fontSize: 11, fontWeight: 600, color: 'var(--t2)' }}>{status}</span>
                <div style={{ flex: 1, background: 'var(--surf3)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={barStyle((count / maxStatus) * 100, status === 'Client' ? 'var(--gn)' : status === 'Prospect' ? 'var(--bl)' : 'var(--am)')} />
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--t2)', minWidth: 32, textAlign: 'right', fontFamily: 'var(--fm)' }}>{count}</span>
              </div>
            ))}
        </div>
      </div>

      {/* By Source */}
      <div style={cardS}>
        <div style={sectionTitle}>Par source</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {Object.entries(stats.bySource || {})
            .sort((a, b) => b[1] - a[1])
            .map(([source, count]) => (
              <div key={source} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 70, fontSize: 11, fontWeight: 600, color: 'var(--t2)' }}>{source}</span>
                <div style={{ flex: 1, background: 'var(--surf3)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={barStyle((count / maxSource) * 100, 'var(--am)')} />
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--t2)', minWidth: 32, textAlign: 'right', fontFamily: 'var(--fm)' }}>{count}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
