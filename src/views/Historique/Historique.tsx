import { useState, useMemo } from 'react'
import { useT } from '../../i18n/useTranslation'
import { useToast } from '../../components/ui/Toast'

type TabType = 'resas' | 'journal'

// Demo data
const DEMO_RESAS = [
  { id: '1', date: '2026-03-25', t: '19h30', n: 'Martin Dupont', c: 4, tbl: 'T12,T13', svc: 'Dîner', s: 'reserved' as const },
  { id: '2', date: '2026-03-25', t: '20h00', n: 'Sophie Lefevre', c: 2, tbl: 'T05', svc: 'Dîner', s: 'arrived' as const },
  { id: '3', date: '2026-03-25', t: '19h00', n: 'Jean Moreau', c: 6, tbl: 'T20,T21', svc: 'Dîner', s: 'cancelled' as const },
  { id: '4', date: '2026-03-24', t: '20h30', n: 'Marie Rousseau', c: 3, tbl: 'T08', svc: 'Dîner', s: 'noshow' as const },
  { id: '5', date: '2026-03-24', t: '19h00', n: 'Pierre Martin', c: 5, tbl: 'T15', svc: 'Dîner', s: 'done' as const },
  { id: '6', date: '2026-03-24', t: '12h30', n: 'Isabelle Dubois', c: 2, tbl: 'T03', svc: 'Déjeuner', s: 'arrived' as const },
  { id: '7', date: '2026-03-23', t: '20h00', n: 'Laurent Bonnet', c: 4, tbl: 'T14', svc: 'Dîner', s: 'done' as const },
]

const DEMO_HISTORIQUE = [
  { id: 'h1', ts: '25/03 20:45', icon: '✓', action: 'Réservation créée', detail: 'Sophie Lefevre · 2p', user: 'Emma Lefevre', role: 'Hôtesse', type: 'create' },
  { id: 'h2', ts: '25/03 20:30', icon: '✏️', action: 'Modification table', detail: 'Martin Dupont · Table 12 → 12+13', user: 'Louis Petit', role: 'Manager', type: 'edit' },
  { id: 'h3', ts: '25/03 19:00', icon: '✕', action: 'Réservation annulée', detail: 'Jean Moreau · 6 couverts', user: 'Emma Lefevre', role: 'Hôtesse', type: 'cancel' },
  { id: 'h4', ts: '24/03 21:15', icon: '⚠', action: 'No-show marqué', detail: 'Marie Rousseau · Dîner 20h30', user: 'Système', role: 'Auto', type: 'noshow' },
  { id: 'h5', ts: '24/03 19:05', icon: '→', action: 'Arrivée confirmée', detail: 'Pierre Martin · Dîner 19h00', user: 'Emma Lefevre', role: 'Hôtesse', type: 'arrive' },
  { id: 'h6', ts: '24/03 12:45', icon: '✓', action: 'Réservation créée', detail: 'Isabelle Dubois · 2p', user: 'Louis Petit', role: 'Manager', type: 'create' },
  { id: 'h7', ts: '23/03 21:00', icon: '⏱', action: 'Passage fermeture', detail: 'Service Dîner fermé', user: 'Système', role: 'Auto', type: 'close' },
]

export function Historique() {
  useT()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<TabType>('resas')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Sort resas by date desc, then time desc
  const sortedResas = useMemo(() => {
    const sorted = [...DEMO_RESAS]
    sorted.sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date)
      return b.t.localeCompare(a.t)
    })
    return sorted
  }, [])

  // Calculate stats
  const totalResas = sortedResas.length
  const totalCovers = sortedResas.reduce((sum, r) => sum + (r.c || 0), 0)
  const cancelledCount = sortedResas.filter(r => r.s === 'cancelled').length
  const noshowCount = sortedResas.filter(r => r.s === 'noshow').length

  // Journal stats
  const journalStats = {
    total: DEMO_HISTORIQUE.length,
    creates: DEMO_HISTORIQUE.filter(h => h.type === 'create').length,
    cancels: DEMO_HISTORIQUE.filter(h => h.type === 'cancel').length,
    noshows: DEMO_HISTORIQUE.filter(h => h.type === 'noshow').length,
  }

  const statusColors: Record<string, string> = {
    reserved: 'var(--bl)',
    arrived: 'var(--gn)',
    noshow: 'var(--rd)',
    cancelled: 'var(--t3)',
    done: 'var(--t4)',
  }

  const statusLabels: Record<string, string> = {
    reserved: 'Réservé',
    arrived: 'Arrivé',
    noshow: 'No-show',
    cancelled: 'Annulé',
    done: 'Terminé',
  }

  const typeColorsMap: Record<string, string> = {
    create: 'var(--gn)',
    cancel: 'var(--rd)',
    arrive: 'var(--gn)',
    noshow: 'var(--am)',
    edit: 'var(--bl)',
    block: 'var(--am)',
    close: 'var(--t3)',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 18px 0', flexShrink: 0 }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)', marginBottom: 4 }}>
          Historique
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 13, color: 'var(--t3)' }}>
            Journal complet des réservations et actions système
          </span>
          <div style={{ flex: 1 }} />
          <input
            placeholder="🔍 Rechercher…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              fontSize: 11, padding: '4px 10px', borderRadius: 5,
              border: '1px solid var(--border)', background: 'var(--surf2)',
              color: 'var(--text)', width: 140,
            }}
          />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            style={{
              fontSize: 11, padding: '4px 8px', borderRadius: 5,
              border: '1px solid var(--border)', background: 'var(--surf2)',
              color: 'var(--text)',
            }}
          >
            <option value="all">Tous statuts</option>
            <option value="reserved">Réservé</option>
            <option value="arrived">Arrivé</option>
            <option value="done">Terminé</option>
            <option value="cancelled">Annulé</option>
            <option value="noshow">No-show</option>
          </select>
          <button
            onClick={() => toast('Export CSV téléchargé', 'success')}
            style={{
              fontSize: 11, padding: '4px 10px', borderRadius: 5,
              border: '1px solid var(--border)', background: 'var(--surf2)',
              color: 'var(--text)', fontWeight: 700, cursor: 'pointer',
            }}
          >
            📊 Exporter
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: 6, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
          <button
            onClick={() => setActiveTab('resas')}
            style={{
              padding: '6px 16px',
              borderRadius: 20,
              border: `1.5px solid ${activeTab === 'resas' ? 'var(--bl)' : 'var(--border)'}`,
              background: activeTab === 'resas' ? 'var(--bp)' : 'transparent',
              color: activeTab === 'resas' ? 'var(--bl)' : 'var(--t3)',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            📋 Toutes les réservations <span style={{ fontSize: 11, opacity: 0.7 }}>({DEMO_RESAS.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('journal')}
            style={{
              padding: '6px 16px',
              borderRadius: 20,
              border: `1.5px solid ${activeTab === 'journal' ? 'var(--bl)' : 'var(--border)'}`,
              background: activeTab === 'journal' ? 'var(--bp)' : 'transparent',
              color: activeTab === 'journal' ? 'var(--bl)' : 'var(--t3)',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            📜 Journal d'actions <span style={{ fontSize: 11, opacity: 0.7 }}>({DEMO_HISTORIQUE.length})</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 'resas' ? (
          <>
            {/* Resas KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, padding: '12px 18px 8px' }}>
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ fontSize: 11, color: 'var(--t3)' }}>Total réservations</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--fm)' }}>
                  {totalResas}
                </div>
              </div>
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ fontSize: 11, color: 'var(--t3)' }}>Couverts totaux</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--bl)', fontFamily: 'var(--fm)' }}>
                  {totalCovers}
                </div>
              </div>
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ fontSize: 11, color: 'var(--t3)' }}>Annulées</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--rd)', fontFamily: 'var(--fm)' }}>
                  {cancelledCount}
                </div>
              </div>
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ fontSize: 11, color: 'var(--t3)' }}>No-shows</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--am)', fontFamily: 'var(--fm)' }}>
                  {noshowCount}
                </div>
              </div>
            </div>

            {/* Resas Table */}
            <div style={{ padding: '0 18px 20px', overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: '640px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>Date</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>Heure</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>Client</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>Cvts</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>Table</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>Service</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedResas.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border)', fontSize: 11, cursor: 'pointer' }}>
                      <td style={{ padding: '7px 10px', fontFamily: 'var(--fm)', fontSize: 11, color: 'var(--t3)' }}>
                        {r.date}
                      </td>
                      <td style={{ padding: '7px 10px', fontFamily: 'var(--fm)', fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>
                        {r.t.replace('h', ':')}
                      </td>
                      <td style={{ padding: '7px 10px', fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
                        {r.n}
                      </td>
                      <td style={{ padding: '7px 10px', fontFamily: 'var(--fm)', fontSize: 11, color: 'var(--text)' }}>
                        {r.c}p
                      </td>
                      <td style={{ padding: '7px 10px', fontSize: 11, color: 'var(--t2)' }}>
                        {r.tbl}
                      </td>
                      <td style={{ padding: '7px 10px', fontSize: 11, color: 'var(--t2)' }}>
                        {r.svc}
                      </td>
                      <td style={{ padding: '7px 10px' }}>
                        <span
                          style={{
                            fontSize: 11,
                            padding: '2px 7px',
                            borderRadius: 5,
                            background: 'rgba(68,128,216,.08)',
                            color: statusColors[r.s] || 'var(--bl)',
                            fontWeight: 700,
                          }}
                        >
                          {statusLabels[r.s] || r.s}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <>
            {/* Journal KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, padding: '12px 18px 8px' }}>
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ fontSize: 11, color: 'var(--t3)' }}>Total actions</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--fm)' }}>
                  {journalStats.total}
                </div>
              </div>
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ fontSize: 11, color: 'var(--t3)' }}>Créations</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--gn)', fontFamily: 'var(--fm)' }}>
                  {journalStats.creates}
                </div>
              </div>
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ fontSize: 11, color: 'var(--t3)' }}>Annulations</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--rd)', fontFamily: 'var(--fm)' }}>
                  {journalStats.cancels}
                </div>
              </div>
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ fontSize: 11, color: 'var(--t3)' }}>No-shows</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--am)', fontFamily: 'var(--fm)' }}>
                  {journalStats.noshows}
                </div>
              </div>
            </div>

            {/* Journal Table */}
            <div style={{ padding: '0 18px 20px', overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>Horodatage</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>Action</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>Utilisateur</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {DEMO_HISTORIQUE.map(h => (
                    <tr key={h.id} style={{ borderBottom: '1px solid var(--border)', fontSize: 11 }}>
                      <td style={{ padding: '7px 10px', fontFamily: 'var(--fm)', fontSize: 11, color: 'var(--t3)', whiteSpace: 'nowrap' }}>
                        {h.ts}
                      </td>
                      <td style={{ padding: '7px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 14 }}>{h.icon}</span>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>
                              {h.action}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--t3)' }}>
                              {h.detail}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '7px 10px' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>
                          {h.user}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--t3)' }}>
                          {h.role}
                        </div>
                      </td>
                      <td style={{ padding: '7px 10px' }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontFamily: 'var(--fm)',
                            padding: '2px 7px',
                            borderRadius: 5,
                            background: 'rgba(68,128,216,.1)',
                            color: typeColorsMap[h.type] || 'var(--bl)',
                            border: `1px solid rgba(68,128,216,.2)`,
                          }}
                        >
                          {h.type}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
