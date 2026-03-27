// ══════════════════════════════════════════════════
//  R3STO — Programme Fidélité
//  Gestion des cartes de fidélité clients
//  Modes : Tampons · Points · Cashback
// ══════════════════════════════════════════════════

import { useState, useMemo } from 'react'
import { useAppStore } from '../../store/useAppStore'
import type { LoyaltyCard, LoyaltyEvent, LoyaltyMode } from '../../types'

// ── Design tokens ────────────────────────────────
const R  = 10
const FF = 'var(--ff)'
const FM = 'var(--fm)'

const card = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: 'var(--surf)', border: '1px solid var(--border)',
  borderRadius: R, padding: 16, ...extra
})
const pill = (active: boolean): React.CSSProperties => ({
  padding: '6px 14px', borderRadius: 20,
  fontSize: 12, fontWeight: 600, fontFamily: FF,
  border: `1px solid ${active ? 'var(--bl)' : 'var(--border)'}`,
  background: active ? 'var(--bp)' : 'transparent',
  color: active ? 'var(--bl)' : 'var(--t3)',
  cursor: 'pointer', transition: 'all .15s',
})
const kpiBox: React.CSSProperties = {
  ...card(), flex: 1, minWidth: 160, textAlign: 'center',
}
const label: React.CSSProperties = {
  fontSize: 11, color: 'var(--t4)', fontWeight: 600, marginBottom: 6, fontFamily: FF,
}
const bigNum: React.CSSProperties = {
  fontSize: 28, fontWeight: 800, fontFamily: FM, color: 'var(--t1)',
}
const btn = (variant: 'primary' | 'ghost' | 'danger' = 'primary'): React.CSSProperties => ({
  padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, fontFamily: FF,
  border: variant === 'ghost' ? '1px solid var(--border)' : 'none',
  background: variant === 'primary' ? 'var(--bl)' : variant === 'danger' ? '#ef4444' : 'transparent',
  color: variant === 'ghost' ? 'var(--t2)' : '#fff',
  cursor: 'pointer', transition: 'all .15s',
})
const input: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 8, fontSize: 13, fontFamily: FF,
  border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--t1)',
  width: '100%', outline: 'none',
}
const selectStyle: React.CSSProperties = { ...input, appearance: 'none' as const }

// ── Helpers ──────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 10)
const today = () => new Date().toISOString().slice(0, 10)

const MODE_LABELS: Record<LoyaltyMode, { fr: string; icon: string; unit: string }> = {
  stamps:   { fr: 'Tampons',  icon: '🔖', unit: 'tampon(s)' },
  points:   { fr: 'Points',   icon: '⭐', unit: 'point(s)' },
  cashback: { fr: 'Cashback', icon: '💰', unit: 'CHF' },
}

export function Fidelite() {
  const {
    loyaltyConfig, loyaltyCards, clients,
    updateLoyaltyConfig, addLoyaltyCard, updateLoyaltyCard, deleteLoyaltyCard, addLoyaltyEvent
  } = useAppStore()

  type Tab = 'dashboard' | 'members' | 'config'
  const [tab, setTab] = useState<Tab>('dashboard')
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [selectedCard, setSelectedCard] = useState<string | null>(null)
  const [showStamp, setShowStamp] = useState<string | null>(null)
  const [stampAmount, setStampAmount] = useState(1)

  const cfg = loyaltyConfig
  const mode = cfg.mode
  const modeInfo = MODE_LABELS[mode]

  // ── KPI calculations ──────────────────────────
  const totalMembers = loyaltyCards.length
  const activeMembers = loyaltyCards.filter(c => {
    const last = new Date(c.lastActivity)
    const ago = (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24)
    return ago <= 90
  }).length
  const totalRewardsUsed = loyaltyCards.reduce((a, c) => a + c.rewardsUsed, 0)
  const totalPointsCirculation = loyaltyCards.reduce((a, c) => {
    if (mode === 'stamps') return a + c.stamps
    if (mode === 'cashback') return a + c.cashbackBalance
    return a + c.points
  }, 0)

  // ── Filter members ────────────────────────────
  const filtered = useMemo(() => {
    let list = [...loyaltyCards]
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        c.clientName.toLowerCase().includes(q) || c.clientEmail.toLowerCase().includes(q)
      )
    }
    return list.sort((a, b) => {
      const valA = mode === 'stamps' ? a.stamps : mode === 'cashback' ? a.cashbackBalance : a.points
      const valB = mode === 'stamps' ? b.stamps : mode === 'cashback' ? b.cashbackBalance : b.points
      return valB - valA
    })
  }, [loyaltyCards, search, mode])

  // ── Add member from client list ────────────────
  const [addClientId, setAddClientId] = useState('')
  const availableClients = clients.filter(
    c => !loyaltyCards.some(lc => lc.clientId === c.id)
  )

  function handleAddMember() {
    const client = clients.find(c => c.id === addClientId)
    if (!client) return
    const newCard: LoyaltyCard = {
      id: uid(),
      clientId: client.id,
      clientName: `${client.prenom} ${client.nom}`,
      clientEmail: client.email,
      points: cfg.welcomeBonus,
      stamps: mode === 'stamps' ? cfg.welcomeBonus : 0,
      cashbackBalance: 0,
      totalEarned: cfg.welcomeBonus,
      rewardsUsed: 0,
      joinedAt: Date.now(),
      lastActivity: today(),
      history: cfg.welcomeBonus > 0 ? [{
        id: uid(), date: today(), type: 'bonus',
        amount: cfg.welcomeBonus, label: 'Bonus bienvenue'
      }] : []
    }
    addLoyaltyCard(newCard)
    setShowAdd(false)
    setAddClientId('')
  }

  // ── Stamp / earn ──────────────────────────────
  function handleEarn(cardId: string) {
    const event: LoyaltyEvent = {
      id: uid(), date: today(), type: 'earn',
      amount: stampAmount,
      label: mode === 'stamps'
        ? `+${stampAmount} tampon${stampAmount > 1 ? 's' : ''} (visite)`
        : mode === 'cashback'
        ? `+${stampAmount.toFixed(2)} CHF cashback`
        : `+${stampAmount} point${stampAmount > 1 ? 's' : ''}`
    }
    addLoyaltyEvent(cardId, event)
    setShowStamp(null)
    setStampAmount(1)
  }

  // ── Redeem ────────────────────────────────────
  function handleRedeem(cardId: string) {
    const c = loyaltyCards.find(lc => lc.id === cardId)
    if (!c) return
    const current = mode === 'stamps' ? c.stamps : mode === 'cashback' ? c.cashbackBalance : c.points
    if (current < cfg.rewardThreshold) return
    const event: LoyaltyEvent = {
      id: uid(), date: today(), type: 'redeem',
      amount: cfg.rewardThreshold,
      label: `Récompense : ${cfg.rewardName}`
    }
    addLoyaltyEvent(cardId, event)
  }

  // ── Detail view ───────────────────────────────
  const detail = selectedCard ? loyaltyCards.find(c => c.id === selectedCard) : null

  // ══════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--t1)', fontFamily: FF, margin: 0 }}>
            🏆 Programme Fidélité
          </h1>
          <p style={{ fontSize: 13, color: 'var(--t3)', marginTop: 4, fontFamily: FF }}>
            {cfg.active
              ? `Mode ${modeInfo.fr} — ${totalMembers} membre${totalMembers > 1 ? 's' : ''}`
              : 'Programme désactivé — configurez et activez ci-dessous'
            }
          </p>
        </div>
        {cfg.active && (
          <button style={btn('primary')} onClick={() => setShowAdd(true)}>
            + Inscrire client
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['dashboard', 'members', 'config'] as Tab[]).map(t => (
          <button key={t} style={pill(tab === t)} onClick={() => { setTab(t); setSelectedCard(null) }}>
            {t === 'dashboard' ? '📊 Tableau de bord' : t === 'members' ? '👥 Membres' : '⚙️ Configuration'}
          </button>
        ))}
      </div>

      {/* ═══ TAB: DASHBOARD ═══ */}
      {tab === 'dashboard' && (
        <div>
          {/* KPIs */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
            <div style={kpiBox}>
              <div style={label}>Membres inscrits</div>
              <div style={bigNum}>{totalMembers}</div>
            </div>
            <div style={kpiBox}>
              <div style={label}>Actifs (90j)</div>
              <div style={{ ...bigNum, color: 'var(--gn)' }}>{activeMembers}</div>
            </div>
            <div style={kpiBox}>
              <div style={label}>{modeInfo.fr} en circulation</div>
              <div style={{ ...bigNum, color: 'var(--bl)' }}>
                {mode === 'cashback' ? `${totalPointsCirculation.toFixed(0)} CHF` : totalPointsCirculation}
              </div>
            </div>
            <div style={kpiBox}>
              <div style={label}>Récompenses utilisées</div>
              <div style={{ ...bigNum, color: '#f59e0b' }}>{totalRewardsUsed}</div>
            </div>
          </div>

          {/* Mode summary card */}
          <div style={{ ...card(), marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 32 }}>{modeInfo.icon}</span>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--t1)', fontFamily: FF }}>
                  Mode : {modeInfo.fr}
                </div>
                <div style={{ fontSize: 12, color: 'var(--t3)', fontFamily: FF }}>
                  {mode === 'stamps'
                    ? `${cfg.stampsGoal} tampons pour "${cfg.rewardName}" (${cfg.rewardValue} CHF)`
                    : mode === 'points'
                    ? `${cfg.pointsPerChf} pt/CHF — ${cfg.rewardThreshold} pts = "${cfg.rewardName}"`
                    : `${cfg.cashbackPercent}% cashback — dès ${cfg.rewardThreshold} CHF accumulés`
                  }
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: 'var(--t3)', fontFamily: FF }}>
              {cfg.welcomeBonus > 0 && <span>🎉 Bonus bienvenue : +{cfg.welcomeBonus}</span>}
              {cfg.birthdayBonus > 0 && <span>🎂 Bonus anniversaire : +{cfg.birthdayBonus}</span>}
              {cfg.expirationMonths > 0 && <span>⏰ Expiration : {cfg.expirationMonths} mois</span>}
              {cfg.doublePointsDays.length > 0 && <span>✨ Jours x2 actifs</span>}
            </div>
          </div>

          {/* Top members */}
          {loyaltyCards.length > 0 && (
            <div style={card()}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)', fontFamily: FF, marginBottom: 12 }}>
                🏅 Top membres
              </div>
              {filtered.slice(0, 5).map((c, i) => {
                const val = mode === 'stamps' ? c.stamps : mode === 'cashback' ? c.cashbackBalance : c.points
                const pct = cfg.rewardThreshold > 0 ? Math.min(100, (val / cfg.rewardThreshold) * 100) : 0
                return (
                  <div key={c.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
                    borderTop: i > 0 ? '1px solid var(--border)' : 'none'
                  }}>
                    <span style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: 'var(--bp)', color: 'var(--bl)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 800, fontFamily: FM, flexShrink: 0,
                    }}>{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)', fontFamily: FF }}>
                        {c.clientName}
                      </div>
                      <div style={{ marginTop: 4, height: 6, background: 'var(--bg2)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 3, transition: 'width .3s',
                          width: `${pct}%`,
                          background: pct >= 100 ? 'var(--gn)' : 'var(--bl)',
                        }} />
                      </div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, fontFamily: FM, color: 'var(--t1)', minWidth: 60, textAlign: 'right' }}>
                      {mode === 'cashback' ? `${val.toFixed(0)}.-` : val}
                      <span style={{ fontSize: 10, color: 'var(--t4)', marginLeft: 2 }}>
                        /{cfg.rewardThreshold}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {loyaltyCards.length === 0 && cfg.active && (
            <div style={{ ...card(), textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🏆</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--t2)', fontFamily: FF }}>
                Aucun membre encore
              </div>
              <div style={{ fontSize: 12, color: 'var(--t3)', fontFamily: FF, marginTop: 4 }}>
                Inscrivez votre premier client au programme
              </div>
              <button style={{ ...btn('primary'), marginTop: 16 }} onClick={() => setShowAdd(true)}>
                + Inscrire un client
              </button>
            </div>
          )}

          {!cfg.active && (
            <div style={{ ...card(), textAlign: 'center', padding: 40, border: '2px dashed var(--border)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>⚙️</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--t2)', fontFamily: FF }}>
                Programme non activé
              </div>
              <div style={{ fontSize: 12, color: 'var(--t3)', fontFamily: FF, marginTop: 4 }}>
                Allez dans Configuration pour choisir votre mode et activer le programme
              </div>
              <button style={{ ...btn('primary'), marginTop: 16 }} onClick={() => setTab('config')}>
                Configurer
              </button>
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB: MEMBERS ═══ */}
      {tab === 'members' && !detail && (
        <div>
          {/* Search */}
          <div style={{ marginBottom: 16 }}>
            <input
              style={input}
              placeholder="🔍 Rechercher un membre…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Member list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(c => {
              const val = mode === 'stamps' ? c.stamps : mode === 'cashback' ? c.cashbackBalance : c.points
              const pct = cfg.rewardThreshold > 0 ? Math.min(100, (val / cfg.rewardThreshold) * 100) : 0
              const canRedeem = val >= cfg.rewardThreshold
              return (
                <div key={c.id} style={{
                  ...card({ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', transition: 'all .15s' })
                }}
                  onClick={() => setSelectedCard(c.id)}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--bl)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 42, height: 42, borderRadius: '50%',
                    background: `linear-gradient(135deg, var(--bl), #8b5cf6)`,
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, fontWeight: 800, fontFamily: FF, flexShrink: 0,
                  }}>
                    {c.clientName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)', fontFamily: FF }}>
                        {c.clientName}
                      </span>
                      {canRedeem && (
                        <span style={{
                          fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                          background: '#f59e0b22', color: '#f59e0b',
                        }}>RÉCOMPENSE</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--t4)', fontFamily: FF, marginTop: 2 }}>
                      {c.clientEmail} · Inscrit le {new Date(c.joinedAt).toLocaleDateString('fr-CH')}
                    </div>
                    {/* Progress */}
                    <div style={{ marginTop: 6, height: 6, background: 'var(--bg2)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 3, transition: 'width .3s',
                        width: `${pct}%`,
                        background: canRedeem ? '#f59e0b' : 'var(--bl)',
                      }} />
                    </div>
                  </div>

                  {/* Value */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, fontFamily: FM, color: 'var(--t1)' }}>
                      {mode === 'cashback' ? `${val.toFixed(0)}.-` : val}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--t4)', fontFamily: FF }}>
                      / {cfg.rewardThreshold} {modeInfo.unit}
                    </div>
                  </div>

                  {/* Quick actions */}
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    <button style={btn('ghost')} onClick={() => { setShowStamp(c.id); setStampAmount(1) }}
                      title="Ajouter">
                      +{modeInfo.icon}
                    </button>
                    {canRedeem && (
                      <button style={{ ...btn('primary'), background: '#f59e0b' }}
                        onClick={() => handleRedeem(c.id)}
                        title="Utiliser récompense">
                        🎁
                      </button>
                    )}
                  </div>
                </div>
              )
            })}

            {filtered.length === 0 && (
              <div style={{ ...card(), textAlign: 'center', padding: 40, color: 'var(--t3)' }}>
                {search ? 'Aucun membre trouvé' : 'Aucun membre inscrit'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ MEMBER DETAIL ═══ */}
      {tab === 'members' && detail && (
        <div>
          <button style={{ ...btn('ghost'), marginBottom: 16 }} onClick={() => setSelectedCard(null)}>
            ← Retour à la liste
          </button>
          <div style={{ ...card(), marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--bl), #8b5cf6)',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, fontWeight: 800, fontFamily: FF,
              }}>
                {detail.clientName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--t1)', fontFamily: FF }}>
                  {detail.clientName}
                </div>
                <div style={{ fontSize: 12, color: 'var(--t3)', fontFamily: FF }}>
                  {detail.clientEmail}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={btn('primary')} onClick={() => { setShowStamp(detail.id); setStampAmount(1) }}>
                  + Ajouter {modeInfo.unit}
                </button>
                {(() => {
                  const val = mode === 'stamps' ? detail.stamps : mode === 'cashback' ? detail.cashbackBalance : detail.points
                  return val >= cfg.rewardThreshold ? (
                    <button style={{ ...btn('primary'), background: '#f59e0b' }} onClick={() => handleRedeem(detail.id)}>
                      🎁 Utiliser récompense
                    </button>
                  ) : null
                })()}
              </div>
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: 16, marginTop: 20, flexWrap: 'wrap' }}>
              {[
                { label: modeInfo.fr, value: mode === 'stamps' ? detail.stamps : mode === 'cashback' ? detail.cashbackBalance : detail.points, color: 'var(--bl)' },
                { label: 'Total gagné', value: detail.totalEarned, color: 'var(--gn)' },
                { label: 'Récompenses', value: detail.rewardsUsed, color: '#f59e0b' },
                { label: 'Dernière activité', value: detail.lastActivity, color: 'var(--t2)', isDate: true },
              ].map((s, i) => (
                <div key={i} style={{ ...card({ background: 'var(--bg2)', flex: 1, minWidth: 120, textAlign: 'center' }) }}>
                  <div style={label}>{s.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, fontFamily: FM, color: s.color }}>
                    {(s as any).isDate ? new Date(s.value).toLocaleDateString('fr-CH') : (mode === 'cashback' && !((s as any).isDate) ? `${Number(s.value).toFixed(0)}.-` : s.value)}
                  </div>
                </div>
              ))}
            </div>

            {/* Progress */}
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--t3)', fontFamily: FF, marginBottom: 6 }}>
                <span>Progression vers "{cfg.rewardName}"</span>
                <span style={{ fontWeight: 700 }}>
                  {mode === 'stamps' ? detail.stamps : mode === 'cashback' ? detail.cashbackBalance.toFixed(0) : detail.points} / {cfg.rewardThreshold}
                </span>
              </div>
              <div style={{ height: 10, background: 'var(--bg2)', borderRadius: 5, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 5, transition: 'width .3s',
                  width: `${Math.min(100, ((mode === 'stamps' ? detail.stamps : mode === 'cashback' ? detail.cashbackBalance : detail.points) / cfg.rewardThreshold) * 100)}%`,
                  background: 'linear-gradient(90deg, var(--bl), #8b5cf6)',
                }} />
              </div>
            </div>
          </div>

          {/* History */}
          <div style={card()}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)', fontFamily: FF, marginBottom: 12 }}>
              📜 Historique
            </div>
            {detail.history.length === 0 && (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--t4)', fontSize: 13 }}>
                Aucun événement
              </div>
            )}
            {[...detail.history].reverse().map(ev => (
              <div key={ev.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
                borderBottom: '1px solid var(--border)',
              }}>
                <span style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                  background: ev.type === 'earn' ? '#22c55e22' : ev.type === 'bonus' ? '#3b82f622' : ev.type === 'redeem' ? '#f59e0b22' : '#ef444422',
                }}>
                  {ev.type === 'earn' ? '✅' : ev.type === 'bonus' ? '🎉' : ev.type === 'redeem' ? '🎁' : '⏰'}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)', fontFamily: FF }}>
                    {ev.label}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--t4)', fontFamily: FF }}>
                    {new Date(ev.date).toLocaleDateString('fr-CH')}
                  </div>
                </div>
                <div style={{
                  fontSize: 14, fontWeight: 800, fontFamily: FM,
                  color: ev.type === 'redeem' || ev.type === 'expire' ? '#ef4444' : 'var(--gn)',
                }}>
                  {ev.type === 'redeem' || ev.type === 'expire' ? '-' : '+'}{ev.amount}
                </div>
              </div>
            ))}
          </div>

          {/* Delete member */}
          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <button style={btn('danger')} onClick={() => {
              if (confirm(`Supprimer ${detail.clientName} du programme ?`)) {
                deleteLoyaltyCard(detail.id)
                setSelectedCard(null)
              }
            }}>
              Supprimer du programme
            </button>
          </div>
        </div>
      )}

      {/* ═══ TAB: CONFIG ═══ */}
      {tab === 'config' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Active toggle */}
          <div style={card()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--t1)', fontFamily: FF }}>
                  Activer le programme
                </div>
                <div style={{ fontSize: 12, color: 'var(--t3)', fontFamily: FF, marginTop: 2 }}>
                  Les clients pourront accumuler des {modeInfo.unit} et obtenir des récompenses
                </div>
              </div>
              <button
                onClick={() => updateLoyaltyConfig({ active: !cfg.active })}
                style={{
                  width: 52, height: 28, borderRadius: 14, border: 'none',
                  background: cfg.active ? 'var(--gn)' : 'var(--bg3)',
                  cursor: 'pointer', position: 'relative', transition: 'background .2s',
                }}
              >
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', background: '#fff',
                  position: 'absolute', top: 3,
                  left: cfg.active ? 27 : 3,
                  transition: 'left .2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,.2)',
                }} />
              </button>
            </div>
          </div>

          {/* Mode selection */}
          <div style={card()}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)', fontFamily: FF, marginBottom: 12 }}>
              Mode du programme
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {(['stamps', 'points', 'cashback'] as LoyaltyMode[]).map(m => {
                const info = MODE_LABELS[m]
                const isActive = cfg.mode === m
                return (
                  <button key={m} onClick={() => updateLoyaltyConfig({ mode: m })} style={{
                    flex: 1, padding: 16, borderRadius: 10,
                    border: `2px solid ${isActive ? 'var(--bl)' : 'var(--border)'}`,
                    background: isActive ? 'var(--bp)' : 'transparent',
                    cursor: 'pointer', textAlign: 'center', transition: 'all .15s',
                  }}>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>{info.icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: isActive ? 'var(--bl)' : 'var(--t2)', fontFamily: FF }}>
                      {info.fr}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--t4)', fontFamily: FF, marginTop: 4 }}>
                      {m === 'stamps' ? '1 visite = 1 tampon' : m === 'points' ? 'Points par CHF dépensé' : '% remboursé sur chaque visite'}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Mode-specific settings */}
          <div style={card()}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)', fontFamily: FF, marginBottom: 12 }}>
              Paramètres {modeInfo.fr}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {mode === 'stamps' && (
                <>
                  <div>
                    <div style={label}>Objectif tampons</div>
                    <input type="number" style={input} value={cfg.stampsGoal} min={2} max={50}
                      onChange={e => updateLoyaltyConfig({ stampsGoal: +e.target.value, rewardThreshold: +e.target.value })} />
                    <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 4 }}>
                      Nombre de visites pour la récompense
                    </div>
                  </div>
                </>
              )}
              {mode === 'points' && (
                <>
                  <div>
                    <div style={label}>Points par CHF</div>
                    <input type="number" style={input} value={cfg.pointsPerChf} min={1} max={10}
                      onChange={e => updateLoyaltyConfig({ pointsPerChf: +e.target.value })} />
                  </div>
                  <div>
                    <div style={label}>Seuil récompense (points)</div>
                    <input type="number" style={input} value={cfg.rewardThreshold} min={10}
                      onChange={e => updateLoyaltyConfig({ rewardThreshold: +e.target.value })} />
                  </div>
                </>
              )}
              {mode === 'cashback' && (
                <>
                  <div>
                    <div style={label}>% Cashback</div>
                    <input type="number" style={input} value={cfg.cashbackPercent} min={1} max={20}
                      onChange={e => updateLoyaltyConfig({ cashbackPercent: +e.target.value })} />
                  </div>
                  <div>
                    <div style={label}>Seuil utilisation (CHF)</div>
                    <input type="number" style={input} value={cfg.rewardThreshold} min={5}
                      onChange={e => updateLoyaltyConfig({ rewardThreshold: +e.target.value })} />
                  </div>
                </>
              )}
              <div>
                <div style={label}>Nom de la récompense</div>
                <input style={input} value={cfg.rewardName}
                  onChange={e => updateLoyaltyConfig({ rewardName: e.target.value })} />
              </div>
              <div>
                <div style={label}>Valeur récompense (CHF)</div>
                <input type="number" style={input} value={cfg.rewardValue} min={0}
                  onChange={e => updateLoyaltyConfig({ rewardValue: +e.target.value })} />
              </div>
            </div>
          </div>

          {/* Bonus & expiration */}
          <div style={card()}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)', fontFamily: FF, marginBottom: 12 }}>
              Bonus & Expiration
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <div>
                <div style={label}>Bonus bienvenue</div>
                <input type="number" style={input} value={cfg.welcomeBonus} min={0}
                  onChange={e => updateLoyaltyConfig({ welcomeBonus: +e.target.value })} />
              </div>
              <div>
                <div style={label}>Bonus anniversaire</div>
                <input type="number" style={input} value={cfg.birthdayBonus} min={0}
                  onChange={e => updateLoyaltyConfig({ birthdayBonus: +e.target.value })} />
              </div>
              <div>
                <div style={label}>Expiration (mois, 0 = jamais)</div>
                <input type="number" style={input} value={cfg.expirationMonths} min={0}
                  onChange={e => updateLoyaltyConfig({ expirationMonths: +e.target.value })} />
              </div>
            </div>
          </div>

          {/* Double points days */}
          <div style={card()}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)', fontFamily: FF, marginBottom: 12 }}>
              Jours double {modeInfo.unit}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map((d, i) => {
                const isOn = cfg.doublePointsDays.includes(i)
                return (
                  <button key={i} onClick={() => {
                    const next = isOn
                      ? cfg.doublePointsDays.filter(x => x !== i)
                      : [...cfg.doublePointsDays, i]
                    updateLoyaltyConfig({ doublePointsDays: next })
                  }} style={{
                    padding: '8px 14px', borderRadius: 8,
                    fontSize: 12, fontWeight: 700, fontFamily: FF,
                    border: `2px solid ${isOn ? 'var(--bl)' : 'var(--border)'}`,
                    background: isOn ? 'var(--bp)' : 'transparent',
                    color: isOn ? 'var(--bl)' : 'var(--t3)',
                    cursor: 'pointer', transition: 'all .15s',
                  }}>
                    {d}
                  </button>
                )
              })}
            </div>
            <div style={{ fontSize: 11, color: 'var(--t4)', fontFamily: FF, marginTop: 8 }}>
              Les {modeInfo.unit} sont doublés ces jours-là
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL: Add member ═══ */}
      {showAdd && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999
        }} onClick={() => setShowAdd(false)}>
          <div style={{ ...card({ width: 420, maxHeight: '80vh', overflow: 'auto' }) }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--t1)', fontFamily: FF, marginBottom: 16 }}>
              Inscrire un client
            </div>
            {availableClients.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--t3)', fontSize: 13 }}>
                Tous les clients sont déjà inscrits, ou aucun client dans la base
              </div>
            ) : (
              <>
                <div style={label}>Sélectionner un client</div>
                <select style={selectStyle} value={addClientId}
                  onChange={e => setAddClientId(e.target.value)}>
                  <option value="">-- Choisir --</option>
                  {availableClients.map(c => (
                    <option key={c.id} value={c.id}>{c.prenom} {c.nom} — {c.email}</option>
                  ))}
                </select>
                {cfg.welcomeBonus > 0 && (
                  <div style={{ fontSize: 12, color: 'var(--gn)', fontFamily: FF, marginTop: 8 }}>
                    🎉 +{cfg.welcomeBonus} {modeInfo.unit} bonus bienvenue
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
                  <button style={btn('ghost')} onClick={() => setShowAdd(false)}>Annuler</button>
                  <button style={btn('primary')} onClick={handleAddMember}
                    disabled={!addClientId}>Inscrire</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══ MODAL: Stamp / earn ═══ */}
      {showStamp && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999
        }} onClick={() => setShowStamp(null)}>
          <div style={{ ...card({ width: 360 }) }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--t1)', fontFamily: FF, marginBottom: 16 }}>
              {mode === 'stamps' ? 'Tamponner' : mode === 'cashback' ? 'Ajouter cashback' : 'Ajouter points'}
            </div>
            <div style={label}>
              {mode === 'stamps' ? 'Nombre de tampons' : mode === 'cashback' ? 'Montant CHF' : 'Nombre de points'}
            </div>
            <input type="number" style={input} value={stampAmount} min={1}
              onChange={e => setStampAmount(+e.target.value)} />
            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
              <button style={btn('ghost')} onClick={() => setShowStamp(null)}>Annuler</button>
              <button style={btn('primary')} onClick={() => handleEarn(showStamp)}>
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
