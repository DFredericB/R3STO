// ══════════════════════════════════════════════════
//  R3STO — Forgot Password
//  Design unifié avec Login : DM Sans · logo 56px · card 420 · blue CTA
// ══════════════════════════════════════════════════
import { useState } from 'react'

const FF = "'DM Sans', system-ui, -apple-system, sans-serif"
const BG = '#0a1020'
const SURF = '#111e33'
const BORDER = 'rgba(44,91,160,.22)'
const BLUE = '#4480d8'
const BLUE_H = '#5590e0'
const TEXT = '#e8edf5'
const MUTED = '#6b82a0'
const DANGER = '#ef6868'

const API = (import.meta as any).env?.VITE_API_BASE || 'https://api.r3sto.com'

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hover, setHover] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const r = await fetch(`${API}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok || !data.ok) throw new Error(data.error || 'Erreur — réessayez')
      setSent(true)
    } catch (e: any) {
      setError(e?.message || 'Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: BG,
      padding: 20,
      fontFamily: FF,
    }}>
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 70% 50% at 30% 20%, rgba(68,128,216,.1) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 70% 80%, rgba(68,128,216,.06) 0%, transparent 60%)',
      }} />

      <form onSubmit={onSubmit} style={{
        position: 'relative',
        width: '100%',
        maxWidth: 420,
        background: SURF,
        border: `1px solid ${BORDER}`,
        borderRadius: 14,
        padding: '36px 32px',
        color: TEXT,
        boxSizing: 'border-box',
        boxShadow: '0 16px 48px rgba(0,0,0,.45)',
        animation: 'forgotUp .3s ease',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <img src="/logo-r3sto.jpg" alt="R3STO" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 0 }} />
        </div>

        <h2 style={{
          textAlign: 'center', fontSize: 18, fontWeight: 700, color: TEXT,
          margin: '0 0 4px', fontFamily: FF,
        }}>Mot de passe oublié</h2>
        <p style={{
          textAlign: 'center', fontSize: 12, color: MUTED,
          margin: '0 0 24px', letterSpacing: '.02em',
        }}>Entrez votre email pour recevoir un lien de réinitialisation</p>

        {error && (
          <div style={{
            background: 'rgba(220,80,80,.1)', color: DANGER,
            padding: '10px 14px', borderRadius: 9, fontSize: 13,
            marginBottom: 16, border: '1px solid rgba(220,80,80,.2)',
            fontFamily: FF, textAlign: 'center',
          }}>{error}</div>
        )}

        {sent ? (
          <div style={{
            background: 'rgba(78,205,138,.08)', color: '#4ecd8a',
            padding: '14px 16px', borderRadius: 10, fontSize: 13,
            marginBottom: 16, border: '1px solid rgba(78,205,138,.25)',
            fontFamily: FF, textAlign: 'center', lineHeight: 1.5,
          }}>
            ✓ Si un compte existe pour <strong>{email}</strong>, un email vient d'être envoyé avec un lien de réinitialisation (valable 1 heure).
          </div>
        ) : (
          <>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              required
              autoFocus
              autoComplete="email"
              placeholder="adresse@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={inputStyle}
              onFocus={e => { e.currentTarget.style.borderColor = BLUE; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(68,128,216,.12)' }}
              onBlur={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.boxShadow = 'none' }}
            />

            <button
              type="submit"
              disabled={loading || !email.trim()}
              onMouseEnter={() => setHover(true)}
              onMouseLeave={() => setHover(false)}
              style={{
                width: '100%', padding: '11px 14px',
                background: hover && !loading ? BLUE_H : BLUE,
                border: `1.5px solid ${hover && !loading ? BLUE_H : BLUE}`,
                borderRadius: 9, color: '#fff', fontSize: 14, fontWeight: 600,
                cursor: loading ? 'wait' : 'pointer',
                opacity: loading || !email.trim() ? .6 : 1,
                transition: 'all .2s', fontFamily: FF, marginTop: 4,
              }}>
              {loading ? 'Envoi…' : 'Envoyer le lien'}
            </button>
          </>
        )}

        <div style={{
          textAlign: 'center', marginTop: 20, paddingTop: 18,
          borderTop: `1px solid ${BORDER}`, fontSize: 13, color: MUTED, fontFamily: FF,
        }}>
          <a href="/" style={{ color: BLUE, fontWeight: 600, textDecoration: 'none' }}>← Retour à la connexion</a>
        </div>

        <div style={{ textAlign: 'center', marginTop: 14, fontSize: 11, color: 'rgba(107,130,160,.5)' }}>
          api.r3sto.com
        </div>
      </form>

      <style>{`@keyframes forgotUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 10.5, fontWeight: 600, color: MUTED,
  marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em', fontFamily: FF,
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', marginBottom: 16,
  background: '#0a1020', border: `1.5px solid ${BORDER}`, borderRadius: 9,
  color: '#e8edf5', fontSize: 14, boxSizing: 'border-box', outline: 'none',
  fontFamily: FF, transition: 'border-color .2s, box-shadow .2s',
}
