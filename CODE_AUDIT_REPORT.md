# R3STO React Application - Comprehensive Code Audit Report
**Date:** 2026-04-05
**Scope:** Complete codebase audit (package.json, src/, api/, tsconfig, vite.config)
**Project:** R3STO - Restaurant Management Platform

---

## Executive Summary

The R3STO React application is a sophisticated restaurant management system with good architectural patterns (Zustand store, component-based UI, TypeScript). However, there are **CRITICAL security issues** that must be addressed before any deployment. The codebase also has TypeScript compilation errors, linting violations, and code quality issues that prevent successful builds.

**Deployment Readiness: ❌ NOT READY**

---

## CRITIQUE (Critical - Must Fix Before Deploy)

### 1. **CRITICAL: Production Credentials Committed to Git**
**File(s):** `.env` (root directory)
**Severity:** CRITICAL SECURITY BREACH
**Issue:**
- Production Stripe keys are committed to the repository and visible in git history:
  - `VITE_STRIPE_PUBLIC_KEY=pk_live_51TFWLQ906pQ0p...`
  - Root `.env` file IS in the repo but listed in `.gitignore` (misconfiguration)
- **Same issue in `api/.env`** with Stripe secret key: `sk_live_51TFWLQ906pQ0p...`
- These keys are now COMPROMISED and must be ROTATED immediately in Stripe dashboard

**Impact:**
- Anyone with git access has production payment credentials
- Potential for fraudulent charges, unauthorized subscriptions
- Violation of PCI-DSS compliance
- Breach of Stripe terms of service

**Fix Required:**
1. Immediately rotate ALL Stripe keys in Stripe dashboard
2. Remove `.env` from git history: `git filter-branch` or `BFG Repo-Cleaner`
3. Ensure `.env` entries are truly in `.gitignore` (verify: `git check-ignore .env`)
4. Add git pre-commit hook to prevent credentials in commits
5. Use environment secrets in CI/CD (GitHub, GitLab, etc.)

**File Check:**
```bash
git check-ignore .env  # Output: NOT IGNORED
git log --all --full-history -- ".env" | head  # Shows .env in history
```

---

### 2. **CRITICAL: TypeScript Compilation Errors (Build Failures)**
**Files:**
- `src/store/index.ts:169` - Tipo mismatch in Resto object
- `src/utils/demoData.ts:481` - Missing SMS quota fields
- `src/views/Commandes/Commandes.tsx:151-152` - Unused state setters (noUnusedParameters error)
- `src/views/Widget/Widget.tsx:96` - Block-scoped variable used before declaration

**Severity:** CRITICAL
**Issue:** Build command `npm run build` fails with TypeScript errors:
```
error TS2739: Type missing properties: sms_quota, sms_used, sms_reset_date
error TS6133: Declared but never read
error TS2448: Block-scoped variable 'options' used before assignment
```

**Impact:** Application will NOT build. Deployment impossible.

**Fix Required:**
1. Add missing SMS fields to all Resto object literals in store/demoData:
   ```typescript
   sms_quota: 0, sms_used: 0, sms_reset_date: '2026-04-05'
   ```
2. Remove unused variables or add ESLint `// @ts-ignore` if intentional
3. Fix Widget.tsx variable declaration order (move `const options` before line 96)

---

### 3. **CRITICAL: Silent API Error Handling (Data Loss Risk)**
**File:** `src/api/apiPush.ts` (lines 44-81)
**Severity:** CRITICAL

**Issue:** All API calls silently swallow errors with `.catch(console.warn)`:
```typescript
createResa: (resa: any) =>
  shouldPush() && apiFetch('/resas', { method: 'POST', body: JSON.stringify(resa) })
    .catch(console.warn),  // ← Error is logged but IGNORED
```

**Impact:**
- User creates a reservation → store updates (local optimistic)
- API call fails silently (network error, server down, auth fail)
- User thinks reservation is saved
- Actual data may be lost or inconsistent between client/server
- No user feedback, no retry, no error recovery

**Fix Required:**
1. Replace `console.warn` with proper error tracking (Sentry, custom logger)
2. Implement exponential backoff retry mechanism
3. Add user notification on failures (toast/modal)
4. Implement offline queue for failed mutations
5. Sync validation on reconnection

---

### 4. **CRITICAL: Token Storage in localStorage (XSS Vulnerable)**
**Files:**
- `src/api/apiPush.ts:11` - `localStorage.getItem('r3sto-token')`
- `src/hooks/useApiSync.ts:19` - Same issue
- `src/App.tsx:76` - Storing token from URL params

**Severity:** CRITICAL
**Issue:** JWT tokens stored in localStorage are vulnerable to XSS attacks:
```typescript
localStorage.setItem('r3sto-token', token)  // ← Anyone with XSS can read this
```

**Attack Scenario:**
1. Attacker injects malicious script via user input/comments
2. Script reads `localStorage.r3sto-token`
3. Token is stolen, used to access restaurant data/make reservations
4. GDPR violation if customer data is accessed

**Fix Required:**
1. Move token to httpOnly cookie (set on server during auth)
2. If localStorage is required, use session-scoped tokens
3. Implement CSRF protection
4. Add Content Security Policy (CSP) headers

---

### 5. **CRITICAL: @ts-ignore Abuse (Type Safety Bypass)**
**Files:**
- `src/utils/stripe.ts:12` - `// @ts-ignore`
- `src/utils/stripe.ts:151` - `// @ts-ignore`
- `src/api/apiService.ts` - Multiple `any` types

**Severity:** CRITICAL
**Issue:** TypeScript safety is bypassed, hiding real type errors:
```typescript
// @ts-ignore
import { loadStripe, type Stripe } from '@stripe/stripe-js'

// @ts-ignore — redirectToCheckout exists at runtime
const { error } = await stripe.redirectToCheckout({ sessionId })
```

**Impact:**
- Type errors are hidden from detection
- Runtime errors will occur in production
- Maintenance nightmare for future developers

**Fix Required:**
1. Remove all `@ts-ignore` comments
2. Properly type Stripe imports (use type definitions)
3. Add proper types for dynamic method calls
4. Enable `noImplicitAny: false` only if absolutely necessary

---

## IMPORTANT (High Priority - Before Release)

### 1. **ESLint Configuration Not Enforced**
**Files:** Project root
**Severity:** IMPORTANT

**Issue:**
- `npm run lint` reports **40+ errors** but build continues
- ESLint errors are not blocking builds (no pre-commit hook)
- Error categories:
  - `@typescript-eslint/no-explicit-any`: 30+ violations
  - `@typescript-eslint/no-unused-vars`: 5+ violations
  - `no-empty`: Empty catch blocks
  - `react-hooks/exhaustive-deps`: Missing dependencies

**Sample Errors:**
```
src/App.tsx:85 - '_syncStatus' assigned but never used
src/App.tsx:112 - useEffect missing 'loadDemoData' dependency
src/api/apiService.ts:46 - Empty catch block { }
src/__tests__/translations.test.ts - 15x "require() forbidden"
```

**Fix Required:**
1. Add pre-commit hook (husky) to block commits with lint errors
2. Fix all `any` types with proper TypeScript
3. Remove empty catch blocks - log or handle properly
4. Fix React Hook dependencies
5. Set `lint` as CI gate (fail on violations)

---

### 2. **Hardcoded Test/Demo Data in Production Paths**
**Files:**
- `src/utils/demoData.ts` - 1800+ lines of demo restaurant data
- `src/views/Widget/Widget.tsx` - Hardcoded test restaurants (SIBLING_SITES)
- `src/views/Commandes/Commandes.tsx` - Test orders array

**Severity:** IMPORTANT
**Issue:**
```typescript
// In Commandes.tsx
const [orders, setOrders] = useState<Order[]>([
  { id: 'cmd1', table: 'T3', status: 'pending', items: [...], total: 54 },
  { id: 'cmd2', table: 'T1', status: 'preparing', items: [...], total: 128 },
])
```

**Impact:**
- Demo data may leak into production views
- Test UI flow if API is unreliable
- Confusing for customers seeing test restaurants

**Fix Required:**
1. Move demoData to separate `__mocks__` directory
2. Only load demo data when `?demo=true` or on `demo.r3sto.ch`
3. Remove hardcoded order arrays from Commandes.tsx (use store)
4. Test production behavior without demo fallbacks

---

### 3. **Console Logs Left in Code (20 instances)**
**Files:**
- `src/store/useAppStore.ts:346,366` - console.warn
- `src/hooks/useApiSync.ts:204` - console.log
- `src/api/apiService.ts` - Multiple console.error

**Severity:** IMPORTANT

**Sample:**
```typescript
console.warn(`[R3STO] Double-booking bloqué : ${resa.tbl}...`)
console.log('[R3STO] ✓ Sync API réussie —', Object.keys(patch).length, 'slices chargées')
```

**Impact:**
- Performance: console.log in tight loops slows rendering
- Security: exposing internal data structure to users (dev tools)
- Maintainability: cluttered console makes debugging harder

**Fix Required:**
1. Remove all console.log/warn/error
2. If needed, use conditional logger: `if (process.env.DEBUG) console.log(...)`
3. Use structured logging (Sentry, LogRocket) for production errors
4. Add ESLint rule `no-console` to prevent regression

---

### 4. **Missing Error Boundaries (React Crash Risk)**
**Files:** `src/App.tsx`, `src/views/**/*`
**Severity:** IMPORTANT

**Issue:** No Error Boundary components are implemented. If any view crashes:
- Entire application goes blank
- User sees "white screen of death"
- No fallback UI
- Error is not logged

**Example Crash Scenario:**
```typescript
// In Resas.tsx - if sortByStatus() throws
const sortedResas = resas.sort(sortByStatus)  // ← Throws → Entire app dies
```

**Fix Required:**
1. Add Error Boundary wrapper at App level
2. Add per-view Error Boundary components
3. Log errors to Sentry/LogRocket
4. Display user-friendly error message with "Try again" button

---

### 5. **Type Inconsistencies in Store/Views**
**Files:**
- `src/types/index.ts` - ResaStatus, UserRole not consistent
- `src/store/useAppStore.ts` - VALID_TRANSITIONS hardcoded
- `src/views/Resas/Resas.tsx` - STATUS_META manually created

**Severity:** IMPORTANT

**Issue:**
```typescript
// Store defines transitions one place
const VALID_TRANSITIONS: Record<string, string[]> = {
  reserved: ['arrived', 'noshow', 'cancelled', 'done'],
  ...
}

// Views redefine locally
const STATUS_CYCLE: Record<string, string> = {
  reserved: 'arrived', arrived: 'done'
}
```

If state is updated, you must remember to update both places.

**Fix Required:**
1. Create single source of truth in `src/constants/statuses.ts`
2. Export all status definitions from there
3. Use shared transitions everywhere
4. Add unit test to verify consistency

---

## MINEUR (Medium Priority - Code Quality)

### 1. **Unused Imports and Variables**
**Files:**
- `src/__tests__/utils.test.ts:1,16,19` - beforeEach, smartPlacement, Service defined but not used
- `src/__tests__/translations.test.ts:3` - getTranslations imported but unused
- `src/App.tsx:85` - `_syncStatus` assigned but never read

**Fix:** Remove or use the imports. Add ESLint rule to enforce.

---

### 2. **Require() Style Imports in Tests**
**Files:** `src/__tests__/translations.test.ts` - 15+ violations
**Issue:** Using CommonJS `require()` in ES modules:
```typescript
const getTranslations = require('../../i18n/translations')  // ← Forbidden
```

**Fix:** Use ES6 imports:
```typescript
import { EMAIL_TEMPLATES } from '../../i18n/translations'
```

---

### 3. **Vite Configuration Too Simple**
**File:** `vite.config.ts`
**Severity:** MINEUR

**Current:**
```typescript
export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173 }
})
```

**Missing:**
- No build optimization rules
- No asset compression
- No env file handling
- No alias configuration
- No code splitting hints

**Fix:** Add:
```typescript
build: {
  rollupOptions: {
    output: { manualChunks: { vendor: ['react', 'zustand'] } }
  },
  minify: 'terser',
  sourcemap: false  // Disable in production
}
```

---

### 4. **localStorage Corruption Recovery Works But Needs Logging**
**File:** `src/store/useAppStore.ts:563-569`
**Severity:** MINEUR

**Code:**
```typescript
onRehydrateStorage: () => {
  return (_state, error) => {
    if (error) {
      console.error('[R3STO] localStorage corrupted — reset')  // ← Only logs
      window.location.reload()  // ← Blind reload
    }
  }
}
```

**Issue:**
- Error details are not captured
- User experiences disruptive reload with no explanation
- No analytics tracking

**Fix:**
```typescript
if (error) {
  sendToErrorTracking({ type: 'localStorage_corruption', error })
  showToast('Données corrompues — rechargement...')
}
```

---

### 5. **API Configuration Fragmented**
**Files:**
- `src/api/apiService.ts:21` - Defines API_BASE
- `src/api/apiPush.ts:7` - Redefines API_BASE
- `src/hooks/useApiSync.ts:14` - Redefines API_BASE
- `src/utils/stripe.ts:109` - Redefines API_BASE

**Severity:** MINEUR

**Issue:** Every file redefines the same constant:
```typescript
const API_BASE = import.meta.env.VITE_API_BASE as string || 'https://api.r3sto.ch/api'
```

**Fix:** Create `src/config/api.ts`:
```typescript
export const API_CONFIG = {
  base: import.meta.env.VITE_API_BASE || 'https://api.r3sto.ch/api',
  timeout: 10000,
  retries: 3,
}
```

---

## INFO (Low Priority - Observations)

### 1. **Package Versions**
- `react: ^19.2.4` - Latest (good)
- `zustand: ^5.0.12` - Latest (good)
- `react-query: ^5.95.2` - Deprecated, use `@tanstack/react-query` (already correct)
- `typescript: ~5.9.3` - Recent (good)
- `vite: ^8.0.1` - Recent (good)

**Action:** Keep dependencies updated, run `npm audit` quarterly.

---

### 2. **TypeScript Configuration - Strict Mode Enabled**
**File:** `tsconfig.app.json`

**Good:**
- `strict: true` ✓
- `noUnusedLocals: true` ✓
- `noUnusedParameters: true` ✓
- `noFallthroughCasesInSwitch: true` ✓

These are strict settings that help catch errors early. However:
- 40+ eslint violations for `any` types (conflicts with strictness)
- Either relax settings or fix violations (recommend fixing)

---

### 3. **Email Templates System (Well Designed)**
**File:** `src/utils/emails.ts` - 17 email templates defined

**Observations:**
- Good separation of concerns
- Clear trigger and variable definitions
- Plan-based access control
- Ready for integration with backend SMTP

**No issues found - this is well-structured code.**

---

### 4. **Stripe Integration - Price IDs Configured**
**File:** `src/utils/stripe.ts`

**Observations:**
- Price IDs are defined for bistro/resto/gastro plans
- Uses Stripe public key from env ✓
- Proper error handling for missing keys ✓
- But: `@ts-ignore` hides type issues (see CRITIQUE #5)

---

### 5. **Demo Data - Comprehensive Coverage**
**File:** `src/utils/demoData.ts` - 1800+ lines

**Observations:**
- Covers all restaurant states (salles, services, tables, resas)
- Good example data (realistic restaurant: 120 covers, 3 rooms)
- Covers edge cases (combos, PMR, bébés, allergies)
- Realistic no-show and VIP customer examples

**No issues - excellent demo data for testing/training.**

---

## Deployment Readiness Checklist

- [x] Code audit completed
- [ ] All CRITIQUE items fixed
- [ ] All TypeScript errors resolved (npm run build succeeds)
- [ ] All ESLint errors fixed (npm run lint passes)
- [ ] .env rotated and excluded from git
- [ ] Error boundaries added
- [ ] Logging/monitoring configured
- [ ] Performance testing done
- [ ] Security headers configured (CSP, HSTS, etc.)
- [ ] Mobile/responsive testing complete
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Load testing (concurrent users)
- [ ] Disaster recovery plan documented
- [ ] Monitoring/alerting setup (Sentry, DataDog, etc.)

---

## Summary by Severity

| Severity | Count | Status |
|----------|-------|--------|
| CRITIQUE | 5 | 🔴 MUST FIX |
| IMPORTANT | 5 | 🟠 SHOULD FIX |
| MINEUR | 5 | 🟡 NICE TO FIX |
| INFO | 5 | 🟢 FYI |

**Estimated Fix Time:**
- CRITIQUE items: 4-6 hours
- IMPORTANT items: 2-3 hours
- MINEUR items: 2-3 hours
- **Total: 8-12 hours of development**

---

## Recommendations

1. **Immediate (Before Any Deployment):**
   - Rotate Stripe credentials
   - Fix TypeScript compilation errors
   - Remove production credentials from git history
   - Add error boundaries

2. **Before Production Release:**
   - Implement proper error handling and logging
   - Set up error tracking (Sentry)
   - Move token to httpOnly cookies
   - Add pre-commit hooks for lint/build validation
   - Implement monitoring and alerting

3. **Nice-to-Have (Iterative Improvements):**
   - Refactor API configuration
   - Consolidate type definitions
   - Add comprehensive unit tests
   - Performance optimization (code splitting)
   - Accessibility audit

---

## Conclusion

The R3STO React application has solid architecture and good design patterns. However, **critical security issues must be resolved immediately** before any production deployment. The codebase is not currently buildable due to TypeScript errors.

**Recommendation:**
- DO NOT DEPLOY in current state
- Address all CRITIQUE items within 24 hours
- Plan 1-2 week release cycle after fixes
- Implement comprehensive monitoring before launch

---

*Report generated by automated code audit - 2026-04-05*
