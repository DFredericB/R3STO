import { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useToast } from '../../components/ui/Toast'
import { iaPlacement } from '../../utils/placementRules'

interface WaitlistItem {
  id: string
  n: string
  c: number
  svc: string
  t: string
  min: number
  note?: string
  createdAt?: number
}

// Demo data if store doesn't have waitlist
const demoWaitlist: WaitlistItem[] = [
  { id: 'w1', n: 'Dupont', c: 4, svc: 'soir', t: '19:30', min: 12, note: 'Fête surprise', createdAt: Date.now() - 12 * 60000 },
  { id: 'w2', n: 'Martin', c: 2, svc: 'soir', t: '20:00', min: 8, createdAt: Date.now() - 8 * 60000 },
  { id: 'w3', n: 'Bernard', c: 6, svc: 'midi', t: '12:30', min: 5, note: 'Terrasse si possible', createdAt: Date.now() - 5 * 60000 },
]

export function Waitlist() {
  const { toast } = useToast()
  const isDemo = useAppStore((s) => s.isDemo)
  const [waitlist, setWaitlist] = useState<WaitlistItem[]>(isDemo ? demoWaitlist : [])
  const tables = useAppStore((s) => s.tables)
  const combos = useAppStore((s) => s.combos)
  const resas = useAppStore((s) => s.resas)
  const activeDate = useAppStore((s) => s.activeDate)
  const addResa = useAppStore((s) => s.addResa)

  // Get IA placement suggestion for a client
  const getPlacementSuggestions = (covers: number, svc?: string) => {
    const suggested = iaPlacement(covers, activeDate, svc || 'soir', tables, combos, resas)
    if (!suggested) return []
    const isCombo = suggested.includes('+')
    const combo = combos.find((c) => c.label === suggested)
    const table = tables.find((t) => t.n === suggested)
    const cap = combo?.cap ?? table?.capMax ?? 0
    return [
      {
        label: suggested,
        cap,
        combo: isCombo,
      },
    ]
  }

  // Get waitlist optimization per service
  const getWaitlistOptimization = (svc: string) => {
    const clientsForSvc = waitlist.filter((w) => w.svc === svc)
    if (!clientsForSvc.length) return null

    const totalCvts = clientsForSvc.reduce((sum, c) => sum + c.c, 0)
    const availableTables = tables.filter((t) => t.active !== false && t.salle)
    const totalCap = availableTables.reduce((sum, t) => sum + (t.capMax || 0), 0)

    // Simple assignment strategy
    const assignments: any[] = []
    let waste = 0

    clientsForSvc.forEach((client) => {
      const best = availableTables.find((t) => (t.capMax || 0) >= client.c)
      if (best) {
        assignments.push({
          client,
          table: { n: best.n, capMax: best.capMax },
          waste: (best.capMax || 0) - client.c,
        })
        waste += (best.capMax || 0) - client.c
      }
    })

    return {
      assignments,
      totalCvts,
      totalCap,
    }
  }

  const optimizationMidi = getWaitlistOptimization('midi')
  const optimizationSoir = getWaitlistOptimization('soir')

  const handleApplyOptimization = (svc: string) => {
    const opt = svc === 'midi' ? optimizationMidi : optimizationSoir
    if (!opt) return

    let placed = 0
    opt.assignments.forEach((a: any) => {
      const fullName = a.client.n || ''
      addResa({
        id: `r${Date.now()}_${placed}`,
        n: fullName,
        nom: fullName.split(' ')[0] || '',
        prenom: fullName.split(' ').slice(1).join(' ') || '',
        c: a.client.c,
        tbl: a.table.n,
        t: a.client.t,
        svc: a.client.svc,
        s: 'reserved',
        statut: 0,
        mode: 'ia',
        tel: '',
        email: '',
        canal: 'telephone',
        prisPar: '',
        note: a.client.note || '',
        date: activeDate,
        createdAt: Date.now(),
        bebe: 0,
        pmr: 0,
        allergie: false,
      })
      placed++
    })

    setWaitlist((w) => w.filter((x) => !opt.assignments.some((a: any) => a.client.id === x.id)))
    toast(`✓ ${placed} client${placed > 1 ? 's' : ''} placé${placed > 1 ? 's' : ''} (optimisation IA)`, 'success')
  }

  const handlePlace = (id: string, tableName?: string) => {
    const w = waitlist.find((x) => x.id === id)
    if (!w) return

    const tbl = tableName || 'À assigner'
    addResa({
      id: `r${Date.now()}`,
      n: w.n,
      nom: w.n.split(' ')[0] || '',
      prenom: w.n.split(' ').slice(1).join(' ') || '',
      c: w.c,
      tbl,
      t: w.t,
      svc: w.svc,
      s: 'reserved',
      statut: 0,
      mode: 'ia',
      tel: '',
      email: '',
      canal: 'telephone',
      prisPar: '',
      note: w.note || '',
      date: activeDate,
      createdAt: Date.now(),
      src: 'waitlist',
      bebe: 0,
      pmr: 0,
      allergie: false,
    })
    setWaitlist((list) => list.filter((x) => x.id !== id))
    toast(`✓ ${w.n} placé${tbl !== 'À assigner' ? ` sur ${tbl}` : ''}`, 'success')
  }

  const handleRemove = (id: string) => {
    waitlist.find((x) => x.id === id)
    setWaitlist((list) => list.filter((x) => x.id !== id))
    toast('Retiré de la liste', 'info')
  }

  return (
    <div style={{ padding: '14px 18px', overflowY: 'auto', height: 'calc(100vh - var(--hh))' }}>
      {/* Page Header */}
      <div style={{ marginBottom: 14, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)', marginBottom: 3 }}>Liste d'attente</div>
        <div style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 10 }}>{waitlist.length} clients en attente aujourd'hui</div>
        <button
          onClick={() => toast('Formulaire d\'ajout à implémenter', 'info')}
          style={{
            padding: '8px 14px',
            borderRadius: 8,
            border: 'none',
            background: 'var(--bl)',
            color: 'white',
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'opacity .2s',
          }}
        >
          ➕ Ajouter à la liste
        </button>
      </div>

      {/* IA Optimization Cards — explication claire */}
      {(optimizationMidi || optimizationSoir) && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--t3)', padding: '0 0 8px', lineHeight: 1.5 }}>
            💡 <strong>Placer</strong> = assigner une table à un seul client · <strong>Appliquer ce plan</strong> = l'IA place tout le monde d'un coup de façon optimale
          </div>
        </div>
      )}
      {(optimizationMidi || optimizationSoir) && (
        <div style={{ marginBottom: 14 }}>
          {[optimizationMidi, optimizationSoir].map((opt) => {
            if (!opt || !opt.assignments.length) return null
            const svc = opt.assignments[0].client.svc
            return (
              <div
                key={svc}
                style={{
                  marginBottom: 10,
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: 'rgba(68,128,216,.07)',
                  border: '1px solid rgba(68,128,216,.2)',
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--bl)', marginBottom: 6 }}>
                  🤖 Optimisation IA · {svc === 'midi' ? '☀️ Midi' : '🌙 Soir'} — {opt.totalCvts}p à placer sur {opt.totalCap}p dispo
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {opt.assignments.map((a: any) => (
                    <div key={a.client.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                      <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 700, color: 'var(--text)', minWidth: 24 }}>
                        {a.table.n}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--t3)' }}>{a.table.capMax}p</span>
                      <span style={{ color: 'var(--t4)' }}>→</span>
                      <span style={{ fontWeight: 600, color: 'var(--text)' }}>{a.client.n}</span>
                      <span style={{ fontSize: 11, color: 'var(--t3)' }}>
                        {a.client.c}p · {a.client.t}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          marginLeft: 'auto',
                          padding: '2px 6px',
                          borderRadius: 4,
                          background:
                            a.waste === 0
                              ? 'rgba(60,200,112,.2)'
                              : a.waste <= 2
                                ? 'rgba(68,128,216,.2)'
                                : 'rgba(220,80,80,.15)',
                          color:
                            a.waste === 0
                              ? 'var(--gn)'
                              : a.waste <= 2
                                ? 'var(--bl)'
                                : 'var(--rd)',
                        }}
                      >
                        {a.waste === 0 ? '✓ Parfait' : a.waste <= 2 ? `+${a.waste}p` : `+${a.waste}p`}
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => handleApplyOptimization(svc)}
                  style={{
                    fontSize: 11,
                    padding: '4px 12px',
                    marginTop: 8,
                    borderRadius: 6,
                    border: 'none',
                    background: 'var(--bl)',
                    color: 'white',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  ⚡ Appliquer ce plan — placer tous les clients d'un coup
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Waitlist Items */}
      {waitlist.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--gn)' }}>
          <div style={{ fontSize: 18, marginBottom: 8 }}>✅</div>
          <div style={{ fontSize: 13 }}>Aucune liste d'attente pour le moment.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {waitlist.map((w, i) => {
            const sugg = getPlacementSuggestions(w.c, w.svc)[0]
            return (
              <div
                key={w.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  background: 'var(--surf)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: '12px 14px',
                }}
              >
                {/* Number */}
                <div style={{ fontSize: 18, fontWeight: 900, fontFamily: 'DM Mono, monospace', color: 'var(--bl)', minWidth: 28 }}>
                  {i + 1}
                </div>

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>
                    {w.n}
                  </div>
                  <div style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--t3)', marginBottom: 4 }}>
                    {w.c}p · {w.svc} {w.t}
                    {w.note ? ` · "${w.note}"` : ''}
                  </div>

                  {/* Suggestion */}
                  {sugg ? (
                    <div
                      style={{
                        fontSize: 11,
                        padding: '4px 9px',
                        borderRadius: 6,
                        background: 'rgba(60,200,112,.08)',
                        border: '1px solid rgba(60,200,112,.25)',
                        color: 'var(--gn)',
                        marginTop: 4,
                      }}
                    >
                      🤖 <strong>{sugg.label}</strong> suggérée{sugg.combo ? ' (combo)' : ''} · {sugg.cap}p
                    </div>
                  ) : (
                    <div
                      style={{
                        fontSize: 11,
                        padding: '4px 9px',
                        borderRadius: 6,
                        background: 'rgba(220,80,80,.07)',
                        color: 'var(--rd)',
                        marginTop: 4,
                      }}
                    >
                      ⚠️ Aucune table dispo pour {w.c}p
                    </div>
                  )}
                </div>

                {/* Badge + Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span
                    style={{
                      fontSize: 11,
                      padding: '3px 8px',
                      borderRadius: 4,
                      background: 'rgba(220,80,80,.15)',
                      color: 'var(--rd)',
                      fontWeight: 700,
                    }}
                  >
                    Dans {w.min}min
                  </span>
                  <button
                    onClick={() => handlePlace(w.id, sugg?.label)}
                    title="Placer ce client maintenant sur la table suggérée et créer sa réservation"
                    style={{
                      padding: '4px 9px',
                      fontSize: 11,
                      fontWeight: 700,
                      borderRadius: 6,
                      border: 'none',
                      background: 'var(--gn)',
                      color: 'white',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    ✓ Placer{sugg?.label ? ` → ${sugg.label}` : ''}
                  </button>
                  <button
                    onClick={() => handleRemove(w.id)}
                    style={{
                      padding: '4px 9px',
                      fontSize: 11,
                      fontWeight: 700,
                      borderRadius: 6,
                      border: 'none',
                      background: 'var(--rd)',
                      color: 'white',
                      cursor: 'pointer',
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
         