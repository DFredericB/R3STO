import { useState, type ReactNode } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useToast } from '../../components/ui/Toast'

interface WidgetConfig {
  color: string
  theme: 'light' | 'dark'
  lang: string
  msg: string
  showTable: boolean
  showNote: boolean
  showPrepay: boolean
  minCvt: number
  maxCvt: number
  layout: 'vertical' | 'horizontal' | 'popup' | 'floating'
  borderRadius: number
  shadow: boolean
  showPhone: boolean
  showEmail: boolean
  showOccasion: boolean
  showLang: boolean
  confirmAuto: boolean
  showSlots: boolean
  maxDaysAhead: number
  btnLabel: string
  successMsg: string
}

const RESTO = { name: 'Mon restaurant' }
const SERVICES = [
  { icon: '🍽️', name: 'Midi', open: '12:00', lastOrder: '14:00', active: true, bookingCutoffMins: 0 },
  { icon: '🍷', name: 'Soir', open: '19:00', lastOrder: '21:30', active: true, bookingCutoffMins: 60 },
]
const TABLES = [
  { n: '1', nm: 'Fenêtre', salle: 'Salle 1', capMin: 2, capMax: 4, active: true, blocked: false },
  { n: '2', nm: 'Bar', salle: 'Salle 1', capMin: 1, capMax: 2, active: true, blocked: false },
  { n: '3', nm: 'Coin', salle: 'Salle 1', capMin: 4, capMax: 6, active: true, blocked: false },
]

export function Widget() {
  const { toast } = useToast()
  const [wgtCfg, setWgtCfg] = useState<WidgetConfig>({
    color: '#1c4f90',
    theme: 'light',
    lang: 'fr',
    msg: 'Réservez votre table en quelques secondes.',
    showTable: false,
    showNote: true,
    showPrepay: false,
    minCvt: 1,
    maxCvt: 20,
    layout: 'vertical',
    borderRadius: 12,
    shadow: true,
    showPhone: true,
    showEmail: true,
    showOccasion: false,
    showLang: true,
    confirmAuto: false,
    showSlots: true,
    maxDaysAhead: 60,
    btnLabel: 'Réserver une table',
    successMsg: 'Votre réservation est confirmée ! Un email de confirmation vous a été envoyé.',
  })

  const [wgtStep, setWgtStep] = useState(1)
  const [wgtCvt, setWgtCvt] = useState(2)
  const [wgtSvc, setWgtSvc] = useState<string | null>(null)
  const [wgtTbl, setWgtTbl] = useState<string | null>(null)

  const renderPreview = () => {
    const step = wgtStep
    const co = wgtCfg.color
    const bg = wgtCfg.theme === 'dark' ? '#141e2b' : '#ffffff'
    const surf = wgtCfg.theme === 'dark' ? '#1c2d3f' : '#f8f9fa'
    const txt = wgtCfg.theme === 'dark' ? '#e8f2ff' : '#1a1a2e'
    const t2 = wgtCfg.theme === 'dark' ? 'rgba(210,228,255,.55)' : '#666'
    const bdr = wgtCfg.theme === 'dark' ? 'rgba(68,128,216,.2)' : '#e0e0e0'

    const steps = ['Date & Service', ...(wgtCfg.showTable ? ['Table'] : []), 'Vos infos', 'Confirmation']
    const totalSteps = steps.length
    const cvt = wgtCvt || 2
    const svc = wgtSvc || SERVICES[0]?.name || 'Midi'

    const dots = steps.map((s, i) => {
      const a = i + 1 === step
      return (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flex: 1 }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 800,
            background: a ? co : bdr,
            color: a ? '#fff' : t2,
          }}>
            {i + 1}
          </div>
          <div style={{ fontSize: 11, color: a ? co : t2, whiteSpace: 'nowrap' }}>{s}</div>
          {i < steps.length - 1 && <div style={{ flex: 2, height: 1, background: bdr, marginTop: 14 }} />}
        </div>
      )
    })

    let body: ReactNode = null

    if (step === 1) {
      const svcHtml = SERVICES.filter(s => s.active).map(s => {
        const sel = svc === s.name
        const sCutoff = s.bookingCutoffMins || 0
        const sOpenM2 = parseInt(s.open.split(':')[0]) * 60 + parseInt(s.open.split(':')[1])
        const sClosed = sCutoff > 0 && new Date().getHours() * 60 + new Date().getMinutes() >= sOpenM2 - sCutoff
        return (
          <button
            key={s.name}
            onClick={() => !sClosed && setWgtSvc(s.name)}
            style={{
              flex: 1,
              padding: 8,
              borderRadius: 8,
              border: `1.5px solid ${sClosed ? 'rgba(220,80,80,.25)' : sel ? co : bdr}`,
              background: sClosed ? 'rgba(220,80,80,.05)' : sel ? co + '18' : surf,
              color: sClosed ? 'rgba(220,80,80,.5)' : sel ? co : txt,
              fontSize: 11,
              fontWeight: 700,
              cursor: sClosed ? 'not-allowed' : 'pointer',
            }}
          >
            {s.icon} {s.name}
            {sClosed ? <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(220,80,80,.7)' }}>🔒 Fermé</div> : <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.7 }}>{s.open}-{s.lastOrder}</div>}
          </button>
        )
      })

      body = (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: t2, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>Date</div>
          <input type="date" style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1.5px solid ${bdr}`, background: surf, color: txt, fontSize: 12 }} />
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: t2, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>Service</div>
            <div style={{ display: 'flex', gap: 8 }}>{svcHtml}</div>
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: t2, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>Couverts</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, border: `1.5px solid ${bdr}`, borderRadius: 8, overflow: 'hidden' }}>
              <button onClick={() => setWgtCvt(Math.max(wgtCfg.minCvt, cvt - 1))} style={{ width: 44, height: 44, border: 'none', background: surf, color: txt, fontSize: 18, cursor: 'pointer' }}>−</button>
              <div style={{ flex: 1, textAlign: 'center', fontSize: 20, fontWeight: 800, fontFamily: 'DM Mono,monospace', color: txt }}>
                {cvt}<div style={{ fontSize: 11, fontWeight: 400, color: t2 }}>pers.</div>
              </div>
              <button onClick={() => setWgtCvt(Math.min(wgtCfg.maxCvt, cvt + 1))} style={{ width: 44, height: 44, border: 'none', background: surf, color: txt, fontSize: 18, cursor: 'pointer' }}>+</button>
            </div>
          </div>
        </div>
      )
    } else if (step === 2 && wgtCfg.showTable) {
      const freeT = TABLES.filter(t => !t.blocked && t.capMax >= cvt).slice(0, 6)
      body = (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: t2, marginBottom: 8 }}>Table préférée <span style={{ fontWeight: 400, opacity: 0.6 }}>(optionnel)</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
            {freeT.map(t => (
              <button
                key={t.n}
                onClick={() => setWgtTbl(t.n)}
                style={{
                  padding: '8px 4px',
                  borderRadius: 8,
                  border: `1.5px solid ${wgtTbl === t.n ? co : bdr}`,
                  background: wgtTbl === t.n ? co + '18' : surf,
                  color: wgtTbl === t.n ? co : txt,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                {t.n}<div style={{ fontSize: 11, opacity: 0.7 }}>{t.capMin}-{t.capMax}p</div>
              </button>
            ))}
            <button
              onClick={() => setWgtTbl(null)}
              style={{
                padding: '8px 4px',
                borderRadius: 8,
                border: `1.5px solid ${bdr}`,
                background: surf,
                color: t2,
                fontSize: 11,
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              Pas de préf.
            </button>
          </div>
        </div>
      )
    } else if (step < totalSteps) {
      body = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div><div style={{ fontSize: 11, fontWeight: 700, color: t2, marginBottom: 4 }}>Prénom *</div><input placeholder="Sophie" style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1.5px solid ${bdr}`, background: surf, color: txt, fontSize: 12 }} /></div>
            <div><div style={{ fontSize: 11, fontWeight: 700, color: t2, marginBottom: 4 }}>Nom *</div><input placeholder="Durand" style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1.5px solid ${bdr}`, background: surf, color: txt, fontSize: 12 }} /></div>
          </div>
          <div><div style={{ fontSize: 11, fontWeight: 700, color: t2, marginBottom: 4 }}>Tél. *</div><input placeholder="+41 79 000 00 00" style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1.5px solid ${bdr}`, background: surf, color: txt, fontSize: 12 }} /></div>
          <div><div style={{ fontSize: 11, fontWeight: 700, color: t2, marginBottom: 4 }}>Email</div><input placeholder="email@..." style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1.5px solid ${bdr}`, background: surf, color: txt, fontSize: 12 }} /></div>
          {wgtCfg.showNote && <div><div style={{ fontSize: 11, fontWeight: 700, color: t2, marginBottom: 4 }}>Demande spéciale</div><textarea placeholder="Anniversaire, allergie..." rows={2} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1.5px solid ${bdr}`, background: surf, color: txt, fontSize: 12, resize: 'none' }} /></div>}
          {wgtCfg.showPrepay && <div style={{ background: co + '12', border: `1.5px solid ${co}44`, borderRadius: 8, padding: '10px 12px' }}><div style={{ fontSize: 11, fontWeight: 700, color: co, marginBottom: 2 }}>CB requise</div><div style={{ fontSize: 11, color: t2 }}>Garantit votre réservation</div></div>}
        </div>
      )
    } else {
      body = (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>✓</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: txt, marginBottom: 6 }}>Réservation confirmée !</div>
          <div style={{ fontSize: 12, color: t2, marginBottom: 16 }}>Un email de confirmation vous a été envoyé.</div>
          <div style={{ background: surf, border: `1.5px solid ${bdr}`, borderRadius: 10, padding: 12, textAlign: 'left' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: txt }}>{svc} · {cvt} pers.</div>
            <div style={{ fontSize: 11, color: t2 }}>2024-12-25</div>
          </div>
          <button
            onClick={() => { setWgtStep(1); setWgtSvc(null); setWgtCvt(2) }}
            style={{
              marginTop: 14,
              padding: '8px 20px',
              borderRadius: 8,
              border: 'none',
              background: co,
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Nouvelle réservation
          </button>
        </div>
      )
    }

    const prevBtn = step > 1 && step <= totalSteps ? <button onClick={() => setWgtStep(step - 1)} style={{ flex: 1, padding: 11, borderRadius: 9, border: `1.5px solid ${bdr}`, background: 'none', color: t2, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Retour</button> : null
    const nextLbl = step === totalSteps ? 'Confirmer' : 'Continuer'
    const nextBtn = step <= totalSteps ? <button onClick={() => setWgtStep(step + 1)} style={{ flex: 2, padding: 11, borderRadius: 9, border: 'none', background: co, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{nextLbl}</button> : null

    const isHoriz = wgtCfg.layout === 'horizontal'

    return (
      <div style={{
        width: isHoriz ? '100%' : 310,
        maxWidth: isHoriz ? 720 : undefined,
        background: bg,
        borderRadius: 16,
        boxShadow: '0 8px 40px rgba(0,0,0,.18)',
        overflow: 'hidden',
        fontFamily: 'DM Sans,sans-serif',
      }}>
        <div style={{ background: co, padding: isHoriz ? '12px 20px' : '16px 20px' }}>
          <div style={{ fontSize: isHoriz ? 13 : 14, fontWeight: 800, color: '#fff', marginBottom: isHoriz ? 0 : 2 }}>
            {RESTO.name}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.75)' }}>
            {wgtCfg.msg}
          </div>
        </div>
        {isHoriz ? (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
            <div style={{ flex: 1, padding: '14px 18px 6px' }}>
              {dots}
            </div>
            <div style={{ flex: 1, padding: '16px 20px' }}>
              {body}
            </div>
            {step <= totalSteps && <div style={{ padding: '16px 14px 16px 0', display: 'flex', flexDirection: 'column', gap: 8, minWidth: 130 }}>{prevBtn}{nextBtn}</div>}
          </div>
        ) : (
          <>
            <div style={{ padding: '14px 18px 6px' }}>
              {dots}
            </div>
            <div style={{ padding: '14px 18px' }}>
              {body}
            </div>
            {step <= totalSteps && <div style={{ padding: '0 18px 18px', display: 'flex', gap: 8 }}>{prevBtn}{nextBtn}</div>}
          </>
        )}
      </div>
    )
  }

  const colorSwatches = ['#1c4f90', '#2d6a4f', '#e63946', '#6d4c41', '#1a1a2e', '#7b2d8b']

  return (
    <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 20, overflow: 'auto', height: 'calc(100vh - var(--hh))' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text)', margin: 0 }}>Widget</h2>
        <p style={{ fontSize: 13, color: 'var(--t2)', margin: '8px 0 0 0' }}>
          Interface client intégrable · Live preview
        </p>
        {/* Domain + Status Bar */}
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
            background: 'rgba(60,200,112,.08)', border: '1px solid rgba(60,200,112,.25)',
            borderRadius: 20, fontSize: 11, fontWeight: 700, color: 'var(--gn)',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gn)' }} />
            En ligne
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px',
            background: 'var(--surf2)', border: '1px solid var(--border)', borderRadius: 20,
          }}>
            <span style={{ fontSize: 11, color: 'var(--t3)' }}>🌐</span>
            <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--fm)', color: 'var(--bl)' }}>booking.r3sto.ch</span>
            <button onClick={() => { navigator.clipboard?.writeText('https://booking.r3sto.ch'); toast('URL copiée', 'success') }}
              style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, border: '1px solid var(--border)', background: 'transparent', color: 'var(--t3)', cursor: 'pointer' }}>
              📋
            </button>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px',
            background: 'rgba(68,128,216,.08)', border: '1px solid rgba(68,128,216,.2)', borderRadius: 20,
          }}>
            <span style={{ fontSize: 11, color: 'var(--bl)' }}>👥 Groupes 8+ → formulaire dédié</span>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px',
            background: 'rgba(155,89,182,.08)', border: '1px solid rgba(155,89,182,.2)', borderRadius: 20,
          }}>
            <span style={{ fontSize: 11, color: '#9b59b6' }}>🔍 Profil client reconnu auto</span>
          </div>
        </div>
      </div>

      {/* Config Panel & Preview */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 18, alignItems: 'start' }}>
        {/* Config Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Color */}
          <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>Couleur</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {colorSwatches.map(hex => (
                <button
                  key={hex}
                  onClick={() => setWgtCfg({ ...wgtCfg, color: hex })}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    background: hex,
                    border: wgtCfg.color === hex ? '3px solid var(--text)' : '2px solid transparent',
                    cursor: 'pointer',
                  }}
                  title={hex}
                />
              ))}
              <input
                type="color"
                value={wgtCfg.color}
                onChange={(e) => setWgtCfg({ ...wgtCfg, color: e.target.value })}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              />
            </div>
          </div>

          {/* Theme */}
          <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>Thème</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => setWgtCfg({ ...wgtCfg, theme: 'light' })}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 4,
                  border: '1px solid var(--border)',
                  background: wgtCfg.theme === 'light' ? 'var(--bl)' : 'var(--surf2)',
                  color: wgtCfg.theme === 'light' ? 'white' : 'var(--text)',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Clair
              </button>
              <button
                onClick={() => setWgtCfg({ ...wgtCfg, theme: 'dark' })}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 4,
                  border: '1px solid var(--border)',
                  background: wgtCfg.theme === 'dark' ? 'var(--bl)' : 'var(--surf2)',
                  color: wgtCfg.theme === 'dark' ? 'white' : 'var(--text)',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Sombre
              </button>
            </div>
          </div>

          {/* Options */}
          <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>Options</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { key: 'showTable', label: 'Choix de table', desc: 'Préférence table' },
                { key: 'showNote', label: 'Demandes spéciales', desc: 'Texte libre' },
                { key: 'showPrepay', label: 'Empreinte CB', desc: 'Anti no-show' },
              ].map(o => (
                <div key={o.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>{o.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--t3)' }}>{o.desc}</div>
                  </div>
                  <button
                    onClick={() => setWgtCfg({ ...wgtCfg, [o.key]: !wgtCfg[o.key as keyof WidgetConfig] })}
                    style={{
                      width: 44,
                      height: 24,
                      borderRadius: 12,
                      border: 'none',
                      cursor: 'pointer',
                      background: wgtCfg[o.key as keyof WidgetConfig] ? 'var(--gn)' : 'var(--surf3)',
                    }}
                  >
                    <div style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      background: '#fff',
                      margin: wgtCfg[o.key as keyof WidgetConfig] ? '3px 3px 3px auto' : '3px auto 3px 3px',
                    }} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Message */}
          <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Message</div>
            <input
              value={wgtCfg.msg}
              onChange={(e) => setWgtCfg({ ...wgtCfg, msg: e.target.value })}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 4,
                border: '1px solid var(--border)',
                background: 'var(--surf2)',
                color: 'var(--text)',
                fontSize: 12,
              }}
            />
          </div>

          {/* Layout */}
          <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>Mise en page</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setWgtCfg({ ...wgtCfg, layout: 'vertical' })}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 4,
                  border: '1px solid var(--border)',
                  background: wgtCfg.layout === 'vertical' ? 'var(--bl)' : 'var(--surf2)',
                  color: wgtCfg.layout === 'vertical' ? 'white' : 'var(--text)',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                □ Vertical
              </button>
              <button
                onClick={() => setWgtCfg({ ...wgtCfg, layout: 'horizontal' })}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 4,
                  border: '1px solid var(--border)',
                  background: wgtCfg.layout === 'horizontal' ? 'var(--bl)' : 'var(--surf2)',
                  color: wgtCfg.layout === 'horizontal' ? 'white' : 'var(--text)',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ▬ Horizontal
              </button>
            </div>
          </div>

          {/* Embed Code */}
          <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Code d'intégration</div>
            <div style={{
              background: 'var(--surf2)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: 12,
              fontFamily: 'DM Mono,monospace',
              fontSize: 11,
              color: 'var(--gn)',
              overflow: 'auto',
              whiteSpace: 'pre',
              lineHeight: '1.7',
            }}>
{`<!-- Widget R3STO -->
<script src="https://widget.r3sto.com/v2/embed.js"><\/script>
<div id="r3sto-widget" data-resto="legourmet" data-color="${wgtCfg.color}" data-theme="${wgtCfg.theme}">
<\/div>`}
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`<!-- Widget R3STO -->
<script src="https://widget.r3sto.com/v2/embed.js"><\/script>
<div id="r3sto-widget" data-resto="legourmet" data-color="${wgtCfg.color}" data-theme="${wgtCfg.theme}">
<\/div>`)
                toast('Code copié dans le presse-papier', 'success')
              }}
              style={{
                marginTop: 10,
                width: '100%',
                padding: 8,
                borderRadius: 4,
                border: 'none',
                background: 'var(--bl)',
                color: 'white',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Copier ce code
            </button>
          </div>
        </div>

        {/* Preview */}
        <div style={{ position: 'sticky', top: 80 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10, textAlign: 'center' }}>
            Prévisualisation live
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', overflowX: 'auto' }}>
            {renderPreview()}
          </div>
          <div style={{ fontSize: 11, color: 'var(--t3)', textAlign: 'center', marginTop: 10 }}>
            Testez le flux client en direct
          </div>
        </div>
      </div>
    </div>
  )
}
