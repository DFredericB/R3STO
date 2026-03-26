import { useState } from 'react'
import { useToast } from '../../components/ui/Toast'

interface PaymentConfig {
  mode: 'empreinte' | 'acompte'
  trigger: 'groupe' | 'all' | 'never'
  minCvt: number
  montantPP: number
  pctTotal: number
  delaiRmb: number
  stripeConnected: boolean
}

interface Transaction {
  n: string
  svc: string
  c: number
  date: string
  montant: number
  mode: 'Empreinte' | 'Acompte'
  status: 'en attente' | 'encaissé' | 'remboursé' | 'validée'
}

const TRANSACTIONS: Transaction[] = [
  { n: 'Dupont Jean', svc: 'Midi', c: 4, date: '2024-12-20', montant: 0, mode: 'Empreinte', status: 'validée' },
  { n: 'Martin Sophie', svc: 'Soir', c: 2, date: '2024-12-19', montant: 45, mode: 'Acompte', status: 'encaissé' },
  { n: 'Bernard Paul', svc: 'Midi', c: 6, date: '2024-12-18', montant: 80, mode: 'Acompte', status: 'en attente' },
]

export function Prepaiement() {
  const { toast } = useToast()
  const [cfg, setCfg] = useState<PaymentConfig>({
    mode: 'empreinte',
    trigger: 'groupe',
    minCvt: 6,
    montantPP: 0,
    pctTotal: 25,
    delaiRmb: 48,
    stripeConnected: true,
  })
  const [txns] = useState<Transaction[]>(TRANSACTIONS)

  const encaisse = txns.filter(t => t.montant > 0 && (t.status === 'encaissé' || t.status.includes('encaissé'))).reduce((s, t) => s + t.montant, 0)
  const attente = txns.filter(t => t.status === 'en attente').reduce((s, t) => s + t.montant, 0)
  const empreintes = txns.filter(t => t.mode === 'Empreinte' && t.status === 'validée').length

  return (
    <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 20, overflow: 'auto', height: 'calc(100vh - var(--hh))' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text)', margin: 0 }}>Prépaiement</h2>
        <p style={{ fontSize: 13, color: 'var(--t2)', margin: '8px 0 0 0' }}>
          Anti no-show · Acomptes en ligne · Stripe
        </p>
      </div>

      {/* KPI Cards - 4 columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t3)', marginBottom: 8 }}>Encaissé ce mois</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--gn)', fontFamily: 'var(--fm)' }}>CHF {encaisse}</div>
          <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>+12% vs mars</div>
        </div>
        <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t3)', marginBottom: 8 }}>En attente</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--am)', fontFamily: 'var(--fm)' }}>CHF {attente}</div>
          <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>{txns.filter(t => t.status === 'en attente').length} transaction</div>
        </div>
        <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t3)', marginBottom: 8 }}>Empreintes actives</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--bl)', fontFamily: 'var(--fm)' }}>{empreintes}</div>
          <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>résas garanties</div>
        </div>
        <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t3)', marginBottom: 8 }}>No-shows évités</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--pu)', fontFamily: 'var(--fm)' }}>3</div>
          <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>-60% vs avant</div>
        </div>
      </div>

      {/* Config Cards - 2 columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {/* Mode & Trigger */}
        <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Mode de garantie</div>

          {/* Mode selector */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
            <button
              onClick={() => setCfg({ ...cfg, mode: 'empreinte' })}
              style={{
                padding: 12,
                borderRadius: 10,
                border: `2px solid ${cfg.mode === 'empreinte' ? 'var(--bl)' : 'var(--border)'}`,
                background: cfg.mode === 'empreinte' ? 'var(--bp)' : 'var(--surf)',
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 18, marginBottom: 4 }}>🔒</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>Empreinte CB</div>
              <div style={{ fontSize: 11, color: 'var(--t3)' }}>CHF 0 débité · Encaissement si no-show</div>
            </button>
            <button
              onClick={() => setCfg({ ...cfg, mode: 'acompte' })}
              style={{
                padding: 12,
                borderRadius: 10,
                border: `2px solid ${cfg.mode === 'acompte' ? 'var(--bl)' : 'var(--border)'}`,
                background: cfg.mode === 'acompte' ? 'var(--bp)' : 'var(--surf)',
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 18, marginBottom: 4 }}>💰</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>Acompte</div>
              <div style={{ fontSize: 11, color: 'var(--t3)' }}>Montant encaissé à la réservation</div>
            </button>
          </div>

          {/* Trigger */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)' }}>Déclencher pour</label>
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              <button
                onClick={() => setCfg({ ...cfg, trigger: 'groupe' })}
                style={{
                  padding: '6px 12px',
                  borderRadius: 20,
                  border: `1px solid ${cfg.trigger === 'groupe' ? 'var(--bl)' : 'var(--border)'}`,
                  background: cfg.trigger === 'groupe' ? 'var(--bp)' : 'transparent',
                  color: cfg.trigger === 'groupe' ? 'var(--bl)' : 'var(--text)',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Groupes {cfg.minCvt}+ pers.
              </button>
              <button
                onClick={() => setCfg({ ...cfg, trigger: 'all' })}
                style={{
                  padding: '6px 12px',
                  borderRadius: 20,
                  border: `1px solid ${cfg.trigger === 'all' ? 'var(--bl)' : 'var(--border)'}`,
                  background: cfg.trigger === 'all' ? 'var(--bp)' : 'transparent',
                  color: cfg.trigger === 'all' ? 'var(--bl)' : 'var(--text)',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Toutes résas
              </button>
              <button
                onClick={() => setCfg({ ...cfg, trigger: 'never' })}
                style={{
                  padding: '6px 12px',
                  borderRadius: 20,
                  border: `1px solid ${cfg.trigger === 'never' ? 'var(--bl)' : 'var(--border)'}`,
                  background: cfg.trigger === 'never' ? 'var(--bp)' : 'transparent',
                  color: cfg.trigger === 'never' ? 'var(--bl)' : 'var(--text)',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Désactivé
              </button>
            </div>
          </div>

          {cfg.trigger === 'groupe' && (
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)' }}>Minimum couverts</label>
              <input
                type="number"
                value={cfg.minCvt}
                onChange={(e) => setCfg({ ...cfg, minCvt: +e.target.value })}
                min="2"
                max="50"
                style={{
                  width: '100%',
                  marginTop: 6,
                  padding: '8px 10px',
                  borderRadius: 4,
                  border: '1px solid var(--border)',
                  background: 'var(--surf2)',
                  color: 'var(--text)',
                  fontFamily: 'var(--fm)',
                  fontWeight: 700,
                }}
              />
            </div>
          )}

          {cfg.mode === 'acompte' && (
            <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)' }}>CHF par personne</label>
                <input
                  type="number"
                  value={cfg.montantPP}
                  onChange={(e) => setCfg({ ...cfg, montantPP: +e.target.value })}
                  min="1"
                  style={{
                    width: '100%',
                    marginTop: 6,
                    padding: '8px 10px',
                    borderRadius: 4,
                    border: '1px solid var(--border)',
                    background: 'var(--surf2)',
                    color: 'var(--text)',
                    fontFamily: 'var(--fm)',
                    fontWeight: 700,
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)' }}>Ou % total</label>
                <input
                  type="number"
                  value={cfg.pctTotal}
                  onChange={(e) => setCfg({ ...cfg, pctTotal: +e.target.value })}
                  min="1"
                  max="100"
                  style={{
                    width: '100%',
                    marginTop: 6,
                    padding: '8px 10px',
                    borderRadius: 4,
                    border: '1px solid var(--border)',
                    background: 'var(--surf2)',
                    color: 'var(--text)',
                    fontFamily: 'var(--fm)',
                    fontWeight: 700,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Stripe */}
        <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Stripe</div>
          {cfg.stripeConnected ? (
            <div style={{ padding: '10px 12px', borderRadius: 6, background: 'var(--gn)20', border: '1px solid var(--gn)', color: 'var(--gn)', fontSize: 11, fontWeight: 700, marginBottom: 12 }}>
              Stripe connecté · Mode production
            </div>
          ) : (
            <>
              <div style={{ padding: '10px 12px', borderRadius: 6, background: 'var(--rd)20', border: '1px solid var(--rd)', color: 'var(--rd)', fontSize: 11, fontWeight: 700, marginBottom: 12 }}>
                Stripe non connecté
              </div>
              <button
                onClick={() => toast('Connexion Stripe', 'success')}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  marginBottom: 12,
                  borderRadius: 4,
                  border: 'none',
                  background: 'var(--bl)',
                  color: 'white',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Connecter Stripe
              </button>
            </>
          )}

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)' }}>Délai remboursement auto</label>
            <select
              value={cfg.delaiRmb}
              onChange={(e) => setCfg({ ...cfg, delaiRmb: +e.target.value })}
              style={{
                width: '100%',
                marginTop: 6,
                padding: '8px 10px',
                borderRadius: 4,
                border: '1px solid var(--border)',
                background: 'var(--surf2)',
                color: 'var(--text)',
                fontFamily: 'var(--fm)',
                fontSize: 11,
              }}
            >
              <option value={24}>24h après no-show</option>
              <option value={48}>48h après no-show</option>
              <option value={72}>72h après no-show</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)' }}>Message client (confirmation)</label>
            <textarea
              rows={3}
              defaultValue={`Votre réservation est confirmée.${cfg.mode === 'empreinte' ? ' Une empreinte CB a été prise en garantie.' : ' Un acompte de {montant} CHF a été prélevé.'}`}
              style={{
                width: '100%',
                marginTop: 6,
                padding: '8px 10px',
                borderRadius: 4,
                border: '1px solid var(--border)',
                background: 'var(--surf2)',
                color: 'var(--text)',
                fontFamily: 'var(--fm)',
                fontSize: 11,
                resize: 'vertical',
              }}
            />
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 12 }}>
          Transactions récentes
        </div>
        <div style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 520 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: 12, fontSize: 11, fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Client</th>
                <th style={{ textAlign: 'left', padding: 12, fontSize: 11, fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Date</th>
                <th style={{ textAlign: 'left', padding: 12, fontSize: 11, fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Mode</th>
                <th style={{ textAlign: 'left', padding: 12, fontSize: 11, fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Montant</th>
                <th style={{ textAlign: 'left', padding: 12, fontSize: 11, fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Statut</th>
                <th style={{ textAlign: 'left', padding: 12, fontSize: 11, fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.05em' }}></th>
              </tr>
            </thead>
            <tbody>
              {txns.map((t, i) => {
                const sc = t.status === 'encaissé' || t.status === 'validée' || t.status.includes('encaissé') ? 'var(--gn)' : t.status === 'remboursé' ? 'var(--am)' : t.status === 'en attente' ? 'var(--bp)' : 'var(--rd)'
                const amt = t.montant > 0 ? 'CHF ' + t.montant : t.mode === 'Empreinte' ? '—' : 'CHF 0'
                return (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: 12 }}>
                      <strong>{t.n}</strong>
                      <div style={{ fontSize: 11, color: 'var(--t3)' }}>{t.svc} · {t.c}p</div>
                    </td>
                    <td style={{ padding: 12, fontSize: 11, color: 'var(--t3)' }}>{t.date}</td>
                    <td style={{ padding: 12 }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 8px',
                        borderRadius: 3,
                        background: t.mode === 'Empreinte' ? 'var(--am)20' : 'var(--bp)20',
                        color: t.mode === 'Empreinte' ? 'var(--am)' : 'var(--bp)',
                        fontSize: 11,
                        fontWeight: 700,
                      }}>
                        {t.mode}
                      </span>
                    </td>
                    <td style={{ padding: 12, fontFamily: 'var(--fm)', fontWeight: 800, color: t.montant > 0 ? 'var(--gn)' : 'var(--t2)' }}>
                      {amt}
                    </td>
                    <td style={{ padding: 12 }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 8px',
                        borderRadius: 3,
                        background: sc === 'var(--gn)' ? 'var(--gn)20' : sc === 'var(--am)' ? 'var(--am)20' : sc === 'var(--bp)' ? 'var(--bp)20' : 'var(--rd)20',
                        color: sc,
                        fontSize: 11,
                        fontWeight: 700,
                      }}>
                        {t.status}
                      </span>
                    </td>
                    <td style={{ padding: 12 }}>
                      {t.status === 'en attente' && (
                        <button
                          onClick={() => toast('Encaissement déclenché', 'success')}
                          style={{
                            fontSize: 11,
                            padding: '2px 7px',
                            borderRadius: 3,
                            border: '1px solid var(--gn)',
                            background: 'var(--gn)20',
                            color: 'var(--gn)',
                            cursor: 'pointer',
                            fontWeight: 700,
                          }}
                        >
                          Encaisser
                        </button>
                      )}
                      {t.status === 'encaissé' && (
                        <button
                          onClick={() => toast('Remboursement initié', 'success')}
                          style={{
                            fontSize: 11,
                            padding: '2px 7px',
                            borderRadius: 3,
                            border: '1px solid var(--border)',
                            background: 'var(--surf2)',
                            color: 'var(--text)',
                            cursor: 'pointer',
                          }}
                        >
                          Rembourser
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
