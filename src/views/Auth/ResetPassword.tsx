// ══════════════════════════════════════════════════
//  R3STO — Reset Password (avec token URL)
// ══════════════════════════════════════════════════
import { useState, useEffect } from 'react'

const FF = "'DM Sans', system-ui, -apple-system, sans-serif"
const BG = '#0a1020'
const SURF = '#111e33'
const BORDER = 'rgba(44,91,160,.22)'
const BLUE = '#4480d8'
const BLUE_H = '#5590e0'
const TEXT = '#e8edf5'
const MUTED = '#6b82a0'
const DANGER = '#ef6868'

const API = (import.meta as any).env?.VITE_API_BASE || 'https://api.r3sto.ch'

export function ResetPassword() {
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [hover, setHover] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const t = params.get('token') || ''
    setToken(t)
  }, [])

  const passwordValid = password.length >= 8
  const passwordsMatch = password === confirm
  const canSubmit = !!token && passwordValid && passwordsMatch && !loading

  const passwordStrength = (): { label: string; color: string; pct: number } => {
    if (!password) return { label: '', color: MUTED, pct: 0 }
    let score = 0
    if (password.length >= 8) score++
    if (password.length >= 12) score++
    if (/[A-Z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++
    const map = [
      { label: 'Très faible', color: DANGER, pct: 20 },
      { label: 'Faible',      color: DANGER, pct: 40 },
      { label: 'Moyen',       color: '#e0a83f', pct: 60 },
      { label: 'Fort',        color: '#4ecd8a', pct: 80 },
      { label: 'Très fort',   color: '#4ecd8a', pct: 100 },
    ]
    return map[Math.min(score, 4)] || map[0]
  }

  const strength = passwordStrength()

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!token) { setError('Lien invalide'); return }
    if (!passwordValid) { setError('Mot de passe : 8 caractères minimum'); return }
    if (!passwordsMatch) { setError('Les mots de passe ne correspondent pas'); return }
    setLoading(true)
    try {
      const r = await fetch(`${API}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok || !data.ok) throw new Error(data.error || 'Lien expiré ou invalide')
      setDone(true)
      setTimeout(() => { window.location.href = '/' }, 2500)
    } catch (e: any) {
      setError(e?.message || 'Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: BG, padding: 20, fontFamily: FF,
    }}>
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 70% 50% at 30% 20%, rgba(68,128,216,.1) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 70% 80%, rgba(68,128,216,.06) 0%, transparent 60%)',
      }} />

      <form onSubmit={onSubmit} style={{
        position: 'relative', width: '100%', maxWidth: 420,
        background: SURF, border: `1px solid ${BORDER}`, borderRadius: 14,
        padding: '36px 32px', color: TEXT, boxSizing: 'border-box',
        boxShadow: '0 16px 48px rgba(0,0,0,.45)', animation: 'resetUp .3s ease',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <img src="/logo-r3sto.jpg" alt="R3STO" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 0 }} />
        </div>

        <h2 style={{
          textAlign: 'center', fontSize: 18, fontWeight: 700, color: TEXT,
          margin: '0 0 4px', fontFamily: FF,
        }}>Nouveau mot de passe</h2>
        <p style={{
          textAlign: 'center', fontSize: 12, color: MUTED,
          margin: '0 0 24px', letterSpacing: '.02em',
        }}>Choisissez un nouveau mot de passe pour votre compte</p>

        {!token && (
          <div style={{
            background: 'rgba(220,80,80,.1)', color: DANGER,
            padding: '10px 14px', borderRadius: 9, fontSize: 13,
            marginBottom: 16, border: '1px solid rgba(220,80,80,.2)',
            fontFamily: FF, textAlign: 'center',
          }}>Lien invalide. <a href="/forgot-password" style={{ color: BLUE }}>Refaire une demande</a></div>
        )}

        {error && (
          <div style={{
            background: 'rgba(220,80,80,.1)', color: DANGER,
            padding: '10px 14px', borderRadius: 9, fontSize: 13,
            marginBottom: 16, border: '1px solid rgba(220,80,80,.2)',
            fontFamily: FF, textAlign: 'center',
          }}>{error}</div>
        )}

        {done ? (
          <div style={{
            background: 'rgba(78,205,138,.08)', color: '#4ecd8a',
            padding: '14px 16px', borderRadius: 10, fontSize: 13,
            marginBottom: 16, border: '1px solid rgba(78,205,138,.25)',
            fontFamily: FF, textAlign: 'center', lineHeight: 1.5,
          }}>
            ✓ Mot de passe mis à jour. Redirection vers la connexion…
          </div>
        ) : (
          <>
            <label style={labelStyle}>Nouveau mot de passe *</label>
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <input
                type={showPw ? 'text' : 'password'}
                required autoFocus autoComplete="new-password"
                placeholder="8 caractères minimum"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={!token}
                style={{
                  ...inputStyle, marginBottom: 0, paddingRight: 44,
                  borderColor: password && !passwordValid ? DANGER : BORDER,
                }}
              />
              <button
                type="button"
                onClick={() => setShowPw(p => !p)}
                tabIndex={-1}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                  color: MUTED, display: 'flex', alignItems: 'center',
                }}
                aria-label={showPw ? 'Masquer' : 'Afficher'}
              >
                {showPw ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>

            {password && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ height: 3, background: 'rgba(255,255,255,.05)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${strength.pct}%`, background: strength.color, transition: 'width .2s, background .2s' }} />
                </div>
                <div style={{ fontSize: 10.5, color: strength.color, marginTop: 4, fontFamily: FF }}>{strength.label}</div>
              </div>
            )}

            <label style={labelStyle}>Confirmer *</label>
            <input
              type={showPw ? 'text' : 'password'}
              required autoComplete="new-password"
              placeholder="Répéter"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              disabled={!token}
              style={{
                ...inputStyle,
                borderColor: confirm && !passwordsMatch ? DANGER : BORDER,
              }}
            />

            <button
              type="submit"
              disabled={!canSubmit}
              onMouseEnter={() => setHover(true)}
              onMouseLeave={() => setHover(false)}
              style={{
                width: '100%', padding: '11px 14px',
                background: hover && canSubmit ? BLUE_H : BLUE,
                border: `1.5px solid ${hover && canSubmit ? BLUE_H : BLUE}`,
                borderRadius: 9, color: '#fff', fontSize: 14, fontWeight: 600,
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                opacity: canSubmit ? 1 : .5,
                transition: 'all .2s', fontFamily: FF, marginTop: 4,
              }}>
              {loading ? 'Mise à jour…' : 'Changer le mot de passe'}
            </button>
          </>
        )}

        <div style={{
          textAlign: 'center', marginTop: 20, paddingTop: 18,
          borderTop: `1px solid ${BORDER}`, fontSize: 13, color: MUTED, fontFamily: FF,
        }}>
          <a href="/" style={{ color: BLUE, fontWeight: 600, textDecoration: 'none' }}>← Retour à la connexion</a>
        </div>
      </form>

      <style>{`@keyframes resetUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 10.5, fontWeight: 600, color: MUTED,
  marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em', fontFamily: FF,
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', marginBottom: 14,
  background: '#0a1020', border: `1.5px solid ${BORDER}`, borderRadius: 9,
  color: '#e8edf5', fontSize: 14, boxSizing: 'border-box', outline: 'none',
  fontFamily: FF, transition: 'border-color .2s, box-shadow .2s',
}
