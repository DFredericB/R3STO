import { useState, useMemo } from 'react'
import { useToast } from '../../components/ui/Toast'

interface WidgetConfig {
  color: string
  theme: 'light' | 'dark'
  lang: string
}

export function Widget() {
  const { toast } = useToast()
  const [wgtCfg, setWgtCfg] = useState<WidgetConfig>({
    color: '#1c4f90',
    theme: 'light',
    lang: 'fr',
  })

  // Build iframe URL from config — always in sync with real booking.r3sto.ch
  const isDemo = window.location.hostname.startsWith('demo.')
  const bookingBase = isDemo ? 'https://booking.r3sto.ch' : 'https://booking.r3sto.ch'
  const iframeUrl = useMemo(() => {
    const p = new URLSearchParams()
    p.set('embed', '1')
    if (wgtCfg.color !== '#1c4f90') p.set('color', wgtCfg.color)
    if (wgtCfg.theme === 'dark') p.set('theme', 'dark')
    if (wgtCfg.lang !== 'fr') p.set('lang', wgtCfg.lang)
    return `${bookingBase}?${p.toString()}`
  }, [wgtCfg, bookingBase])

  // Embed code for copy
  const embedCode = `<!-- Widget R3STO -->\n<iframe src="${iframeUrl}" style="width:100%;min-height:600px;border:none;border-radius:12px" allow="payment"></iframe>`

  const colorSwatches = ['#1c4f90', '#2d6a4f', '#e63946', '#6d4c41', '#1a1a2e', '#7b2d8b']

  return (
    <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 20, overflow: 'auto', height: 'calc(100vh - var(--hh))' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text)', margin: 0 }}>Widget de réservation</h2>
        <p style={{ fontSize: 13, color: 'var(--t2)', margin: '8px 0 0 0' }}>
          Votre page de réservation en ligne — booking.r3sto.ch
        </p>
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
        </div>
      </div>

      {/* Config + Preview */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 18, alignItems: 'start' }}>
        {/* Config Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Color */}
          <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>Couleur</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {colorSwatches.map(hex => (
                <button key={hex} onClick={() => setWgtCfg({ ...wgtCfg, color: hex })}
                  style={{ width: 26, height: 26, borderRadius: '50%', background: hex, border: wgtCfg.color === hex ? '3px solid var(--text)' : '2px solid transparent', cursor: 'pointer' }}
                />
              ))}
              <input type="color" value={wgtCfg.color} onChange={e => setWgtCfg({ ...wgtCfg, color: e.target.value })}
                style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0 }}
              />
            </div>
          </div>

          {/* Theme */}
          <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>Thème</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['light', 'dark'] as const).map(th => (
                <button key={th} onClick={() => setWgtCfg({ ...wgtCfg, theme: th })}
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: 4, border: '1px solid var(--border)',
                    background: wgtCfg.theme === th ? 'var(--bl)' : 'var(--surf2)',
                    color: wgtCfg.theme === th ? 'white' : 'var(--text)',
                    fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  }}>
                  {th === 'light' ? 'Clair' : 'Sombre'}
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>Langue</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {['fr', 'de', 'it', 'en'].map(l => (
                <button key={l} onClick={() => setWgtCfg({ ...wgtCfg, lang: l })}
                  style={{
                    flex: 1, padding: '6px 8px', borderRadius: 4, border: '1px solid var(--border)',
                    background: wgtCfg.lang === l ? 'var(--bl)' : 'var(--surf2)',
                    color: wgtCfg.lang === l ? 'white' : 'var(--text)',
                    fontSize: 11, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase',
                  }}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Embed Code */}
          <div style={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Code d'intégration</div>
            <div style={{
              background: 'var(--surf2)', border: '1px solid var(--border)', borderRadius: 8,
              padding: 12, fontFamily: 'DM Mono,monospace', fontSize: 10, color: 'var(--gn)',
              overflow: 'auto', whiteSpace: 'pre', lineHeight: '1.7',
            }}>
              {embedCode}
            </div>
            <button onClick={() => { navigator.clipboard?.writeText(embedCode); toast('Code copié', 'success') }}
              style={{
                marginTop: 10, width: '100%', padding: 8, borderRadius: 4, border: 'none',
                background: 'var(--bl)', color: 'white', fontSize: 11, fontWeight: 700, cursor: 'pointer',
              }}>
              Copier le code
            </button>
          </div>
        </div>

        {/* Live Preview — real booking.r3sto.ch in iframe */}
        <div style={{ position: 'sticky', top: 80 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10, textAlign: 'center' }}>
            Prévisualisation live — booking.r3sto.ch
          </div>
          <div style={{
            background: wgtCfg.theme === 'dark' ? '#1a1a2e' : '#f5f5f5',
            borderRadius: 16, padding: 20, display: 'flex', justifyContent: 'center',
            border: '1px solid var(--border)',
          }}>
            <iframe
              src={iframeUrl}
              style={{
                width: 420, minHeight: 620, border: 'none', borderRadius: 12,
                background: wgtCfg.theme === 'dark' ? '#0f1923' : '#fff',
              }}
              title="R3STO Booking Widget"
            />
          </div>
        </div>
      </div>
    </div>
  )

}
