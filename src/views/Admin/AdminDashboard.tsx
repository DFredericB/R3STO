// ══════════════════════════════════════════════════
//  R3STO — Tableau de bord Administrateur
//  KPIs, activité, health check, revenus, exports
// ══════════════════════════════════════════════════

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { RADIUS, sectionTitle } from '../../utils/design'
import { useToast } from '../../components/ui/Toast'



interface KPIData {
  mrr: number
  activeClients: number
  monthlyBookings: number
  noShowRate: number
  pipeline: number
}

interface ActivityLog {
  id: number
  action: string
  user: string
  timestamp: string
  status: 'success' | 'warning' | 'error'
}

interface SubdomainHealth {
  name: string
  status: 'online' | 'degraded' | 'offline'
  latency: number
  lastCheck: string
}

interface Restaurant {
  id: number
  name: string
  city: string
  plan: string
  mrr: number
  bookings: number
}

interface NewSignup {
  id: number
  restaurant: string
  plan: string
  date: string
  city: string
}

// Demo data
const DEMO_KPI: KPIData = {
  mrr: 28450,
  activeClients: 312,
  monthlyBookings: 4860,
  noShowRate: 8.2,
  pipeline: 45000,
}

const DEMO_ACTIVITY: ActivityLog[] = [
  { id: 1, action: 'Nouveau client : Le Bernardin', user: 'Didier', timestamp: '2026-04-12 14:32', status: 'success' },
  { id: 2, action: 'Upgrade Resto → Gastro', user: 'Auto', timestamp: '2026-04-12 12:15', status: 'success' },
  { id: 3, action: 'Alerte : no-show rate > 10%', user: 'System', timestamp: '2026-04-12 09:48', status: 'warning' },
  { id: 4, action: 'Export CSV : 842 réservations', user: 'Didier', timestamp: '2026-04-11 18:20', status: 'success' },
  { id: 5, action: 'API rate limit : api.r3sto.ch', user: 'System', timestamp: '2026-04-11 16:45', status: 'error' },
]

const DEMO_SUBDOMAINS: SubdomainHealth[] = [
  { name: 'api.r3sto.ch', status: 'online', latency: 42, lastCheck: '2026-04-12 15:28' },
  { name: 'auth.r3sto.ch', status: 'online', latency: 68, lastCheck: '2026-04-12 15:27' },
  { name: 'app.r3sto.ch', status: 'online', latency: 156, lastCheck: '2026-04-12 15:26' },
  { name: 'admin.r3sto.ch', status: 'online', latency: 78, lastCheck: '2026-04-12 15:27' },
  { name: 'booking.r3sto.ch', status: 'degraded', latency: 890, lastCheck: '2026-04-12 15:25' },
]

const DEMO_RESTAURANTS: Restaurant[] = [
  { id: 1, name: 'Aux Trois Glands', city: 'Zurich', plan: 'Gastro', mrr: 79, bookings: 1250 },
  { id: 2, name: 'Le Bernardin', city: 'Genève', plan: 'Gastro', mrr: 79, bookings: 980 },
  { id: 3, name: 'Fondue Tradition', city: 'Valais', plan: 'Resto', mrr: 59, bookings: 750 },
  { id: 4, name: 'Le Petit Café', city: 'Lausanne', plan: 'Bistro', mrr: 39, bookings: 620 },
  { id: 5, name: 'La Brasserie', city: 'Bâle', plan: 'Resto', mrr: 59, bookings: 540 },
]

const DEMO_REVENUE = [
  { month: 'Oct', amount: 24000 },
  { month: 'Nov', amount: 26500 },
  { month: 'Déc', amount: 31200 },
  { month: 'Jan', amount: 23800 },
  { month: 'Fév', amount: 27100 },
  { month: 'Mar', amount: 28450 },
]

const DEMO_SIGNUPS: NewSignup[] = [
  { id: 1, restaurant: 'Restaurant Le Nomade', plan: 'Gastro', date: '2026-04-12', city: 'Genève' },
  { id: 2, restaurant: 'Brasserie Au Coin', plan: 'Resto', date: '2026-04-11', city: 'Lausanne' },
  { id: 3, restaurant: 'Le Petit Bistreau', plan: 'Bistro', date: '2026-04-10', city: 'Neuchâtel' },
  { id: 4, restaurant: 'Auberge de Montagne', plan: 'Gastro', date: '2026-04-08', city: 'Valais' },
  { id: 5, restaurant: 'Café de la Gare', plan: 'Bistro', date: '2026-04-07', city: 'Bâle' },
]

// Styles
const cardS: React.CSSProperties = {
  background: 'var(--surf)',
  border: '1px solid var(--border)',
  borderRadius: RADIUS.md,
  padding: 14,
}

const kpiCard: React.CSSProperties = {
  ...cardS,
  flex: '1 1 160px',
  minWidth: 140,
  textAlign: 'center',
}

const btnPrimary: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: RADIUS.sm,
  background: 'var(--bl)',
  color: '#fff',
  border: 'none',
  fontWeight: 700,
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'var(--ff)',
}

const btnSecondary: React.CSSProperties = {
  ...btnPrimary,
  background: 'var(--surf3)',
  color: 'var(--t2)',
  border: '1px solid var(--border)',
}

const alertBanner: React.CSSProperties = {
  background: 'rgba(220, 80, 80, 0.12)',
  border: '1px solid rgba(220, 80, 80, 0.3)',
  borderRadius: RADIUS.md,
  padding: 12,
  marginBottom: 16,
  display: 'flex',
  alignItems: 'center',
  gap: 12,
}

export function AdminDashboard() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [kpi] = useState<KPIData>(DEMO_KPI)
  const [activity] = useState<ActivityLog[]>(DEMO_ACTIVITY)
  const [subdomains] = useState<SubdomainHealth[]>(DEMO_SUBDOMAINS)
  const [restaurants] = useState<Restaurant[]>(DEMO_RESTAURANTS)
  const [revenue] = useState(DEMO_REVENUE)
  const [signups] = useState<NewSignup[]>(DEMO_SIGNUPS)
  const [loading, setLoading] = useState(false)
  const [syncStatus, setSyncStatus] = useState<'online' | 'offline'>('online')

  const exportReport = () => {
    try {
      const csv = [
        ['Admin Report', new Date().toLocaleDateString('fr-CH')],
        [],
        ['KPI Dashboard'],
        ['MRR', kpi.mrr],
        ['Active Clients', kpi.activeClients],
        ['Monthly Bookings', kpi.monthlyBookings],
        ['No-show Rate', kpi.noShowRate],
        ['Pipeline', kpi.pipeline],
        [],
        ['Top 5 Restaurants'],
        ['Name', 'City', 'Plan', 'MRR', 'Bookings'],
        ...restaurants.map(r => [r.name, r.city, r.plan, r.mrr, r.bookings]),
      ]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n')

      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `r3sto-admin-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast('Rapport exporté')
    } catch (e) {
      toast('Erreur export')
    }
  }

  const refreshHealth = async () => {
    setLoading(true)
    try {
      await new Promise(r => setTimeout(r, 800))
      toast('Health check mis a jour')
    } finally {
      setLoading(false)
    }
  }

  const handleBackupDB = () => {
    toast('Base de donnees sauvegardee')
  }

  const handleViewLogs = () => {
    navigate('/admin/logs')
  }

  const handleSystemSettings = () => {
    navigate('/admin/settings')
  }

  const maxRevenue = Math.max(...revenue.map(r => r.amount), 1)

  return (
    <div style={{ padding: '16px 20px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', margin: 0, fontFamily: 'var(--ff)' }}>
            📊 Tableau de bord Admin
          </h1>
          <p style={{ fontSize: 11, color: 'var(--t3)', margin: '2px 0 0', fontFamily: 'var(--ff)' }}>
            Aperçu complet R3STO · {new Date().toLocaleDateString('fr-CH')}
          </p>
        </div>
        <button style={btnPrimary} onClick={exportReport}>
          ↓ Exporter rapport
        </button>
      </div>

      {/* Alert Banner */}
      <div style={alertBanner}>
        <span style={{ fontSize: 18 }}>⚠️</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--rd)' }}>Alerte : booking.r3sto.ch dégradé</div>
          <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 2 }}>Latence 890ms · Monitoring actif</div>
        </div>
      </div>

      {/* Sync Status Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: 10,
          background: syncStatus === 'online' ? 'rgba(52, 211, 153, 0.08)' : 'rgba(239, 68, 68, 0.08)',
          border: `1px solid ${syncStatus === 'online' ? 'rgba(52, 211, 153, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          borderRadius: RADIUS.md,
          marginBottom: 16,
          fontSize: 12,
          fontFamily: 'var(--ff)',
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: syncStatus === 'online' ? 'var(--gn)' : 'var(--rd)',
            animation: syncStatus === 'online' ? 'pulse 2s infinite' : 'none',
          }}
        />
        <span style={{ color: 'var(--text)', fontWeight: 600 }}>
          {syncStatus === 'online' ? '✓ Sync en ligne' : '✕ Mode offline'}
        </span>
        <span style={{ marginLeft: 'auto', color: 'var(--t3)', fontSize: 11 }}>
          {new Date().toLocaleTimeString('fr-CH')}
        </span>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div
          style={{ ...kpiCard, cursor: 'pointer', transition: '.2s', position: 'relative', overflow: 'hidden' }}
          onClick={() => navigate('/admin/restaurants')}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--gn)')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
        >
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--gn)' }}>{kpi.mrr.toLocaleString()} CHF</div>
          <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 600, marginTop: 4 }}>MRR REVENU</div>
        </div>
        <div
          style={{ ...kpiCard, cursor: 'pointer', transition: '.2s', position: 'relative', overflow: 'hidden' }}
          onClick={() => navigate('/admin/restaurants')}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--bl)')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
        >
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--bl)' }}>{kpi.activeClients}</div>
          <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 600, marginTop: 4 }}>CLIENTS ACTIFS</div>
        </div>
        <div
          style={{ ...kpiCard, cursor: 'pointer', transition: '.2s', position: 'relative', overflow: 'hidden' }}
          onClick={() => navigate('/admin/bookings')}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--am)')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
        >
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--am)' }}>{kpi.monthlyBookings.toLocaleString()}</div>
          <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 600, marginTop: 4 }}>RESAS MOIS</div>
        </div>
        <div
          style={{ ...kpiCard, cursor: 'pointer', transition: '.2s', position: 'relative', overflow: 'hidden' }}
          onClick={() => navigate('/admin/analytics')}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--rd)')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
        >
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--rd)' }}>{kpi.noShowRate}%</div>
          <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 600, marginTop: 4 }}>NO-SHOW</div>
        </div>
        <div style={{ ...kpiCard }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--bp)' }}>{(kpi.pipeline / 1000).toFixed(1)}k CHF</div>
          <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 600, marginTop: 4 }}>PIPELINE</div>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        <button style={btnPrimary} onClick={handleBackupDB}>
          💾 Backup DB
        </button>
        <button style={btnSecondary} onClick={handleViewLogs}>
          📋 View Logs
        </button>
        <button style={btnSecondary} onClick={handleSystemSettings}>
          ⚙️ Settings
        </button>
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: 14, marginBottom: 16 }}>
        {/* Revenue Chart */}
        <div style={cardS}>
          <div style={sectionTitle}>Revenu 6 mois</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 150, marginTop: 8 }}>
            {revenue.map((r, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: `${(r.amount / maxRevenue) * 130}px`,
                    background: 'var(--gn)',
                    borderRadius: RADIUS.sm,
                    transition: 'all .2s',
                  }}
                  title={`${r.amount.toLocaleString()} CHF`}
                />
                <span style={{ fontSize: 9, color: 'var(--t3)', fontWeight: 600 }}>{r.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Health Monitor */}
        <div style={cardS}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={sectionTitle}>Status Subdomains</div>
            <button
              onClick={refreshHealth}
              disabled={loading}
              style={{ ...btnSecondary, padding: '4px 8px', fontSize: 10, opacity: loading ? 0.6 : 1 }}
            >
              {loading ? '⟳' : '↻'} Check
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {subdomains.map(s => (
              <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background:
                      s.status === 'online'
                        ? 'var(--gn)'
                        : s.status === 'degraded'
                          ? 'var(--am)'
                          : 'var(--rd)',
                  }}
                />
                <span style={{ fontSize: 11, fontWeight: 600, flex: 1, fontFamily: 'var(--fm)' }}>{s.name}</span>
                <span style={{ fontSize: 9, color: 'var(--t3)', fontFamily: 'var(--fm)' }}>{s.latency}ms</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top 5 Restaurants */}
      <div style={{ ...cardS, marginBottom: 16 }}>
        <div style={sectionTitle}>Top 5 Restaurants</div>
        <div style={{ overflowX: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'var(--ff)' }}>
            <thead>
              <tr style={{ background: 'var(--surf3)', borderBottom: '1.5px solid var(--border)' }}>
                {['Nom', 'Ville', 'Plan', 'MRR', 'Resas'].map(h => (
                  <th
                    key={h}
                    style={{
                      padding: '8px 10px',
                      textAlign: 'left',
                      fontSize: 9,
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '.08em',
                      color: 'var(--t4)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {restaurants.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 700 }}>{r.name}</td>
                  <td style={{ padding: '8px 10px' }}>{r.city}</td>
                  <td style={{ padding: '8px 10px' }}>
                    <span
                      style={{
                        padding: '2px 6px',
                        borderRadius: 10,
                        fontSize: 9,
                        fontWeight: 700,
                        background: 'var(--bp)',
                        color: 'var(--bl)',
                      }}
                    >
                      {r.plan}
                    </span>
                  </td>
                  <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--gn)' }}>{r.mrr} CHF</td>
                  <td style={{ padding: '8px 10px', fontFamily: 'var(--fm)', color: 'var(--t2)' }}>{r.bookings.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Two-column layout: Activity + New Signups */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: 14, marginBottom: 16 }}>
        {/* Activity Feed */}
        <div style={cardS}>
          <div style={sectionTitle}>Activité récente</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {activity.slice(0, 5).map(log => (
              <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                <span
                  style={{
                    fontSize: 16,
                    minWidth: 20,
                    textAlign: 'center',
                  }}
                >
                  {log.status === 'success' ? '✓' : log.status === 'warning' ? '⚠' : '✕'}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>{log.action}</div>
                  <div style={{ fontSize: 9, color: 'var(--t3)' }}>
                    {log.user} · {log.timestamp}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Latest Signups */}
        <div style={cardS}>
          <div style={sectionTitle}>Dernières inscriptions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {signups.slice(0, 5).map(signup => (
              <div key={signup.id} style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--bl)',
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>{signup.restaurant}</div>
                  <div style={{ fontSize: 9, color: 'var(--t3)' }}>
                    {signup.plan} · {signup.city}
                  </div>
                </div>
                <span style={{ fontSize: 9, color: 'var(--t4)', fontFamily: 'var(--fm)', whiteSpace: 'nowrap' }}>{signup.date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>
    </div>
  )
}
