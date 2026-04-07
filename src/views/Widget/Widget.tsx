import { useState } from 'react'
import type { ReactNode } from 'react'
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
  showRedirect: boolean
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

// Demo sibling restaurants for redirect when full
const SIBLING_SITES = [
  { id: 's1', name: 'Le Bistro de Sion', ville: 'Sion', distance: '2.1 km', color: '#38b090', available: true, slots: 3 },
  { id: 's2', name: 'La Terrasse du Lac', ville: 'Montreux', distance: '12 km', color: '#e08030', available: true, slots: 1 },
  { id: 's3', name: 'Chez Marcel', ville: 'Lausanne', distance: '25 km', color: '#7c3aed', available: false, slots: 0 },
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
    showRedirect: true,
  })

  const [wgtStep, setWgtStep] = useState(1)
  const [wgtCvt, setWgtCvt] = useState(2)
  const [wgtSvc, setWgtSvc] = useState<string | null>(null)
  const [wgtTbl, setWgtTbl] = useState<string | null>(null)
  const [isFull, setIsFull] = useState(false) // Simulate restaurant full

  const renderPreview = () => {
    const step = wgtStep
    const co = wgtCfg.color
    const isDk = wgtCfg.theme === 'dark'
    const bg = isDk ? '#0f1923' : '#ffffff'
    const surf = isDk ? '#182433' : '#f4f6f8'
    const surf2 = isDk ? '#1e3044' : '#edf0f3'
    const txt = isDk ? '#e8f2ff' : '#1a1a2e'
    const t2 = isDk ? 'rgba(210,228,255,.5)' : '#8892a0'
    const t3 = isDk ? 'rgba(210,228,255,.3)' : '#b0b8c4'
    const bdr = isDk ? 'rgba(68,128,216,.15)' : '#e6e9ed'
    const coLight = co + (isDk ? '20' : '10')
    const coBorder = co + (isDk ? '40' : '28')

    const steps = ['Date & Service', ...(wgtCfg.showTable ? ['Table'] : []), 'Vos infos', 'Confirmation']
    const totalSteps = steps.length
    const cvt = wgtCvt || 2
    const svc = wgtSvc || SERVICES[0]?.name || 'Midi'

    // ── Progress bar (clean horizontal) ──
    const progressBar = (
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '0 4px' }}>
        {steps.map((s, i) => {
          const done = i + 1 < step
          const active = i + 1 === step
          return (
            <div key={i} style={{ display: 'contents' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 0 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: done ? 11 : 10, fontWeight: 800,
                  background: done ? co : active ? co : 'transparent',
                  color: done ? '#fff' : active ? '#fff' : t3,
                  border: `2px solid ${done || active ? co : bdr}`,
                  transition: 'all .25s ease',
                }}>
                  {done ? '✓' : i + 1}
                </div>
                <div style={{ fontSize: 9, fontWeight: active ? 700 : 500, color: active ? co : t3, whiteSpace: 'nowrap', letterSpacing: '.01em' }}>{s}</div>
              </div>
              {i < steps.length - 1 && (
                <div style={{ flex: 1, height: 2, background: done ? co : bdr, borderRadius: 1, margin: '0 6px', marginBottom: 18, transition: 'background .25s ease' }} />
              )}
            </div>
          )
        })}
      </div>
    )

    // ── Input style helper ──
    const inputSt = (focus?: boolean): React.CSSProperties => ({
      width: '100%', padding: '10px 12px', borderRadius: 10,
      border: `1.5px solid ${focus ? coBorder : bdr}`,
      background: surf, color: txt, fontSize: 13, fontFamily: 'inherit',
      outline: 'none', transition: 'border .15s',
      boxSizing: 'border-box' as const,
    })
    const labelSt: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: t2, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.06em', display: 'block' }

    let body: ReactNode = null

    if (step === 1) {
      // Date chips (7 days)
      const dateChips: { label: string; sub: string; key: number }[] = []
      const now = new Date()
      for (let i = 0; i < 7; i++) {
        const d = new Date(now); d.setDate(now.getDate() + i)
        const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
        dateChips.push({ label: i === 0 ? 'Auj.' : dayNames[d.getDay()], sub: String(d.getDate()), key: i })
      }

      body = (
        <div>
          {/* Date chips */}
          <div style={{ marginBottom: 16 }}>
            <div style={labelSt}>Date</div>
            <div style={{ display: 'flex', gap: 5 }}>
              {dateChips.map((dc, i) => (
                <div key={dc.key} style={{
                  flex: 1, textAlign: 'center', padding: '8px 2px', borderRadius: 10, cursor: 'pointer',
                  background: i === 0 ? coLight : 'transparent',
                  border: `1.5px solid ${i === 0 ? coBorder : 'transparent'}`,
                  transition: 'all .15s',
                }}>
                  <div style={{ fontSize: 9, fontWeight: 600, color: i === 0 ? co : t3, marginBottom: 2 }}>{dc.label}</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: i === 0 ? co : txt }}>{dc.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Service cards */}
          <div style={{ marginBottom: 16 }}>
            <div style={labelSt}>Service</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {SERVICES.filter(s => s.active).map(s => {
                const sel = svc === s.name
                const sCutoff = s.bookingCutoffMins || 0
                const sOpenM = parseInt(s.open.split(':')[0]) * 60 + parseInt(s.open.split(':')[1])
                const sClosed = sCutoff > 0 && new Date().getHours() * 60 + new Date().getMinutes() >= sOpenM - sCutoff
                return (
                  <button key={s.name} onClick={() => !sClosed && setWgtSvc(s.name)} style={{
                    flex: 1, padding: '12px 8px', borderRadius: 12, textAlign: 'center', cursor: sClosed ? 'not-allowed' : 'pointer',
                    border: `1.5px solid ${sClosed ? 'rgba(220,80,80,.2)' : sel ? coBorder : bdr}`,
                    background: sClosed ? 'rgba(220,80,80,.04)' : sel ? coLight : 'transparent',
                    opacity: sClosed ? .5 : 1, transition: 'all .15s',
                  }}>
                    <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: sel ? co : txt }}>{s.name}</div>
                    <div style={{ fontSize: 10, fontWeight: 500, color: t2, marginTop: 1 }}>
                      {sClosed ? '🔒 Fermé' : `${s.open.replace(':', 'h')} – ${s.lastOrder.replace(':', 'h')}`}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Guests ±  */}
          <div style={{ marginBottom: 4 }}>
            <div style={labelSt}>Nombre de personnes</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, justifyContent: 'center' }}>
              <button onClick={() => setWgtCvt(Math.max(wgtCfg.minCvt, cvt - 1))} style={{
                width: 40, height: 40, borderRadius: '50%', border: `1.5px solid ${bdr}`, background: surf,
                color: cvt <= wgtCfg.minCvt ? t3 : txt, fontSize: 18, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>−</button>
              <div style={{ width: 64, textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 900, fontFamily: 'DM Mono,monospace', color: co, lineHeight: 1 }}>{cvt}</div>
                <div style={{ fontSize: 9, fontWeight: 600, color: t2, marginTop: 2 }}>pers.</div>
              </div>
              <button onClick={() => setWgtCvt(Math.min(wgtCfg.maxCvt, cvt + 1))} style={{
                width: 40, height: 40, borderRadius: '50%', border: `1.5px solid ${bdr}`, background: surf,
                color: cvt >= wgtCfg.maxCvt ? t3 : txt, fontSize: 18, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>+</button>
            </div>
          </div>

          {/* Slots (time pills) */}
          {wgtCfg.showSlots && (
            <div style={{ marginTop: 12 }}>
              <div style={labelSt}>Créneau</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['12h00', '12h15', '12h30', '12h45', '13h00', '13h15', '13h30'].map((sl, i) => (
                  <button key={sl} style={{
                    padding: '7px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                    fontFamily: 'DM Mono,monospace', cursor: 'pointer',
                    border: `1.5px solid ${i === 0 ? coBorder : bdr}`,
                    background: i === 0 ? coLight : 'transparent',
                    color: i === 0 ? co : txt,
                    transition: 'all .12s',
                  }}>{sl.replace('h', ':')}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      )

      // Full restaurant redirect
      if (isFull && wgtCfg.showRedirect) {
        const availableSites = SIBLING_SITES.filter(s => s.available)
        body = (
          <div>
            <div style={{ padding: '16px', background: isDk ? 'rgba(220,80,80,.08)' : 'rgba(220,80,80,.04)', border: '1.5px solid rgba(220,80,80,.2)', borderRadius: 14, marginBottom: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>😔</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#dc5050', marginBottom: 4 }}>Restaurant complet</div>
              <div style={{ fontSize: 11, color: t2 }}>Aucune table disponible pour {cvt} personnes à cette date.</div>
            </div>
            {availableSites.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: co, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.05em' }}>Nos autres établissements</div>
                {availableSites.map(site => (
                  <div key={site.id} onClick={() => { setIsFull(false); toast(`Redirigé vers ${site.name}`, 'success') }} style={{
                    padding: '12px 14px', marginBottom: 6, borderRadius: 12,
                    border: `1.5px solid ${site.color}25`, background: `${site.color}08`,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, transition: 'all .12s',
                  }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: `linear-gradient(135deg,${site.color},${site.color}cc)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 15, fontWeight: 900, flexShrink: 0 }}>{site.name.charAt(0)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: txt }}>{site.name}</div>
                      <div style={{ fontSize: 10, color: t2 }}>{site.ville} · {site.distance}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#22c55e' }}>{site.slots}</div>
                      <div style={{ fontSize: 9, color: t2 }}>dispo</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setIsFull(false)} style={{ width: '100%', marginTop: 8, padding: '10px', borderRadius: 10, border: `1.5px solid ${bdr}`, background: 'transparent', color: t2, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>← Modifier ma recherche</button>
          </div>
        )
      }
    } else if (step === 2 && wgtCfg.showTable) {
      const freeT = TABLES.filter(t => !t.blocked && t.capMax >= cvt).slice(0, 6)
      body = (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: t2, marginBottom: 10 }}>Table préférée <span style={{ fontWeight: 400, opacity: 0.5 }}>(optionnel)</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 8 }}>
            {freeT.map(t => (
              <button key={t.n} onClick={() => setWgtTbl(t.n)} style={{
                padding: '12px 4px', borderRadius: 12, textAlign: 'center', cursor: 'pointer',
                border: `1.5px solid ${wgtTbl === t.n ? coBorder : bdr}`,
                background: wgtTbl === t.n ? coLight : 'transparent',
                color: wgtTbl === t.n ? co : txt, transition: 'all .12s',
              }}>
                <div style={{ fontSize: 14, fontWeight: 900, fontFamily: 'DM Mono,monospace' }}>{t.n}</div>
                <div style={{ fontSize: 9, color: t2, marginTop: 2 }}>{t.nm}</div>
                <div style={{ fontSize: 9, color: t3, marginTop: 1 }}>{t.capMin}-{t.capMax}p</div>
              </button>
            ))}
            <button onClick={() => setWgtTbl(null)} style={{
              padding: '12px 4px', borderRadius: 12, textAlign: 'center', cursor: 'pointer',
              border: `1.5px solid ${bdr}`, background: 'transparent', color: t2,
            }}>
              <div style={{ fontSize: 12 }}>🎲</div>
              <div style={{ fontSize: 9, marginTop: 2 }}>Au choix</div>
            </button>
          </div>
        </div>
      )
    } else if (step < totalSteps) {
      body = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div><span style={labelSt}>Prénom *</span><input placeholder="Sophie" style={inputSt()} /></div>
            <div><span style={labelSt}>Nom *</span><input placeholder="Durand" style={inputSt()} /></div>
          </div>
          {wgtCfg.showPhone && <div><span style={labelSt}>Téléphone *</span><input placeholder="+41 79 000 00 00" style={inputSt()} /></div>}
          {wgtCfg.showEmail && <div><span style={labelSt}>Email</span><input placeholder="email@exemple.ch" type="email" style={inputSt()} /></div>}
          {wgtCfg.showNote && <div><span style={labelSt}>Demande spéciale</span><textarea placeholder="Anniversaire, allergie, chaise haute..." rows={2} style={{ ...inputSt(), resize: 'none' as const, fontFamily: 'inherit' }} /></div>}
          {wgtCfg.showOccasion && (
            <div>
              <span style={labelSt}>Occasion</span>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {['🎂 Anniversaire', '💼 Business', '💕 Romantique', '🎉 Fête'].map(o => (
                  <button key={o} style={{ padding: '6px 10px', borderRadius: 20, fontSize: 10, fontWeight: 600, border: `1.5px solid ${bdr}`, background: 'transparent', color: t2, cursor: 'pointer' }}>{o}</button>
                ))}
              </div>
            </div>
          )}
          {wgtCfg.showPrepay && (
            <div style={{ background: coLight, border: `1.5px solid ${coBorder}`, borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>💳</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: co }}>Empreinte bancaire requise</div>
                <div style={{ fontSize: 10, color: t2 }}>Garantit votre réservation · Aucun débit</div>
              </div>
            </div>
          )}
        </div>
      )
    } else {
      body = (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', margin: '0 auto 12px',
            background: `linear-gradient(135deg,${co},${co}bb)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, color: '#fff',
          }}>✓</div>
          <div style={{ fontSize: 17, fontWeight: 900, color: txt, marginBottom: 4 }}>Réservation confirmée</div>
          <div style={{ fontSize: 11, color: t2, marginBottom: 18 }}>{wgtCfg.successMsg || 'Un email de confirmation vous a été envoyé.'}</div>
          <div style={{ background: surf, borderRadius: 12, padding: '14px 16px', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: txt }}>{svc}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: co, fontFamily: 'DM Mono,monospace' }}>12:00</span>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <span style={{ fontSize: 11, color: t2 }}>👤 {cvt} pers.</span>
              {wgtTbl && <span style={{ fontSize: 11, color: t2 }}>🪑 Table {wgtTbl}</span>}
              <span style={{ fontSize: 11, color: t2 }}>📅 {new Date().toLocaleDateString('fr-CH')}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button onClick={() => { setWgtStep(1); setWgtSvc(null); setWgtCvt(2) }} style={{
              flex: 1, padding: '10px', borderRadius: 10, border: `1.5px solid ${bdr}`,
              background: 'transparent', color: t2, fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}>Nouvelle réservation</button>
            <button style={{
              flex: 1, padding: '10px', borderRadius: 10, border: 'none',
              background: co, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer',
            }}>📅 Ajouter au calendrier</button>
          </div>
        </div>
      )
    }

    const prevBtn = step > 1 && step <= totalSteps ? (
      <button onClick={() => setWgtStep(step - 1)} style={{
        flex: 1, padding: 12, borderRadius: 12, border: `1.5px solid ${bdr}`,
        background: 'transparent', color: t2, fontSize: 12, fontWeight: 700, cursor: 'pointer',
        transition: 'all .12s',
      }}>← Retour</button>
    ) : null
    const nextLbl = step === totalSteps ? '✅ Confirmer la réservation' : 'Continuer →'
    const nextBtn = step <= totalSteps ? (
      <button onClick={() => setWgtStep(step + 1)} style={{
        flex: 2, padding: 12, borderRadius: 12, border: 'none',
        background: `linear-gradient(135deg,${co},${co}dd)`,
        color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer',
        boxShadow: `0 4px 16px ${co}33`,
        transition: 'all .12s',
      }}>{nextLbl}</button>
    ) : null

    return (
      <div style={{
        width: 360,
        background: bg,
        borderRadius: 20,
        boxShadow: isDk ? '0 12px 48px rgba(0,0,0,.5)' : '0 12px 48px rgba(0,0,0,.12)',
        overflow: 'hidden',
        fontFamily: "'DM Sans',system-ui,-apple-system,sans-serif",
      }}>
        {/* Hero header */}
        <div style={{
          background: `linear-gradient(135deg,${co},${co}cc)`,
          padding: '20px 22px 16px',
          position: 'relative',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M20 20.5V18H0v-2h20v-2H0v-2h20v-2H0V8h20V6H0V4h20V2H0V0h22v20h2V0h2v20h2V0h2v20h2V0h2v20h2V0h2v20.5z\' fill=\'%23ffffff\' fill-opacity=\'.03\'/%3E%3C/svg%3E")', opacity: 0.5 }} />
          <div style={{ position: 'relative' }}>
            {wgtCfg.showLang && (
              <div style={{ position: 'absolute', top: -4, right: 0, display: 'flex', gap: 3 }}>
                {['FR', 'DE', 'EN'].map(l => (
                  <button key={l} style={{ padding: '2px 6px', borderRadius: 4, border: 'none', background: l === 'FR' ? 'rgba(255,255,255,.25)' : 'transparent', color: 'rgba(255,255,255,.75)', fontSize: 9, fontWeight: 700, cursor: 'pointer' }}>{l}</button>
                ))}
              </div>
            )}
            <div style={{ fontSize: 16, fontWeight: 900, color: '#fff', marginBottom: 3, letterSpacing: '-.01em' }}>
              {RESTO.name}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.7)', lineHeight: 1.4 }}>
              {wgtCfg.msg}
            </div>
          </div>
        </div>

        {/* Progress */}
        <div style={{ padding: '14px 18px 8px' }}>
          {progressBar}
        </div>

        {/* Body */}
        <div style={{ padding: '10px 20px 16px' }}>
          {body}
        </div>

        {/* Footer buttons */}
        {step <= totalSteps && (
          <div style={{ padding: '0 20px 20px', display: 'flex', gap: 8 }}>
            {prevBtn}{nextBtn}
          </div>
        )}

        {/* Powered by */}
        <div style={{ padding: '0 0 12px', textAlign: 'center' }}>
          <span style={{ fontSize: 9, color: t3, letterSpacing: '.02em' }}>Powered by <strong style={{ fontWeight: 800, color: t2 }}>R3STO</strong></span>
        </div>
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

      {/* INSCRIPTION & VALIDATION FLOW */}
      
      {/* Widget Status Dashboard */}
      <div style={{
        background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 8, padding: 16,
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Statut du widget</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button style={{
              width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
              background: 'var(--gn)'
            }}>
              <div style={{
                width: 18, height: 18, borderRadius: '50%', background: '#fff',
                margin: '3px 3px 3px auto'
              }} />
            </button>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gn)' }}>Actif</span>
          </div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Domaine</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--fm)' }}>booking.r3sto.ch</div>
          <div style={{ fontSize: 11, color: 'var(--t3)' }}>Vérifié</div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.06em' }}>SSL</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gn)' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Sécurisé</span>
          </div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Dernière résa</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Hier à 19h32</div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Ce mois</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>87 réservations</div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Conversion</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gn)' }}>4.2%</div>
          <div style={{ height: 3, background: 'var(--surf2)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: '42%', height: '100%', background: 'var(--gn)' }} />
          </div>
        </div>
      </div>

      {/* Inscription Flow Pipeline */}
      <div style={{
        background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 8, padding: 16
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>Pipeline d'inscription</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { step: 1, title: 'Info restaurant', status: 'done', icon: '✅' },
            { step: 2, title: 'Email de confirmation', status: 'done', icon: '✅' },
            { step: 3, title: 'Domaine personnalisé', status: 'pending', icon: '⏳' },
            { step: 4, title: 'Widget testé', status: 'pending', icon: '⏳' },
            { step: 5, title: 'Mise en production', status: 'pending', icon: '🚀' },
          ].map((item, idx) => (
            <div key={item.step} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16,
                background: item.status === 'done' ? 'var(--gn)' : item.status === 'current' ? 'var(--bl)' : 'var(--surf2)',
                color: item.status === 'done' ? '#fff' : item.status === 'current' ? '#fff' : 'var(--t3)',
                fontWeight: 700
              }}>
                {item.status === 'done' ? '✓' : item.step}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{item.title}</div>
                <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>
                  {item.status === 'done' ? 'Complété' : item.status === 'current' ? 'En cours' : 'À faire'}
                </div>
              </div>
              <div style={{ fontSize: 18 }}>{item.icon}</div>
              {idx < 4 && <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 6px' }} />}
            </div>
          ))}
        </div>
        
        {/* Domaine personnalisé input */}
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Domaine personnalisé</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="text"
              placeholder="ex: reservations.mon-resto.ch"
              style={{
                flex: 1, padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border)',
                background: 'var(--surf2)', color: 'var(--text)', fontSize: 12,
                outline: 'none', boxSizing: 'border-box'
              }}
            />
            <button style={{
              padding: '10px 16px', borderRadius: 6, border: 'none', background: 'var(--bl)',
              color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer'
            }}>
              Configurer
            </button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 6 }}>Ajoutez votre propre domaine pour plus de personnalisation</div>
        </div>
      </div>

      {/* Email Validation Panel */}
      <div style={{
        background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 8, padding: 16
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>Gestion des emails</div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          {/* Sender email */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>Email d'envoi</div>
            <input
              type="email"
              placeholder="noreply@resto.ch"
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border)',
                background: 'var(--surf2)', color: 'var(--text)', fontSize: 12,
                outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>
          
          {/* From name */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>Nom d'expéditeur</div>
            <input
              type="text"
              placeholder="Mon Restaurant"
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border)',
                background: 'var(--surf2)', color: 'var(--text)', fontSize: 12,
                outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* Email templates */}
        <div style={{ marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t2)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.06em' }}>Templates</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
            {['Confirmation', 'Rappel', 'Annulation'].map(tmpl => (
              <button key={tmpl} style={{
                padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border)',
                background: 'var(--surf2)', color: 'var(--text)', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', transition: 'all .15s'
              }}>
                👁️ {tmpl}
              </button>
            ))}
          </div>
        </div>

        {/* Deliverability status */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t2)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.06em' }}>Livrabilité</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gn)' }} />
              <span style={{ fontSize: 12, color: 'var(--text)' }}>SPF</span>
              <span style={{ fontSize: 11, color: 'var(--t3)', marginLeft: 'auto' }}>Configuré ✓</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gn)' }} />
              <span style={{ fontSize: 12, color: 'var(--text)' }}>DKIM</span>
              <span style={{ fontSize: 11, color: 'var(--t3)', marginLeft: 'auto' }}>Configuré ✓</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#d4a574' }} />
              <span style={{ fontSize: 12, color: 'var(--text)' }}>DMARC</span>
              <span style={{ fontSize: 11, color: 'var(--t3)', marginLeft: 'auto' }}>À configurer</span>
            </div>
          </div>
        </div>

        <button style={{
          marginTop: 14, width: '100%', padding: '10px 12px', borderRadius: 6, border: 'none',
          background: 'var(--bl)', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer'
        }}>
          Envoyer email de test
        </button>
      </div>

      {/* Widget Analytics Card */}
      <div style={{
        background: 'linear-gradient(135deg, var(--surf) 0%, var(--surf2) 100%)',
        border: '1px solid var(--border)', borderRadius: 8, padding: 16
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>Analytiques du widget</div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 700 }}>Aujourd'hui</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>12 vues</div>
            <div style={{ fontSize: 11, color: 'var(--gn)', marginTop: 4 }}>+4 vs hier</div>
          </div>
          
          <div>
            <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 700 }}>Semaine</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>84 vues</div>
            <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>11 réservations</div>
          </div>
          
          <div>
            <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 700 }}>Ce mois</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>2,087 vues</div>
            <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>87 réservations</div>
          </div>
          
          <div>
            <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 700 }}>Taux abandon</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--rd)' }}>23%</div>
            <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>Étape 2 (infos)</div>
          </div>
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.06em' }}>Heures populaires</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['12h', '12:30h', '13h', '19h', '19:30h', '20h', '20:30h'].map((time, i) => (
            <div key={time} style={{
              padding: '6px 10px', borderRadius: 6, background: 'var(--surf)', border: '1px solid var(--border)',
              fontSize: 11, fontWeight: 600, color: 'var(--text)',
              opacity: [0.6, 1, 0.9, 0.5, 0.8, 1, 0.7][i]
            }}>
              {time}
            </div>
          ))}
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
                { key: 'showRedirect', label: 'Redirection MultiSite', desc: 'Proposer alternatives si complet' },
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
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
            <button onClick={() => setIsFull(!isFull)} style={{
              padding: '4px 12px', borderRadius: 20, fontSize: 10, fontWeight: 700, cursor: 'pointer',
              background: isFull ? 'rgba(220,80,80,.15)' : 'var(--surf3)',
              border: `1px solid ${isFull ? 'rgba(220,80,80,.3)' : 'var(--border)'}`,
              color: isFull ? 'var(--rd)' : 'var(--t3)',
            }}>
              {isFull ? '🔴 Complet (simulé)' : '🟢 Simuler complet'}
            </button>
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
