import { useState } from 'react'
import { useToast } from '../../components/ui/Toast'

interface Automation {
  id: string
  name: string
  trigger: string
  canal: string
  active: boolean
  sent: number
}

const MARKETING_AUTO: Automation[] = [
  { id: '1', name: 'Bienvenue nouveau client', trigger: 'Première réservation', canal: 'Email + SMS', active: true, sent: 247 },
  { id: '2', name: 'Rappel 24h', trigger: '24h avant réservation', canal: 'SMS', active: true, sent: 1523 },
  { id: '3', name: 'Remerciement post-visite', trigger: 'Après visite confirmée', canal: 'Email', active: true, sent: 890 },
  { id: '4', name: 'Relance 30 jours', trigger: 'Pas vu depuis 30j', canal: 'Email', active: false, sent: 312 },
  { id: '5', name: 'Anniversaire client', trigger: 'Date d\'anniversaire', canal: 'Email + SMS', active: true, sent: 45 },
]

export function Marketing() {
  const { toast } = useToast()
  const [automations, setAutomations] = useState(MARKETING_AUTO)

  const toggleMarket = (id: string) => {
    setAutomations(prev => prev.map(m => m.id === id ? { ...m, active: !m.active } : m))
    toast('Automation modifiée', 'success')
  }

  const totalSent = automations.reduce((s, m) => s + m.sent, 0)
  const activeCount = automations.filter(m => m.active).length

  return (
    <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 20, overflow: 'auto', height: 'calc(100vh - var(--hh))' }}>
      {/* Page Header */}
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text)', margin: 0 }}>Marketing</h2>
        <p style={{ fontSize: 13, color: 'var(--t2)', margin: '8px 0 0 0' }}>
          5 automations · emails & SMS configurables
        </p>
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button
            onClick={() => toast('Nouvelle automation créée', 'success')}
            style={{
              padding: '8px 12px',
              borderRadius: 4,
              border: 'none',
              background: 'var(--bl)',
              color: 'white',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            ➕ Nouvelle automation
          </button>
          <button
            onClick={() => toast('Statistiques détaillées', 'success')}
            style={{
              padding: '8px 12px',
              borderRadius: 4,
              border: '1px solid var(--border)',
              background: 'var(--surf2)',
              color: 'var(--text)',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            📊 Statistiques
          </button>
        </div>
      </div>

      {/* KPI Cards - 3 column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t3)', marginBottom: 8 }}>Automations actives</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--gn)', fontFamily: 'var(--fm)' }}>{activeCount}</div>
        </div>
        <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t3)', marginBottom: 8 }}>Envois ce mois</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--bl)', fontFamily: 'var(--fm)' }}>{totalSent}</div>
          <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>messages</div>
        </div>
        <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t3)', marginBottom: 8 }}>Taux ouverture</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--gn)', fontFamily: 'var(--fm)' }}>68%</div>
          <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>↑ vs 55% moyen</div>
        </div>
      </div>

      {/* Section Label */}
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.07em' }}>
        Mes automations
      </div>

      {/* Automation Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {automations.map((m) => (
          <div key={m.id} style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>{m.name}</div>
                <div style={{ fontSize: 11, fontFamily: 'var(--fm)', color: 'var(--t3)' }}>
                  🎯 {m.trigger} · 📧 {m.canal}
                </div>
                <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 3 }}>{m.sent} envois ce mois</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <span style={{
                  display: 'inline-block',
                  padding: '3px 8px',
                  borderRadius: 3,
                  background: m.active ? 'var(--gn)20' : 'var(--t3)20',
                  color: m.active ? 'var(--gn)' : 'var(--t3)',
                  fontSize: 11,
                  fontWeight: 700,
                }}>
                  {m.active ? 'Actif' : 'Inactif'}
                </span>
                <button
                  onClick={() => toast('Modifier automation', 'success')}
                  style={{
                    fontSize: 11,
                    padding: '3px 8px',
                    borderRadius: 3,
                    border: '1px solid var(--border)',
                    background: 'var(--surf2)',
                    color: 'var(--text)',
                    cursor: 'pointer',
                  }}
                >
                  ✏️
                </button>
                <button
                  onClick={() => toggleMarket(m.id)}
                  style={{
                    fontSize: 11,
                    padding: '3px 8px',
                    borderRadius: 3,
                    border: `1px solid ${m.active ? 'var(--rd)' : 'var(--gn)'}`,
                    background: m.active ? 'var(--rd)20' : 'var(--gn)20',
                    color: m.active ? 'var(--rd)' : 'var(--gn)',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                >
                  {m.active ? 'Désactiver' : 'Activer'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
