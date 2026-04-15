import { useState, useMemo } from 'react'
import { useToast } from '../../components/ui/Toast'
import { useAppStore } from '../../store/useAppStore'

interface WidgetConfig {
  color: string
  theme: 'light' | 'dark'
  lang: string
}

// Validation stricte d'une couleur hex — refus des valeurs tordues
const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/
const DEFAULT_COLOR = '#1c4f90'
const BOOKING_BASE = 'https://booking.r3sto.ch'

export function Widget() {
  const { toast } = useToast()
  const restaurantId = useAppStore(s => s.restaurantId)
  const [wgtCfg, setWgtCfg] = useState<WidgetConfig>({
    color: DEFAULT_COLOR,
    theme: 'light',
    lang: 'fr',
  })

  // Couleur validée (fallback sur défaut si input corrompu)
  const safeColor = HEX_RE.test(wgtCfg.color) ? wgtCfg.color : DEFAULT_COLOR

  // Build iframe URL from config — always in sync with real booking.r3sto.ch
  // NB : bookingBase est unique (app + demo) ; le tenant arrive via `r=<id>`.
  const iframeUrl = useMemo(() => {
    const p = new URLSearchParams()
    p.set('embed', '1')
    // Tenant : sans restaurantId, booking.r3sto.ch affichera la page générique
    if (restaurantId) p.set('r', String(restaurantId))
    if (safeColor !== DEFAULT_COLOR) p.set('color', safeColor)
    if (wgtCfg.theme === 'dark') p.set('theme', 'dark')
    if (wgtCfg.lang !== 'fr') p.set('lang', wgtCfg.lang)
    return `${BOOKING_BASE}?${p.toString()}`
  }, [safeColor, wgtCfg.theme, wgtCfg.lang, restaurantId])

  const setColor = (hex: string) => {
    if (!HEX_RE.test(hex)) {
      toast('Couleur invalide (attendu #rrggbb)', 'error')
      return
    }
    setWgtCfg({ ...wgtCfg, color: hex })
  }

  // Embed code for copy — sandbox serré, allow limité à la réservation
  const embedCode = `<!-- Widget R3STO -->\n<iframe src="${iframeUrl}" style="width:100%;min-height:600px;border:none;border-radius:12px" sandbox="allow-scripts allow-forms allow-same-origin allow-popups" allow="payment" loading="lazy" title="Réservation en ligne"></iframe>`

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
            <button onClick={() => { navigator.clipboard?.writeText(iframeUrl); toast('URL copiée', 'success') }}
              style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, border: '1px solid var(--border)', background: 'transparent', color: 'var(--t3)', cursor: 'pointer' }}>
              📋
            </button>
          </div>
          <a href={iframeUrl} target="_blank" rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px',
              background: 'var(--bl)', border: '1px solid var(--bl)', borderRadius: 20,
              color: 'white', fontSize: 11, fontWeight: 700, textDecoration: 'none',
            }}>
            ↗ Tester le widget
          </a>
        </div>
        {!restaurantId && (
          <div style={{
            marginTop: 10, padding: '10px 14px', borderRadius: 8,
            background: 'rgba(230,130,50,.08)', border: '1px solid rgba(230,130,50,.3)',
            fontSize: 12, color: 'var(--text)',
          }}>
            ⚠ <b>Aucun restaurant lié à ce compte</b> — le widget affichera la page générique. Complétez votre profil pour que le lien pointe sur votre établissement.
          </div>
        )}
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
                <button key={hex} onClick={() => setColor(hex)}
                  style={{ width: 26, height: 26, borderRadius: '50%', background: hex, border: safeColor === hex ? '3px solid var(--text)' : '2px solid transparent', cursor: 'pointer' }}
                />
              ))}
              <input type="color" value={safeColor} onChange={e => setColor(e.target.value)}
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
            <div style=