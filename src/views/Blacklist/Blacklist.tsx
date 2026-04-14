import { useState, useMemo } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useToast } from '../../components/ui/Toast'
import PhoneInput from '../../components/ui/PhoneInput'

interface BlacklistEntry {
  id: string
  n: string
  tel: string
  score: number
  level: 1 | 2 | 3 | 4
  reason: string
  active: boolean
}

const levelMap = {
  1: { c: 'var(--am)', l: '⚠️ Surveillance' },
  2: { c: 'var(--rd)', l: '🔴 Attention' },
  3: { c: 'var(--rd)', l: '🔴 Interdit' },
  4: { c: 'var(--rd)', l: '⛔ Ban total' },
}

export function Blacklist() {
  const { toast } = useToast()
  const storeClients = useAppStore(s => s.clients)
  const resas = useAppStore(s => s.resas)
  const options = useAppStore(s => s.options)
  const { addClient, updateClient } = useAppStore()
  const [tab, setTab] = useState<'liste' | 'regles' | 'manuel'>('liste')

  // Blacklist rules stored in options (persisted via auto-sync)
  const autoRulesStored = (options as any).blacklistRules || null
  const [autoRules, setAutoRules] = useState({
    noshow_threshold: autoRulesStored?.noshow_threshold ?? 3,
    noshow_level: (autoRulesStored?.noshow_level ?? 2) as 1|2|3|4,
    noshow_ban_threshold: autoRulesStored?.noshow_ban_threshold ?? 5,
    cancel_late_threshold: autoRulesStored?.cancel_late_threshold ?? 4,
    cancel_late_level: (autoRulesStored?.cancel_late_level ?? 1) as 1|2|3|4,
    auto_rehabilitate_days: autoRulesStored?.auto_rehabilitate_days ?? 90,
    auto_enabled: autoRulesStored?.auto_enabled ?? true,
  })
  const updateOptions = useAppStore(s => s.updateOptions)
  const [manualForm, setManualForm] = useState({ name: '', tel: '', level: 2 as 1|2|3|4, reason: '' })

  // Derive blacklist from store clients (status = 'blacklisted' or noshow count)
  const clients: BlacklistEntry[] = useMemo(() => {
    // Clients explicitly blacklisted
    const blacklisted = storeClients
      .filter(c => c.blacklisted === true || c.totalNoshows > 0)
      .map(c => {
        const noshowCount = resas.filter(r => r.tel === c.tel && r.s === 'noshow').length
        const level: 1|2|3|4 = noshowCount >= autoRules.noshow_ban_threshold ? 4
          : noshowCount >= autoRules.noshow_threshold ? autoRules.noshow_level as 1|2|3|4
          : c.blacklisted === true ? 3 : 1
        const score = Math.min(100, noshowCount * 20 + (c.blacklisted === true ? 40 : 0))
        return {
          id: c.id,
          n: `${c.prenom || ''} ${c.nom || ''}`.trim() || c.tel,
          tel: c.tel || '',
          score,
          level,
          reason: c.notes || (c.blacklisted === true ? 'Blocage manuel' : `${noshowCount} no-show(s)`),
          active: c.blacklisted === true,
        }
      })
    return blacklisted.sort((a, b) => b.score - a.score)
  }, [storeClients, resas, autoRules])

  const activeCount = clients.filter(c => c.active).length
  const level34Count = clients.filter(c => c.level >= 3).length
  const avgScore = clients.length > 0 ? Math.round(clients.reduce((sum, c) => sum + c.score, 0) / clients.length) : 0

  function addManualBlock() {
    if (!manualForm.name.trim()) return
    // Check if client already exists by phone
    const existing = storeClients.find(c => c.tel === manualForm.tel)
    if (existing) {
      updateClient(existing.id, {
        blacklisted: true,
        notes: manualForm.reason || 'Blocage manuel',
      })
    } else {
      addClient({
        id: `bl_${Date.now()}`,
        nom: manualForm.name.split(' ').slice(1).join(' ') || manualForm.name,
        prenom: manualForm.name.split(' ')[0] || '',
        tel: manualForm.tel,
        email: '',
        statut: 3,
        allergies: '',
        notes: manualForm.reason || 'Blocage manuel',
        langue: 'fr',
        entreprise: '',
        tags: [],
        tablePref: '',
        createdAt: Date.now(),
        lastVisit: '',
        totalVisits: 0,
        totalCouverts: 0,
        totalNoshows: 0,
        blacklisted: true,
        blacklistReason: manualForm.reason || 'Blocage manuel',
      })
    }
    setManualForm({ name: '', tel: '', level: 2, reason: '' })
    setTab('liste')
    toast('Client bloqué manuellement', 'success')
  }

  return (
    <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 20, overflow: 'auto', height: 'calc(100vh - var(--hh))' }}>
      {/* Page Header */}
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text)', margin: 0 }}>Clients bloqués</h2>
        <p style={{ fontSize: 13, color: 'var(--t2)', margin: '8px 0 0 0' }}>
          {activeCount} clients surveillés · 4 niveaux d'alerte ·
          {autoRules.auto_enabled ? ' 🤖 Auto activé' : ' ✋ Manuel uniquement'}
        </p>
        <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
          {(['liste', 'regles', 'manuel'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '6px 12px', borderRadius: 5, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                border: `1.5px solid ${tab === t ? 'var(--bl)' : 'var(--border)'}`,
                background: tab === t ? 'var(--bp)' : 'transparent',
                color: tab === t ? 'var(--bl)' : 'var(--t3)',
              }}
            >
              {t === 'liste' ? `📋 Liste (${clients.length})` : t === 'regles' ? '🤖 Règles auto' : '✋ Blocage manuel'}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button
            onClick={() => { const csv = ['Nom,Tel,Score,Niveau,Raison,Actif', ...clients.map(c => c.n+','+c.tel+','+c.score+','+c.level+','+c.reason+','+c.active)].join('\n'); const blob = new Blob([csv], {type:'text/csv'}); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'blacklist.csv'; a.click(); toast('CSV exporté', 'success') }}
            style={{
              padding: '6px 12px', borderRadius: 5, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              border: '1px solid var(--border)', background: 'var(--surf2)', color: 'var(--text)',
            }}
          >
            📊 Exporter
          </button>
        </div>
      </div>

      {/* KPI Cards */}
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

      {/* ── TAB: RÈGLES AUTO ── */}
      {tab === 'regles' && (
        <div style={{ background: 'var(--surf2)', border: '1.5px solid var(--border)', borderRadius: 12, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 15, fontWeight: 900, color: 'var(--text)' }}>🤖 Blocage automatique</span>
            <div style={{ flex: 1 }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--t2)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={autoRules.auto_enabled}
                onChange={e => setAutoRules(r => ({ ...r, auto_enabled: e.target.checked }))}
                style={{ accentColor: 'var(--bl)' }}
              />
              Activé
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, opacity: autoRules.auto_enabled ? 1 : 0.4 }}>
            <div style={{ padding: 14, background: 'var(--surf)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--rd)', marginBottom: 8 }}>No-shows</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--t3)', minWidth: 70 }}>Surveillance à</span>
                <input type="number" min={1} max={10} value={autoRules.noshow_threshold}
                  onChange={e => setAutoRules(r => ({ ...r, noshow_threshold: +e.target.value }))}
                  style={{ width: 50, padding: '3px 6px', fontSize: 12, borderRadius: 5, border: '1px solid var(--border)', background: 'var(--surf2)', color: 'var(--text)', fontFamily: 'var(--fm)' }}
                />
                <span style={{ fontSize: 11, color: 'var(--t3)' }}>no-shows → Niveau</span>
                <select value={autoRules.noshow_level}
                  onChange={e => setAutoRules(r => ({ ...r, noshow_level: +e.target.value as 1|2|3|4 }))}
                  style={{ fontSize: 11, padding: '3px 6px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--surf)', color: 'var(--text)' }}
                >
                  {[1,2,3,4].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--t3)', minWidth: 70 }}>Ban total à</span>
                <input type="number" min={1} max={20} value={autoRules.noshow_ban_threshold}
                  onChange={e => setAutoRules(r => ({ ...r, noshow_ban_threshold: +e.target.value }))}
                  style={{ width: 50, padding: '3px 6px', fontSize: 12, borderRadius: 5, border: '1px solid var(--border)', background: 'var(--surf2)', color: 'var(--text)', fontFamily: 'var(--fm)' }}
                />
                <span style={{ fontSize: 11, color: 'var(--t3)' }}>no-shows → Niveau 4</span>
              </div>
            </div>
            <div style={{ padding: 14, background: 'var(--surf)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--am)', marginBottom: 8 }}>Annulations tardives</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--t3)', minWidth: 70 }}>Surveillance à</span>
                <input type="number" min={1} max={10} value={autoRules.cancel_late_threshold}
                  onChange={e => setAutoRules(r => ({ ...r, cancel_late_threshold: +e.target.value }))}
                  style={{ width: 50, padding: '3px 6px', fontSize: 12, borderRadius: 5, border: '1px solid var(--border)', background: 'var(--surf2)', color: 'var(--text)', fontFamily: 'var(--fm)' }}
                />
                <span style={{ fontSize: 11, color: 'var(--t3)' }}>annulations → Niveau</span>
                <select value={autoRules.cancel_late_level}
                  onChange={e => setAutoRules(r => ({ ...r, cancel_late_level: +e.target.value as 1|2|3|4 }))}
                  style={{ fontSize: 11, padding: '3px 6px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--surf)', color: 'var(--text)' }}
                >
                  {[1,2,3,4].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>
            <div style={{ padding: 14, background: 'var(--surf)', borderRadius: 8, border: '1px solid var(--border)', gridColumn: '1/-1' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--gn)', marginBottom: 8 }}>Réhabilitation automatique</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--t3)' }}>Réhabiliter après</span>
                <input type="number" min={0} max={365} value={autoRules.auto_rehabilitate_days}
                  onChange={e => setAutoRules(r => ({ ...r, auto_rehabilitate_days: +e.target.value }))}
                  style={{ width: 60, padding: '3px 6px', fontSize: 12, borderRadius: 5, border: '1px solid var(--border)', background: 'var(--surf2)', color: 'var(--text)', fontFamily: 'var(--fm)' }}
                />
                <span style={{ fontSize: 11, color: 'var(--t3)' }}>jours sans incident (0 = jamais)</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => { updateOptions({ blacklistRules: autoRules } as any); toast('Règles sauvegardées', 'success') }}
            style={{ marginTop: 14, padding: '8px 16px', borderRadius: 6, border: 'none', background: 'var(--bl)', color: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
          >
            💾 Sauvegarder les règles
          </button>
        </div>
      )}

      {/* ── TAB: BLOCAGE MANUEL ── */}
      {tab === 'manuel' && (
        <div style={{ background: 'var(--surf2)', border: '1.5px solid var(--border)', borderRadius: 12, padding: 18, maxWidth: 480 }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--text)', marginBottom: 16 }}>✋ Blocage manuel</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', display: 'block', marginBottom: 3 }}>Nom du client *</label>
              <input value={manualForm.name} onChange={e => setManualForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Rechercher ou saisir un nom…"
                style={{ width: '100%', padding: '8px 10px', fontSize: 13, borderRadius: 7, border: '1.5px solid var(--border)', background: 'var(--surf)', color: 'var(--text)', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', display: 'block', marginBottom: 3 }}>Téléphone</label>
              <PhoneInput value={manualForm.tel} onChange={v => setManualForm(f => ({ ...f, tel: v }))} compact />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', display: 'block', marginBottom: 3 }}>Niveau</label>
              <div style={{ display: 'flex', gap: 5 }}>
                {([1,2,3,4] as const).map(lv => (
                  <button key={lv} onClick={() => setManualForm(f => ({ ...f, level: lv }))}
                    style={{
                      flex: 1, padding: '6px 4px', borderRadius: 5, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      border: `1.5px solid ${manualForm.level === lv ? levelMap[lv].c : 'var(--border)'}`,
                      background: manualForm.level === lv ? levelMap[lv].c + '20' : 'transparent',
                      color: manualForm.level === lv ? levelMap[lv].c : 'var(--t3)',
                    }}
                  >
                    {levelMap[lv].l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', display: 'block', marginBottom: 3 }}>Raison</label>
              <textarea value={manualForm.reason} onChange={e => setManualForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="Raison du blocage…" rows={2}
                style={{ width: '100%', padding: '8px 10px', fontSize: 12, borderRadius: 7, border: '1.5px solid var(--border)', background: 'var(--surf)', color: 'var(--text)', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>
            <button onClick={addManualBlock} disabled={!manualForm.name.trim()}
              style={{
                padding: '9px 16px', borderRadius: 7, border: 'none', fontWeight: 700, fontSize: 13, cursor: manualForm.name.trim() ? 'pointer' : 'not-allowed',
                background: manualForm.name.trim() ? 'var(--rd)' : 'var(--border)',
                color: manualForm.name.trim() ? 'white' : 'var(--t4)',
              }}
            >
              ⛔ Bloquer ce client
            </button>
          </div>
        </div>
      )}

      {/* ── TAB: LISTE (Table) ── */}
      {tab === 'liste' && <div style={{ overflow: 'auto' }}>
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
                        onClick={() => toast(b.n + ' · ' + b.tel + ' · ' + b.reason, 'info')}
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
                          onClick={() => { updateClient(b.id, { blacklisted: false, blacklistReason: '' }); toast(b.n + ' réhabilité', 'success') }}
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
      </div>}
    </div>
  )
}
