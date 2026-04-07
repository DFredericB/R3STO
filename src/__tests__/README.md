# R3STO Frontend Unit Tests

Complete test suite using Vitest for the R3STO restaurant reservation management system.

## Test Files

### 1. store.test.ts — Zustand Store Tests (29 test cases)

**Reservation Management:**
- `addResa`: creates reservations and adds to array
- `addResa`: blocks double-booking on same table/date/service
- `addResa`: allows booking when table is free (different service)
- `addResa`: allows booking when reservation is not active (noshow/done)
- `updateResa`: partial updates work correctly
- `deleteResa`: removes from array
- `setResaStatus`: valid transitions (reserved→arrived, arrived→done)
- `setResaStatus`: blocks invalid transitions (done→arrived)

**Table Management:**
- `swapTables`: two resas swap tables correctly

**Client Management:**
- `addClient`: adds to clients array
- `updateClient`: partial update works
- `deleteClient`: removes from array

**Configuration:**
- `setTables`: replaces tables array
- `setServices`: replaces services array
- `setSalles`: replaces salles array
- `updateOptions`: partial update works

**UI State:**
- `blinkResa`: sets blinkResaIds
- `toggleSidebar`: toggles collapsed state
- `toggleQuickResa`: toggles quick resa visibility

**Helper Functions:**
- `isDoubleBooked`: detects occupied tables
- `isDoubleBooked`: returns false for free tables
- `isDoubleBooked`: returns false for non-active reservations
- `isValidTransition`: all valid transitions tested (reserved→arrived, done→arrived, waitlist→reserved, etc.)

### 2. utils.test.ts — Placement & Alert Rules Tests (37 test cases)

**Basic Rules:**
- `isOccupying`: identifies occupying statuses (reserved, arrived)
- `isOccupying`: identifies non-occupying statuses (done, noshow)
- `tblMatchesTable`: exact matching (no substring matching)
- `tblMatchesTable`: combo table matching

**Occupied Tables:**
- `getOccupiedTableIds`: returns occupied table IDs
- `getOccupiedTableIds`: excludes done reservations
- `getFreeTables`: returns only free tables
- `getFreeTables`: excludes blocked tables

**Combos:**
- `getFreeCombos`: returns combos with all free tables
- `getFreeCombos`: excludes combos with occupied tables
- `getMaxCapacity`: returns max of free tables and combos
- `getCombosForTable`: returns combos containing table
- `getCombosForTable`: returns empty for unrelated tables

**Moves & Swaps:**
- `canMoveResa`: allows valid moves
- `canMoveResa`: blocks moves to occupied tables
- `canMoveResa`: blocks moves with insufficient capacity
- `canSwapResas`: allows valid swaps
- `canSwapResas`: blocks invalid swaps
- `canUncombine`: allows valid uncombine operations
- `canUncombine`: blocks uncombine with insufficient capacity

**IA Placement:**
- `iaPlacement`: chooses smallest fitting table (best fit)
- `iaPlacement`: chooses larger table when small is occupied
- `iaPlacement`: returns null when no table fits

**Table Preference:**
- `detectTablePref`: finds preferred table from history
- `detectTablePref`: requires minimum 2 visits

**Effective Covers:**
- `getEffectiveMaxCovers`: limits by service max
- `getEffectiveMaxCovers`: returns min of free capacity and remaining

**Alerts:**
- `computeAlerts`: counts waitlist
- `computeAlerts`: counts groups (≥6 covers)
- `computeAlerts`: counts unassigned
- `computeAlerts`: counts noshow
- `computeAlerts`: filters by date

### 3. translations.test.ts — i18n Translation Tests (23 test cases)

**Structure Validation:**
- translations file exists and exports data
- every key has all 4 languages (FR, DE, IT, EN)
- no empty string values exist
- all keys follow dot-separated lowercase convention (day., month., nav., header., support., etc.)

**Content Quality:**
- day abbreviations for all 7 days
- month abbreviations for all 12 months
- FR translations are not empty
- DE translations are not empty
- IT translations are not empty
- EN translations are not empty

**Expected Keys:**
- All common keys tested individually (day.dim, day.sam, month.jan, month.dec, header.today, nav.dashboard, etc.)

**Completeness:**
- no duplicate keys exist
- all language keys use exactly FR, DE, IT, EN
- day section has all days
- month section has all months
- header section exists
- nav section exists

**Format Validation:**
- all translation values are properly quoted strings
- no unclosed braces in translations object
- no syntax errors in translation entries

**Export:**
- translations object is exported for app use
- Lang type is exported

### 4. types.test.ts — TypeScript Type Validation Tests (29 test cases)

**Service Interface:**
- Service has all required fields
- jours array contains valid day numbers (0-6)
- times are valid format (HH:MM)

**Salle Interface:**
- Salle has all required fields
- Salle types are valid (intérieure, extérieure, privée, bar)
- Salle exterior flag matches type

**OptionsData Interface:**
- OptionsData has all required configuration fields
- boolean fields are correctly typed
- dispersion_mode is valid (ia, manuel)

**Resa Interface:**
- Resa has all required fields
- status values are valid (reserved, arrived, done, noshow, cancelled, waitlist)
- date is ISO format YYYY-MM-DD
- client statut values are valid (0-3)
- mode values are valid (ia, manuel, web)
- canal values are valid (telephone, walkin, widget, google, email, whatsapp, sms)

**Table Interface:**
- Table has all required fields
- shape values are valid
- capacity min <= max

**Client Interface:**
- Client has all required fields
- language values are valid (fr, en, de, it)

**GiftCard Interface:**
- GiftCard has all required fields
- status values are valid (active, partial, used, expired, cancelled)

**Review Interface:**
- Review has all required fields
- rating values are valid (1-5)

**LoyaltyCard Interface:**
- LoyaltyCard has all required fields

**LoyaltyConfig Interface:**
- LoyaltyConfig has all required fields
- mode values are valid (points, stamps, cashback)

**Site Interface:**
- Site has all required fields
- plan values are valid (bistro, resto, gastro)

## Running the Tests

```bash
npm install vitest --save-dev
npm run test
```

## Coverage

- **Store Logic**: 29 test cases covering all store actions and helpers
- **Placement & Alerts**: 37 test cases covering all business rules
- **Translations**: 23 test cases validating i18n completeness
- **Types**: 29 test cases validating interface structures

**Total: 118 test cases**

## Notes

- Tests use `vitest` syntax (describe/it/expect)
- Store tests use `useAppStore.getState()` for direct state access (no React rendering needed)
- All tests are independent and can be run in parallel
- No external mocks required; tests verify actual TypeScript types and functions
