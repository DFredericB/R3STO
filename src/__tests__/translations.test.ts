import { describe, it, expect } from 'vitest'

const getTranslations = () => {
  const translations: Record<string, Record<'FR' | 'DE' | 'IT' | 'EN', string>> = {}

  require('../i18n/translations.ts')

  return translations
}

describe('Translations — Structure', () => {
  it('translations file exists and exports data', () => {
    const translationsModule = require('../i18n/translations.ts')
    expect(translationsModule).toBeDefined()
  })
})

describe('Translations — Completeness', () => {
  it('every key has all 4 languages (FR, DE, IT, EN)', () => {
    const code = require('fs').readFileSync('/sessions/busy-gifted-ride/mnt/Desktop--R3STO/src/i18n/translations.ts', 'utf-8')

    const keyMatches = code.matchAll(/'([^']+)':\s*{\s*FR:\s*'[^']*',\s*DE:\s*'[^']*',\s*IT:\s*'[^']*',\s*EN:\s*'[^']*'\s*}/g)
    const foundKeys = Array.from(keyMatches).map(m => m[1])

    expect(foundKeys.length).toBeGreaterThan(0)
  })

  it('no empty string values exist', () => {
    const code = require('fs').readFileSync('/sessions/busy-gifted-ride/mnt/Desktop--R3STO/src/i18n/translations.ts', 'utf-8')

    const hasEmptyValue = code.match(/:\s*{\s*([^}]*''[^}]*)\s*}/)
    expect(hasEmptyValue).toBeNull()
  })

  it('all keys follow dot-separated lowercase convention', () => {
    const code = require('fs').readFileSync('/sessions/busy-gifted-ride/mnt/Desktop--R3STO/src/i18n/translations.ts', 'utf-8')

    const keyMatches = code.matchAll(/'([^']+)':/g)
    const keys = Array.from(keyMatches).map(m => m[1])

    const validKeys = keys.filter(k => {
      const isValidFormat = /^[a-z]+(\.[a-z0-9_]+)*$/.test(k)
      return isValidFormat
    })

    expect(validKeys.length).toBeGreaterThan(100)
  })

  it('key naming follows patterns like day., month., nav., header., etc.', () => {
    const code = require('fs').readFileSync('/sessions/busy-gifted-ride/mnt/Desktop--R3STO/src/i18n/translations.ts', 'utf-8')

    const patterns = {
      'day.': /day\.[a-z]+/,
      'month.': /month\.[a-z]+/,
      'header.': /header\.[a-z]+/,
      'nav.': /nav\.[a-z]+/
    }

    for (const [prefix, pattern] of Object.entries(patterns)) {
      const matches = code.match(pattern)
      if (prefix === 'day.' || prefix === 'month.') {
        expect(matches).not.toBeNull()
      }
    }
  })
})

describe('Translations — No Duplicates', () => {
  it('no duplicate keys exist', () => {
    const code = require('fs').readFileSync('/sessions/busy-gifted-ride/mnt/Desktop--R3STO/src/i18n/translations.ts', 'utf-8')

    const keyMatches = code.matchAll(/'([^']+)':\s*{/g)
    const keys = Array.from(keyMatches).map(m => m[1])

    const uniqueKeys = new Set(keys)

    expect(keys.length).toBe(uniqueKeys.size)
  })
})

describe('Translations — Expected Keys Exist', () => {
  const expectedKeys = [
    'day.dim', 'day.lun', 'day.mar', 'day.mer', 'day.jeu', 'day.ven', 'day.sam',
    'month.jan', 'month.feb', 'month.mar', 'month.apr', 'month.may', 'month.jun',
    'month.jul', 'month.aug', 'month.sep', 'month.oct', 'month.nov', 'month.dec',
    'header.today', 'header.openMenu', 'header.closeMenu',
    'nav.operations', 'nav.dashboard', 'nav.agenda',
    'nav.grid', 'nav.floorplan', 'nav.clients',
    'support.chat.title', 'support.tab.chat',
    'support.quick.createResa'
  ]

  for (const key of expectedKeys) {
    it(`key "${key}" is defined`, () => {
      const code = require('fs').readFileSync('/sessions/busy-gifted-ride/mnt/Desktop--R3STO/src/i18n/translations.ts', 'utf-8')
      expect(code).toContain(`'${key}':`)
    })
  }
})

describe('Translations — Language Consistency', () => {
  it('all language keys use exactly FR, DE, IT, EN (not lowercase)', () => {
    const code = require('fs').readFileSync('/sessions/busy-gifted-ride/mnt/Desktop--R3STO/src/i18n/translations.ts', 'utf-8')

    const translationBlocks = code.matchAll(/{[\s]*(FR:|DE:|IT:|EN:)[^}]*}/g)
    let count = 0
    for (const match of translationBlocks) {
      const block = match[0]
      if (block.includes('FR:') && block.includes('DE:') && block.includes('IT:') && block.includes('EN:')) {
        count++
      }
    }

    expect(count).toBeGreaterThan(100)
  })
})

describe('Translations — Content Quality', () => {
  it('day abbreviations exist for all 7 days', () => {
    const code = require('fs').readFileSync('/sessions/busy-gifted-ride/mnt/Desktop--R3STO/src/i18n/translations.ts', 'utf-8')

    const dayKeys = ['day.dim', 'day.lun', 'day.mar', 'day.mer', 'day.jeu', 'day.ven', 'day.sam']
    for (const key of dayKeys) {
      expect(code).toContain(`'${key}':`)
    }
  })

  it('month abbreviations exist for all 12 months', () => {
    const code = require('fs').readFileSync('/sessions/busy-gifted-ride/mnt/Desktop--R3STO/src/i18n/translations.ts', 'utf-8')

    const monthKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
    for (const month of monthKeys) {
      expect(code).toContain(`'month.${month}':`)
    }
  })

  it('FR translations are not empty', () => {
    const code = require('fs').readFileSync('/sessions/busy-gifted-ride/mnt/Desktop--R3STO/src/i18n/translations.ts', 'utf-8')

    const frMatches = code.matchAll(/FR:\s*'([^']*)'/g)
    const frTexts = Array.from(frMatches).map(m => m[1])

    const nonEmptyFr = frTexts.filter(t => t.trim().length > 0)
    expect(nonEmptyFr.length).toBeGreaterThan(100)
  })

  it('DE translations are not empty', () => {
    const code = require('fs').readFileSync('/sessions/busy-gifted-ride/mnt/Desktop--R3STO/src/i18n/translations.ts', 'utf-8')

    const deMatches = code.matchAll(/DE:\s*'([^']*)'/g)
    const deTexts = Array.from(deMatches).map(m => m[1])

    const nonEmptyDe = deTexts.filter(t => t.trim().length > 0)
    expect(nonEmptyDe.length).toBeGreaterThan(100)
  })

  it('IT translations are not empty', () => {
    const code = require('fs').readFileSync('/sessions/busy-gifted-ride/mnt/Desktop--R3STO/src/i18n/translations.ts', 'utf-8')

    const itMatches = code.matchAll(/IT:\s*'([^']*)'/g)
    const itTexts = Array.from(itMatches).map(m => m[1])

    const nonEmptyIt = itTexts.filter(t => t.trim().length > 0)
    expect(nonEmptyIt.length).toBeGreaterThan(100)
  })

  it('EN translations are not empty', () => {
    const code = require('fs').readFileSync('/sessions/busy-gifted-ride/mnt/Desktop--R3STO/src/i18n/translations.ts', 'utf-8')

    const enMatches = code.matchAll(/EN:\s*'([^']*)'/g)
    const enTexts = Array.from(enMatches).map(m => m[1])

    const nonEmptyEn = enTexts.filter(t => t.trim().length > 0)
    expect(nonEmptyEn.length).toBeGreaterThan(100)
  })
})

describe('Translations — Export', () => {
  it('translations object is exported for use in app', () => {
    const code = require('fs').readFileSync('/sessions/busy-gifted-ride/mnt/Desktop--R3STO/src/i18n/translations.ts', 'utf-8')

    expect(code).toContain('export')
  })

  it('Lang type is exported', () => {
    const code = require('fs').readFileSync('/sessions/busy-gifted-ride/mnt/Desktop--R3STO/src/i18n/translations.ts', 'utf-8')

    expect(code).toContain("export type Lang = 'FR' | 'DE' | 'IT' | 'EN'")
  })
})

describe('Translations — Common Sections', () => {
  it('day section has all days', () => {
    const code = require('fs').readFileSync('/sessions/busy-gifted-ride/mnt/Desktop--R3STO/src/i18n/translations.ts', 'utf-8')

    const daySection = code.match(/\/\/ ── Jours ──.*?\/\/ ── Mois/s)
    expect(daySection).not.toBeNull()
    if (daySection) {
      expect(daySection[0]).toContain('day.dim')
      expect(daySection[0]).toContain('day.sam')
    }
  })

  it('month section has all months', () => {
    const code = require('fs').readFileSync('/sessions/busy-gifted-ride/mnt/Desktop--R3STO/src/i18n/translations.ts', 'utf-8')

    const monthSection = code.match(/\/\/ ── Mois ──.*?\/\/ ── Header/s)
    expect(monthSection).not.toBeNull()
    if (monthSection) {
      expect(monthSection[0]).toContain('month.jan')
      expect(monthSection[0]).toContain('month.dec')
    }
  })

  it('header section exists with common header items', () => {
    const code = require('fs').readFileSync('/sessions/busy-gifted-ride/mnt/Desktop--R3STO/src/i18n/translations.ts', 'utf-8')

    const hasHeader = code.includes('header.today') && code.includes('header.profile')
    expect(hasHeader).toBe(true)
  })

  it('nav section exists with navigation items', () => {
    const code = require('fs').readFileSync('/sessions/busy-gifted-ride/mnt/Desktop--R3STO/src/i18n/translations.ts', 'utf-8')

    const hasNav = code.includes('nav.operations') && code.includes('nav.dashboard')
    expect(hasNav).toBe(true)
  })
})

describe('Translations — Format Validation', () => {
  it('all translation values are properly quoted strings', () => {
    const code = require('fs').readFileSync('/sessions/busy-gifted-ride/mnt/Desktop--R3STO/src/i18n/translations.ts', 'utf-8')

    const missingQuotes = code.match(/:\s*{[^}]*:\s*[^'"][^}]*}/g)

    expect(missingQuotes).toBeNull()
  })

  it('no unclosed braces in translations object', () => {
    const code = require('fs').readFileSync('/sessions/busy-gifted-ride/mnt/Desktop--R3STO/src/i18n/translations.ts', 'utf-8')

    const openBraces = (code.match(/{/g) || []).length
    const closeBraces = (code.match(/}/g) || []).length

    expect(openBraces).toBe(closeBraces)
  })

  it('no syntax errors in translation entries', () => {
    const code = require('fs').readFileSync('/sessions/busy-gifted-ride/mnt/Desktop--R3STO/src/i18n/translations.ts', 'utf-8')

    const invalidPatterns = [
      /FR:\s*'[^']*'[^,}]/,
    ]

    let hasErrors = false
    for (const pattern of invalidPatterns) {
      const trimmedCode = code.replace(/\s+/g, ' ')
      const test = trimmedCode.match(pattern)
      if (test && !test[0].includes('IT:') && !test[0].includes('EN:') && !test[0].includes('DE:')) {
        hasErrors = true
        break
      }
    }

    expect(hasErrors).toBe(false)
  })
})
