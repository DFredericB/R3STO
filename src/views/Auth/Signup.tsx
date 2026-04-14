// ══════════════════════════════════════════════════
//  R3STO — Signup / Inscription
//  Design unifié avec Login : DM Sans · logo 56px · card 460 · blue CTA
// ══════════════════════════════════════════════════
import { useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { useT } from '../../i18n/useTranslation'
import PhoneInput from '../../components/ui/PhoneInput'

const FF = "'DM Sans', system-ui, -apple-system, sans-serif"
const BG = '#0a1020'
const SURF = '#111e33'
const BORDER = 'rgba(44,91,160,.22)'
const BLUE = '#4480d8'
const BLUE_H = '#5590e0'
const TEXT = '#e8edf5'
const MUTED = '#6b82a0'
const DANGER = '#ef6868'

export function Signup() {
  const { t } = useT()
  const { signup, loading, error } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [restaurantName, setRestaurantName] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [showMore, setShowMore] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [hover, setHover] = useState(false)

  // Validations frontend (miroir du backend Zod)
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const passwordValid = password.length >= 8
  const passwordsMatch = password === confirm
  const canSubmit = emailValid && passwordValid && passwordsMatch && !loading

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
    setLocalError(null)

    if (!emailValid) { setLocalError('Email invalide'); return }
    if (!passwordValid) { setLocalError('Mot de passe : 8 caractères minimum'); return }
    if (!passwordsMatch) { setLocalError('Les mots de passe ne correspondent pas'); return }

    const ok = await signup({
      email: email.trim(),
      password,
      restaurantName: restaurantName.trim() || undefined,
      name: name.trim(),
      phone: phone.trim() || undefined,
    })
    if (ok) window.location.href = '/'
  }

  const displayError = localError || error

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
        maxWidth: 460,
        background: SURF,
        border: `1px solid ${BORDER}`,
        borderRadius: 14,
        padding: '32px 32px 28px',
        color: TEXT,
        boxSizing: 'border-box',
        boxShadow: '0 16px 48px rgba(0,0,0,.45)',
        animation: 'signupUp .3s ease',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <img
            src="/logo-r3sto.jpg"
            alt="R3STO"
            style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 0 }}
          />
        </div>

        {/* Title */}
        <h2 style={{
          textAlign: 'center',
          fontSize: 18,
          fontWeight: 700,
          color: TEXT,
          margin: '0 0 4px',
          fontFamily: FF,
        }}>
          Créer votre compte R3STO
        </h2>
        <p style={{
          textAlign: 'center',
          fontSize: 12,
          color: MUTED,
          margin: '0 0 24px',
          letterSpacing: '.02em',
        }}>
          Essai gratuit · aucune commission sur vos réservations
        </p>

        {/* Error */}
        {displayError && (
          <div style={{
            background: 'rgba(220,80,80,.1)',
            color: DANGER,
            padding: '10px 14px',
            borderRadius: 9,
            fontSize: 13,
            marginBottom: 16,
            border: '1px solid rgba(220,80,80,.2)',
            fontFamily: FF,
            textAlign: 'center',
          }}>{displayError}</div>
        )}

        {/* Email */}
        <label style={labelStyle}>Email *</label>
        <input
          type="email"
          required
          autoFocus
          autoComplete="email"
          placeholder="adresse@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{
            ...inputStyle,
            borderColor: email && !emailValid ? DANGER : BORDER,
          }}
        />

        {/* Restaurant name */}
        <label style={labelStyle}>Nom du restaurant</label>
        <input
          type="text"
          autoComplete="organization"
          placeholder="ex: Le Bistro du Centre"
          value={restaurantName}
          onChange={e => setRestaurantName(e.target.value)}
          style={inputStyle}
        />

        {/* Password */}
        <label style={labelStyle}>Mot de passe *</label>
        <div style={{ position: 'relative', marginBottom: 8 }}>
          <input
            type={showPw ? 'text' : 'password'}
            required
            autoComplete="new-password"
            placeholder="8 caractères minimum"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{
              ...inputStyle,
              marginBottom: 0,
              paddingRight: 44,
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

        {/* Password strength */}
        {password && (
          <div style={{ marginBottom: 14 }}>
            <div style={{
              height: 3, background: 'rgba(255,255,255,.05)',
              borderRadius: 2, overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${strength.pct}%`,
                background: strength.color,
                transition: 'width .2s, background .2s',
              }} />
            </div>
            <div style={{
              fontSize: 10.5, color: strength.color, marginTop: 4, fontFamily: FF,
            }}>{strength.label}</div>
          </div>
        )}

        {/* Confirm password */}
        <label style={labelStyle}>Confirmer le mot de passe *</label>
        <input
          type={showPw ? 'text' : 'password'}
          required
          autoComplete="new-password"
          placeholder="Répéter"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          style={{
            ...inputStyle,
            borderColor: confirm && !passwordsMatch ? DANGER : BORDER,
          }}
        />

        {/* Toggle "plus d'infos" */}
        <button
          type="button"
          onClick={() => setShowMore(m => !m)}
          style={{
            background: 'none', border: 'none',
            color: BLUE, fontSize: 12, fontWeight: 600,
            cursor: 'pointer', padding: '6px 0',
            marginBottom: showMore ? 12 : 6, fontFamily: FF,
            textDecoration: 'underline',
          }}
        >
          {showMore ? '− Masquer les infos optionnelles' : '+ Ajouter nom et téléphone (optionnel)'}
        </button>

        {showMore && (
          <>
            <label style={labelStyle}>Votre nom</label>
            <input
              type="text"
              autoComplete="name"
              placeholder="ex: Marco Rossi"
              value={name}
              onChange={e => setName(e.target.value)}
              style={inputStyle}
            />

            <label style={labelStyle}>Téléphone</label>
            <div style={{ marginBottom: 14 }}>
              <PhoneInput
                value={phone}
                onChange={setPhone}
              />
            </div>
          </>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={!canSubmit}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          style={{
            width: '100%',
            padding: '11px 14px',
            background: hover && canSubmit ? BLUE_H : BLUE,
            border: `1.5px solid ${hover && canSubmit ? BLUE_H : BLUE}`,
            borderRadius: 9,
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            opacity: canSubmit ? 1 : .5,
            transition: 'all .2s',
            fontFamily: FF,
            marginTop: 4,
          }}
        >
          {loading ? 'Création du compte…' : 'Créer mon compte'}
        </button>

        {/* CGU hint */}
        <p style={{
          fontSize: 10.5, color: MUTED, textAlign: 'center',
          margin: '12px 0 0', lineHeight: 1.5, fontFamily: FF,
        }}>
          En créant un compte, vous acceptez nos conditions d'utilisation.
        </p>

        {/* Link back to login */}
        <div style={{
          textAlign: 'center', marginTop: 20, paddingTop: 18,
          borderTop: `1px solid ${BORDER}`,
          fontSize: 13, color: MUTED, fontFamily: FF,
        }}>
          Déjà un compte ?{' '}
          <a
            href="/"
            style={{ color: BLUE, fontWeight: 600, textDecoration: 'none' }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'underline' }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'none' }}
          >Se connecter</a>
        </div>

        <div style={{ textAlign: 'center', marginTop: 14, fontSize: 11, color: 'rgba(107,130,160,.5)' }}>
          api.r3sto.ch
        </div>
      </form>

      <style>{`@keyframes signupUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* supprimer warning useT unused si i18n pas encore branché */}
      <span style={{ display: 'none' }}>{t('login.submit')}</span>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 10.5,
  fontWeight: 600,
  color: MUTED,
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: '.06em',
  fontFamily: FF,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  marginBottom: 14,
  background: '#0a1020',
  border: `1.5px solid ${BORDER}`,
  borderRadius: 9,
  color: '#e8edf5',
  fontSize: 14,
  boxSizing: 'border-box',
  outline: 'none',
  fontFamily: FF,
  transition: 'border-color .2s, box-shadow .2s',
}
