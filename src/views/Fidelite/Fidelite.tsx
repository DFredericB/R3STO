// ══════════════════════════════════════════════════
//  R3STO — Programme Fidélité
//  Gestion des cartes de fidélité clients
//  Modes : Tampons · Points · Cashback
// ══════════════════════════════════════════════════

import { useState, useMemo, useEffect, useRef } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useTranslation'
import type { LoyaltyCard, LoyaltyEvent, LoyaltyMode, LoyaltyTier } from '../../types'

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
  const { t, days } = useT()
  const {
    loyaltyConfig, loyaltyCards, clients, resas,
    updateLoyaltyConfig, addLoyaltyCard, deleteLoyaltyCard, addLoyaltyEvent, updateLoyaltyCard
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

  // ── Tier helper ───────────────────────────────
  const getTier = (totalEarned: number): LoyaltyTier | null => {
    if (!cfg.tiersEnabled || !cfg.tiers?.length) return null
    const sorted = [...cfg.tiers].sort((a, b) => b.minEarned - a.minEarned)
    return sorted.find(t => totalEarned >= t.minEarned) || null
  }

  // ── Auto-enrollment : inscrire les clients auto depuis les résas done ──
  const lastResaSnapshot = useRef(resas.filter(r => r.s === 'done').length)
  useEffect(() => {
    if (!cfg.active || !cfg.autoEnroll) return
    const doneResas = resas.filter(r => r.s === 'done')
    if (doneResas.length === lastResaSnapshot.current) return
    lastResaSnapshot.current = doneResas.length

    const enrolledClientIds = new Set(loyaltyCards.map(lc => lc.clientId))
    const enrolledTels = new Set(
      loyaltyCards.map(lc => {
        const cl = clients.find(c => c.id === lc.clientId)
        return cl?.tel || ''
      }).filter(Boolean)
    )

    for (const r of doneResas) {
      // Find matching client
      const client = clients.find(c =>
        (c.tel && c.tel === r.tel) || (c.nom === r.nom && c.prenom === r.prenom)
      )
      if (!client) continue
      if (enrolledClientIds.has(client.id)) continue
      if (client.tel && enrolledTels.has(client.tel)) continue

      // Auto-enroll
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
        tier: getTier(cfg.welcomeBonus)?.name,
        history: cfg.welcomeBonus > 0 ? [{
          id: uid(), date: today(), type: 'bonus',
          amount: cfg.welcomeBonus, label: 'Bonus bienvenue (auto)'
        }] : []
      }
      addLoyaltyCard(newCard)
      enrolledClientIds.add(client.id)
    }
  }, [resas, cfg.active, cfg.autoEnroll])

  // ── Auto-earn : ajouter points/tampons quand résa → done ──
  const processedResaIds = useRef(new Set<string>())
  useEffect(() => {
    if (!cfg.active || !cfg.autoEarnOnDone) return
    const doneResas = resas.filter(r => r.s === 'done' && !processedResaIds.current.has(r.id))

    for (const r of doneResas) {
      processedResaIds.current.add(r.id)
      // Find matching loyalty card
      const client = clients.find(c =>
        (c.tel && c.tel === r.tel) || (c.nom === r.nom && c.prenom === r.prenom)
      )
      if (!client) continue
      const card = loyaltyCards.find(lc => lc.clientId === client.id)
      if (!card) continue

      // Check if this resa was already credited
      if (card.history.some(ev => ev.resaId === r.id)) continue

      const isDouble = cfg.doublePointsDays.includes(new Date(r.date).getDay())
      const multiplier = isDouble ? 2 : 1

      let amount = 0
      let labelText = ''
      if (mode === 'stamps') {
        amount = 1 * multiplier
        labelText = `+${amount} tampon${amount > 1 ? 's' : ''} (visite${isDouble ? ' x2' : ''})`
      } else if (mode === 'points') {
        // Estimate CHF from covers (avg 40 CHF/cover in demo)
        const estimatedChf = r.c * 40
        amount = Math.round(estimatedChf * cfg.pointsPerChf) * multiplier
        labelText = `+${amount} pts (${r.c}p${isDouble ? ' x2' : ''})`
      } else {
        const estimatedChf = r.c * 40
        amount = Math.round(estimatedChf * cfg.cashbackPercent / 100 * 100) / 100 * multiplier
        labelText = `+${amount.toFixed(2)} CHF cashback (${r.c}p${isDouble ? ' x2' : ''})`
      }

      const event: LoyaltyEvent = {
        id: uid(), date: r.date, type: 'earn',
        amount, label: labelText, resaId: r.id
      }
      addLoyaltyEvent(card.id, event)
    }
  }, [resas, loyaltyCards, cfg.active, cfg.autoEarnOnDone])

  // ── Update tiers on cards ──
  useEffect(() => {
    if (!cfg.tiersEnabled || !cfg.tiers?.length) return
    for (const card of loyaltyCards) {
      const tier = getTier(card.totalEarned)
      if (tier && tier.name !== card.tier) {
        updateLoyaltyCard(card.id, { tier: tier.name })
      }
    }
  }, [loyaltyCards, cfg.tiersEnabled, cfg.tiers])

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
            🏆 {t('fid.title')}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--t3)', marginTop: 4, fontFamily: FF }}>
            {cfg.active
              ? `Mode ${modeInfo.fr} — ${totalMembers} ${t('fid.members').toLowerCase()}${cfg.autoEnroll ? ' · Auto' : ''}`
              : t('fid.disabled')
            }
          </p>
        </div>
        {cfg.active && (
          <button style={btn('primary')} onClick={() => setShowAdd(true)}>
            {t('fid.addMember')}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['dashboard', 'members', 'config'] as Tab[]).map(tb => (
          <button key={tb} style={pill(tab === tb)} onClick={() => { setTab(tb); setSelectedCard(null) }}>
            {tb === 'dashboard' ? `📊 ${t('fid.dashboard')}` : tb === 'members' ? `👥 ${t('fid.members')}` : `⚙️ ${t('fid.config')}`}
          </button>
        ))}
      </div>

      {/* ═══ TAB: DASHBOARD ═══ */}
      {tab === 'dashboard' && (
        <div>
          {/* KPIs */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
            <div style={kpiBox}>
              <div style={label}>{t('fid.totalMembers')}</div>
              <div style={bigNum}>{totalMembers}</div>
            </div>
            <div style={kpiBox}>
              <div style={label}>{t('fid.members')} (90j)</div>
              <div style={{ ...bigNum, color: 'var(--gn)' }}>{activeMembers}</div>
            </div>
            <div style={kpiBox}>
              <div style={label}>{modeInfo.fr} en circulation</div>
              <div style={{ ...bigNum, color: 'var(--bl)' }}>
                {mode === 'cashback' ? `${totalPointsCirculation.toFixed(0)} CHF` : totalPointsCirculation}
              </div>
            </div>
            <div style={kpiBox}>
              <div style={label}>{t('fid.rewardsUsed')}</div>
              <div style={{ ...bigNum, color: '#f59e0b' }}>{totalRewardsUsed}</div>
            </div>
          </div>

          {/* Tier breakdown */}
          {cfg.tiersEnabled && (cfg.tiers || []).length > 0 && loyaltyCards.length > 0 && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
              {(cfg.tiers || []).map(tier => {
                const count = loyaltyCards.filter(c => c.tier === tier.name).length
                return (
                  <div key={tier.name} style={{
                    ...card({ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 140 }),
                  }}>
                    <span style={{ fontSize: 24 }}>{tier.icon}</span>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 800, fontFamily: FM, color: tier.color }}>{count}</div>
                      <div style={{ fontSize: 10, color: 'var(--t4)', fontFamily: FF }}>{tier.name}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

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
                {t('fid.noMembers')}
              </div>
              <div style={{ fontSize: 12, color: 'var(--t3)', fontFamily: FF, marginTop: 4 }}>
                {t('fid.enrollFirst')}
              </div>
              <button style={{ ...btn('primary'), marginTop: 16 }} onClick={() => setShowAdd(true)}>
                {t('fid.addMember')}
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
              placeholder={`🔍 ${t('fid.search')}`}
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
                      {(() => {
                        const tier = getTier(c.totalEarned)
                        return tier ? (
                          <span style={{
                            fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                            background: `${tier.color}22`, color: tier.color,
                          }}>{tier.icon} {tier.name}</span>
                        ) : null
                      })()}
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
                        title={t('fid.useReward')}>
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
            ← {t('fid.members')}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--t3)', fontFamily: FF }}>
                    {detail.clientEmail}
                  </span>
                  {(() => {
                    const tier = getTier(detail.totalEarned)
                    return tier ? (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5,
                        background: `${tier.color}22`, color: tier.color, border: `1px solid ${tier.color}44`,
                      }}>{tier.icon} {tier.name} — {tier.perks}</span>
                    ) : null
                  })()}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={btn('primary')} onClick={() => { setShowStamp(detail.id); setStampAmount(1) }}>
                  + {t('fid.addUnit')} {modeInfo.unit}
                </button>
                {(() => {
                  const val = mode === 'stamps' ? detail.stamps : mode === 'cashback' ? detail.cashbackBalance : detail.points
                  return val >= cfg.rewardThreshold ? (
                    <button style={{ ...btn('primary'), background: '#f59e0b' }} onClick={() => handleRedeem(detail.id)}>
                      🎁 {t('fid.useReward')}
                    </button>
                  ) : null
                })()}
              </div>
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: 16, marginTop: 20, flexWrap: 'wrap' }}>
              {[
                { label: modeInfo.fr, value: mode === 'stamps' ? detail.stamps : mode === 'cashback' ? detail.cashbackBalance : detail.points, color: 'var(--bl)' },
                { label: t('fid.totalEarned'), value: detail.totalEarned, color: 'var(--gn)' },
                { label: t('fid.rewardsUsed'), value: detail.rewardsUsed, color: '#f59e0b' },
                { label: t('fid.lastActivity'), value: detail.lastActivity, color: 'var(--t2)', isDate: true },
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
              📜 {t('fid.history')}
            </div>
            {detail.history.length === 0 && (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--t4)', fontSize: 13 }}>
                {t('fid.noHistory')}
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
              {t('fid.delete')}
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
                  {t('fid.activate')} {t('fid.title').toLowerCase()}
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
              {days.map((d, i) => {
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

          {/* Automatisation */}
          <div style={card()}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)', fontFamily: FF, marginBottom: 12 }}>
              🤖 Automatisation
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Auto-enroll */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, fontFamily: FF, color: 'var(--t1)' }}>Inscription automatique</div>
                  <div style={{ fontSize: 11, color: 'var(--t3)', fontFamily: FF }}>
                    Inscrire automatiquement chaque client après sa 1ère réservation terminée
                  </div>
                </div>
                <button onClick={() => updateLoyaltyConfig({ autoEnroll: !cfg.autoEnroll })}
                  style={{
                    width: 44, height: 24, borderRadius: 12, border: 'none',
                    background: cfg.autoEnroll ? 'var(--gn)' : 'var(--bg3)',
                    cursor: 'pointer', position: 'relative', transition: 'background .2s',
                  }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', background: '#fff',
                    position: 'absolute', top: 3, left: cfg.autoEnroll ? 23 : 3,
                    transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)',
                  }} />
                </button>
              </div>

              {/* Auto-earn */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, fontFamily: FF, color: 'var(--t1)' }}>Accumulation automatique</div>
                  <div style={{ fontSize: 11, color: 'var(--t3)', fontFamily: FF }}>
                    Ajouter les {modeInfo.unit} automatiquement quand une réservation passe à "Terminé"
                  </div>
                </div>
                <button onClick={() => updateLoyaltyConfig({ autoEarnOnDone: !cfg.autoEarnOnDone })}
                  style={{
                    width: 44, height: 24, borderRadius: 12, border: 'none',
                    background: cfg.autoEarnOnDone ? 'var(--gn)' : 'var(--bg3)',
                    cursor: 'pointer', position: 'relative', transition: 'background .2s',
                  }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', background: '#fff',
                    position: 'absolute', top: 3, left: cfg.autoEarnOnDone ? 23 : 3,
                    transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)',
                  }} />
                </button>
              </div>

              {/* Flow visual */}
              <div style={{
                padding: '10px 14px', background: 'var(--bg2)', borderRadius: 8, border: '1px solid var(--border)',
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t4)', fontFamily: FF, marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>Flow automatique</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 11, fontFamily: FF }}>
                  <span style={{ padding: '3px 8px', borderRadius: 4, background: 'var(--gn)', color: '#fff', fontWeight: 700 }}>✅ Résa terminée</span>
                  <span style={{ color: 'var(--t4)' }}>→</span>
                  {cfg.autoEnroll && <>
                    <span style={{ padding: '3px 8px', borderRadius: 4, background: 'var(--bl)', color: '#fff', fontWeight: 700 }}>📝 Auto-inscription</span>
                    <span style={{ color: 'var(--t4)' }}>→</span>
                  </>}
                  {cfg.autoEarnOnDone && (
                    <span style={{ padding: '3px 8px', borderRadius: 4, background: '#f59e0b', color: '#fff', fontWeight: 700 }}>
                      {modeInfo.icon} +{modeInfo.unit}
                    </span>
                  )}
                  {!cfg.autoEnroll && !cfg.autoEarnOnDone && (
                    <span style={{ color: 'var(--t4)', fontStyle: 'italic' }}>Tout est manuel</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Niveaux / Tiers */}
          <div style={card()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)', fontFamily: FF }}>
                🏅 Niveaux de fidélité
              </div>
              <button onClick={() => updateLoyaltyConfig({ tiersEnabled: !cfg.tiersEnabled })}
                style={{
                  width: 44, height: 24, borderRadius: 12, border: 'none',
                  background: cfg.tiersEnabled ? 'var(--gn)' : 'var(--bg3)',
                  cursor: 'pointer', position: 'relative', transition: 'background .2s',
                }}>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', background: '#fff',
                  position: 'absolute', top: 3, left: cfg.tiersEnabled ? 23 : 3,
                  transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)',
                }} />
              </button>
            </div>

            {cfg.tiersEnabled && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(cfg.tiers || []).map((tier, idx) => {
                  const membersInTier = loyaltyCards.filter(c => c.tier === tier.name).length
                  return (
                    <div key={idx} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                      borderRadius: 8, border: `1px solid ${tier.color}44`, background: `${tier.color}08`,
                    }}>
                      <span style={{ fontSize: 24 }}>{tier.icon}</span>
                      <div style={{ flex: 1 }}>
                        <input value={tier.name} style={{ ...input, padding: '4px 8px', fontSize: 13, fontWeight: 700, background: 'transparent', border: 'none', color: tier.color }}
                          onChange={e => {
                            const tiers = [...(cfg.tiers || [])]
                            tiers[idx] = { ...tiers[idx], name: e.target.value }
                            updateLoyaltyConfig({ tiers })
                          }}
                        />
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
                          <span style={{ fontSize: 10, color: 'var(--t4)', fontFamily: FF }}>Dès</span>
                          <input type="number" value={tier.minEarned} min={0}
                            style={{ ...input, width: 60, padding: '2px 6px', fontSize: 11 }}
                            onChange={e => {
                              const tiers = [...(cfg.tiers || [])]
                              tiers[idx] = { ...tiers[idx], minEarned: +e.target.value }
                              updateLoyaltyConfig({ tiers })
                            }}
                          />
                          <span style={{ fontSize: 10, color: 'var(--t4)', fontFamily: FF }}>{modeInfo.unit} gagnés</span>
                          <span style={{ fontSize: 10, color: 'var(--t4)', fontFamily: FF }}>·</span>
                          <input value={tier.perks} placeholder="Avantages…"
                            style={{ ...input, flex: 1, padding: '2px 6px', fontSize: 11 }}
                            onChange={e => {
                              const tiers = [...(cfg.tiers || [])]
                              tiers[idx] = { ...tiers[idx], perks: e.target.value }
                              updateLoyaltyConfig({ tiers })
                            }}
                          />
                        </div>
                      </div>
                      <div style={{ textAlign: 'center', minWidth: 40 }}>
                        <div style={{ fontSize: 16, fontWeight: 800, fontFamily: FM, color: tier.color }}>{membersInTier}</div>
                        <div style={{ fontSize: 9, color: 'var(--t4)' }}>membres</div>
                      </div>
                    </div>
                  )
                })}
                <button onClick={() => {
                  const tiers = [...(cfg.tiers || []), { name: 'Platine', icon: '💎', minEarned: 300, color: '#06b6d4', perks: 'Service premium' }]
                  updateLoyaltyConfig({ tiers })
                }} style={{ ...btn('ghost'), fontSize: 12, alignSelf: 'flex-start' }}>
                  + Ajouter un niveau
                </button>
              </div>
            )}
          </div>

          {/* Carte digitale */}
          <div style={card()}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)', fontFamily: FF, marginBottom: 8 }}>
              📱 Carte digitale client
            </div>
            <div style={{ fontSize: 12, color: 'var(--t2)', fontFamily: FF, lineHeight: 1.5 }}>
              Chaque membre reçoit un lien unique vers sa carte de fidélité digitale.
              Le QR code peut être scanné en salle pour créditer les {modeInfo.unit} automatiquement.
            </div>
            <div style={{
              marginTop: 12, padding: '16px 20px', borderRadius: 12,
              background: 'linear-gradient(135deg, var(--bl), #8b5cf6)',
              color: '#fff', textAlign: 'center',
            }}>
              <div style={{ fontSize: 10, opacity: .7, fontFamily: FF, letterSpacing: 1, textTransform: 'uppercase' }}>Carte fidélité</div>
              <div style={{ fontSize: 18, fontWeight: 800, fontFamily: FF, marginTop: 4 }}>Jean Dupont</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 12 }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, fontFamily: FM }}>127</div>
                  <div style={{ fontSize: 9, opacity: .7 }}>{modeInfo.unit}</div>
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, fontFamily: FM }}>🥈</div>
                  <div style={{ fontSize: 9, opacity: .7 }}>Argent</div>
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, fontFamily: FM }}>3</div>
                  <div style={{ fontSize: 9, opacity: .7 }}>récompenses</div>
                </div>
              </div>
              <div style={{
                marginTop: 12, padding: 10, background: '#fff', borderRadius: 8,
                display: 'inline-block',
              }}>
                <div style={{
                  width: 80, height: 80, background: '#000', borderRadius: 4,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 10, fontFamily: FM,
                }}>QR</div>
              </div>
              <div style={{ fontSize: 10, opacity: .6, marginTop: 8, fontFamily: FM }}>
                fidelite.r3sto.ch/c/abc123
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--t4)', fontFamily: FF, marginTop: 8 }}>
              Le lien est envoyé automatiquement dans l'email de bienvenue et rappelé après chaque visite.
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
                  <button style={btn('ghost')} onClick={() => setShowAdd(false)}>{t('fid.cancel')}</button>
                  <button style={btn('primary')} onClick={handleAddMember}
                    disabled={!addClientId}>{t('fid.confirm')}</button>
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
              <button style={btn('ghost')} onClick={() => setShowStamp(null)}>{t('fid.cancel')}</button>
              <button style={btn('primary')} onClick={() => handleEarn(showStamp)}>
                {t('fid.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
