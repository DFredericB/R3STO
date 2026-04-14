import { useState, useMemo } from 'react'
import { useT } from '../../i18n/useTranslation'
import { useToast } from '../../components/ui/Toast'
import { useAppStore } from '../../store/useAppStore'
import { filterChip, STATUS } from '../../utils/design'

type TabType = 'resas' | 'journal'

export function Historique() {
  useT()
  const { toast } = useToast()

  // Read real data from store
  const resas = useAppStore(s => s.resas)

  const [activeTab, setActiveTab] = useState<TabType>('resas')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  // Filter and sort resas by date desc, then time desc
  const filteredAndSortedResas = useMemo(() => {
    let result = [...resas]

    // Apply search filter (by client name)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(r => r.n && r.n.toLowerCase().includes(query))
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      result = result.filter(r => r.s === filterStatus)
    }

    // Apply date range filter
    if (dateFrom) {
      result = result.filter(r => r.date >= dateFrom)
    }
    if (dateTo) {
      result = result.filter(r => r.date <= dateTo)
    }

    // Sort by date desc, then time desc
    result.sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date)
      return (b.t || '').localeCompare(a.t || '')
    })

    return result
  }, [resas, searchQuery, filterStatus, dateFrom, dateTo])

  // Pagination for resas tab
  const totalPages = Math.ceil(filteredAndSortedResas.length / itemsPerPage)
  const paginatedResas = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredAndSortedResas.slice(start, start + itemsPerPage)
  }, [filteredAndSortedResas, currentPage])

  // Reset to page 1 when filters change
  const handleFilterChange = (callback: () => void) => {
    setCurrentPage(1)
    callback()
  }

  // Calculate stats from real data
  const totalResas = filteredAndSortedResas.length
  const totalCovers = filteredAndSortedResas.reduce((sum, r) => sum + (r.c || 0), 0)
  const cancelledCount = filteredAndSortedResas.filter(r => r.s === 'cancelled').length
  const noshowCount = filteredAndSortedResas.filter(r => r.s === 'noshow').length

  // Generate journal from resas data
  const journalEntries = useMemo(() => {
    const entries = resas.map(r => {
      const date = new Date(r.date)
      const createdDate = new Date(r.createdAt * 1000)
      const ts = `${String(createdDate.getDate()).padStart(2, '0')}/${String(createdDate.getMonth() + 1).padStart(2, '0')} ${String(createdDate.getHours()).padStart(2, '0')}:${String(createdDate.getMinutes()).padStart(2, '0')}`

      let actionType = 'create'
      let actionLabel = 'Réservation créée'
      let icon = '✓'

      if (r.s === 'cancelled') {
        actionType = 'cancel'
        actionLabel = 'Réservation annulée'
        icon = '✕'
      } else if (r.s === 'noshow') {
        actionType = 'noshow'
        actionLabel = 'No-show marqué'
        icon = '⚠'
      } else if (r.s === 'arrived') {
        actionType = 'arrive'
        actionLabel = 'Arrivée confirmée'
        icon = '→'
      } else if (r.s === 'done') {
        actionType = 'done'
        actionLabel = 'Service terminé'
        icon = '⏱'
      }

      return {
        id: r.id,
        ts,
        icon,
        action: actionLabel,
        detail: `${r.n || ''} · ${r.c}p`,
        user: r.prisPar || 'Système',
        role: 'Utilisateur',
        type: actionType as string,
        createdAt: r.createdAt,
      }
    })

    // Sort by createdAt desc
    entries.sort((a, b) => b.createdAt - a.createdAt)
    return entries
  }, [resas])

  // Journal stats
  const journalStats = {
    total: journalEntries.length,
    creates: journalEntries.filter(h => h.type === 'create').length,
    cancels: journalEntries.filter(h => h.type === 'cancel').length,
    noshows: journalEntries.filter(h => h.type === 'noshow').length,
  }

  // Pagination for journal tab
  const journalTotalPages = Math.ceil(journalEntries.length / itemsPerPage)
  const paginatedJournal = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return journalEntries.slice(start, start + itemsPerPage)
  }, [journalEntries, currentPage])

  // Source unique : design.ts STATUS (même couleur/label que Resas, Grille, Journal…)
  const statusColors: Record<string, string> = Object.fromEntries(
    Object.entries(STATUS).map(([k, v]) => [k, v.color])
  )

  // Labels FR uniformes (fallback local si la clé i18n n'est pas résolvable
  // depuis une Record plate). Mapping explicite pour éviter toute divergence.
  const statusLabels: Record<string, string> = {
    reserved: 'Réservé',
    arrived: 'Arrivé',
    noshow: 'No-show',
    cancelled: 'Annulé',
    done: 'Terminé',
    waitlist: 'Liste d\'attente',
  }

  const typeColorsMap: Record<string, string> = {
    create: 'var(--gn)',
    cancel: 'var(--rd)',
    arrive: 'var(--gn)',
    done: 'var(--t4)',
    noshow: 'var(--am)',
    edit: 'var(--bl)',
    block: 'var(--am)',
    close: 'var(--t3)',
  }

  // CSV Export function
  const handleExportCSV = () => {
    const headers = ['Date', 'Heure', 'Client', 'Couverts', 'Table', 'Service', 'Statut']
    const rows = filteredAndSortedResas.map(r => [
      r.date,
      (r.t || '').replace('h', ':'),
      r.n || '',
      r.c.toString(),
      r.tbl || '',
      r.svc || '',
      statusLabels[r.s] || r.s,
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `historique_resas_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast('Export CSV téléchargé', 'success')
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
            onChange={e => handleFilterChange(() => setSearchQuery(e.target.value))}
            style={{
              fontSize: 11, padding: '4px 10px', borderRadius: 5,
              border: '1px solid var(--border)', background: 'var(--surf2)',
              color: 'var(--text)', width: 140,
            }}
          />
          <select
            value={filterStatus}
            onChange={e => handleFilterChange(() => setFilterStatus(e.target.value))}
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
            onClick={handleExportCSV}
            style={{
              fontSize: 11, padding: '4px 10px', borderRadius: 5,
              border: '1px solid var(--border)', background: 'var(--surf2)',
              color: 'var(--text)', fontWeight: 700, cursor: 'pointer',
            }}
          >
            📊 Exporter
          </button>
        </div>

        {/* Date Range Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: 'var(--t3)' }}>
            Du:
            <input
              type="date"
              value={dateFrom}
              onChange={e => handleFilterChange(() => setDateFrom(e.target.value))}
              style={{
                fontSize: 11, padding: '4px 8px', borderRadius: 5, marginLeft: 6,
                border: '1px solid var(--border)', background: 'var(--surf2)',
                color: 'var(--text)',
              }}
            />
          </label>
          <label style={{ fontSize: 11, color: 'var(--t3)' }}>
            Au:
            <input
              type="date"
              value={dateTo}
              onChange={e => handleFilterChange(() => setDateTo(e.target.value))}
              style={{
                fontSize: 11, padding: '4px 8px', borderRadius: 5, marginLeft: 6,
                border: '1px solid var(--border)', background: 'var(--surf2)',
                color: 'var(--text)',
              }}
            />
          </label>
          {(dateFrom || dateTo) && (
            <button
              onClick={() => {
                handleFilterChange(() => {
                  setDateFrom('')
                  setDateTo('')
                })
              }}
              style={{
                fontSize: 11, padding: '4px 8px', borderRadius: 5,
                border: '1px solid var(--border)', background: 'var(--surf2)',
                color: 'var(--t3)', cursor: 'pointer',
              }}
            >
              Effacer dates
            </button>
          )}
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: 6, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
          <button onClick={() => setActiveTab('resas')} style={filterChip(activeTab === 'resas')}>
            📋 Toutes les réservations <span style={{ fontSize: 11, opacity: 0.7 }}>({totalResas})</span>
          </button>
          <button onClick={() => setActiveTab('journal')} style={filterChip(activeTab === 'journal')}>
            📜 Journal d'actions <span style={{ fontSize: 11, opacity: 0.7 }}>({journalStats.total})</span>
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
                  {paginatedResas.length > 0 ? (
                    paginatedResas.map(r => (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--border)', fontSize: 11, cursor: 'pointer' }}>
                        <td style={{ padding: '7px 10px', fontFamily: 'var(--fm)', fontSize: 11, color: 'var(--t3)' }}>
                          {r.date}
                        </td>
                        <td style={{ padding: '7px 10px', fontFamily: 'var(--fm)', fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>
                          {(r.t || '').replace('h', ':')}
                        </td>
                        <td style={{ padding: '7px 10px', fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
                          {r.n || ''}
                        </td>
                        <td style={{ padding: '7px 10px', fontFamily: 'var(--fm)', fontSize: 11, color: 'var(--text)' }}>
                          {r.c}p
                        </td>
                        <td style={{ padding: '7px 10px', fontSize: 11, color: 'var(--t2)' }}>
                          {r.tbl || ''}
                        </td>
                        <td style={{ padding: '7px 10px', fontSize: 11, color: 'var(--t2)' }}>
                          {r.svc || ''}
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
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} style={{ padding: '20px', textAlign: 'center', color: 'var(--t3)', fontSize: 12 }}>
                        Aucune réservation trouvée
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, padding: '12px 18px' }}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{
                    fontSize: 11, padding: '4px 10px', borderRadius: 5,
                    border: '1px solid var(--border)', background: 'var(--surf2)',
                    color: currentPage === 1 ? 'var(--t3)' : 'var(--text)',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    opacity: currentPage === 1 ? 0.5 : 1,
                  }}
                >
                  ← Précédent
                </button>
                <span style={{ fontSize: 11, color: 'var(--t3)' }}>
                  Page {currentPage} sur {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    fontSize: 11, padding: '4px 10px', borderRadius: 5,
                    border: '1px solid var(--border)', background: 'var(--surf2)',
                    color: currentPage === totalPages ? 'var(--t3)' : 'var(--text)',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    opacity: currentPage === totalPages ? 0.5 : 1,
                  }}
                >
                  Suivant →
                </button>
              </div>
            )}
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
                  {paginatedJournal.length > 0 ? (
                    paginatedJournal.map(h => (
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
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: 'var(--t3)', fontSize: 12 }}>
                        Aucune action trouvée
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {journalTotalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, padding: '12px 18px' }}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{
                    fontSize: 11, padding: '4px 10px', borderRadius: 5,
                    border: '1px solid var(--border)', background: 'var(--surf2)',
                    color: currentPage === 1 ? 'var(--t3)' : 'var(--text)',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    opacity: currentPage === 1 ? 0.5 : 1,
                  }}
                >
                  ← Précédent
                </button>
                <span style={{ fontSize: 11, color: 'var(--t3)' }}>
                  Page {currentPage} sur {journalTotalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(journalTotalPages, p + 1))}
                  disabled={currentPage === journalTotalPages}
                  style={{
                    fontSize: 11, padding: '4px 10px', borderRadius: 5,
                    border: '1px solid var(--border)', background: 'var(--surf2)',
                    color: currentPage === journalTotalPages ? 'var(--t3)' : 'var(--text)',
                    cursor: currentPage === journalTotalPages ? 'not-allowed' : 'pointer',
                    opacity: currentPage === journalTotalPages ? 0.5 : 1,
                  }}
                >
                  Suivant →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
