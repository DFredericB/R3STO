// ══════════════════════════════════════════════════
//  R3STO — Data Intelligence
//  Analytics usage, collecte données, analyse marché,
//  couverture géo, benchmark concurrence, insights
// ══════════════════════════════════════════════════

import { useState, useMemo } from 'react'
import { RADIUS, sectionTitle, filterChip, inputStyle } from '../../utils/design'

const card: React.CSSProperties = {
  background: 'var(--surf)', border: '1px solid var(--border)',
  borderRadius: RADIUS.md, padding: 14,
}
const stat: React.CSSProperties = {
  ...card, textAlign: 'center', flex: '1 1 150px', minWidth: 130,
}
const btnP: React.CSSProperties = {
  padding: '8px 16px', borderRadius: RADIUS.sm,
  background: 'var(--bl)', color: '#fff', border: 'none',
  fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'var(--ff)',
}

type TabView = 'overview' | 'usage' | 'market' | 'data' | 'churn'

// ── Demo data ──
const USAGE_DATA = [
  { month: 'Nov 25', activeUsers: 42, sessions: 1850, avgDuration: 22, actions: 12400 },
  { month: 'Déc 25', activeUsers: 48, sessions: 2100, avgDuration: 24, actions: 14200 },
  { month: 'Jan 26', activeUsers: 55, sessions: 2400, avgDuration: 23, actions: 15800 },
  { month: 'Fév 26', activeUsers: 61, sessions: 2700, avgDuration: 25, actions: 17500 },
  { month: 'Mar 26', activeUsers: 68, sessions: 3100, avgDuration: 26, actions: 20100 },
  { month: 'Avr 26', activeUsers: 74, sessions: 3450, avgDuration: 27, actions: 22800 },
]

const MARKET_CANTONS = [
  { canton: 'GE', total: 1200, penetration: 5.2, prospects: 840, clients: 62, growth: '+12%' },
  { canton: 'VD', total: 1800, penetration: 3.8, prospects: 1100, clients: 68, growth: '+18%' },
  { canton: 'VS', total: 600, penetration: 4.1, prospects: 380, clients: 25, growth: '+8%' },
  { canton: 'ZH', total: 2400, penetration: 1.2, prospects: 420, clients: 29, growth: '+22%' },
  { canton: 'BE', total: 1600, penetration: 1.5, prospects: 350, clients: 24, growth: '+15%' },
  { canton: 'BS', total: 500, penetration: 2.8, prospects: 220, clients: 14, growth: '+10%' },
  { canton: 'LU', total: 400, penetration: 2.0, prospects: 180, clients: 8, growth: '+5%' },
  { canton: 'TI', total: 700, penetration: 1.4, prospects: 280, clients: 10, growth: '+7%' },
  { canton: 'FR', total: 350, penetration: 3.4, prospects: 240, clients: 12, growth: '+14%' },
  { canton: 'SG', total: 450, penetration: 1.1, prospects: 150, clients: 5, growth: '+3%' },
]

const COMPETITORS = [
  { name: 'TheFork (LaFourchette)', share: 35, strength: 'Brand awareness, réseau mondial', weakness: 'Commission par couvert, pas de CRM', pricing: '2-4 CHF/couvert' },
  { name: 'Aleno', share: 12, strength: 'Marché suisse, intégration POS', weakness: 'Prix élevé, complexe', pricing: '149-399 CHF/mois' },
  { name: 'forAtable', share: 8, strength: 'Simple, abordable', weakness: 'Fonctionnalités limitées, pas de widget', pricing: '29-79 CHF/mois' },
  { name: 'Resmio', share: 5, strength: 'Gratuit de base, EU', weakness: 'Pas adapté CH, support limité', pricing: '0-99 EUR/mois' },
  { name: 'R3STO', share: 3, strength: 'All-in-one, pas de commission, suisse', weakness: 'Nouveau, base petite', pricing: '39-79 CHF/mois' },
  { name: 'Autres / maison', share: 37, strength: 'Gratuit, personnalisé', weakness: 'Pas de widget, pas fiable', pricing: '0 CHF' },
]

const CHURN_INDICATORS = [
  { resto: 'Pizzeria Napoli', lastLogin: '12 jours', usage: 'Faible', riskScore: 85, plan: 'Essentiel', mrr: 39, signal: 'Aucune résa créée depuis 2 sem.' },
  { resto: 'Le Jardin Fleuri', lastLogin: '8 jours', usage: 'Moyen', riskScore: 62, plan: 'Premium', mrr: 59, signal: 'Widget désactivé, appels support x3' },
  { resto: 'Sushi Express', lastLogin: '5 jours', usage: 'Faible', riskScore: 58, plan: 'Essentiel', mrr: 39, signal: 'Annulation Stripe en attente' },
  { resto: 'Café du Marché', lastLogin: '15 jours', usage: 'Nul', riskScore: 92, plan: 'Premium', mrr: 59, signal: 'Pas connecté depuis 2 sem, 0 résa ce mois' },
  { resto: 'Brasserie du Port', lastLogin: '3 jours', usage: 'Moyen', riskScore: 45, plan: 'Signature', mrr: 79, signal: 'Downgrade demandé par email' },
]

const DATA_ASSETS = [
  { name: 'Base restaurants CH', records: 6842, quality: 92, updated: '2026-04-12', fields: 'Nom, adresse, couverts, type cuisine, email, tel' },
  { name: 'Comportement réservation', records: 45200, quality: 98, updated: '2026-04-13', fields: 'Créneaux, taux remplissage, no-show, durée moyenne' },
  { name: 'Avis & satisfaction', records: 12800, quality: 85, updated: '2026-04-13', fields: 'Note, sentiment, réponse, temps réponse' },
  { name: 'Usage plateforme', records: 3450, quality: 99, updated: '2026-04-13', fields: 'Sessions, durée, modules, actions, device' },
  { name: 'Données widget', records: 28600, quality: 95, updated: '2026-04-13', fields: 'Conversions, abandons, créneaux demandés, mobile vs desktop' },
  { name: 'Tendances culinaires', records: 890, quality: 78, updated: '2026-04-10', fields: 'Type cuisine, prix moyen, popularité par canton' },
]

export function DataIntelligence() {
  const [tab, setTab] = useState<TabView>('overview')

  const latest = USAGE_DATA[USAGE_DATA.length - 1]
  const prev = USAGE_DATA[USAGE_DATA.length - 2]
  const totalClients = MARKET_CANTONS.reduce((s, c) => s + c.clients, 0)
  const totalProspects = MARKET_CANTONS.reduce((s, c) => s + c.prospects, 0)
  const atRiskMRR = CHURN_INDICATORS.filter(c => c.riskScore >= 60).reduce((s, c) => s + c.mrr, 0)

  return (
    <div style={{ padding: '16px 20px', maxWidth: 1500, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', margin: 0, fontFamily: 'var(--ff)' }}>
            📊 Data Intelligence
          </h1>
          <p style={{ fontSize: 11, color: 'var(--t3)', margin: '2px 0 0', fontFamily: 'var(--ff)' }}>
            Analyse marché, données collectées, usage plateforme, prédiction churn
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {([
            ['overview', '🏠 Vue globale'],
            ['usage', '📈 Usage'],
            ['market', '🗺️ Marché'],
            ['data', '💾 Données'],
            ['churn', '⚠️ Churn'],
          ] as [TabView, string][]).map(([k, label]) => (
            <button key={k} style={filterChip(tab === k)} onClick={() => setTab(k)}>{label}</button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={stat}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--bl)' }}>{totalClients}</div>
          <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 600 }}>CLIENTS ACTIFS</div>
        </div>
        <div style={stat}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#7c3aed' }}>{totalProspects.toLocaleString()}</div>
          <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 600 }}>PROSPECTS DB</div>
        </div>
        <div style={stat}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--gn)' }}>{latest.activeUsers}</div>
          <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 600 }}>USERS ACTIFS/MOIS</div>
        </div>
        <div style={stat}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--am)' }}>{latest.avgDuration} min</div>
          <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 600 }}>SESSION MOYENNE</div>
        </div>
        <div style={stat}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--rd)' }}>{atRiskMRR} CHF</div>
          <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 600 }}>MRR À RISQUE</div>
        </div>
      </div>

      {tab === 'overview' && <OverviewTab />}
      {tab === 'usage' && <UsageTab />}
      {tab === 'market' && <MarketTab />}
      {tab === 'data' && <DataAssetsTab />}
      {tab === 'churn' && <ChurnTab />}
    </div>
  )
}

// ── Overview ──
function OverviewTab() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 14 }}>
      {/* Usage trend */}
      <div style={card}>
        <div style={sectionTitle}>Croissance utilisateurs</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {USAGE_DATA.map(d => (
            <div key={d.month} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 50, fontSize: 10, fontWeight: 600, color: 'var(--t3)' }}>{d.month}</span>
              <div style={{ flex: 1, background: 'var(--surf3)', borderRadius: 3, overflow: 'hidden', height: 20 }}>
                <div style={{
                  height: '100%', borderRadius: 3,
                  background: 'linear-gradient(90deg, var(--bl), #7c3aed)',
                  width: `${(d.activeUsers / 80) * 100}%`,
                  transition: 'width .3s',
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 6,
                }}>
                  <span style={{ fontSize: 9, fontWeight: 800, color: '#fff' }}>{d.activeUsers}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top cantons */}
      <div style={card}>
        <div style={sectionTitle}>Couverture marché par canton</div>
        {MARKET_CANTONS.slice(0, 6).map(c => (
          <div key={c.canton} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ width: 28, fontSize: 12, fontWeight: 800, color: 'var(--bl)' }}>{c.canton}</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--t3)', marginBottom: 2 }}>
                <span>{c.clients} clients / {c.total} restos</span>
                <span style={{ color: 'var(--gn)', fontWeight: 700 }}>{c.penetration}%</span>
              </div>
              <div style={{ background: 'var(--surf3)', borderRadius: 3, overflow: 'hidden', height: 6 }}>
                <div style={{ height: '100%', borderRadius: 3, background: 'var(--bl)', width: `${c.penetration * 10}%` }} />
              </div>
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--gn)' }}>{c.growth}</span>
          </div>
        ))}
      </div>

      {/* Competitors overview */}
      <div style={card}>
        <div style={sectionTitle}>Parts de marché estimées (Suisse)</div>
        {COMPETITORS.map(c => (
          <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{
              width: 100, fontSize: 10, fontWeight: c.name === 'R3STO' ? 800 : 600,
              color: c.name === 'R3STO' ? 'var(--bl)' : 'var(--t2)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{c.name}</span>
            <div style={{ flex: 1, background: 'var(--surf3)', borderRadius: 3, overflow: 'hidden', height: 14 }}>
              <div style={{
                height: '100%', borderRadius: 3,
                background: c.name === 'R3STO' ? 'var(--bl)' : c.name.includes('Fork') ? 'var(--rd)' : 'var(--am)',
                width: `${c.share}%`,
              }} />
            </div>
            <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--t2)', minWidth: 30, textAlign: 'right', fontFamily: 'var(--fm)' }}>
              {c.share}%
            </span>
          </div>
        ))}
      </div>

      {/* Churn alerts */}
      <div style={card}>
        <div style={sectionTitle}>Alertes churn</div>
        {CHURN_INDICATORS.filter(c => c.riskScore >= 60).map(c => (
          <div key={c.resto} style={{
            padding: '8px 10px', marginBottom: 4, borderRadius: 6,
            background: c.riskScore >= 80 ? 'var(--rp)' : 'var(--ap)',
            border: `1px solid ${c.riskScore >= 80 ? 'var(--rb)' : 'rgba(232,165,48,.2)'}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>{c.resto}</span>
              <span style={{
                fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 4,
                background: c.riskScore >= 80 ? 'var(--rd)' : 'var(--am)', color: '#fff',
              }}>{c.riskScore}%</span>
            </div>
            <div style={{ fontSize: 9, color: 'var(--t3)', marginTop: 2 }}>{c.signal}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Usage Tab ──
function UsageTab() {
  const maxSessions = Math.max(...USAGE_DATA.map(d => d.sessions))
  const maxActions = Math.max(...USAGE_DATA.map(d => d.actions))

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 14 }}>
      <div style={card}>
        <div style={sectionTitle}>Sessions par mois</div>
        {USAGE_DATA.map(d => (
          <div key={d.month} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ width: 55, fontSize: 10, fontWeight: 600, color: 'var(--t3)' }}>{d.month}</span>
            <div style={{ flex: 1, background: 'var(--surf3)', borderRadius: 3, overflow: 'hidden', height: 18 }}>
              <div style={{ height: '100%', borderRadius: 3, background: 'var(--bl)', width: `${(d.sessions / maxSessions) * 100}%` }} />
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--t2)', minWidth: 40, textAlign: 'right', fontFamily: 'var(--fm)' }}>
              {d.sessions.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
      <div style={card}>
        <div style={sectionTitle}>Actions totales par mois</div>
        {USAGE_DATA.map(d => (
          <div key={d.month} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ width: 55, fontSize: 10, fontWeight: 600, color: 'var(--t3)' }}>{d.month}</span>
            <div style={{ flex: 1, background: 'var(--surf3)', borderRadius: 3, overflow: 'hidden', height: 18 }}>
              <div style={{ height: '100%', borderRadius: 3, background: '#7c3aed', width: `${(d.actions / maxActions) * 100}%` }} />
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--t2)', minWidth: 45, textAlign: 'right', fontFamily: 'var(--fm)' }}>
              {d.actions.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
      <div style={{ ...card, gridColumn: '1 / -1' }}>
        <div style={sectionTitle}>Modules les plus utilisés (ce mois)</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { name: 'Réservations', pct: 38, icon: '📋' },
            { name: 'Plan de salle', pct: 22, icon: '📐' },
            { name: 'Clients', pct: 15, icon: '👤' },
            { name: 'Widget', pct: 12, icon: '🌐' },
            { name: 'Dashboard', pct: 8, icon: '📊' },
            { name: 'Marketing', pct: 3, icon: '📣' },
            { name: 'Fidélité', pct: 2, icon: '🏆' },
          ].map(m => (
            <div key={m.name} style={{
              ...card, flex: '1 1 140px', minWidth: 120, textAlign: 'center',
              background: 'var(--bg2)',
            }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{m.icon}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--bl)', fontFamily: 'var(--fm)' }}>{m.pct}%</div>
              <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 600 }}>{m.name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Market Tab ──
function MarketTab() {
  const totalRestos = MARKET_CANTONS.reduce((s, c) => s + c.total, 0)
  const totalClients = MARKET_CANTONS.reduce((s, c) => s + c.clients, 0)
  const avgPenetration = totalClients / totalRestos * 100

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={stat}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--bl)' }}>{totalRestos.toLocaleString()}</div>
          <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 600 }}>RESTOS EN SUISSE</div>
        </div>
        <div style={stat}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--gn)' }}>{totalClients}</div>
          <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 600 }}>NOS CLIENTS</div>
        </div>
        <div style={stat}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#7c3aed' }}>{avgPenetration.toFixed(1)}%</div>
          <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 600 }}>PÉNÉTRATION</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 14 }}>
        {/* Canton table */}
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
            <div style={sectionTitle}>Couverture par canton</div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'var(--ff)' }}>
            <thead>
              <tr style={{ background: 'var(--surf3)', borderBottom: '1.5px solid var(--border)' }}>
                {['Canton','Total restos','Clients','Prospects','Pénétration','Croissance'].map(h => (
                  <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontSize: 9, fontWeight: 800, color: 'var(--t4)', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MARKET_CANTONS.map(c => (
                <tr key={c.canton} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '6px 10px', fontWeight: 800, color: 'var(--bl)' }}>{c.canton}</td>
                  <td style={{ padding: '6px 10px', fontFamily: 'var(--fm)' }}>{c.total.toLocaleString()}</td>
                  <td style={{ padding: '6px 10px', fontWeight: 700, color: 'var(--gn)' }}>{c.clients}</td>
                  <td style={{ padding: '6px 10px', color: 'var(--t3)' }}>{c.prospects}</td>
                  <td style={{ padding: '6px 10px' }}>
                    <span style={{
                      padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                      background: c.penetration >= 4 ? 'var(--gp)' : c.penetration >= 2 ? 'var(--bp)' : 'var(--rp)',
                      color: c.penetration >= 4 ? 'var(--gn)' : c.penetration >= 2 ? 'var(--bl)' : 'var(--rd)',
                    }}>{c.penetration}%</span>
                  </td>
                  <td style={{ padding: '6px 10px', fontWeight: 700, color: 'var(--gn)', fontSize: 10 }}>{c.growth}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Competitors */}
        <div style={card}>
          <div style={sectionTitle}>Analyse concurrence</div>
          {COMPETITORS.map(c => (
            <div key={c.name} style={{
              padding: '10px', marginBottom: 6, borderRadius: 6,
              background: c.name === 'R3STO' ? 'var(--bp)' : 'var(--bg2)',
              border: `1px solid ${c.name === 'R3STO' ? 'var(--b2)' : 'var(--border)'}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: c.name === 'R3STO' ? 'var(--bl)' : 'var(--text)' }}>{c.name}</span>
                <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--t2)', fontFamily: 'var(--fm)' }}>{c.pricing}</span>
              </div>
              <div style={{ fontSize: 10, color: 'var(--t3)', lineHeight: 1.4 }}>
                <span style={{ color: 'var(--gn)', fontWeight: 600 }}>+</span> {c.strength}
              </div>
              <div style={{ fontSize: 10, color: 'var(--t3)', lineHeight: 1.4 }}>
                <span style={{ color: 'var(--rd)', fontWeight: 600 }}>−</span> {c.weakness}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Data Assets Tab ──
function DataAssetsTab() {
  const totalRecords = DATA_ASSETS.reduce((s, d) => s + d.records, 0)
  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={stat}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--bl)' }}>{totalRecords.toLocaleString()}</div>
          <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 600 }}>ENREGISTREMENTS TOTAL</div>
        </div>
        <div style={stat}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--gn)' }}>{DATA_ASSETS.length}</div>
          <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 600 }}>JEUX DE DONNÉES</div>
        </div>
        <div style={stat}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#7c3aed' }}>
            {Math.round(DATA_ASSETS.reduce((s, d) => s + d.quality, 0) / DATA_ASSETS.length)}%
          </div>
          <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 600 }}>QUALITÉ MOYENNE</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {DATA_ASSETS.map(d => (
          <div key={d.name} style={{ ...card, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 8,
              background: 'var(--bp)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, flexShrink: 0,
            }}>💾</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{d.name}</div>
              <div style={{ fontSize: 10, color: 'var(--t3)' }}>{d.fields}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--bl)', fontFamily: 'var(--fm)' }}>
                {d.records.toLocaleString()}
              </div>
              <div style={{ fontSize: 9, color: 'var(--t4)' }}>enregistrements</div>
            </div>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: d.quality >= 90 ? 'var(--gp)' : d.quality >= 80 ? 'var(--bp)' : 'var(--ap)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 800, flexShrink: 0,
              color: d.quality >= 90 ? 'var(--gn)' : d.quality >= 80 ? 'var(--bl)' : 'var(--am)',
            }}>{d.quality}%</div>
            <div style={{ fontSize: 9, color: 'var(--t4)', flexShrink: 0, width: 70, textAlign: 'right' }}>
              MàJ {d.updated.slice(5)}
            </div>
          </div>
        ))}
      </div>

      <div style={{ ...card, marginTop: 14 }}>
        <div style={sectionTitle}>Export & monétisation</div>
        <p style={{ fontSize: 11, color: 'var(--t2)', lineHeight: 1.5, margin: '8px 0' }}>
          Les données agrégées et anonymisées peuvent être valorisées : tendances de réservation par région,
          taux de remplissage moyens, types de cuisine populaires, comportement consommateur, etc.
          Chaque dataset peut être exporté en CSV ou via API.
        </p>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button style={btnP}>📥 Export CSV complet</button>
          <button style={{ ...btnP, background: '#7c3aed' }}>🔗 Configurer API Data</button>
        </div>
      </div>
    </div>
  )
}

// ── Churn Tab ──
function ChurnTab() {
  return (
    <div>
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={sectionTitle}>Clients à risque de churn</div>
          <button style={btnP}>📧 Campagne rétention</button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'var(--ff)' }}>
          <thead>
            <tr style={{ background: 'var(--surf3)', borderBottom: '1.5px solid var(--border)' }}>
              {['Restaurant','Plan','MRR','Dernier login','Usage','Risque','Signal'].map(h => (
                <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontSize: 9, fontWeight: 800, color: 'var(--t4)', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CHURN_INDICATORS.sort((a, b) => b.riskScore - a.riskScore).map(c => (
              <tr key={c.resto} style={{
                borderBottom: '1px solid var(--border)',
                background: c.riskScore >= 80 ? 'rgba(220,80,80,.05)' : 'transparent',
              }}>
                <td style={{ padding: '8px 10px', fontWeight: 700 }}>{c.resto}</td>
                <td style={{ padding: '8px 10px' }}>
                  <span style={{
                    padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                    background: c.plan === 'Gastro' ? 'rgba(124,58,237,.1)' : c.plan === 'Resto' ? 'var(--bp)' : 'var(--surf3)',
                    color: c.plan === 'Gastro' ? '#7c3aed' : c.plan === 'Resto' ? 'var(--bl)' : 'var(--t3)',
                  }}>{c.plan}</span>
                </td>
                <td style={{ padding: '8px 10px', fontWeight: 700, fontFamily: 'var(--fm)' }}>{c.mrr} CHF</td>
                <td style={{ padding: '8px 10px', color: 'var(--t3)' }}>{c.lastLogin}</td>
                <td style={{ padding: '8px 10px' }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    color: c.usage === 'Nul' ? 'var(--rd)' : c.usage === 'Faible' ? 'var(--am)' : 'var(--t2)',
                  }}>{c.usage}</span>
                </td>
                <td style={{ padding: '8px 10px' }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 800,
                    background: c.riskScore >= 80 ? 'var(--rd)' : c.riskScore >= 60 ? 'var(--am)' : 'var(--gn)',
                    color: '#fff',
                  }}>{c.riskScore}%</span>
                </td>
                <td style={{ padding: '8px 10px', fontSize: 10, color: 'var(--t3)', maxWidth: 200 }}>{c.signal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
