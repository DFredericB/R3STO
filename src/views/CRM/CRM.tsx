// ══════════════════════════════════════════════════
//  R3STO — CRM Complet
//  Pipeline commercial, scoring leads, activités,
//  suivi deals, automation, analytics
//  Gestion complète des prospects restaurants B2B
// ══════════════════════════════════════════════════

import { useState, useEffect, useCallback, useMemo } from 'react'
import { getToken } from '../../auth/useAuth'
import { RADIUS, sectionTitle, filterChip, inputStyle, labelStyle } from '../../utils/design'
import { useToast } from '../../components/ui/Toast'

const API = (import.meta as any).env?.VITE_API_BASE || 'https://api.r3sto.ch'

// ── Types ──
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
  // CRM enrichi
  score?: number
  pipeline_stage?: PipelineStage
  deal_value?: number
  assigned_to?: string
  last_activity?: string
  next_followup?: string
  tags?: string[]
  activity_count?: number
}

type PipelineStage = 'lead' | 'qualified' | 'demo' | 'proposal' | 'negotiation' | 'won' | 'lost'
type TabView = 'pipeline' | 'list' | 'stats' | 'activities' | 'automation'

interface Stats {
  total: number
  withEmail: number
  withPhone: number
  unsubscribed: number
  byStatus: Record<string, number>
  bySource: Record<string, number>
  byCanton: Record<string, number>
}

interface Activity {
  id: string
  contactId: number
  contactName: string
  type: 'call' | 'email' | 'meeting' | 'note' | 'demo' | 'proposal'
  description: string
  date: string
  outcome?: string
  assignedTo: string
}

interface AutoRule {
  id: string
  name: string
  trigger: string
  action: string
  active: boolean
  executions: number
}

const PAGE_SIZE = 50
const CANTONS = ['GE','VD','VS','FR','NE','JU','BE','ZH','LU','BS','AG','SG','TI','TG','SO','BL','GR','SZ','ZG','SH','AR','AI','GL','NW','OW','UR']
const STATUSES = ['Prospect','Client','Partenaire','Inactif','lead','active','lost']

const PIPELINE_STAGES: { key: PipelineStage; label: string; icon: string; color: string }[] = [
  { key: 'lead', label: 'Leads', icon: '📥', color: 'var(--t3)' },
  { key: 'qualified', label: 'Qualifiés', icon: '✅', color: 'var(--bl)' },
  { key: 'demo', label: 'Démo planifiée', icon: '🎯', color: '#7c3aed' },
  { key: 'proposal', label: 'Proposition', icon: '📄', color: 'var(--am)' },
  { key: 'negotiation', label: 'Négociation', icon: '🤝', color: '#e8a530' },
  { key: 'won', label: 'Gagnés', icon: '🏆', color: 'var(--gn)' },
  { key: 'lost', label: 'Perdus', icon: '❌', color: 'var(--rd)' },
]

// ── Styles ──
const card: React.CSSProperties = {
  background: 'var(--surf)', border: '1px solid var(--border)',
  borderRadius: RADIUS.md, padding: 14,
}
const btnP: React.CSSProperties = {
  padding: '8px 16px', borderRadius: RADIUS.sm,
  background: 'var(--bl)', color: '#fff', border: 'none',
  fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'var(--ff)',
}
const btnS: React.CSSProperties = {
  ...btnP, background: 'var(--surf3)', color: 'var(--t2)',
  border: '1px solid var(--border)',
}
const stat: React.CSSProperties = {
  ...card, textAlign: 'center', flex: '1 1 140px', minWidth: 120,
}

// ── API helper ──
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

// ── Lead scoring ──
function computeScore(c: Contact): number {
  let score = 0
  if (c.email) score += 20
  if (c.phone) score += 15
  if (c.website) score += 10
  if (c.couverts) {
    const cvt = parseInt(c.couverts)
    if (cvt >= 100) score += 25
    else if (cvt >= 50) score += 15
    else score += 5
  }
  if (c.city) score += 5
  if (c.canton && ['GE','VD','VS','ZH','BE','BS'].includes(c.canton)) score += 10
  if (c.type_cuisine) score += 5
  if (c.notes && c.notes.length > 20) score += 5
  if (c.source === 'linkedin') score += 5
  if (c.status === 'Client') score += 20
  if (c.status === 'Prospect') score += 10
  return Math.min(score, 100)
}

function scoreColor(s: number): string {
  if (s >= 70) return 'var(--gn)'
  if (s >= 40) return 'var(--am)'
  return 'var(--rd)'
}

function scoreBg(s: number): string {
  if (s >= 70) return 'var(--gp)'
  if (s >= 40) return 'var(--ap)'
  return 'var(--rp)'
}

// ── Demo data generators ──
function demoPipelineData(contacts: Contact[]): Record<PipelineStage, Contact[]> {
  const stages: Record<PipelineStage, Contact[]> = {
    lead: [], qualified: [], demo: [], proposal: [], negotiation: [], won: [], lost: [],
  }
  contacts.forEach((c, i) => {
    const score = computeScore(c)
    const enriched = { ...c, score, deal_value: Math.round(39 + Math.random() * 40) * 12 }
    if (c.status === 'Client') stages.won.push(enriched)
    else if (c.status === 'Inactif' || c.status === 'lost') stages.lost.push(enriched)
    else if (score >= 70) stages[(['negotiation', 'proposal', 'demo'] as const)[i % 3]].push(enriched)
    else if (score >= 40) stages[(['qualified', 'demo'] as const)[i % 2]].push(enriched)
    else stages.lead.push(enriched)
  })
  return stages
}

function demoActivities(): Activity[] {
  const now = Date.now()
  const day = 86400000
  return [
    { id: 'a1', contactId: 1, contactName: 'La Brasserie du Port', type: 'call', description: 'Appel découverte — intéressé par plan Resto', date: new Date(now - day * 0.5).toISOString(), outcome: 'Démo planifiée mercredi', assignedTo: 'Caroline' },
    { id: 'a2', contactId: 2, contactName: 'Chez Marco', type: 'demo', description: 'Démo complète 45min — très enthousiaste', date: new Date(now - day * 1).toISOString(), outcome: 'Envoi proposition Gastro', assignedTo: 'Didier' },
    { id: 'a3', contactId: 3, contactName: 'Le Comptoir Suisse', type: 'email', description: 'Relance post-démo avec comparatif concurrence', date: new Date(now - day * 1.5).toISOString(), assignedTo: 'Caroline' },
    { id: 'a4', contactId: 4, contactName: 'Auberge de la Gare', type: 'proposal', description: 'Proposition Resto 59 CHF/mois envoyée', date: new Date(now - day * 2).toISOString(), outcome: 'En attente réponse', assignedTo: 'Antoine' },
    { id: 'a5', contactId: 5, contactName: 'Trattoria Bella', type: 'meeting', description: 'RDV sur place — 80 couverts, besoin widget + fidelité', date: new Date(now - day * 2.5).toISOString(), outcome: 'Qualifié Gastro', assignedTo: 'Didier' },
    { id: 'a6', contactId: 6, contactName: 'Le Refuge Alpin', type: 'note', description: 'Pas de réponse après 3 relances — marquer inactif dans 1 sem.', date: new Date(now - day * 3).toISOString(), assignedTo: 'Caroline' },
    { id: 'a7', contactId: 7, contactName: 'Café Central', type: 'call', description: 'Premier contact à froid — curieux mais pas décideur', date: new Date(now - day * 4).toISOString(), outcome: 'Rappeler le gérant lundi', assignedTo: 'Antoine' },
    { id: 'a8', contactId: 8, contactName: 'Sushi Corner', type: 'demo', description: 'Mini-démo 15min — compare avec TheFork', date: new Date(now - day * 5).toISOString(), outcome: 'Envoyer comparatif prix', assignedTo: 'Didier' },
  ]
}

function demoAutoRules(): AutoRule[] {
  return [
    { id: 'r1', name: 'Score > 70 → Qualifier', trigger: 'Score lead dépasse 70', action: 'Déplacer en "Qualifiés" + notification Slack', active: true, executions: 234 },
    { id: 'r2', name: 'Relance 3 jours', trigger: '3 jours sans activité (stage Proposition)', action: 'Email de relance automatique', active: true, executions: 89 },
    { id: 'r3', name: 'Welcome email', trigger: 'Nouveau lead ajouté', action: 'Envoyer email de bienvenue + brochure PDF', active: true, executions: 1547 },
    { id: 'r4', name: 'Assignation auto GE/VD', trigger: 'Nouveau lead canton GE ou VD', action: 'Assigner à Caroline', active: true, executions: 412 },
    { id: 'r5', name: 'Alerte deal stagnant', trigger: 'Deal en négociation > 14 jours', action: 'Notification manager + email client', active: false, executions: 56 },
    { id: 'r6', name: 'Post-signature onboarding', trigger: 'Deal marqué "Gagné"', action: 'Créer compte + envoyer accès + planifier onboarding', active: true, executions: 78 },
  ]
}

// ═════════════════════════════════════════════════
export function CRM() {
  const { toast } = useToast()
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
  const [showAddActivity, setShowAddActivity] = useState(false)
  const [tab, setTab] = useState<TabView>('pipeline')
  const [activities] = useState<Activity[]>(demoActivities)
  const [autoRules, setAutoRules] = useState<AutoRule[]>(demoAutoRules)
  const [editForm, setEditForm] = useState<Partial<Contact>>({})

  // ── Debounce ──
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
    } catch (err) {
      console.error('[CRM] fetchContacts failed:', err)
      toast('Chargement CRM impossible', 'error')
    } finally { setLoading(false) }
  }, [page, searchDebounced, filterCanton, filterStatus, filterSource])

  useEffect(() => { fetchContacts() }, [fetchContacts])

  useEffect(() => {
    apiFetch('/crm/stats')
      .then(d => { if (d.ok) setStats(d.stats || d) })
      .catch(err => console.error('[CRM] /crm/stats failed:', err))
  }, [])

  const pipeline = useMemo(() => demoPipelineData(contacts), [contacts])
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const sources = useMemo(() => {
    if (!stats?.bySource) return ['import', 'manual', 'linkedin', 'minotel']
    return Object.keys(stats.bySource)
  }, [stats])

  // ── Pipeline metrics ──
  const pipelineMetrics = useMemo(() => {
    const totalDeals = Object.values(pipeline).flat().length
    const wonDeals = pipeline.won.length
    const totalValue = Object.values(pipeline).flat().reduce((s, c) => s + (c.deal_value || 0), 0)
    const wonValue = pipeline.won.reduce((s, c) => s + (c.deal_value || 0), 0)
    const avgDealSize = wonDeals > 0 ? Math.round(wonValue / wonDeals) : 0
    const conversionRate = totalDeals > 0 ? Math.round((wonDeals / totalDeals) * 100) : 0
    return { totalDeals, wonDeals, totalValue, wonValue, avgDealSize, conversionRate }
  }, [pipeline])

  // ── Handlers ──
  const openEdit = (c: Contact) => { setSelected(c); setEditForm({ ...c }); setShowEdit(true) }
  const saveEdit = async () => {
    if (!selected) return
    try {
      const data = await apiFetch(`/crm/contacts/${selected.id}`, { method: 'PATCH', body: JSON.stringify(editForm) })
      if (data.ok) { toast('Contact mis à jour'); setShowEdit(false); fetchContacts() }
      else toast(data.error || 'Erreur', 'error')
    } catch { toast('Erreur réseau', 'error') }
  }
  const deleteContact = async (id: number) => {
    if (!confirm('Supprimer ce contact ?')) return
    try {
      const data = await apiFetch(`/crm/contacts/${id}`, { method: 'DELETE' })
      if (data.ok) { toast('Supprimé'); fetchContacts() }
    } catch { toast('Erreur', 'error') }
  }
  const toggleAutoRule = (id: string) => {
    setAutoRules(rs => rs.map(r => r.id === id ? { ...r, active: !r.active } : r))
    toast('Règle mise à jour')
  }

  return (
    <div style={{ padding: '16px 20px', maxWidth: 1500, margin: '0 auto' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', margin: 0, fontFamily: 'var(--ff)' }}>
            📇 CRM R3STO
          </h1>
          <p style={{ fontSize: 11, color: 'var(--t3)', margin: '2px 0 0', fontFamily: 'var(--ff)' }}>
            {total.toLocaleString()} contacts · Pipeline {pipelineMetrics.conversionRate}% conversion · {pipelineMetrics.wonValue.toLocaleString()} CHF gagnés
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {([
            ['pipeline', '🔀 Pipeline'],
            ['list', '📋 Liste'],
            ['activities', '📅 Activités'],
            ['automation', '⚡ Automation'],
            ['stats', '📊 Stats'],
          ] as [TabView, string][]).map(([k, label]) => (
            <button key={k} style={filterChip(tab === k)} onClick={() => setTab(k)}>{label}</button>
          ))}
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={stat}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--bl)' }}>{stats?.total?.toLocaleString() || '—'}</div>
          <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 600 }}>CONTACTS</div>
        </div>
        <div style={stat}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#7c3aed' }}>{pipelineMetrics.totalDeals}</div>
          <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 600 }}>DEALS ACTIFS</div>
        </div>
        <div style={stat}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--gn)' }}>{pipelineMetrics.wonDeals}</div>
          <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 600 }}>GAGNÉS</div>
        </div>
        <div style={stat}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--am)' }}>{pipelineMetrics.avgDealSize.toLocaleString()} CHF</div>
          <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 600 }}>DEAL MOYEN/AN</div>
        </div>
        <div style={stat}>
          <div style={{ fontSize: 22, fontWeight: 800, color: pipelineMetrics.conversionRate >= 20 ? 'var(--gn)' : 'var(--am)' }}>
            {pipelineMetrics.conversionRate}%
          </div>
          <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 600 }}>CONVERSION</div>
        </div>
        <div style={stat}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--gn)' }}>{pipelineMetrics.totalValue.toLocaleString()} CHF</div>
          <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 600 }}>VALEUR PIPELINE</div>
        </div>
      </div>

      {/* ── Tab Content ── */}
      {tab === 'pipeline' && <PipelineView pipeline={pipeline} onSelect={openEdit} />}
      {tab === 'list' && (
        <ListView
          contacts={contacts} loading={loading} total={total}
          page={page} setPage={setPage} totalPages={totalPages}
          search={search} setSearch={setSearch}
          filterCanton={filterCanton} setFilterCanton={setFilterCanton}
          filterStatus={filterStatus} setFilterStatus={setFilterStatus}
          filterSource={filterSource} setFilterSource={setFilterSource}
          sources={sources} openEdit={openEdit} deleteContact={deleteContact}
        />
      )}
      {tab === 'activities' && <ActivitiesView activities={activities} onAdd={() => setShowAddActivity(true)} />}
      {tab === 'automation' && <AutomationView rules={autoRules} onToggle={toggleAutoRule} />}
      {tab === 'stats' && stats && <StatsView stats={stats} />}

      {/* ── Edit Modal ── */}
      {showEdit && selected && (
        <ContactModal
          contact={selected} editForm={editForm} setEditForm={setEditForm}
          onSave={saveEdit} onClose={() => setShowEdit(false)}
          activities={activities.filter(a => a.contactId === selected.id)}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════
//  Pipeline View — Kanban-style
// ═══════════════════════════════════════════════════
function PipelineView({ pipeline, onSelect }: { pipeline: Record<PipelineStage, Contact[]>; onSelect: (c: Contact) => void }) {
  return (
    <div style={{
      display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8,
      scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent',
    }}>
      {PIPELINE_STAGES.map(stage => {
        const items = pipeline[stage.key]
        const stageValue = items.reduce((s, c) => s + (c.deal_value || 0), 0)
        return (
          <div key={stage.key} style={{
            flex: '0 0 210px', minWidth: 210,
            background: 'var(--surf)', border: '1px solid var(--border)',
            borderRadius: RADIUS.md, display: 'flex', flexDirection: 'column',
            maxHeight: 'calc(100vh - 280px)',
          }}>
            {/* Column header */}
            <div style={{
              padding: '10px 10px 8px', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14 }}>{stage.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--ff)' }}>{stage.label}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{
                  fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 8,
                  background: stage.color, color: '#fff', minWidth: 18, textAlign: 'center',
                }}>{items.length}</span>
              </div>
            </div>
            {/* Value bar */}
            {stageValue > 0 && (
              <div style={{ padding: '4px 10px', fontSize: 9, fontWeight: 700, color: stage.color, fontFamily: 'var(--fm)', borderBottom: '1px solid var(--border)' }}>
                {stageValue.toLocaleString()} CHF/an
              </div>
            )}
            {/* Cards */}
            <div style={{
              flex: 1, overflowY: 'auto', padding: 6, display: 'flex', flexDirection: 'column', gap: 4,
              scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent',
            }}>
              {items.slice(0, 20).map(c => {
                const score = c.score ?? computeScore(c)
                return (
                  <div key={c.id} onClick={() => onSelect(c)} style={{
                    padding: '8px 9px', borderRadius: 6,
                    background: 'var(--bg2)', border: '1px solid var(--border)',
                    cursor: 'pointer', transition: 'border-color .12s',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = stage.color)}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.company || [c.first_name, c.last_name].filter(Boolean).join(' ') || '—'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                      <span style={{ fontSize: 9, color: 'var(--t3)' }}>{c.city || c.canton || '—'}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {c.deal_value && (
                          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--gn)', fontFamily: 'var(--fm)' }}>
                            {c.deal_value} CHF
                          </span>
                        )}
                        <span style={{
                          fontSize: 8, fontWeight: 800, padding: '1px 4px', borderRadius: 4,
                          background: scoreBg(score), color: scoreColor(score),
                        }}>{score}</span>
                      </div>
                    </div>
                    {c.couverts && (
                      <div style={{ fontSize: 9, color: 'var(--t4)', marginTop: 2 }}>
                        {c.couverts} couverts · {c.type_cuisine || '—'}
                      </div>
                    )}
                  </div>
                )
              })}
              {items.length > 20 && (
                <div style={{ fontSize: 10, color: 'var(--t4)', textAlign: 'center', padding: 4 }}>
                  +{items.length - 20} autres
                </div>
              )}
              {items.length === 0 && (
                <div style={{ fontSize: 10, color: 'var(--t4)', textAlign: 'center', padding: 16 }}>
                  Aucun deal
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ═══════════════════════════════════════════════════
//  List View — Table avec scoring
// ═══════════════════════════════════════════════════
function ListView({ contacts, loading, total, page, setPage, totalPages, search, setSearch, filterCanton, setFilterCanton, filterStatus, setFilterStatus, filterSource, setFilterSource, sources, openEdit, deleteContact }: {
  contacts: Contact[]; loading: boolean; total: number; page: number; setPage: (p: number | ((p: number) => number)) => void; totalPages: number
  search: string; setSearch: (s: string) => void
  filterCanton: string; setFilterCanton: (s: string) => void
  filterStatus: string; setFilterStatus: (s: string) => void
  filterSource: string; setFilterSource: (s: string) => void
  sources: string[]; openEdit: (c: Contact) => void; deleteContact: (id: number) => void
}) {
  return (
    <>
      {/* Filters */}
      <div style={{ ...card, marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher nom, email, ville, entreprise..."
          style={{ ...inputStyle, flex: '2 1 250px', minWidth: 200 }} />
        <select value={filterCanton} onChange={e => { setFilterCanton(e.target.value); setPage(0) }}
          style={{ ...inputStyle, flex: '0 1 100px', minWidth: 80 }}>
          <option value="">Canton</option>
          {CANTONS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(0) }}
          style={{ ...inputStyle, flex: '0 1 120px', minWidth: 100 }}>
          <option value="">Statut</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterSource} onChange={e => { setFilterSource(e.target.value); setPage(0) }}
          style={{ ...inputStyle, flex: '0 1 120px', minWidth: 100 }}>
          <option value="">Source</option>
          {sources.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {(filterCanton || filterStatus || filterSource || search) && (
          <button onClick={() => { setSearch(''); setFilterCanton(''); setFilterStatus(''); setFilterSource(''); setPage(0) }}
            style={{ ...btnS, fontSize: 11, padding: '6px 10px' }}>✕ Reset</button>
        )}
      </div>

      {/* Table */}
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'var(--ff)' }}>
            <thead>
              <tr style={{ background: 'var(--surf3)', borderBottom: '1.5px solid var(--border)' }}>
                {['Score','Entreprise','Contact','Email','Tel','Ville','Canton','Source','Statut',''].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--t4)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={10} style={{ padding: 40, textAlign: 'center', color: 'var(--t3)' }}>Chargement...</td></tr>}
              {!loading && contacts.length === 0 && <tr><td colSpan={10} style={{ padding: 40, textAlign: 'center', color: 'var(--t4)' }}>Aucun contact</td></tr>}
              {!loading && contacts.map(c => {
                const score = computeScore(c)
                return (
                  <tr key={c.id} onClick={() => openEdit(c)} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background .1s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surf3)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '8px 10px' }}>
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 28, height: 20, borderRadius: 4, fontSize: 10, fontWeight: 800,
                        background: scoreBg(score), color: scoreColor(score), fontFamily: 'var(--fm)',
                      }}>{score}</div>
                    </td>
                    <td style={{ padding: '8px 10px', fontWeight: 700, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.company || '—'}</td>
                    <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>{[c.first_name, c.last_name].filter(Boolean).join(' ') || '—'}</td>
                    <td style={{ padding: '8px 10px', color: c.email ? 'var(--bl)' : 'var(--t4)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email || '—'}</td>
                    <td style={{ padding: '8px 10px', fontFamily: 'var(--fm)', fontSize: 10, whiteSpace: 'nowrap' }}>{c.phone || '—'}</td>
                    <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>{c.city || '—'}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 700 }}>
                      {c.canton ? <span style={{ padding: '2px 6px', borderRadius: 4, background: 'var(--bp)', color: 'var(--bl)', fontSize: 10, fontWeight: 800 }}>{c.canton}</span> : '—'}
                    </td>
                    <td style={{ padding: '8px 10px', fontSize: 10, color: 'var(--t3)' }}>{c.source}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700,
                        background: c.status === 'Client' ? 'var(--gp)' : c.status === 'Prospect' ? 'var(--bp)' : 'var(--surf3)',
                        color: c.status === 'Client' ? 'var(--gn)' : c.status === 'Prospect' ? 'var(--bl)' : 'var(--t3)',
                      }}>{c.status}</span>
                    </td>
                    <td style={{ padding: '8px 6px' }}>
                      <button onClick={e => { e.stopPropagation(); deleteContact(c.id) }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--t4)', padding: 2 }} title="Supprimer">🗑</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderTop: '1px solid var(--border)', fontSize: 11 }}>
            <span style={{ color: 'var(--t3)' }}>{(page * PAGE_SIZE + 1)}–{Math.min((page + 1) * PAGE_SIZE, total)} sur {total.toLocaleString()}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)} style={{ ...btnS, padding: '4px 10px', opacity: page === 0 ? 0.4 : 1 }}>← Préc.</button>
              <span style={{ padding: '4px 8px', fontSize: 10, fontFamily: 'var(--fm)', color: 'var(--t2)' }}>{page + 1}/{totalPages}</span>
              <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} style={{ ...btnS, padding: '4px 10px', opacity: page >= totalPages - 1 ? 0.4 : 1 }}>Suiv. →</button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════
//  Activities View — Timeline
// ═══════════════════════════════════════════════════
function ActivitiesView({ activities, onAdd }: { activities: Activity[]; onAdd: () => void }) {
  const typeConfig: Record<string, { icon: string; color: string; label: string }> = {
    call: { icon: '📞', color: 'var(--bl)', label: 'Appel' },
    email: { icon: '📧', color: '#7c3aed', label: 'Email' },
    meeting: { icon: '🤝', color: 'var(--gn)', label: 'RDV' },
    note: { icon: '📝', color: 'var(--t3)', label: 'Note' },
    demo: { icon: '🎯', color: 'var(--am)', label: 'Démo' },
    proposal: { icon: '📄', color: '#e8a530', label: 'Proposition' },
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={sectionTitle}>Activités récentes</div>
        <button style={btnP} onClick={onAdd}>+ Nouvelle activité</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {activities.map(a => {
          const cfg = typeConfig[a.type] || typeConfig.note
          const d = new Date(a.date)
          const ago = Math.round((Date.now() - d.getTime()) / 86400000)
          const agoLabel = ago === 0 ? "Aujourd'hui" : ago === 1 ? 'Hier' : `Il y a ${ago}j`
          return (
            <div key={a.id} style={{
              ...card, display: 'flex', gap: 12, alignItems: 'flex-start',
              borderLeft: `3px solid ${cfg.color}`,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: cfg.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, flexShrink: 0,
              }}>{cfg.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{a.contactName}</span>
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                    background: cfg.color + '18', color: cfg.color,
                  }}>{cfg.label}</span>
                  <span style={{ fontSize: 9, color: 'var(--t4)', marginLeft: 'auto', flexShrink: 0 }}>{agoLabel}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--t2)', lineHeight: 1.4 }}>{a.description}</div>
                {a.outcome && (
                  <div style={{ fontSize: 10, color: 'var(--gn)', fontWeight: 600, marginTop: 3 }}>→ {a.outcome}</div>
                )}
                <div style={{ fontSize: 9, color: 'var(--t4)', marginTop: 3 }}>Assigné à {a.assignedTo}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════
//  Automation View
// ═══════════════════════════════════════════════════
function AutomationView({ rules, onToggle }: { rules: AutoRule[]; onToggle: (id: string) => void }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <div style={sectionTitle}>Règles d'automation</div>
          <p style={{ fontSize: 11, color: 'var(--t3)', margin: '2px 0 0' }}>
            Automatisez le pipeline, les relances et l'onboarding
          </p>
        </div>
        <button style={btnP}>+ Nouvelle règle</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {rules.map(r => (
          <div key={r.id} style={{
            ...card, display: 'flex', alignItems: 'center', gap: 12,
            opacity: r.active ? 1 : 0.6,
          }}>
            <button onClick={() => onToggle(r.id)} style={{
              width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
              background: r.active ? 'var(--gn)' : 'var(--border)',
              position: 'relative', transition: 'background .2s', flexShrink: 0,
            }}>
              <div style={{
                width: 16, height: 16, borderRadius: '50%', background: '#fff',
                position: 'absolute', top: 2,
                left: r.active ? 18 : 2, transition: 'left .2s',
              }} />
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{r.name}</div>
              <div style={{ fontSize: 10, color: 'var(--t3)' }}>
                <span style={{ fontWeight: 600 }}>SI</span> {r.trigger} <span style={{ fontWeight: 600, marginLeft: 6 }}>→</span> {r.action}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--bl)', fontFamily: 'var(--fm)' }}>{r.executions}</div>
              <div style={{ fontSize: 8, color: 'var(--t4)', fontWeight: 600 }}>EXÉCUTIONS</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════
//  Stats View
// ═══════════════════════════════════════════════════
function StatsView({ stats }: { stats: Stats }) {
  const barStyle = (pct: number, color: string): React.CSSProperties => ({
    height: 18, borderRadius: 3, background: color, width: `${Math.max(pct, 2)}%`, transition: 'width .3s',
  })
  const maxCanton = Math.max(...Object.values(stats.byCanton || {}), 1)
  const maxStatus = Math.max(...Object.values(stats.byStatus || {}), 1)
  const maxSource = Math.max(...Object.values(stats.bySource || {}), 1)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 14 }}>
      <div style={card}>
        <div style={sectionTitle}>Par canton</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 400, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}>
          {Object.entries(stats.byCanton || {}).sort((a, b) => b[1] - a[1]).map(([canton, count]) => (
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
      <div style={card}>
        <div style={sectionTitle}>Par statut</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {Object.entries(stats.byStatus || {}).sort((a, b) => b[1] - a[1]).map(([status, count]) => (
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
      <div style={card}>
        <div style={sectionTitle}>Par source</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {Object.entries(stats.bySource || {}).sort((a, b) => b[1] - a[1]).map(([source, count]) => (
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

// ═══════════════════════════════════════════════════
//  Contact Modal — Fiche complète
// ═══════════════════════════════════════════════════
function ContactModal({ contact, editForm, setEditForm, onSave, onClose, activities }: {
  contact: Contact; editForm: Partial<Contact>; setEditForm: (f: any) => void
  onSave: () => void; onClose: () => void; activities: Activity[]
}) {
  const score = computeScore(contact)
  const [activeTab, setActiveTab] = useState<'info' | 'activity' | 'notes'>('info')

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: 'var(--surf)', borderRadius: RADIUS.lg, padding: 0,
        width: '100%', maxWidth: 720, maxHeight: '90vh', overflow: 'hidden',
        border: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: 'var(--text)', fontFamily: 'var(--ff)' }}>
                {contact.company || [contact.first_name, contact.last_name].filter(Boolean).join(' ') || 'Contact'}
              </h2>
              <span style={{
                fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 6,
                background: scoreBg(score), color: scoreColor(score),
              }}>Score {score}/100</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--t3)' }}>
              {[contact.city, contact.canton, contact.couverts && `${contact.couverts} couverts`].filter(Boolean).join(' · ')}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--t3)' }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)' }}>
          {(['info', 'activity', 'notes'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={{
              padding: '8px 16px', fontSize: 11, fontWeight: 700, fontFamily: 'var(--ff)',
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: activeTab === t ? 'var(--bl)' : 'var(--t3)',
              borderBottom: activeTab === t ? '2px solid var(--bl)' : '2px solid transparent',
            }}>
              {t === 'info' ? 'Informations' : t === 'activity' ? 'Activités' : 'Notes'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: 20,
          scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent',
        }}>
          {activeTab === 'info' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {([
                ['company', 'Entreprise'], ['raison_sociale', 'Raison sociale'],
                ['first_name', 'Prénom'], ['last_name', 'Nom'],
                ['email', 'Email'], ['phone', 'Téléphone'],
                ['address', 'Adresse'], ['postal_code', 'NPA'],
                ['city', 'Ville'], ['canton', 'Canton'],
                ['country', 'Pays'], ['website', 'Site web'],
                ['couverts', 'Couverts'], ['type_cuisine', 'Type cuisine'],
                ['concurrence', 'Concurrence'], ['source', 'Source'],
                ['status', 'Statut'],
              ] as [string, string][]).map(([key, label]) => (
                <div key={key} style={key === 'address' ? { gridColumn: '1 / -1' } : {}}>
                  <label style={labelStyle}>{label}</label>
                  {key === 'canton' ? (
                    <select value={(editForm as any)[key] || ''} onChange={e => setEditForm((f: any) => ({ ...f, [key]: e.target.value || null }))} style={inputStyle}>
                      <option value="">—</option>
                      {CANTONS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  ) : key === 'status' ? (
                    <select value={(editForm as any)[key] || ''} onChange={e => setEditForm((f: any) => ({ ...f, [key]: e.target.value }))} style={inputStyle}>
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : (
                    <input value={(editForm as any)[key] || ''} onChange={e => setEditForm((f: any) => ({ ...f, [key]: e.target.value || null }))} style={inputStyle} />
                  )}
                </div>
              ))}
            </div>
          )}
          {activeTab === 'activity' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activities.length > 0 ? activities.map(a => (
                <div key={a.id} style={{ padding: '8px 10px', background: 'var(--bg2)', borderRadius: 6, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>{a.description}</div>
                  {a.outcome && <div style={{ fontSize: 10, color: 'var(--gn)', marginTop: 2 }}>→ {a.outcome}</div>}
                  <div style={{ fontSize: 9, color: 'var(--t4)', marginTop: 2 }}>{new Date(a.date).toLocaleDateString('fr-CH')} · {a.assignedTo}</div>
                </div>
              )) : (
                <div style={{ textAlign: 'center', padding: 30, color: 'var(--t4)', fontSize: 12 }}>Aucune activité enregistrée</div>
              )}
            </div>
          )}
          {activeTab === 'notes' && (
            <div>
              <label style={labelStyle}>Notes</label>
              <textarea
                value={editForm.notes || ''} rows={8}
                onChange={e => setEditForm((f: any) => ({ ...f, notes: e.target.value || null }))}
                style={{ ...inputStyle, resize: 'vertical', minHeight: 160 }}
                placeholder="Notes sur le contact, historique, préférences..."
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
          <button style={btnS} onClick={onClose}>Annuler</button>
          <button style={btnP} onClick={onSave}>Enregistrer</button>
        </div>
      </div>
    </div>
  )
}
