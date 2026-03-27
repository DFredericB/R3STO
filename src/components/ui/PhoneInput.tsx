/**
 * PhoneInput — Composant téléphone réutilisable R3STO
 * Affiche drapeau + indicatif du pays du restaurant
 * Formate automatiquement selon le pays
 */
import { useState, useEffect, useRef } from 'react'
import { useAppStore } from '../../store/useAppStore'

// ── Données pays ───────────────────────────────────
interface CountryData {
  dial: string
  flag: string
  format: string      // ex: '## ### ## ##' → 78 123 45 67
  placeholder: string
  maxDigits: number
}

const COUNTRIES: Record<string, CountryData> = {
  // ── Europe francophone & voisins ──
  CH: { dial: '+41', flag: '🇨🇭', format: '## ### ## ##', placeholder: '78 123 45 67', maxDigits: 9 },
  FR: { dial: '+33', flag: '🇫🇷', format: '# ## ## ## ##', placeholder: '6 12 34 56 78', maxDigits: 9 },
  BE: { dial: '+32', flag: '🇧🇪', format: '### ## ## ##', placeholder: '470 12 34 56', maxDigits: 9 },
  LU: { dial: '+352', flag: '🇱🇺', format: '### ### ###', placeholder: '621 123 456', maxDigits: 9 },
  MC: { dial: '+377', flag: '🇲🇨', format: '## ## ## ##', placeholder: '06 12 34 56', maxDigits: 8 },
  // ── Europe centrale ──
  DE: { dial: '+49', flag: '🇩🇪', format: '### #######', placeholder: '170 1234567', maxDigits: 11 },
  AT: { dial: '+43', flag: '🇦🇹', format: '### #######', placeholder: '664 1234567', maxDigits: 11 },
  NL: { dial: '+31', flag: '🇳🇱', format: '# ## ## ## ##', placeholder: '6 12 34 56 78', maxDigits: 9 },
  // ── Europe du sud ──
  IT: { dial: '+39', flag: '🇮🇹', format: '### ### ####', placeholder: '312 345 6789', maxDigits: 10 },
  ES: { dial: '+34', flag: '🇪🇸', format: '### ## ## ##', placeholder: '612 34 56 78', maxDigits: 9 },
  PT: { dial: '+351', flag: '🇵🇹', format: '### ### ###', placeholder: '912 345 678', maxDigits: 9 },
  GR: { dial: '+30', flag: '🇬🇷', format: '### ### ####', placeholder: '691 234 5678', maxDigits: 10 },
  // ── Royaume-Uni & Irlande ──
  GB: { dial: '+44', flag: '🇬🇧', format: '#### ######', placeholder: '7911 123456', maxDigits: 10 },
  IE: { dial: '+353', flag: '🇮🇪', format: '## ### ####', placeholder: '85 123 4567', maxDigits: 9 },
  // ── Scandinavie ──
  SE: { dial: '+46', flag: '🇸🇪', format: '## ### ## ##', placeholder: '70 123 45 67', maxDigits: 9 },
  NO: { dial: '+47', flag: '🇳🇴', format: '### ## ###', placeholder: '412 34 567', maxDigits: 8 },
  DK: { dial: '+45', flag: '🇩🇰', format: '## ## ## ##', placeholder: '20 12 34 56', maxDigits: 8 },
  FI: { dial: '+358', flag: '🇫🇮', format: '## ### ####', placeholder: '40 123 4567', maxDigits: 9 },
  // ── Europe de l'Est ──
  PL: { dial: '+48', flag: '🇵🇱', format: '### ### ###', placeholder: '512 345 678', maxDigits: 9 },
  CZ: { dial: '+420', flag: '🇨🇿', format: '### ### ###', placeholder: '601 234 567', maxDigits: 9 },
  RO: { dial: '+40', flag: '🇷🇴', format: '### ### ###', placeholder: '721 234 567', maxDigits: 9 },
  HU: { dial: '+36', flag: '🇭🇺', format: '## ### ####', placeholder: '20 123 4567', maxDigits: 9 },
  HR: { dial: '+385', flag: '🇭🇷', format: '## ### ####', placeholder: '91 234 5678', maxDigits: 9 },
  // ── Amérique du Nord ──
  US: { dial: '+1', flag: '🇺🇸', format: '(###) ###-####', placeholder: '(555) 123-4567', maxDigits: 10 },
  CA: { dial: '+1', flag: '🇨🇦', format: '(###) ###-####', placeholder: '(514) 123-4567', maxDigits: 10 },
  MX: { dial: '+52', flag: '🇲🇽', format: '## #### ####', placeholder: '55 1234 5678', maxDigits: 10 },
  // ── Afrique du Nord & Moyen-Orient ──
  MA: { dial: '+212', flag: '🇲🇦', format: '## ## ## ## ##', placeholder: '06 12 34 56 78', maxDigits: 10 },
  TN: { dial: '+216', flag: '🇹🇳', format: '## ### ###', placeholder: '20 123 456', maxDigits: 8 },
  DZ: { dial: '+213', flag: '🇩🇿', format: '### ## ## ##', placeholder: '551 23 45 67', maxDigits: 9 },
  AE: { dial: '+971', flag: '🇦🇪', format: '## ### ####', placeholder: '50 123 4567', maxDigits: 9 },
  SA: { dial: '+966', flag: '🇸🇦', format: '## ### ####', placeholder: '50 123 4567', maxDigits: 9 },
  LB: { dial: '+961', flag: '🇱🇧', format: '## ### ###', placeholder: '71 123 456', maxDigits: 8 },
  // ── Asie-Pacifique ──
  JP: { dial: '+81', flag: '🇯🇵', format: '##-####-####', placeholder: '90-1234-5678', maxDigits: 10 },
  CN: { dial: '+86', flag: '🇨🇳', format: '### #### ####', placeholder: '138 1234 5678', maxDigits: 11 },
  IN: { dial: '+91', flag: '🇮🇳', format: '##### #####', placeholder: '98765 43210', maxDigits: 10 },
  AU: { dial: '+61', flag: '🇦🇺', format: '### ### ###', placeholder: '412 345 678', maxDigits: 9 },
  SG: { dial: '+65', flag: '🇸🇬', format: '#### ####', placeholder: '9123 4567', maxDigits: 8 },
  TH: { dial: '+66', flag: '🇹🇭', format: '## ### ####', placeholder: '81 234 5678', maxDigits: 9 },
  // ── Amérique du Sud ──
  BR: { dial: '+55', flag: '🇧🇷', format: '## #####-####', placeholder: '11 98765-4321', maxDigits: 11 },
  AR: { dial: '+54', flag: '🇦🇷', format: '## ####-####', placeholder: '11 2345-6789', maxDigits: 10 },
  // ── Afrique sub-saharienne ──
  SN: { dial: '+221', flag: '🇸🇳', format: '## ### ## ##', placeholder: '77 123 45 67', maxDigits: 9 },
  CI: { dial: '+225', flag: '🇨🇮', format: '## ## ## ## ##', placeholder: '07 12 34 56 78', maxDigits: 10 },
  // ── Russie & Turquie ──
  RU: { dial: '+7', flag: '🇷🇺', format: '### ###-##-##', placeholder: '912 345-67-89', maxDigits: 10 },
  TR: { dial: '+90', flag: '🇹🇷', format: '### ### ## ##', placeholder: '532 123 45 67', maxDigits: 10 },
  IL: { dial: '+972', flag: '🇮🇱', format: '##-###-####', placeholder: '50-123-4567', maxDigits: 9 },
}

const DEFAULT_COUNTRY: CountryData = { dial: '+41', flag: '🇨🇭', format: '## ### ## ##', placeholder: '78 123 45 67', maxDigits: 9 }

// ── Formatage ──────────────────────────────────────
function digitsOnly(v: string): string {
  return v.replace(/\D/g, '')
}

function formatPhone(digits: string, format: string): string {
  let i = 0
  let result = ''
  for (const c of format) {
    if (i >= digits.length) break
    if (c === '#') {
      result += digits[i++]
    } else {
      result += c
    }
  }
  return result
}

// ── Full international number (for storage) ────────
export function toE164(localDigits: string, countryCode: string): string {
  const c = COUNTRIES[countryCode] ?? DEFAULT_COUNTRY
  const d = digitsOnly(localDigits)
  if (!d) return ''
  // Remove leading 0 if present (common in FR, BE, MA, etc.)
  const clean = d.startsWith('0') ? d.slice(1) : d
  return `${c.dial}${clean}`
}

// ── Parse E164 back to local digits ────────────────
export function fromE164(e164: string, countryCode: string): string {
  const c = COUNTRIES[countryCode] ?? DEFAULT_COUNTRY
  if (!e164) return ''
  if (e164.startsWith(c.dial)) {
    return e164.slice(c.dial.length)
  }
  return e164.replace(/^\+\d{1,3}/, '')
}

// ── Composant ──────────────────────────────────────
interface PhoneInputProps {
  value: string
  onChange: (value: string) => void
  style?: React.CSSProperties
  compact?: boolean          // mode compact pour modale
  showSelector?: boolean     // afficher sélecteur de pays (défaut: true)
}

export default function PhoneInput({ value, onChange, style, compact, showSelector = true }: PhoneInputProps) {
  const pays = useAppStore(s => s.resto.pays) || 'CH'
  const [countryCode, setCountryCode] = useState(pays)
  const [showList, setShowList] = useState(false)
  const [localDigits, setLocalDigits] = useState('')
  const [searchCountry, setSearchCountry] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const country = COUNTRIES[countryCode] ?? DEFAULT_COUNTRY

  // Sync from external value
  useEffect(() => {
    const d = digitsOnly(value)
    if (d !== digitsOnly(localDigits)) {
      setLocalDigits(d)
    }
  }, [value])

  // Sync country from store
  useEffect(() => {
    setCountryCode(pays)
  }, [pays])

  // Close dropdown on outside click
  useEffect(() => {
    if (!showList) return
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setShowList(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showList])

  const handleChange = (raw: string) => {
    const d = digitsOnly(raw).slice(0, country.maxDigits)
    setLocalDigits(d)
    onChange(d)
  }

  const displayValue = formatPhone(localDigits, country.format)
  const h = compact ? 36 : 44

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'flex', ...style }}>
      {/* Flag + indicatif (fusionnés) */}
      <button
        type="button"
        onClick={() => showSelector && setShowList(!showList)}
        style={{
          display: 'flex', alignItems: 'center', gap: compact ? 3 : 4,
          padding: compact ? '0 8px' : '0 10px',
          height: h, minWidth: compact ? 64 : 72,
          background: 'var(--surf3)', border: '1px solid var(--border)',
          borderRight: 'none', borderRadius: '8px 0 0 8px',
          cursor: showSelector ? 'pointer' : 'default',
          fontSize: compact ? 13 : 15,
          color: 'var(--text)',
          flexShrink: 0,
        }}>
        <span>{country.flag}</span>
        <span style={{
          fontSize: compact ? 11 : 12, color: 'var(--t3)',
          fontFamily: 'var(--fm)', fontWeight: 600,
        }}>{country.dial}</span>
        {showSelector && <span style={{ fontSize: 8, opacity: .5 }}>▾</span>}
      </button>

      {/* Input */}
      <input
        type="tel"
        inputMode="tel"
        value={displayValue}
        onChange={e => handleChange(e.target.value)}
        placeholder={country.placeholder}
        style={{
          flex: 1, minWidth: 0,
          height: h, padding: '0 10px',
          background: 'var(--surf3)', border: '1px solid var(--border)',
          borderLeft: 'none', borderRadius: '0 8px 8px 0',
          color: 'var(--text)', fontSize: compact ? 13 : 14,
          fontFamily: 'var(--fm)', fontWeight: 500,
          outline: 'none', boxSizing: 'border-box',
        }}
      />

      {/* Dropdown pays */}
      {showList && (() => {
        const q = searchCountry.toLowerCase()
        // Trier : pays du restaurant en premier, puis pays actuel, puis alphabétique
        const entries = Object.entries(COUNTRIES)
          .filter(([code, data]) => !q || code.toLowerCase().includes(q) || data.dial.includes(q) || data.flag.includes(q))
          .sort(([a], [b]) => {
            if (a === pays) return -1
            if (b === pays) return 1
            if (a === countryCode) return -1
            if (b === countryCode) return 1
            return 0
          })
        return (
          <div style={{
            position: 'absolute', top: h + 4, left: 0, zIndex: 100,
            background: 'var(--surf2)', border: '1px solid var(--border)',
            borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,.4)',
            width: 240, display: 'flex', flexDirection: 'column',
          }}>
            {/* Recherche */}
            <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
              <input
                ref={searchRef}
                autoFocus
                type="text"
                value={searchCountry}
                onChange={e => setSearchCountry(e.target.value)}
                placeholder="🔍 Pays ou indicatif…"
                style={{
                  width: '100%', padding: '6px 8px', fontSize: 12,
                  border: '1px solid var(--border)', borderRadius: 6,
                  background: 'var(--surf3)', color: 'var(--text)',
                  fontFamily: 'var(--ff)', outline: 'none',
                }}
              />
            </div>
            <div style={{ maxHeight: 220, overflowY: 'auto' }}>
              {entries.map(([code, data]) => (
                <button key={code} type="button"
                  onClick={() => { setCountryCode(code); setShowList(false); setSearchCountry('') }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                    padding: '7px 12px', border: 'none', cursor: 'pointer',
                    background: code === countryCode ? 'rgba(91,156,246,.15)' : 'transparent',
                    color: code === countryCode ? '#7bb8ff' : 'var(--text)',
                    fontSize: 13, fontFamily: 'var(--ff)',
                    borderBottom: code === pays && code !== countryCode ? '1px solid var(--border)' : 'none',
                  }}>
                  <span style={{ fontSize: 16 }}>{data.flag}</span>
                  <span style={{ fontWeight: 600, fontSize: 12 }}>{code}</span>
                  <span style={{ color: 'var(--t3)', fontFamily: 'var(--fm)', fontSize: 11 }}>{data.dial}</span>
                  {code === pays && <span style={{ fontSize: 9, color: 'var(--gn)', fontWeight: 700, marginLeft: 'auto' }}>DÉFAUT</span>}
                </button>
              ))}
              {entries.length === 0 && (
                <div style={{ padding: '12px', fontSize: 11, color: 'var(--t3)', textAlign: 'center' }}>Aucun pays trouvé</div>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// ── Affichage international formaté ─────────────
/** Prend n'importe quel téléphone (digits bruts ou E.164) et retourne un affichage formaté avec indicatif.
 *  Ex: "795301000" → "+41 79 530 10 00"  |  "+41795301000" → "+41 79 530 10 00" */
export function displayPhone(tel: string, countryCode?: string): string {
  if (!tel) return ''
  // Déjà formaté avec + ? Retourner tel quel
  if (tel.startsWith('+') && tel.includes(' ')) return tel
  // Extraire les chiffres
  const raw = tel.replace(/\D/g, '')
  if (!raw) return ''
  const cc = countryCode || 'CH'
  const c = COUNTRIES[cc] ?? DEFAULT_COUNTRY
  const dialDigits = c.dial.replace(/\D/g, '')
  // Si commence par l'indicatif (ex: 41795301000), extraire la partie locale
  let local = raw
  if (raw.startsWith(dialDigits) && raw.length > dialDigits.length + 4) {
    local = raw.slice(dialDigits.length)
  }
  // Enlever le 0 initial si présent
  if (local.startsWith('0') && local.length > 1) local = local.slice(1)
  // Formater
  const formatted = formatPhone(local, c.format)
  return formatted ? `${c.dial} ${formatted}` : tel
}

// Export pour usage externe
export { COUNTRIES, DEFAULT_COUNTRY, formatPhone, digitsOnly }
export type { CountryData }
