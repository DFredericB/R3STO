import { useState } from 'react'
import { RADIUS } from '../../utils/design'

type Tab = 'overview' | 'factures' | 'frais' | 'tva' | 'tresorerie'

interface Invoice {
  id: string
  client: string
  date: string
  amount: number
  dueDate: string
  status: 'payee' | 'attente' | 'retard'
}

interface Expense {
  id: string
  category: string
  label: string
  amount: number
  date: string
}

const INVOICES: Invoice[] = [
  { id: 'F-2026-001', client: 'Bistro du Lac', date: '2026-03-01', amount: 590, dueDate: '2026-03-31', status: 'payee' },
  { id: 'F-2026-002', client: 'Le Comptoir', date: '2026-03-01', amount: 790, dueDate: '2026-03-31', status: 'payee' },
  { id: 'F-2026-003', client: 'Chez Marcel', date: '2026-04-01', amount: 390, dueDate: '2026-04-30', status: 'attente' },
  { id: 'F-2026-004', client: 'La Table Ronde', date: '2026-04-01', amount: 590, dueDate: '2026-04-30', status: 'attente' },
  { id: 'F-2026-005', client: 'Auberge du Soleil', date: '2026-02-01', amount: 790, dueDate: '2026-02-28', status: 'retard' },
]

const EXPENSES: Expense[] = [
  { id: 'e1', category: 'Loyer', label: 'Bureau Lausanne', amount: 2800, date: '2026-04-01' },
  { id: 'e2', category: 'Salaires', label: 'Masse salariale mars', amount: 34600, date: '2026-03-25' },
  { id: 'e3', category: 'Fournisseurs', label: 'Infomaniak Hosting', amount: 450, date: '2026-04-05' },
  { id: 'e4', category: 'Marketing', label: 'Google Ads mars', amount: 1200, date: '2026-03-31' },
  { id: 'e5', category: 'IT', label: 'Licences logiciels', amount: 380, date: '2026-04-01' },
  { id: 'e6', category: 'Fournisseurs', label: 'Stripe fees mars', amount: 320, date: '2026-03-31' },
]

const TVA_RATES = [
  { label: 'Taux normal', rate: 8.1, desc: 'Services SaaS, conseil' },
  { label: 'Taux reduit', rate: 2.6, desc: 'Alimentation, boissons' },
  { label: 'Taux special', rate: 3.8, desc: 'Hebergement' },
]

const MONTHS = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec']

const card: React.CSSProperties = { background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: RADIUS.md, padding: 14 }
const btnS: React.CSSProperties = { padding: '8px 16px', borderRadius: RADIUS.sm, background: 'var(--surf3)', color: 'var(--t2)', border: '1px solid var(--border)', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'var(--ff)' }

export function Finance() {
  const [tab, setTab] = useState<Tab>('overview')

  const totalRevenue = INVOICES.reduce((s, i) => s + i.amount, 0)
  const totalExpenses = EXPENSES.reduce((s, e) => s + e.amount, 0)
  const netProfit = totalRevenue - totalExpenses

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: "Vue d'ensemble" },
    { key: 'factures', label: 'Factures' },
    { key: 'frais', label: 'Frais' },
    { key: 'tva', label: 'TVA & Impots' },
    { key: 'tresorerie', label: 'Tresorerie' },
  ]

  const statusMeta: Record<string, { label: string; color: string; bg: string }> = {
    payee: { label: 'Payee', color: 'var(--gn)', bg: 'var(--gp, #e6f9e6)' },
    attente: { label: 'En attente', color: 'var(--am)', bg: 'var(--ap, #fff8e6)' },
    retard: { label: 'En retard', color: 'var(--rd)', bg: 'var(--rp, #fde8e8)' },
  }

  const catColors: Record<string, string> = {
    Loyer: 'var(--bl)', Salaires: 'var(--am)', Fournisseurs: 'var(--gn)', Marketing: '#e855a0', IT: '#8b5cf6',
  }

  return (
    <div style={{ padding: '16px 20px', maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', margin: '0 0 4px', fontFamily: 'var(--ff)' }}>Finance</h1>
      <p style={{ fontSize: 11, color: 'var(--t3)', margin: '0 0 16px', fontFamily: 'var(--ff)' }}>Factures, frais, TVA suisse et tresorerie</p>

      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '2px solid var(--border)', flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '8px 18px', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer',
            fontFamily: 'var(--ff)', background: tab === t.key ? 'var(--surf)' : 'transparent',
            color: tab === t.key ? 'var(--bl)' : 'var(--t3)',
            borderBottom: tab === t.key ? '2px solid var(--bl)' : '2px solid transparent',
            marginBottom: -2, transition: '.15s',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            {[
              { label: 'REVENUS', value: 'CHF ' + totalRevenue.toLocaleString(), color: 'var(--gn)' },
              { label: 'DEPENSES', value: 'CHF ' + totalExpenses.toLocaleString(), color: 'var(--rd)' },
              { label: 'BENEFICE NET', value: 'CHF ' + netProfit.toLocaleString(), color: netProfit >= 0 ? 'var(--gn)' : 'var(--rd)' },
              { label: 'MRR', value: 'CHF ' + Math.round(totalRevenue / 3).toLocaleString(), color: 'var(--bl)' },
            ].map(k => (
              <div key={k.label} style={{ ...card, textAlign: 'center', flex: '1 1 140px', minWidth: 120 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
                <div style={{ fontSize: 9, color: 'var(--t3)', fontWeight: 700, letterSpacing: '.05em' }}>{k.label}</div>
              </div>
            ))}
          </div>
          <div style={{ ...card }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>Repartition des depenses</div>
            {Object.entries(EXPENSES.reduce((acc, e) => { acc[e.category] = (acc[e.category] || 0) + e.amount; return acc }, {} as Record<string, number>)).map(([cat, amount]) => (
              <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ width: 80, fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>{cat}</span>
                <div style={{ flex: 1, height: 8, background: 'var(--surf3)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: catColors[cat] || 'var(--bl)', width: Math.round(amount / totalExpenses * 100) + '%' }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', minWidth: 80, textAlign: 'right' }}>CHF {amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Factures */}
      {tab === 'factures' && (
        <div style={{ overflowX: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'var(--ff)' }}>
            <thead>
              <tr>
                {['N facture', 'Client', 'Date', 'Montant', 'Echeance', 'Statut'].map(h => (
                  <th key={h} style={{ padding: 8, textAlign: 'left', borderBottom: '2px solid var(--border)', color: 'var(--t3)', fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {INVOICES.map(inv => {
                const meta = statusMeta[inv.status]
                return (
                  <tr key={inv.id}>
                    <td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontWeight: 600, color: 'var(--text)' }}>{inv.id}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid var(--border)', color: 'var(--text)' }}>{inv.client}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid var(--border)', color: 'var(--t3)' }}>{inv.date}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontWeight: 700, color: 'var(--text)' }}>CHF {inv.amount}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid var(--border)', color: 'var(--t3)' }}>{inv.dueDate}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid var(--border)' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700, background: meta.bg, color: meta.color }}>{meta.label}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Frais */}
      {tab === 'frais' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {EXPENSES.map(exp => (
            <div key={exp.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <span style={{ padding: '3px 10px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: 'var(--surf3)', color: catColors[exp.category] || 'var(--t3)' }}>{exp.category}</span>
              <div style={{ flex: '1 1 200px', minWidth: 150 }}>
                <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text)' }}>{exp.label}</div>
                <div style={{ fontSize: 10, color: 'var(--t4)' }}>{exp.date}</div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--rd)' }}>- CHF {exp.amount.toLocaleString()}</span>
            </div>
          ))}
          <div style={{ ...card, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Total depenses</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--rd)' }}>CHF {totalExpenses.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* TVA */}
      {tab === 'tva' && (
        <div>
          <div style={{ ...card, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>Taux TVA suisses (2024+)</div>
            {TVA_RATES.map(t => (
              <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '8px 0', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--bl)', minWidth: 60 }}>{t.rate}%</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text)' }}>{t.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--t4)' }}>{t.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ ...card }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>Estimation TVA sur revenus</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text)' }}>Revenus SaaS (8.1%)</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>CHF {Math.round(totalRevenue * 0.081).toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text)' }}>Impot sur benefice (14.7%)</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>CHF {Math.round(Math.max(0, netProfit) * 0.147).toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Benefice net apres impots</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--gn)' }}>CHF {Math.round(Math.max(0, netProfit) * (1 - 0.147)).toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tresorerie */}
      {tab === 'tresorerie' && (
        <div style={{ overflowX: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'var(--ff)' }}>
            <thead>
              <tr>
                {['Mois', 'Revenus', 'Depenses', 'Net', 'Marge'].map(h => (
                  <th key={h} style={{ padding: 8, textAlign: 'left', borderBottom: '2px solid var(--border)', color: 'var(--t3)', fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MONTHS.slice(0, 6).map((m, i) => {
                const revBase = [3200, 3650, 4100, 4700, 5300, 5850]
                const expBase = [12400, 12800, 13100, 12900, 13500, 13200]
                const rev = revBase[i]
                const exp = expBase[i]
                const net = rev - exp
                const margin = rev > 0 ? Math.round(net / rev * 100) : 0
                return (
                  <tr key={m}>
                    <td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontWeight: 600, color: 'var(--text)' }}>{m} 2026</td>
                    <td style={{ padding: 8, borderBottom: '1px solid var(--border)', color: 'var(--gn)', fontWeight: 600 }}>CHF {rev.toLocaleString()}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid var(--border)', color: 'var(--rd)', fontWeight: 600 }}>CHF {exp.toLocaleString()}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontWeight: 700, color: net >= 0 ? 'var(--gn)' : 'var(--rd)' }}>CHF {net.toLocaleString()}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid var(--border)', color: 'var(--t3)' }}>{margin}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
