/**
 * R3STO Phone Input v2.0 — Composant téléphone unifié professionnel
 *
 * Features:
 *  - Drapeau + indicatif auto selon pays du restaurant
 *  - 40+ pays avec formatage local
 *  - Détection IP automatique du pays (optionnel)
 *  - Recherche pays dans le dropdown
 *  - Mode compact pour modales
 *  - API: getValue, getE164, setValue, setCountry
 *
 * Usage:
 *  var phone = R3Phone.init('#container', { country: 'CH', onInput: fn })
 *  phone.getE164()  // → '+41781234567'
 */
;(function (root) {
  'use strict'

  // ══════════════════════════════════════════════════
  //  DONNÉES PAYS — triés par usage restaurant
  // ══════════════════════════════════════════════════
  var C = {
    // Europe francophone
    CH:  { d:'+41',  f:'🇨🇭', n:'Suisse',        fmt:'## ### ## ##',       ph:'78 123 45 67',    mx:9  },
    FR:  { d:'+33',  f:'🇫🇷', n:'France',        fmt:'# ## ## ## ##',      ph:'6 12 34 56 78',   mx:9  },
    BE:  { d:'+32',  f:'🇧🇪', n:'Belgique',      fmt:'### ## ## ##',       ph:'470 12 34 56',    mx:9  },
    LU:  { d:'+352', f:'🇱🇺', n:'Luxembourg',    fmt:'### ### ###',        ph:'621 123 456',     mx:9  },
    MC:  { d:'+377', f:'🇲🇨', n:'Monaco',        fmt:'## ## ## ##',        ph:'06 12 34 56',     mx:8  },
    // Europe DACH
    DE:  { d:'+49',  f:'🇩🇪', n:'Allemagne',     fmt:'### #######',        ph:'170 1234567',     mx:11 },
    AT:  { d:'+43',  f:'🇦🇹', n:'Autriche',      fmt:'### #######',        ph:'664 1234567',     mx:11 },
    LI:  { d:'+423', f:'🇱🇮', n:'Liechtenstein',  fmt:'### ## ##',          ph:'660 12 34',       mx:7  },
    // Europe sud
    IT:  { d:'+39',  f:'🇮🇹', n:'Italie',        fmt:'### ### ####',       ph:'312 345 6789',    mx:10 },
    ES:  { d:'+34',  f:'🇪🇸', n:'Espagne',       fmt:'### ## ## ##',       ph:'612 34 56 78',    mx:9  },
    PT:  { d:'+351', f:'🇵🇹', n:'Portugal',      fmt:'### ### ###',        ph:'912 345 678',     mx:9  },
    GR:  { d:'+30',  f:'🇬🇷', n:'Grèce',         fmt:'### ### ####',       ph:'691 234 5678',    mx:10 },
    // Europe nord / ouest
    GB:  { d:'+44',  f:'🇬🇧', n:'Royaume-Uni',   fmt:'#### ######',        ph:'7911 123456',     mx:10 },
    IE:  { d:'+353', f:'🇮🇪', n:'Irlande',       fmt:'## ### ####',        ph:'85 123 4567',     mx:9  },
    NL:  { d:'+31',  f:'🇳🇱', n:'Pays-Bas',      fmt:'# ## ## ## ##',      ph:'6 12 34 56 78',   mx:9  },
    DK:  { d:'+45',  f:'🇩🇰', n:'Danemark',      fmt:'## ## ## ##',        ph:'20 12 34 56',     mx:8  },
    SE:  { d:'+46',  f:'🇸🇪', n:'Suède',         fmt:'## ### ## ##',       ph:'70 123 45 67',    mx:9  },
    NO:  { d:'+47',  f:'🇳🇴', n:'Norvège',       fmt:'### ## ###',         ph:'412 34 567',      mx:8  },
    FI:  { d:'+358', f:'🇫🇮', n:'Finlande',      fmt:'## ### ####',        ph:'40 123 4567',     mx:9  },
    IS:  { d:'+354', f:'🇮🇸', n:'Islande',       fmt:'### ####',           ph:'611 1234',        mx:7  },
    // Europe est
    PL:  { d:'+48',  f:'🇵🇱', n:'Pologne',       fmt:'### ### ###',        ph:'512 345 678',     mx:9  },
    CZ:  { d:'+420', f:'🇨🇿', n:'Tchéquie',      fmt:'### ### ###',        ph:'601 234 567',     mx:9  },
    SK:  { d:'+421', f:'🇸🇰', n:'Slovaquie',     fmt:'### ### ###',        ph:'901 234 567',     mx:9  },
    HU:  { d:'+36',  f:'🇭🇺', n:'Hongrie',       fmt:'## ### ####',        ph:'20 123 4567',     mx:9  },
    RO:  { d:'+40',  f:'🇷🇴', n:'Roumanie',      fmt:'### ### ###',        ph:'721 234 567',     mx:9  },
    BG:  { d:'+359', f:'🇧🇬', n:'Bulgarie',      fmt:'## ### ####',        ph:'88 123 4567',     mx:9  },
    HR:  { d:'+385', f:'🇭🇷', n:'Croatie',       fmt:'## ### ####',        ph:'91 234 5678',     mx:9  },
    SI:  { d:'+386', f:'🇸🇮', n:'Slovénie',      fmt:'## ### ###',         ph:'31 234 567',      mx:8  },
    RS:  { d:'+381', f:'🇷🇸', n:'Serbie',        fmt:'## ### ####',        ph:'60 123 4567',     mx:9  },
    BA:  { d:'+387', f:'🇧🇦', n:'Bosnie',        fmt:'## ### ###',         ph:'61 234 567',      mx:8  },
    // Amérique
    US:  { d:'+1',   f:'🇺🇸', n:'États-Unis',    fmt:'(###) ###-####',     ph:'(555) 123-4567',  mx:10 },
    CA:  { d:'+1',   f:'🇨🇦', n:'Canada',        fmt:'(###) ###-####',     ph:'(514) 123-4567',  mx:10 },
    MX:  { d:'+52',  f:'🇲🇽', n:'Mexique',       fmt:'## #### ####',       ph:'55 1234 5678',    mx:10 },
    BR:  { d:'+55',  f:'🇧🇷', n:'Brésil',        fmt:'## #####-####',      ph:'11 91234-5678',   mx:11 },
    // Afrique / Maghreb
    MA:  { d:'+212', f:'🇲🇦', n:'Maroc',         fmt:'## ## ## ## ##',      ph:'06 12 34 56 78',  mx:10 },
    TN:  { d:'+216', f:'🇹🇳', n:'Tunisie',       fmt:'## ### ###',         ph:'20 123 456',      mx:8  },
    DZ:  { d:'+213', f:'🇩🇿', n:'Algérie',       fmt:'### ## ## ##',       ph:'551 23 45 67',    mx:9  },
    SN:  { d:'+221', f:'🇸🇳', n:'Sénégal',       fmt:'## ### ## ##',       ph:'77 123 45 67',    mx:9  },
    CI:  { d:'+225', f:'🇨🇮', n:'Côte d\'Ivoire', fmt:'## ## ## ## ##',     ph:'07 12 34 56 78',  mx:10 },
    // Moyen-Orient
    TR:  { d:'+90',  f:'🇹🇷', n:'Turquie',       fmt:'### ### ## ##',       ph:'532 123 45 67',   mx:10 },
    LB:  { d:'+961', f:'🇱🇧', n:'Liban',         fmt:'## ### ###',         ph:'71 123 456',      mx:8  },
    AE:  { d:'+971', f:'🇦🇪', n:'Émirats',       fmt:'## ### ####',        ph:'50 123 4567',     mx:9  },
    // Asie-Pacifique
    JP:  { d:'+81',  f:'🇯🇵', n:'Japon',         fmt:'## #### ####',       ph:'90 1234 5678',    mx:10 },
    AU:  { d:'+61',  f:'🇦🇺', n:'Australie',     fmt:'### ### ###',        ph:'412 345 678',     mx:9  },
    TH:  { d:'+66',  f:'🇹🇭', n:'Thaïlande',     fmt:'## ### ####',        ph:'81 234 5678',     mx:9  },
    SG:  { d:'+65',  f:'🇸🇬', n:'Singapour',     fmt:'#### ####',          ph:'8123 4567',       mx:8  },
  }

  // COMPAT: anciennes clés → nouvelles
  var COUNTRIES = {}
  var ALL_CODES = []
  for (var k in C) {
    if (!C.hasOwnProperty(k)) continue
    COUNTRIES[k] = { dial: C[k].d, flag: C[k].f, name: C[k].n, fmt: C[k].fmt, ph: C[k].ph, max: C[k].mx }
    ALL_CODES.push(k)
  }

  // ══════════════════════════════════════════════════
  //  HELPERS
  // ══════════════════════════════════════════════════
  function digits(v) { return (v || '').replace(/\D/g, '') }

  function formatPhone(raw, fmt) {
    var d = digits(raw), i = 0, out = ''
    for (var c = 0; c < fmt.length && i < d.length; c++) {
      out += fmt[c] === '#' ? d[i++] : fmt[c]
    }
    return out
  }

  function toE164(local, cc) {
    var c = COUNTRIES[cc] || COUNTRIES.CH
    var d = digits(local)
    if (!d) return ''
    if (d[0] === '0') d = d.slice(1)
    return c.dial + d
  }

  function fromE164(e164, cc) {
    var c = COUNTRIES[cc] || COUNTRIES.CH
    if (!e164) return ''
    if (e164.indexOf(c.dial) === 0) return e164.slice(c.dial.length)
    return e164.replace(/^\+\d{1,3}/, '')
  }

  // Détection IP → pays (async, facultatif)
  function detectCountry(cb) {
    try {
      var x = new XMLHttpRequest()
      x.open('GET', 'https://ipapi.co/json/', true)
      x.timeout = 3000
      x.onload = function () {
        try {
          var r = JSON.parse(x.responseText)
          var cc = (r.country_code || '').toUpperCase()
          cb(COUNTRIES[cc] ? cc : null)
        } catch (e) { cb(null) }
      }
      x.onerror = x.ontimeout = function () { cb(null) }
      x.send()
    } catch (e) { cb(null) }
  }

  // ══════════════════════════════════════════════════
  //  STYLES (injection unique)
  // ══════════════════════════════════════════════════
  var injected = false
  function injectStyles() {
    if (injected) return; injected = true
    var s = document.createElement('style')
    s.id = 'r3phone-css'
    s.textContent = [
      // Wrap
      '.r3p{display:flex;align-items:stretch;border-radius:8px;overflow:visible;border:1.5px solid var(--border,#2a3a52);background:var(--surf3,#1a2840);transition:border-color .15s;position:relative}',
      '.r3p:focus-within{border-color:var(--ac,#5b9cf6)}',
      // Flag
      '.r3p-f{display:flex;align-items:center;gap:4px;padding:0 8px;cursor:pointer;background:transparent;border:none;border-right:1px solid var(--border,#2a3a52);font-size:16px;color:var(--text,#e8ecf1);flex-shrink:0;min-height:44px;transition:background .12s}',
      '.r3p-f:hover{background:rgba(91,156,246,.06)}',
      '.r3p-c .r3p-f{min-height:36px;font-size:14px;padding:0 6px}',
      // Caret
      '.r3p-v{font-size:8px;opacity:.45;margin-left:1px}',
      // Dial code
      '.r3p-d{display:flex;align-items:center;padding:0 6px;font-size:12px;color:var(--t3,#6b7f99);font-family:var(--fm,"DM Mono",monospace);font-weight:600;flex-shrink:0;user-select:none}',
      '.r3p-c .r3p-d{font-size:11px;padding:0 4px}',
      // Input
      '.r3p-i{flex:1;min-width:0;border:none;outline:none;background:transparent;color:var(--text,#e8ecf1);font-size:14px;font-family:var(--fm,"DM Mono",monospace);font-weight:500;padding:0 10px;height:44px;box-sizing:border-box}',
      '.r3p-i::placeholder{color:var(--t4,#4a5f7a)}',
      '.r3p-c .r3p-i{height:36px;font-size:13px;padding:0 8px}',
      // Light theme overrides
      '.r3p.light{border-color:var(--border,#d5dbe3);background:var(--bg,#fff)}',
      '.r3p.light:focus-within{border-color:var(--blue-mid,#1c4f90)}',
      '.r3p.light .r3p-f{border-right-color:var(--border,#d5dbe3)}',
      '.r3p.light .r3p-f:hover{background:rgba(28,79,144,.04)}',
      '.r3p.light .r3p-d{color:var(--muted,#6e7d91)}',
      '.r3p.light .r3p-i{color:var(--text,#1a2033)}',
      '.r3p.light .r3p-i::placeholder{color:var(--muted,#a0abb8)}',
      // Dropdown
      '.r3p-dd{display:none;position:absolute;top:calc(100% + 4px);left:0;z-index:9999;border-radius:10px;box-shadow:0 10px 36px rgba(0,0,0,.45);max-height:260px;width:260px;flex-direction:column;overflow:hidden}',
      '.r3p-dd{background:var(--surf2,#111e33);border:1.5px solid var(--border,#2a3a52)}',
      '.r3p.light .r3p-dd{background:#fff;border-color:var(--border,#d5dbe3);box-shadow:0 10px 36px rgba(0,0,0,.1)}',
      '.r3p-dd.open{display:flex}',
      // Search
      '.r3p-ds{width:100%;padding:9px 12px;border:none;border-bottom:1px solid var(--border,#2a3a52);background:var(--surf3,#1a2840);color:var(--text,#e8ecf1);font-size:12px;outline:none;box-sizing:border-box}',
      '.r3p-ds::placeholder{color:var(--t4,#4a5f7a)}',
      '.r3p.light .r3p-ds{background:var(--bg,#f7f8fa);color:var(--text,#1a2033);border-bottom-color:var(--border,#d5dbe3)}',
      // Items
      '.r3p-dl{overflow-y:auto;flex:1;scrollbar-width:thin}',
      '.r3p-di{display:flex;align-items:center;gap:9px;width:100%;padding:7px 12px;border:none;cursor:pointer;background:transparent;color:var(--text,#e8ecf1);font-size:13px;text-align:left;transition:background .08s}',
      '.r3p-di:hover{background:rgba(91,156,246,.08)}',
      '.r3p-di.on{background:rgba(91,156,246,.14);color:#7bb8ff}',
      '.r3p.light .r3p-di{color:var(--text,#1a2033)}',
      '.r3p.light .r3p-di:hover{background:rgba(28,79,144,.05)}',
      '.r3p.light .r3p-di.on{background:rgba(28,79,144,.08);color:var(--blue-mid,#1c4f90)}',
      '.r3p-di em{font-size:17px;font-style:normal;flex-shrink:0}',
      '.r3p-di b{font-size:12px;min-width:24px}',
      '.r3p-di span{font-size:11px;flex:1}',
      '.r3p-di small{font-size:11px;font-family:var(--fm,"DM Mono",monospace);color:var(--t3,#6b7f99);font-weight:600}',
    ].join('\n')
    document.head.appendChild(s)
  }

  // ══════════════════════════════════════════════════
  //  CREATE
  // ══════════════════════════════════════════════════
  function create(container, opts) {
    opts = opts || {}
    injectStyles()

    var cc = opts.country || 'CH'
    var c = COUNTRIES[cc] || COUNTRIES.CH
    var compact = !!opts.compact
    var light = !!opts.light
    var showSel = opts.selector !== false
    var localDigits = ''
    var onInput = opts.onInput || function () {}
    var onE164 = opts.onE164 || function () {}
    var onCountry = opts.onCountry || function () {}

    // ── Wrap ─────────────────────────────────────
    var wrap = document.createElement('div')
    wrap.className = 'r3p' + (compact ? ' r3p-c' : '') + (light ? ' light' : '')

    // ── Flag button ──────────────────────────────
    var fb = document.createElement('button')
    fb.type = 'button'; fb.className = 'r3p-f'
    fb.innerHTML = '<em>' + c.flag + '</em>' + (showSel ? '<span class="r3p-v">▾</span>' : '')
    wrap.appendChild(fb)

    // ── Dial ─────────────────────────────────────
    var dd = document.createElement('div')
    dd.className = 'r3p-d'; dd.textContent = c.dial
    wrap.appendChild(dd)

    // ── Input ────────────────────────────────────
    var inp = document.createElement('input')
    inp.type = 'tel'; inp.inputMode = 'tel'
    inp.className = 'r3p-i'; inp.placeholder = c.ph
    inp.autocomplete = 'tel-national'
    wrap.appendChild(inp)

    // ── Dropdown ─────────────────────────────────
    var drop = null, searchInp = null, listEl = null
    if (showSel) {
      drop = document.createElement('div'); drop.className = 'r3p-dd'
      searchInp = document.createElement('input')
      searchInp.type = 'text'; searchInp.className = 'r3p-ds'
      searchInp.placeholder = '🔍 Rechercher un pays…'
      searchInp.autocomplete = 'off'
      drop.appendChild(searchInp)
      listEl = document.createElement('div'); listEl.className = 'r3p-dl'
      drop.appendChild(listEl)
      wrap.appendChild(drop)

      function renderList(filter) {
        listEl.innerHTML = ''
        var f = (filter || '').toLowerCase()
        ALL_CODES.forEach(function (code) {
          var co = COUNTRIES[code]
          var searchable = (code + ' ' + co.name + ' ' + co.dial).toLowerCase()
          if (f && searchable.indexOf(f) === -1) return
          var it = document.createElement('button')
          it.type = 'button'; it.className = 'r3p-di' + (code === cc ? ' on' : '')
          it.innerHTML = '<em>' + co.flag + '</em><b>' + code + '</b><span>' + co.name + '</span><small>' + co.dial + '</small>'
          it.addEventListener('click', function () { setCountry(code); drop.classList.remove('open') })
          listEl.appendChild(it)
        })
      }

      searchInp.addEventListener('input', function () { renderList(searchInp.value) })

      fb.addEventListener('click', function (e) {
        e.stopPropagation()
        var open = drop.classList.toggle('open')
        if (open) { searchInp.value = ''; renderList(); searchInp.focus() }
      })

      document.addEventListener('click', function (e) {
        if (drop && !wrap.contains(e.target)) drop.classList.remove('open')
      })

      renderList()
    }

    // ── Country switcher ─────────────────────────
    function setCountry(code) {
      if (!COUNTRIES[code]) return
      cc = code; c = COUNTRIES[cc]
      fb.querySelector('em').textContent = c.flag
      dd.textContent = c.dial
      inp.placeholder = c.ph
      updateDisplay()
      onCountry(cc)
    }

    // ── Format + emit ────────────────────────────
    function updateDisplay() {
      inp.value = formatPhone(localDigits, c.fmt)
      onInput(localDigits)
      onE164(localDigits ? toE164(localDigits, cc) : '')
    }

    inp.addEventListener('input', function () {
      localDigits = digits(inp.value).slice(0, c.max)
      updateDisplay()
    })

    // ── Auto-detect ──────────────────────────────
    if (opts.autoDetect) {
      detectCountry(function (detected) {
        if (detected && !localDigits) setCountry(detected)
      })
    }

    // ── Mount ────────────────────────────────────
    var target = typeof container === 'string' ? document.querySelector(container) : container
    if (target) target.appendChild(wrap)

    // ── Public API ───────────────────────────────
    return {
      el: wrap,
      input: inp,
      getValue: function () { return localDigits },
      getFormatted: function () { return formatPhone(localDigits, c.fmt) },
      getE164: function () { return toE164(localDigits, cc) },
      getCountry: function () { return cc },
      getDial: function () { return c.dial },
      setValue: function (v) { localDigits = digits(v).slice(0, c.max); updateDisplay() },
      setE164: function (e164) { localDigits = digits(fromE164(e164, cc)).slice(0, c.max); updateDisplay() },
      setCountry: setCountry,
      isValid: function () { return digits(localDigits).length >= 7 },
      focus: function () { inp.focus() },
      destroy: function () { if (wrap.parentNode) wrap.parentNode.removeChild(wrap) },
    }
  }

  // ══════════════════════════════════════════════════
  //  EXPORT
  // ══════════════════════════════════════════════════
  root.R3Phone = {
    version: '2.0.0',
    create: create,
    init: function (sel, opts) { return create(sel, opts) },
    COUNTRIES: COUNTRIES,
    ALL_CODES: ALL_CODES,
    toE164: toE164,
    fromE164: fromE164,
    formatPhone: formatPhone,
    digits: digits,
    detectCountry: detectCountry,
  }

})(window)
