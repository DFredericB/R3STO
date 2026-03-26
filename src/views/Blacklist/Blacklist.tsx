import { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useToast } from '../../components/ui/Toast'

interface BlacklistedClient {
  id: string
  n: string
  tel: string
  score: number
  level: 1 | 2 | 3 | 4
  reason: string
  active: boolean
}

const BLACKLIST: BlacklistedClient[] = [
  { id: '1', n: 'Jean Dupont', tel: '+33612345678', score: 92, level: 4, reason: 'Ban total - 5 no-shows', active: true },
  { id: '2', n: 'Marie Lefevre', tel: '+33623456789', score: 78, level: 3, reason: 'Interdit - Comportement agressif', active: true },
  { id: '3', n: 'Pierre Martin', tel: '+33634567890', score: 55, level: 2, reason: 'Attention - 3 no-shows', active: true },
  { id: '4', n: 'Sophie Bernard', tel: '+33645678901', score: 32, level: 1, reason: 'Surveillance - 1 no-show', active: true },
]

const levelMap = {
  1: { c: 'var(--am)', l: '⚠️ Surveillance' },
  2: { c: 'var(--rd)', l: '🔴 Attention' },
  3: { c: 'var(--rd)', l: '🔴 Interdit' },
  4: { c: 'var(--rd)', l: '⛔ Ban total' },
}

export function Blacklist() {
  const { toast } = useToast()
  const [clients, setClients] = useState(BLACKLIST)

  const activeCount = clients.filter(c => c.active).length
  const level34Count = clients.filter(c => c.level >= 3).length
  const avgScore = Math.round(clients.reduce((sum, c) => sum + c.score, 0) / clients.length)

  return (
    <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 20, overflow: 'auto', height: 'calc(100vh - var(--hh))' }}>
      {/* Page Header */}
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text)', margin: 0 }}>Clients bloqués</h2>
        <p style={{ fontSize: 13, color: 'var(--t2)', margin: '8px 0 0 0' }}>
          {activeCount} clients surveillés · 4 niveaux d'alerte
        </p>
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button
            onClick={() => toast('Ajouter à la blacklist', 'success')}
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
            ➕ Ajouter
          </button>
          <button
            onClick={() => toast('Export CSV', 'success')}
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
            📊 Exporter
          </button>
        </div>
      </div>

      {/* KPI Cards - 4 column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t3)', marginBottom: 8 }}>Total inscrits</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--bl)', fontFamily: 'var(--fm)' }}>{clients.length}</div>
        </div>
        <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t3)', marginBottom: 8 }}>Actifs</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--rd)', fontFamily: 'var(--fm)' }}>{activeCount}</div>
        </div>
        <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t3)', marginBottom: 8 }}>Niveau 3-4</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--rd)', fontFamily: 'var(--fm)' }}>{level34Count}</div>
        </div>
        <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t3)', marginBottom: 8 }}>Score moyen</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--bl)', fontFamily: 'var(--fm)' }}>{avgScore}</div>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflow: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 13,
          minWidth: 600,
        }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: 12, fontSize: 11, fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Nom</th>
              <th style={{ textAlign: 'left', padding: 12, fontSize: 11, fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Téléphone</th>
              <th style={{ textAlign: 'left', padding: 12, fontSize: 11, fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Score</th>
              <th style={{ textAlign: 'left', padding: 12, fontSize: 11, fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Niveau</th>
              <th style={{ textAlign: 'left', padding: 12, fontSize: 11, fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Raison</th>
              <th style={{ textAlign: 'left', padding: 12, fontSize: 11, fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((b) => {
              const lv = levelMap[b.level]
              const scoreColor = b.score > 70 ? 'var(--rd)' : b.score > 40 ? 'var(--am)' : 'var(--bl)'
              return (
                <tr key={b.id} style={{ opacity: b.active ? 1 : 0.5, borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: 12 }}>
                    <strong>{b.n}</strong>
                  </td>
                  <td style={{ padding: 12, fontFamily: 'var(--fm)', fontSize: 11 }}>
                    {b.tel}
                  </td>
                  <td style={{ padding: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{
                        flex: 1,
                        maxWidth: 60,
                        height: 5,
                        background: 'var(--surf3)',
                        borderRadius: 3,
                        overflow: 'hidden',
                      }}>
                        <div style={{ height: '100%', background: scoreColor, width: `${b.score}%` }} />
                      </div>
                      <span style={{ fontSize: 11, fontFamily: 'var(--fm)', fontWeight: 700 }}>{b.score}</span>
                    </div>
                  </td>
                  <td style={{ padding: 12 }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '3px 8px',
                      borderRadius: 3,
                      background: lv.c + '30',
                      border: `1px solid ${lv.c}`,
                      color: lv.c,
                      fontSize: 11,
                      fontWeight: 700,
                    }}>
                      {lv.l}
                    </span>
                  </td>
                  <td style={{ padding: 12, fontSize: 11, color: 'var(--t3)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {b.reason}
                  </td>
                  <td style={{ padding: 12 }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        onClick={() => toast('Fiche ouverte', 'success')}
                        style={{
                          fontSize: 11,
                          padding: '3px 7px',
                          borderRadius: 3,
                          border: '1px solid var(--border)',
                          background: 'var(--surf2)',
                          color: 'var(--text)',
                          cursor: 'pointer',
                        }}
                      >
                        👁
                      </button>
                      {b.active && (
                        <button
                          onClick={() => toast('Réhabilité', 'success')}
                          style={{
                            fontSize: 11,
                            padding: '3px 7px',
                            borderRadius: 3,
                            border: '1px solid var(--gn)',
                            background: 'var(--gn)20',
                            color: 'var(--gn)',
                            cursor: 'pointer',
                          }}
                        >
                          ✓
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
