// ══════════════════════════════════════════════════
//  R3STO — Pricing & Strategy
//  Gestion des plans, stratégie tarifaire, upsell,
//  revenue par client, optimisation MRR/ARR
// ══════════════════════════════════════════════════

import { useState } from 'react'
import { RADIUS, sectionTitle, filterChip } from '../../utils/design'
import { useToast } from '../../components/ui/Toast'
import { useAdminFinancials } from '../../hooks/useAdminApi'

const card: React.CSSProperties = {
  background: 'var(--surf)', border: '1px solid var(--border)',
  borderRadius: RADIUS.md, padding: 14,
}
const stat: React.CSSProperties = {
  ...card, textAlign: 'center', flex: '1 1 140px', minWidth: 125,
}
const btnP: React.CSSProperties = {
  padding: '8px 16px', borderRadius: RADIUS.sm,
  background: 'var(--bl)', color: '#fff', border: 'none',
  fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'var(--ff)',
}

type TabView = 'overview' | 'plans' | 'upsell' | 'revenue'

// ── Data ──
const PLANS = [
  {
    name: 'Essentiel', price: 39, stripeId: 'price_1TFWg9906pQ0p9GXfDcLAi20', color: 'var(--gn)',
    clients: 38, mrr: 38 * 39, churn: 4.2,
    features: ['Grille, Agenda, Journal', 'Dashboard', 'Services & salles', 'Support dédié'],
    upsellTarget: 'Resto',
  },
  {
    name: 'Premium', price: 59, stripeId: 'price_1TFWg9906pQ0p9GXtwaDm2PV', color: 'var(--bl)',
    clients: 24, mrr: 24 * 59, churn: 2.8,
    features: ['Tout Bistro +', 'Plan 2D, Tables & Combos', 'CRM, Fidélité, Marketing', 'Widget, Menu, QR, Cadeaux', 'Marketplace, Rôles illimités', 'Support dédié'],
    upsellTarget: 'Gastro',
  },
  {
    name: 'Signature', price: 79, stripeId: 'price_1TFWg9906pQ0p9GX98TbpANS', color: 'var(--am)',
    clients: 12, mrr: 12 * 79, churn: 1.5,
    features: ['Tout Resto +', 'Avis, Site vitrine', 'Prépaiement Stripe', 'Multi-sites (12)', 'IA, SMS, API REST', 'Support dédié + SLA'],
    upsellTarget: null,
  },
]

const REVENUE_MONTHS = [
  { month: 'Nov 25', mrr: 2180, newMRR: 312, churnMRR: 78, expansion: 118 },
  { month: 'Déc 25', mrr: 2532, newMRR: 390, churnMRR: 98, expansion: 156 },
  { month: 'Jan 26', mrr: 2980, newMRR: 468, churnMRR: 118, expansion: 197 },
  { month: 'Fév 26', mrr: 3527, newMRR: 531, churnMRR: 79, expansion: 236 },
  { month: 'Mar 26', mrr: 4215, newMRR: 624, churnMRR: 118, expansion: 295 },
  { month: 'Avr 26', mrr: 5016, newMRR: 708, churnMRR: 157, expansion: 354 },
]

const UPSELL_OPPORTUNITIES = [
  { resto: 'La Brasserie du Port', currentPlan: 'Bistro', suggestedPlan: 'Resto', reason: 'Dépasse 100 résas/mois, demande widget avancé', probability: 85, deltaMRR: 20 },
  { resto: 'Chez Luigi', currentPlan: 'Bistro', suggestedPlan: 'Resto', reason: 'Active marketing, 2 salles configurées', probability: 72, deltaMRR: 20 },
  { resto: 'Le Refuge Alpin', currentPlan: 'Resto', suggestedPlan: 'Gastro', reason: '2e restaurant ouvert, besoin multi-site', probability: 90, deltaMRR: 20 },
  { resto: 'Sushi Zen', currentPlan: 'Bistro', suggestedPlan: 'Resto', reason: 'Base clients > 500, veut fidélité', probability: 65, deltaMRR: 20 },
  { resto: 'Café des Halles', currentPlan: 'Resto', suggestedPlan: 'Gastro', reason: 'Utilise API, besoin prépaiement événements', probability: 55, deltaMRR: 20 },
  { resto: 'Trattoria Napoli', currentPlan: 'Bistro', suggestedPlan: 'Resto', reason: '3 salles, limité par plan actuel', probability: 78, deltaMRR: 20 },
]

export function PricingStrategy() {
  const { toast } = useToast()
  const [tab, setTab] = useState<TabView>('overview')
  const { data: fin, source: finSource } = useAdminFinancials()

  const demoMRR = PLANS.reduce((s, p) => s + p.mrr, 0)
  const demoClients = PLANS.reduce((s, p) => s + p.clients, 0)

  // Préférer API si dispo
  const totalMRR = fin?.mrr != null ? Math.round(fin.mrr) : demoMRR
  const totalClients = fin?.total_restaurants ?? demoClients
  const arpu = totalClients > 0 ? Math.round(totalMRR / totalClients) : 0
  const arr = fin?.arr != null ? Math.round(fin.arr) : totalMRR * 12
  const potentialUpsellMRR = UPSELL_OPPORTUNITIES.reduce((s, o) => s + o.deltaMRR, 0)
  const latest = REVENUE_MONTHS[REVENUE_MONTHS.length - 1]
  const prev = REVENUE_MONTHS[REVENUE_MONTHS.length - 2]
  const mrrGrowth = prev.mrr > 0 ? Math.round(((latest.mrr - prev.mrr) / prev.mrr) * 100) : 0

  return (
    <div style={{ padding: '16px 20px', maxWidth: 1500, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', margin: 0, fontFamily: 'var(--ff)' }}>
            💰 Stratégie & Pricing
          </h1>
          <p style={{ fontSize: 11, color: 'var(--t3)', margin: '2px 0 0', fontFamily: 'var(--ff)' }}>
            Revenus, plans tarifaires, upsell, optimisation MRR
            <span style={{ marginLeft: 8, padding: '1px 6px', borderRadius: 8, background: finSource === 'api' ? 'var(--bp)' : 'var(--surf3)', color: finSource === 'api' ? 'var(--bl)' : 'var(--t4)', fontSize: 9, fontWeight: 800 }}>
              {finSource === 'api' ? 'LIVE API' : 'DEMO'}
            </span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {([
            ['overview', '🏠 Vue globale'],
            ['plans', '📦 Plans'],
            ['upsell', '📈 Upsell'],
            ['revenue', '💶 Revenue'],
          ] as [TabView, string][]).map(([k, label]) => (
            <button key={k} style={filterChip(tab === k)} onClick={() => setTab(k)}>{label}</button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={stat}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--gn)' }}>{totalMRR.toLocaleString()} CHF</div>
          <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 600 }}>MRR</div>
        </div>
        <div style={stat}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--bl)' }}>{arr.toLocaleString()} CHF</div>
          <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 600 }}>ARR</div>
        </div>
        <div style={stat}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#7c3aed' }}>{arpu} CHF</div>
          <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 600 }}>ARPU</div>
        </div>
        <div style={stat}>
          <div style={{ fontSize: 22, fontWeight: 800, color: mrrGrowth > 0 ? 'var(--gn)' : 'var(--rd)' }}>+{mrrGrowth}%</div>
          <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 600 }}>CROISSANCE MRR</div>
        </div>
        <div style={stat}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--am)' }}>+{potentialUpsellMRR} CHF</div>
          <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 600 }}>UPSELL POTENTIEL</div>
        </div>
      </div>

      {tab === 'overview' && <OverviewTab plans={PLANS} revenue={REVENUE_MONTHS} />}
      {tab === 'plans' && <PlansTab plans={PLANS} />}
      {tab === 'upsell' && <UpsellTab opportunities={UPSELL_OPPORTUNITIES} />}
      {tab === 'revenue' && <RevenueTab data={REVENUE_MONTHS} />}
    </div>
  )
}

function OverviewTab({ plans, revenue }: { plans: typeof PLANS; revenue: typeof REVENUE_MONTHS }) {
  const maxMRR = Math.max(...revenue.map(r => r.mrr))
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 14 }}>
      {/* Plan distribution */}
      <div style={card}>
        <div style={sectionTitle}>Répartition clients par plan</div>
        {plans.map(p => {
          const pct = Math.round((p.clients / plans.reduce((s, pl) => s + pl.clients, 0)) * 100)
          return (
            <div key={p.name} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: p.color }}>{p.name}</span>
                  <span style={{ fontSize: 10, color: 'var(--t3)' }}>{p.price} CHF/mois</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--t2)', fontFamily: 'var(--fm)' }}>{p.clients} clients</span>
                  <span style={{ fontSize: 10, fontWeight: 800, color: p.color }}>{pct}%</span>
                </div>
              </div>
              <div style={{ background: 'var(--surf3)', borderRadius: 4, overflow: 'hidden', height: 8 }}>
                <div style={{ height: '100%', borderRadius: 4, background: p.color, width: `${pct}%`, transition: 'width .3s' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                <span style={{ fontSize: 9, color: 'var(--t4)' }}>MRR: {p.mrr.toLocaleString()} CHF</span>
                <span style={{ fontSize: 9, color: p.churn > 3 ? 'var(--rd)' : 'var(--gn)' }}>Churn: {p.churn}%</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* MRR Growth */}
      <div style={card}>
        <div style={sectionTitle}>Évolution MRR</div>
        {revenue.map(r => (
          <div key={r.month} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ width: 55, fontSize: 10, fontWeight: 600, color: 'var(--t3)' }}>{r.month}</span>
            <div style={{ flex: 1, background: 'var(--surf3)', borderRadius: 3, overflow: 'hidden', height: 20 }}>
              <div style={{
                height: '100%', borderRadius: 3,
                background: 'linear-gradient(90deg, var(--gn), var(--bl))',
                width: `${(r.mrr / maxMRR) * 100}%`,
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 6,
              }}>
                <span style={{ fontSize: 9, fontWeight: 800, color: '#fff' }}>{r.mrr.toLocaleString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick upsell preview */}
      <div style={card}>
        <div style={sectionTitle}>Top opportunités upsell</div>
        {UPSELL_OPPORTUNITIES.slice(0, 4).map(o => (
          <div key={o.resto} style={{
            padding: '8px 10px', marginBottom: 4, borderRadius: 6,
            background: 'var(--bg2)', border: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>{o.resto}</span>
              <span style={{
                fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 4,
                background: o.probability >= 80 ? 'var(--gp)' : o.probability >= 60 ? 'var(--bp)' : 'var(--ap)',
                color: o.probability >= 80 ? 'var(--gn)' : o.probability >= 60 ? 'var(--bl)' : 'var(--am)',
              }}>{o.probability}%</span>
            </div>
            <div style={{ fontSize: 9, color: 'var(--t3)', marginTop: 2 }}>
              {o.currentPlan} → {o.suggestedPlan} · +{o.deltaMRR} CHF/mois
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PlansTab({ plans }: { plans: typeof PLANS }) {
  return (
    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
      {plans.map(p => (
        <div key={p.name} style={{
          ...card, flex: '1 1 280px', minWidth: 260,
          borderTop: `3px solid ${p.color}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: p.color }}>{p.name}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginTop: 4 }}>
                {p.price} <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--t3)' }}>CHF/mois</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--bl)', fontFamily: 'var(--fm)' }}>{p.clients}</div>
              <div style={{ fontSize: 9, color: 'var(--t4)' }}>clients</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, padding: '6px 8px', borderRadius: 6, background: 'var(--gp)', textAlign: 'center' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--gn)', fontFamily: 'var(--fm)' }}>{p.mrr.toLocaleString()}</div>
              <div style={{ fontSize: 8, color: 'var(--gn)', fontWeight: 600 }}>MRR</div>
            </div>
            <div style={{ flex: 1, padding: '6px 8px', borderRadius: 6, background: p.churn > 3 ? 'var(--rp)' : 'var(--bp)', textAlign: 'center' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: p.churn > 3 ? 'var(--rd)' : 'var(--bl)', fontFamily: 'var(--fm)' }}>{p.churn}%</div>
              <div style={{ fontSize: 8, color: p.churn > 3 ? 'var(--rd)' : 'var(--bl)', fontWeight: 600 }}>CHURN</div>
            </div>
          </div>

          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>
            Fonctionnalités incluses
          </div>
          {p.features.map(f => (
            <div key={f} style={{ fontSize: 11, color: 'var(--t2)', padding: '3px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'var(--gn)', fontSize: 10 }}>✓</span> {f}
            </div>
          ))}

          {p.upsellTarget && (
            <div style={{ marginTop: 10, padding: '6px 10px', borderRadius: 6, background: 'var(--bp)', fontSize: 10, color: 'var(--bl)', fontWeight: 600 }}>
              Upsell vers {p.upsellTarget} → +{plans.find(pl => pl.name === p.upsellTarget)!.price - p.price} CHF/mois
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function UpsellTab({ opportunities }: { opportunities: typeof UPSELL_OPPORTUNITIES }) {
  const totalDelta = opportunities.reduce((s, o) => s + o.deltaMRR, 0)
  const weightedDelta = opportunities.reduce((s, o) => s + o.deltaMRR * (o.probability / 100), 0)

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={stat}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--bl)' }}>{opportunities.length}</div>
          <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 600 }}>OPPORTUNITÉS</div>
        </div>
        <div style={stat}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--am)' }}>+{totalDelta} CHF</div>
          <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 600 }}>MRR POTENTIEL</div>
        </div>
        <div style={stat}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--gn)' }}>+{Math.round(weightedDelta)} CHF</div>
          <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 600 }}>MRR PONDÉRÉ</div>
        </div>
      </div>

      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'var(--ff)' }}>
          <thead>
            <tr style={{ background: 'var(--surf3)', borderBottom: '1.5px solid var(--border)' }}>
              {['Restaurant','Plan actuel','Suggestion','Raison','Probabilité','Delta MRR',''].map(h => (
                <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontSize: 9, fontWeight: 800, color: 'var(--t4)', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {opportunities.sort((a, b) => b.probability - a.probability).map(o => (
              <tr key={o.resto} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 10px', fontWeight: 700 }}>{o.resto}</td>
                <td style={{ padding: '8px 10px' }}>
                  <span style={{ padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: 'var(--surf3)', color: 'var(--t2)' }}>{o.currentPlan}</span>
                </td>
                <td style={{ padding: '8px 10px' }}>
                  <span style={{ padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: 'var(--bp)', color: 'var(--bl)' }}>{o.suggestedPlan}</span>
                </td>
                <td style={{ padding: '8px 10px', fontSize: 10, color: 'var(--t3)', maxWidth: 250 }}>{o.reason}</td>
                <td style={{ padding: '8px 10px' }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 800,
                    background: o.probability >= 80 ? 'var(--gn)' : o.probability >= 60 ? 'var(--am)' : 'var(--t3)',
                    color: '#fff',
                  }}>{o.probability}%</span>
                </td>
                <td style={{ padding: '8px 10px', fontWeight: 800, color: 'var(--gn)', fontFamily: 'var(--fm)' }}>+{o.deltaMRR} CHF</td>
                <td style={{ padding: '8px 10px' }}>
                  <button style={{ ...btnP, padding: '4px 10px', fontSize: 10 }}>Contacter</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function RevenueTab({ data }: { data: typeof REVENUE_MONTHS }) {
  return (
    <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
        <div style={sectionTitle}>Détail revenus mensuels</div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'var(--ff)' }}>
        <thead>
          <tr style={{ background: 'var(--surf3)', borderBottom: '1.5px solid var(--border)' }}>
            {['Mois','MRR','Nouveau MRR','Expansion','Churn MRR','Net'].map(h => (
              <th key={h} style={{ padding: '8px 12px', textAlign: 'right', fontSize: 9, fontWeight: 800, color: 'var(--t4)', textTransform: 'uppercase' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((r, i) => {
            const net = r.newMRR + r.expansion - r.churnMRR
            return (
              <tr key={r.month} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 12px', fontWeight: 700, textAlign: 'right' }}>{r.month}</td>
                <td style={{ padding: '8px 12px', fontWeight: 800, color: 'var(--bl)', fontFamily: 'var(--fm)', textAlign: 'right' }}>{r.mrr.toLocaleString()}</td>
                <td style={{ padding: '8px 12px', color: 'var(--gn)', fontWeight: 700, fontFamily: 'var(--fm)', textAlign: 'right' }}>+{r.newMRR}</td>
                <td style={{ padding: '8px 12px', color: '#7c3aed', fontWeight: 700, fontFamily: 'var(--fm)', textAlign: 'right' }}>+{r.expansion}</td>
                <td style={{ padding: '8px 12px', color: 'var(--rd)', fontWeight: 700, fontFamily: 'var(--fm)', textAlign: 'right' }}>-{r.churnMRR}</td>
                <td style={{ padding: '8px 12px', fontWeight: 800, fontFamily: 'var(--fm)', textAlign: 'right', color: net > 0 ? 'var(--gn)' : 'var(--rd)' }}>
                  {net > 0 ? '+' : ''}{net}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
