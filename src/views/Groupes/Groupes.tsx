import { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useToast } from '../../components/ui/Toast'
import { iaPlacement } from '../../utils/placementRules'

interface GroupRequest {
  id: string
  n: string
  c: number
  t: string
  svc: string
  date: string
  tel?: string
  note?: string
  soumis: string
  status: 'pending' | 'accepted' | 'refused'
  createdAt: number
}

// Demo data if store doesn't have group requests
const demoGroupes: GroupRequest[] = [
  {
    id: 'g1',
    n: 'Durand',
    c: 12,
    t: '19:00',
    svc: 'soir',
    date: '2026-03-25',
    tel: '+41 21 123 45 67',
    note: 'Nourriture sans gluten pour 2 personnes',
    soumis: '14:30',
    status: 'pending',
    createdAt: Date.now() - 2 * 60 * 60 * 1000,
  },
  {
    id: 'g2',
    n: 'Leclerc',
    c: 8,
    t: '20:00',
    svc: 'soir',
    date: '2026-03-26',
    tel: '+41 21 987 65 43',
    note: '',
    soumis: '10:15',
    status: 'pending',
    createdAt: Date.now() - 4 * 60 * 60 * 1000,
  },
  {
    id: 'g3',
    n: 'Simon',
    c: 10,
    t: '12:30',
    svc: 'midi',
    date: '2026-03-24',
    tel: '',
    note: 'Client vip',
    soumis: '09:00',
    status: 'accepted',
    createdAt: Date.now() - 24 * 60 * 60 * 1000,
  },
]

export function Groupes() {
  const { toast } = useToast()
  const [groupes, setGroupes] = useState<GroupRequest[]>(demoGroupes)
  const [showSettings, setShowSettings] = useState(false)
  const [grpSettings, setGrpSettings] = useState({
    seuil_widget: 8,
    validation_obligatoire: true,
    delai_reponse_h: 48,
    redirect_widget: true,
    msg_redirect: 'Pour les groupes de {seuil}+ personnes, merci de remplir notre formulaire dédié.',
    prepaiement_groupe: true,
    acompte_pct: 30,
    notification_email: true,
    notification_sms: false,
  })
  const tables = useAppStore((s) => s.tables)
  const combos = useAppStore((s) => s.combos)
  const resas = useAppStore((s) => s.resas)
  const activeDate = useAppStore((s) => s.activeDate)
  const addResa = useAppStore((s) => s.addResa)

  const pending = groupes.filter((g) => g.status === 'pending')
  const treated = groupes.filter((g) => g.status !== 'pending')

  // Get placement suggestion
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

  const handleGroupAction = (id: string, status: 'accepted' | 'refused') => {
    const g = groupes.find((x) => x.id === id)
    if (!g) return

    setGroupes((list) => list.map((x) => (x.id === id ? { ...x, status } : x)))

    if (status === 'accepted') {
      const sugg = getPlacementSuggestions(g.c, g.svc)[0]
      const tbl = sugg?.label || 'À assigner'

      addResa({
        id: `r${Date.now()}`,
        n: g.n,
        nom: g.n.split(' ')[0] || '',
        prenom: g.n.split(' ').slice(1).join(' ') || '',
        c: g.c,
        tbl,
        t: g.t,
        svc: g.svc,
        s: 'reserved',
        statut: 0,
        mode: 'ia',
        tel: g.tel || '',
        email: '',
        canal: 'telephone',
        prisPar: '',
        note: (g.note || '') + '[Groupe]',
        date: g.date,
        createdAt: Date.now(),
        src: 'groupe',
        bebe: 0,
        pmr: 0,
        allergie: false,
      })

      toast(`✓ Groupe accepté · Réservation créée · ${tbl}`, 'success')
    } else {
      toast(`✕ Demande refusée — client à notifier`, 'info')
    }
  }

  const renderCard = (g: GroupRequest) => {
    const isPending = g.status === 'pending'
    const sugg = isPending ? getPlacementSuggestions(g.c, g.svc)[0] : null

    const statusBadge =
      g.status === 'pending'
        ? { icon: '⏳', label: 'En attente', color: 'var(--rd)' }
        : g.status === 'accepted'
          ? { icon: '✓', label: 'Accepté', color: 'var(--gn)' }
          : { icon: '✕', label: 'Refusé', color: 'var(--t3)' }

    return (
      <div
        key={g.id}
        style={{
          background: 'var(--surf)',
          border: `1.5px solid ${isPending ? 'rgba(220,80,80,.3)' : 'var(--border)'}`,
          borderRadius: 12,
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 5 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>{g.n}</span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 4,
                background:
                  g.status === 'pending'
                    ? 'rgba(220,80,80,.15)'
                    : g.status === 'accepted'
                      ? 'rgba(60,200,112,.15)'
                      : 'rgba(128,128,128,.15)',
                color: statusBadge.color,
              }}
            >
              {statusBadge.icon} {statusBadge.label}
            </span>
          </div>

          <div style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--t3)', marginBottom: 2 }}>
            👥 {g.c}p · {g.svc} {g.t} · {g.date}
          </div>

          {g.tel && (
            <div style={{ fontSize: 11, color: 'var(--bl)', marginTop: 2 }}>
              📞 {g.tel}
            </div>
          )}

          {g.note && (
            <div style={{ fontSize: 11, color: 'var(--t2)', fontStyle: 'italic', marginTop: 3 }}>
              📝 {g.note}
            </div>
          )}

          <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 4, fontFamily: 'DM Mono, monospace' }}>
            Soumis le {g.soumis}
          </div>

          {/* Suggestion for pending */}
          {isPending &&
            (sugg ? (
              <div
                style={{
                  fontSize: 11,
                  padding: '5px 9px',
                  borderRadius: 6,
                  background: 'rgba(60,200,112,.08)',
                  border: '1px solid rgba(60,200,112,.25)',
                  color: 'var(--gn)',
                  marginTop: 6,
                }}
              >
                🤖 Table suggérée : <strong>{sugg.label}</strong> ({sugg.cap}p)
                {sugg.combo ? ' — combo' : ''}
              </div>
            ) : (
              <div
                style={{
                  fontSize: 11,
                  padding: '5px 9px',
                  borderRadius: 6,
                  background: 'rgba(220,80,80,.07)',
                  color: 'var(--rd)',
                  marginTop: 6,
                }}
              >
                ⚠️ Aucune table disponible pour {g.c}p au moment de la demande
              </div>
            ))}
        </div>

        {/* Action buttons for pending */}
        {isPending && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
            <button
              onClick={() => handleGroupAction(g.id, 'accepted')}
              style={{
                fontSize: 11,
                padding: '5px 14px',
                borderRadius: 6,
                border: 'none',
                background: 'var(--gn)',
                color: 'white',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              ✓ Accepter
            </button>
            <button
              onClick={() => handleGroupAction(g.id, 'refused')}
              style={{
                fontSize: 11,
                padding: '5px 14px',
                borderRadius: 6,
                border: 'none',
                background: 'var(--rd)',
                color: 'white',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              ✕ Refuser
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ padding: '0 18px 20px', overflowY: 'auto', height: 'calc(100vh - var(--hh))' }}>
      {/* Page Header */}
      <div style={{ marginBottom: 14, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)', marginBottom: 3 }}>Demandes groupes</div>
        <div style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 10 }}>
          Réservations groupes soumises via widget · validation manuelle activée
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          style={{
            fontSize: 11,
            padding: '5px 14px',
            borderRadius: 6,
            border: `1px solid ${showSettings ? 'var(--bl)' : 'var(--border)'}`,
            background: showSettings ? 'var(--bp)' : 'var(--surf2)',
            color: showSettings ? 'var(--bl)' : 'var(--text)',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          ⚙️ Paramètres groupes
        </button>
      </div>

      {/* ── SETTINGS PANEL ── */}
      {showSettings && (
        <div style={{ background: 'var(--surf2)', border: '1.5px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--text)', marginBottom: 14 }}>⚙️ Configuration groupes</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* Widget redirect */}
            <div style={{ padding: 12, background: 'var(--surf)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--bl)', marginBottom: 8 }}>🌐 Redirection widget</div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--t2)', marginBottom: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={grpSettings.redirect_widget}
                  onChange={e => setGrpSettings(s => ({ ...s, redirect_widget: e.target.checked }))}
                  style={{ accentColor: 'var(--bl)' }} />
                Rediriger vers formulaire groupe quand ≥ seuil
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--t3)' }}>Seuil :</span>
                <input type="number" min={2} max={50} value={grpSettings.seuil_widget}
                  onChange={e => setGrpSettings(s => ({ ...s, seuil_widget: +e.target.value }))}
                  style={{ width: 50, padding: '3px 6px', fontSize: 12, borderRadius: 5, border: '1px solid var(--border)', background: 'var(--surf2)', color: 'var(--text)', fontFamily: 'var(--fm)' }} />
                <span style={{ fontSize: 11, color: 'var(--t3)' }}>personnes</span>
              </div>
              <div style={{ fontSize: 10, color: 'var(--t4)', fontStyle: 'italic' }}>
                Message : "{grpSettings.msg_redirect.replace('{seuil}', String(grpSettings.seuil_widget))}"
              </div>
            </div>

            {/* Validation */}
            <div style={{ padding: 12, background: 'var(--surf)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--am)', marginBottom: 8 }}>✅ Validation</div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--t2)', marginBottom: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={grpSettings.validation_obligatoire}
                  onChange={e => setGrpSettings(s => ({ ...s, validation_obligatoire: e.target.checked }))}
                  style={{ accentColor: 'var(--bl)' }} />
                Validation manuelle obligatoire
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--t3)' }}>Délai de réponse :</span>
                <select value={grpSettings.delai_reponse_h}
                  onChange={e => setGrpSettings(s => ({ ...s, delai_reponse_h: +e.target.value }))}
                  style={{ fontSize: 11, padding: '3px 6px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--surf2)', color: 'var(--text)' }}>
                  {[12, 24, 48, 72].map(h => <option key={h} value={h}>{h}h</option>)}
                </select>
              </div>
            </div>

            {/* Prépaiement */}
            <div style={{ padding: 12, background: 'var(--surf)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--gn)', marginBottom: 8 }}>💳 Prépaiement</div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--t2)', marginBottom: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={grpSettings.prepaiement_groupe}
                  onChange={e => setGrpSettings(s => ({ ...s, prepaiement_groupe: e.target.checked }))}
                  style={{ accentColor: 'var(--bl)' }} />
                Exiger un acompte pour les groupes
              </label>
              {grpSettings.prepaiement_groupe && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--t3)' }}>Acompte :</span>
                  <input type="number" min={10} max={100} value={grpSettings.acompte_pct}
                    onChange={e => setGrpSettings(s => ({ ...s, acompte_pct: +e.target.value }))}
                    style={{ width: 50, padding: '3px 6px', fontSize: 12, borderRadius: 5, border: '1px solid var(--border)', background: 'var(--surf2)', color: 'var(--text)', fontFamily: 'var(--fm)' }} />
                  <span style={{ fontSize: 11, color: 'var(--t3)' }}>%</span>
                </div>
              )}
            </div>

            {/* Notifications */}
            <div style={{ padding: 12, background: 'var(--surf)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>🔔 Notifications</div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--t2)', marginBottom: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={grpSettings.notification_email}
                  onChange={e => setGrpSettings(s => ({ ...s, notification_email: e.target.checked }))}
                  style={{ accentColor: 'var(--bl)' }} />
                Email au restaurant
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--t2)', cursor: 'pointer' }}>
                <input type="checkbox" checked={grpSettings.notification_sms}
                  onChange={e => setGrpSettings(s => ({ ...s, notification_sms: e.target.checked }))}
                  style={{ accentColor: 'var(--bl)' }} />
                SMS au gérant
              </label>
            </div>
          </div>
          <button onClick={() => { toast('Paramètres sauvegardés', 'success'); setShowSettings(false) }}
            style={{ marginTop: 12, padding: '7px 16px', borderRadius: 6, border: 'none', background: 'var(--bl)', color: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
            💾 Sauvegarder
          </button>
        </div>
      )}

      {/* Pending Section */}
      {pending.length > 0 ? (
        <div style={{ marginBottom: 18 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: 'var(--rd)',
              textTransform: 'uppercase',
              letterSpacing: '.09em',
              fontFamily: 'DM Mono, monospace',
              marginBottom: 8,
              marginTop: 12,
            }}
          >
            ⏳ En attente de validation ({pending.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pending.map((g) => renderCard(g))}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--gn)', marginTop: 12, marginBottom: 14 }}>
          <div style={{ fontSize: 18, marginBottom: 8 }}>✅</div>
          <div style={{ fontSize: 13 }}>Aucune demande groupe en attente</div>
        </div>
      )}

      {/* Treated Section */}
      {treated.length > 0 && (
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: 'var(--t3)',
              textTransform: 'uppercase',
              letterSpacing: '.09em',
              fontFamily: 'DM Mono, monospace',
              marginBottom: 8,
            }}
          >
            Traitées récemment
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {treated.map((g) => renderCard(g))}
          </div>
        </div>
      )}
    </div>
  )
}
