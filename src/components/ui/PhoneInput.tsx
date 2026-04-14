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

// Format générique réutilisable — surchargé seulement pour les pays clés (CH/FR/US/…)
const GEN9: CountryData = { dial: '', flag: '', format: '### ### ###', placeholder: '123 456 789', maxDigits: 9 }
const GEN10: CountryData = { dial: '', flag: '', format: '### ### ####', placeholder: '123 456 7890', maxDigits: 10 }
const GEN8: CountryData = { dial: '', flag: '', format: '### ### ##', placeholder: '123 456 78', maxDigits: 8 }
const GEN7: CountryData = { dial: '', flag: '', format: '### ####', placeholder: '123 4567', maxDigits: 7 }

const mk = (base: CountryData, dial: string, flag: string, placeholder?: string): CountryData =>
  ({ ...base, dial, flag, placeholder: placeholder ?? base.placeholder })

const COUNTRIES: Record<string, CountryData> = {
  // ── Europe ──
  CH: { dial: '+41', flag: '🇨🇭', format: '## ### ## ##', placeholder: '78 123 45 67', maxDigits: 9 },
  FR: { dial: '+33', flag: '🇫🇷', format: '# ## ## ## ##', placeholder: '6 12 34 56 78', maxDigits: 9 },
  BE: { dial: '+32', flag: '🇧🇪', format: '### ## ## ##', placeholder: '470 12 34 56', maxDigits: 9 },
  LU: { dial: '+352', flag: '🇱🇺', format: '### ### ###', placeholder: '621 123 456', maxDigits: 9 },
  MC: { dial: '+377', flag: '🇲🇨', format: '## ## ## ##', placeholder: '06 12 34 56', maxDigits: 8 },
  DE: { dial: '+49', flag: '🇩🇪', format: '### #######', placeholder: '170 1234567', maxDigits: 11 },
  AT: { dial: '+43', flag: '🇦🇹', format: '### #######', placeholder: '664 1234567', maxDigits: 11 },
  NL: { dial: '+31', flag: '🇳🇱', format: '# ## ## ## ##', placeholder: '6 12 34 56 78', maxDigits: 9 },
  IT: { dial: '+39', flag: '🇮🇹', format: '### ### ####', placeholder: '312 345 6789', maxDigits: 10 },
  ES: { dial: '+34', flag: '🇪🇸', format: '### ## ## ##', placeholder: '612 34 56 78', maxDigits: 9 },
  PT: { dial: '+351', flag: '🇵🇹', format: '### ### ###', placeholder: '912 345 678', maxDigits: 9 },
  GR: { dial: '+30', flag: '🇬🇷', format: '### ### ####', placeholder: '691 234 5678', maxDigits: 10 },
  GB: { dial: '+44', flag: '🇬🇧', format: '#### ######', placeholder: '7911 123456', maxDigits: 10 },
  IE: { dial: '+353', flag: '🇮🇪', format: '## ### ####', placeholder: '85 123 4567', maxDigits: 9 },
  SE: { dial: '+46', flag: '🇸🇪', format: '## ### ## ##', placeholder: '70 123 45 67', maxDigits: 9 },
  NO: { dial: '+47', flag: '🇳🇴', format: '### ## ###', placeholder: '412 34 567', maxDigits: 8 },
  DK: { dial: '+45', flag: '🇩🇰', format: '## ## ## ##', placeholder: '20 12 34 56', maxDigits: 8 },
  FI: { dial: '+358', flag: '🇫🇮', format: '## ### ####', placeholder: '40 123 4567', maxDigits: 9 },
  PL: { dial: '+48', flag: '🇵🇱', format: '### ### ###', placeholder: '512 345 678', maxDigits: 9 },
  CZ: { dial: '+420', flag: '🇨🇿', format: '### ### ###', placeholder: '601 234 567', maxDigits: 9 },
  RO: { dial: '+40', flag: '🇷🇴', format: '### ### ###', placeholder: '721 234 567', maxDigits: 9 },
  HU: { dial: '+36', flag: '🇭🇺', format: '## ### ####', placeholder: '20 123 4567', maxDigits: 9 },
  HR: { dial: '+385', flag: '🇭🇷', format: '## ### ####', placeholder: '91 234 5678', maxDigits: 9 },
  AL: mk(GEN9, '+355', '🇦🇱', '67 212 3456'),
  AD: mk(GEN8, '+376', '🇦🇩', '312 345'),
  BA: mk(GEN8, '+387', '🇧🇦', '61 234 567'),
  BG: mk(GEN9, '+359', '🇧🇬', '48 123 456'),
  BY: mk(GEN9, '+375', '🇧🇾', '29 491 1911'),
  CY: mk(GEN8, '+357', '🇨🇾', '96 123 456'),
  EE: mk(GEN8, '+372', '🇪🇪', '51 23 4567'),
  FO: mk(GEN7, '+298', '🇫🇴', '211 234'),
  GE: mk(GEN9, '+995', '🇬🇪', '555 12 34 56'),
  GI: mk(GEN8, '+350', '🇬🇮', '5712 3456'),
  GL: mk(GEN7, '+299', '🇬🇱', '221 234'),
  IS: mk(GEN7, '+354', '🇮🇸', '611 1234'),
  LI: mk(GEN7, '+423', '🇱🇮', '660 234 567'),
  LT: mk(GEN8, '+370', '🇱🇹', '612 34 567'),
  LV: mk(GEN8, '+371', '🇱🇻', '21 234 567'),
  MT: mk(GEN8, '+356', '🇲🇹', '9696 1234'),
  MD: mk(GEN8, '+373', '🇲🇩', '621 12 345'),
  ME: mk(GEN8, '+382', '🇲🇪', '67 622 901'),
  MK: mk(GEN8, '+389', '🇲🇰', '72 345 678'),
  RS: mk(GEN9, '+381', '🇷🇸', '60 1234567'),
  SI: mk(GEN8, '+386', '🇸🇮', '31 234 567'),
  SK: mk(GEN9, '+421', '🇸🇰', '912 123 456'),
  SM: mk(GEN10, '+378', '🇸🇲', '66 66 12 12'),
  UA: mk(GEN9, '+380', '🇺🇦', '50 123 4567'),
  VA: mk(GEN10, '+379', '🇻🇦', '06 6982 1234'),
  XK: mk(GEN8, '+383', '🇽🇰', '43 123 456'),
  // ── Amérique du Nord ──
  US: { dial: '+1', flag: '🇺🇸', format: '(###) ###-####', placeholder: '(555) 123-4567', maxDigits: 10 },
  CA: { dial: '+1', flag: '🇨🇦', format: '(###) ###-####', placeholder: '(514) 123-4567', maxDigits: 10 },
  MX: { dial: '+52', flag: '🇲🇽', format: '## #### ####', placeholder: '55 1234 5678', maxDigits: 10 },
  // ── Amérique centrale & Caraïbes ──
  BZ: mk(GEN7, '+501', '🇧🇿', '622 1234'),
  CR: mk(GEN8, '+506', '🇨🇷', '8312 3456'),
  CU: mk(GEN8, '+53', '🇨🇺', '5 1234567'),
  DO: mk(GEN10, '+1809', '🇩🇴', '809 234 5678'),
  SV: mk(GEN8, '+503', '🇸🇻', '7012 3456'),
  GT: mk(GEN8, '+502', '🇬🇹', '5123 4567'),
  HT: mk(GEN8, '+509', '🇭🇹', '34 10 1234'),
  HN: mk(GEN8, '+504', '🇭🇳', '9123 4567'),
  JM: mk(GEN10, '+1876', '🇯🇲', '876 210 1234'),
  NI: mk(GEN8, '+505', '🇳🇮', '8123 4567'),
  PA: mk(GEN8, '+507', '🇵🇦', '6123 4567'),
  PR: mk(GEN10, '+1787', '🇵🇷', '787 234 5678'),
  TT: mk(GEN10, '+1868', '🇹🇹', '868 291 1234'),
  BS: mk(GEN10, '+1242', '🇧🇸', '242 359 1234'),
  BB: mk(GEN10, '+1246', '🇧🇧', '246 250 1234'),
  AG: mk(GEN10, '+1268', '🇦🇬', '268 464 0123'),
  AI: mk(GEN10, '+1264', '🇦🇮', '264 235 1234'),
  AW: mk(GEN7, '+297', '🇦🇼', '560 1234'),
  BM: mk(GEN10, '+1441', '🇧🇲', '441 370 1234'),
  KY: mk(GEN10, '+1345', '🇰🇾', '345 323 1234'),
  DM: mk(GEN10, '+1767', '🇩🇲', '767 225 1234'),
  GD: mk(GEN10, '+1473', '🇬🇩', '473 403 1234'),
  GP: mk(GEN9, '+590', '🇬🇵', '690 00 1234'),
  MQ: mk(GEN9, '+596', '🇲🇶', '696 20 1234'),
  MS: mk(GEN10, '+1664', '🇲🇸', '664 492 3456'),
  KN: mk(GEN10, '+1869', '🇰🇳', '869 765 2917'),
  LC: mk(GEN10, '+1758', '🇱🇨', '758 284 5678'),
  VC: mk(GEN10, '+1784', '🇻🇨', '784 430 0123'),
  VG: mk(GEN10, '+1284', '🇻🇬', '284 300 1234'),
  VI: mk(GEN10, '+1340', '🇻🇮', '340 642 1234'),
  TC: mk(GEN10, '+1649', '🇹🇨', '649 231 1234'),
  // ── Amérique du Sud ──
  BR: { dial: '+55', flag: '🇧🇷', format: '## #####-####', placeholder: '11 98765-4321', maxDigits: 11 },
  AR: { dial: '+54', flag: '🇦🇷', format: '## ####-####', placeholder: '11 2345-6789', maxDigits: 10 },
  BO: mk(GEN8, '+591', '🇧🇴', '7234 5678'),
  CL: mk(GEN9, '+56', '🇨🇱', '2 2123 4567'),
  CO: mk(GEN10, '+57', '🇨🇴', '321 1234567'),
  EC: mk(GEN9, '+593', '🇪🇨', '99 123 4567'),
  GY: mk(GEN7, '+592', '🇬🇾', '609 1234'),
  PY: mk(GEN9, '+595', '🇵🇾', '961 456789'),
  PE: mk(GEN9, '+51', '🇵🇪', '912 345 678'),
  SR: mk(GEN7, '+597', '🇸🇷', '741 2345'),
  UY: mk(GEN8, '+598', '🇺🇾', '94 231 234'),
  VE: mk(GEN10, '+58', '🇻🇪', '412 123 4567'),
  GF: mk(GEN9, '+594', '🇬🇫', '694 20 1234'),
  FK: mk(GEN7, '+500', '🇫🇰', '51234'),
  // ── Afrique du Nord ──
  MA: { dial: '+212', flag: '🇲🇦', format: '## ## ## ## ##', placeholder: '06 12 34 56 78', maxDigits: 10 },
  TN: { dial: '+216', flag: '🇹🇳', format: '## ### ###', placeholder: '20 123 456', maxDigits: 8 },
  DZ: { dial: '+213', flag: '🇩🇿', format: '### ## ## ##', placeholder: '551 23 45 67', maxDigits: 9 },
  EG: mk(GEN10, '+20', '🇪🇬', '100 123 4567'),
  LY: mk(GEN9, '+218', '🇱🇾', '91 2345678'),
  SD: mk(GEN9, '+249', '🇸🇩', '91 1234567'),
  SS: mk(GEN9, '+211', '🇸🇸', '97 123 4567'),
  EH: mk(GEN9, '+212', '🇪🇭', '528 123 456'),
  // ── Moyen-Orient ──
  AE: { dial: '+971', flag: '🇦🇪', format: '## ### ####', placeholder: '50 123 4567', maxDigits: 9 },
  SA: { dial: '+966', flag: '🇸🇦', format: '## ### ####', placeholder: '50 123 4567', maxDigits: 9 },
  LB: { dial: '+961', flag: '🇱🇧', format: '## ### ###', placeholder: '71 123 456', maxDigits: 8 },
  IL: { dial: '+972', flag: '🇮🇱', format: '##-###-####', placeholder: '50-123-4567', maxDigits: 9 },
  BH: mk(GEN8, '+973', '🇧🇭', '3600 1234'),
  IQ: mk(GEN10, '+964', '🇮🇶', '791 234 5678'),
  IR: mk(GEN10, '+98', '🇮🇷', '912 345 6789'),
  JO: mk(GEN9, '+962', '🇯🇴', '79 1234567'),
  KW: mk(GEN8, '+965', '🇰🇼', '500 12345'),
  OM: mk(GEN8, '+968', '🇴🇲', '9212 3456'),
  PS: mk(GEN9, '+970', '🇵🇸', '599 123 456'),
  QA: mk(GEN8, '+974', '🇶🇦', '3312 3456'),
  SY: mk(GEN9, '+963', '🇸🇾', '944 567 890'),
  YE: mk(GEN9, '+967', '🇾🇪', '712 345 678'),
  TR: { dial: '+90', flag: '🇹🇷', format: '### ### ## ##', placeholder: '532 123 45 67', maxDigits: 10 },
  // ── Asie ──
  JP: { dial: '+81', flag: '🇯🇵', format: '##-####-####', placeholder: '90-1234-5678', maxDigits: 10 },
  CN: { dial: '+86', flag: '🇨🇳', format: '### #### ####', placeholder: '138 1234 5678', maxDigits: 11 },
  IN: { dial: '+91', flag: '🇮🇳', format: '##### #####', placeholder: '98765 43210', maxDigits: 10 },
  SG: { dial: '+65', flag: '🇸🇬', format: '#### ####', placeholder: '9123 4567', maxDigits: 8 },
  TH: { dial: '+66', flag: '🇹🇭', format: '## ### ####', placeholder: '81 234 5678', maxDigits: 9 },
  AF: mk(GEN9, '+93', '🇦🇫', '70 123 4567'),
  AM: mk(GEN8, '+374', '🇦🇲', '77 123456'),
  AZ: mk(GEN9, '+994', '🇦🇿', '40 123 45 67'),
  BD: mk(GEN10, '+880', '🇧🇩', '1812 345678'),
  BT: mk(GEN8, '+975', '🇧🇹', '17 123 456'),
  BN: mk(GEN7, '+673', '🇧🇳', '712 3456'),
  KH: mk(GEN9, '+855', '🇰🇭', '91 234 567'),
  TL: mk(GEN8, '+670', '🇹🇱', '77 12345'),
  HK: mk(GEN8, '+852', '🇭🇰', '5123 4567'),
  ID: mk(GEN10, '+62', '🇮🇩', '812 3456 7890'),
  KZ: mk(GEN10, '+7', '🇰🇿', '701 234 5678'),
  KP: mk(GEN9, '+850', '🇰🇵', '191 234 567'),
  KR: mk(GEN10, '+82', '🇰🇷', '10 1234 5678'),
  KG: mk(GEN9, '+996', '🇰🇬', '312 123456'),
  LA: mk(GEN9, '+856', '🇱🇦', '20 2312 3456'),
  MO: mk(GEN8, '+853', '🇲🇴', '6612 3456'),
  MY: mk(GEN10, '+60', '🇲🇾', '12 345 6789'),
  MV: mk(GEN7, '+960', '🇲🇻', '771 1234'),
  MN: mk(GEN8, '+976', '🇲🇳', '8812 3456'),
  MM: mk(GEN9, '+95', '🇲🇲', '9 212 3456'),
  NP: mk(GEN10, '+977', '🇳🇵', '984 1234567'),
  PK: mk(GEN10, '+92', '🇵🇰', '301 2345678'),
  PH: mk(GEN10, '+63', '🇵🇭', '905 1234567'),
  LK: mk(GEN9, '+94', '🇱🇰', '71 234 5678'),
  TW: mk(GEN9, '+886', '🇹🇼', '912 345 678'),
  TJ: mk(GEN9, '+992', '🇹🇯', '917 12 3456'),
  TM: mk(GEN8, '+993', '🇹🇲', '66 123456'),
  UZ: mk(GEN9, '+998', '🇺🇿', '91 234 56 78'),
  VN: mk(GEN10, '+84', '🇻🇳', '91 234 56 78'),
  // ── Océanie ──
  AU: { dial: '+61', flag: '🇦🇺', format: '### ### ###', placeholder: '412 345 678', maxDigits: 9 },
  NZ: mk(GEN9, '+64', '🇳🇿', '21 123 4567'),
  FJ: mk(GEN7, '+679', '🇫🇯', '701 2345'),
  PG: mk(GEN8, '+675', '🇵🇬', '7012 3456'),
  WS: mk(GEN7, '+685', '🇼🇸', '721 2345'),
  SB: mk(GEN7, '+677', '🇸🇧', '741 2345'),
  VU: mk(GEN7, '+678', '🇻🇺', '591 2345'),
  TO: mk(GEN7, '+676', '🇹🇴', '771 2345'),
  KI: mk(GEN8, '+686', '🇰🇮', '7201 2345'),
  NR: mk(GEN7, '+674', '🇳🇷', '555 1234'),
  PW: mk(GEN7, '+680', '🇵🇼', '620 1234'),
  MH: mk(GEN7, '+692', '🇲🇭', '235 1234'),
  FM: mk(GEN7, '+691', '🇫🇲', '350 1234'),
  TV: mk(GEN7, '+688', '🇹🇻', '901 2345'),
  CK: mk(GEN7, '+682', '🇨🇰', '712 3456'),
  NU: mk(GEN7, '+683', '🇳🇺', '888 4012'),
  NC: mk(GEN7, '+687', '🇳🇨', '751 234'),
  PF: mk(GEN7, '+689', '🇵🇫', '87 12 34 56'),
  // ── Afrique sub-saharienne ──
  SN: { dial: '+221', flag: '🇸🇳', format: '## ### ## ##', placeholder: '77 123 45 67', maxDigits: 9 },
  CI: { dial: '+225', flag: '🇨🇮', format: '## ## ## ## ##', placeholder: '07 12 34 56 78', maxDigits: 10 },
  AO: mk(GEN9, '+244', '🇦🇴', '923 123 456'),
  BJ: mk(GEN8, '+229', '🇧🇯', '90 01 12 34'),
  BW: mk(GEN8, '+267', '🇧🇼', '71 234 567'),
  BF: mk(GEN8, '+226', '🇧🇫', '70 12 34 56'),
  BI: mk(GEN8, '+257', '🇧🇮', '79 56 12 34'),
  CM: mk(GEN9, '+237', '🇨🇲', '6 71 23 45 67'),
  CV: mk(GEN7, '+238', '🇨🇻', '991 12 34'),
  CF: mk(GEN8, '+236', '🇨🇫', '70 01 23 45'),
  TD: mk(GEN8, '+235', '🇹🇩', '63 01 23 45'),
  KM: mk(GEN7, '+269', '🇰🇲', '321 2345'),
  CD: mk(GEN9, '+243', '🇨🇩', '99 123 4567'),
  CG: mk(GEN9, '+242', '🇨🇬', '06 123 4567'),
  DJ: mk(GEN7, '+253', '🇩🇯', '77 830 000'),
  GQ: mk(GEN9, '+240', '🇬🇶', '222 123 456'),
  ER: mk(GEN7, '+291', '🇪🇷', '7 123 456'),
  SZ: mk(GEN8, '+268', '🇸🇿', '7612 3456'),
  ET: mk(GEN9, '+251', '🇪🇹', '91 123 4567'),
  GA: mk(GEN8, '+241', '🇬🇦', '06 03 12 34'),
  GM: mk(GEN7, '+220', '🇬🇲', '301 2345'),
  GH: mk(GEN9, '+233', '🇬🇭', '23 123 4567'),
  GN: mk(GEN9, '+224', '🇬🇳', '601 12 34 56'),
  GW: mk(GEN7, '+245', '🇬🇼', '955 012 345'),
  KE: mk(GEN9, '+254', '🇰🇪', '712 123 456'),
  LS: mk(GEN8, '+266', '🇱🇸', '5012 3456'),
  LR: mk(GEN8, '+231', '🇱🇷', '77 012 3456'),
  MG: mk(GEN9, '+261', '🇲🇬', '32 12 345 67'),
  MW: mk(GEN9, '+265', '🇲🇼', '991 234 567'),
  ML: mk(GEN8, '+223', '🇲🇱', '65 01 23 45'),
  MR: mk(GEN8, '+222', '🇲🇷', '22 12 34 56'),
  MU: mk(GEN8, '+230', '🇲🇺', '5251 2345'),
  YT: mk(GEN9, '+262', '🇾🇹', '639 01 23 45'),
  MZ: mk(GEN9, '+258', '🇲🇿', '82 123 4567'),
  NA: mk(GEN9, '+264', '🇳🇦', '81 123 4567'),
  NE: mk(GEN8, '+227', '🇳🇪', '93 12 34 56'),
  NG: mk(GEN10, '+234', '🇳🇬', '802 123 4567'),
  RE: mk(GEN9, '+262', '🇷🇪', '692 12 34 56'),
  RW: mk(GEN9, '+250', '🇷🇼', '72 123 4567'),
  ST: mk(GEN7, '+239', '🇸🇹', '221 2345'),
  SC: mk(GEN7, '+248', '🇸🇨', '251 0123'),
  SL: mk(GEN8, '+232', '🇸🇱', '25 123 456'),
  SO: mk(GEN8, '+252', '🇸🇴', '7 1123456'),
  ZA: mk(GEN9, '+27', '🇿🇦', '71 123 4567'),
  TZ: mk(GEN9, '+255', '🇹🇿', '621 234 567'),
  TG: mk(GEN8, '+228', '🇹🇬', '90 11 23 45'),
  UG: mk(GEN9, '+256', '🇺🇬', '712 345 678'),
  ZM: mk(GEN9, '+260', '🇿🇲', '95 1234567'),
  ZW: mk(GEN9, '+263', '🇿🇼', '71 234 5678'),
  // ── Russie & CIS ──
  RU: { dial: '+7', flag: '🇷🇺', format: '### ###-##-##', placeholder: '912 345-67-89', maxDigits: 10 },
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
            return a.localeCompare(b)
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
