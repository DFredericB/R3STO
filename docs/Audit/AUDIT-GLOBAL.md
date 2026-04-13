# AUDIT GLOBAL R3STO — Topbar, Menus, Cohérence, Flux, API, Store, Toasts

> Date : 13 avril 2026
> Scope : Header, Sidebar, BottomNav, composants partagés, API/sync, auth

---

## 1. HEADER (Topbar) — src/components/layout/Header.tsx (751 lignes)

### Ce qui fonctionne ✅
- Horloge live (mise à jour 30s)
- Notifications générées depuis resas du jour
- Badge compteur non-lus
- Multi-site switcher (si plan gastro + sites)
- Dropdown profil avec switch de rôle
- Switcher langue FR/DE/IT/EN
- Recherche globale (SearchModal)

### Problèmes trouvés

| # | Problème | Sévérité | Détail |
|---|----------|----------|--------|
| H1 | Logout ne déconnecte pas | CRITIQUE | onClick → navigate('/') mais ne clear pas le token/localStorage |
| H2 | Notifications non persistées | MOYEN | readIds en local state → reset au reload |
| H3 | Code mort _unused_currentService | MINEUR | useMemo recalcule toutes les 30s pour rien |
| H4 | Horloge saccadée | MINEUR | Update 30s au lieu du prochain rollover de minute |
| H5 | Pulse animation incohérente | MINEUR | 0.4 dans Sidebar vs 0.45 dans Header |

---

## 2. SIDEBAR — src/components/layout/Sidebar.tsx (389 lignes)

### Ce qui fonctionne ✅
- Navigation complète par groupes
- Compteurs resas du jour (pending, waitlist)
- Recherche inline dans le menu
- Collapsible (toggle)
- Admin vs App filtrage par hostname

### Problèmes trouvés

| # | Problème | Sévérité | Détail |
|---|----------|----------|--------|
| S1 | Module gating non implémenté | CRITIQUE | moduleId sur nav items mais jamais vérifié → KDS/Delivery toujours visible |
| S2 | Rôle hardcodé "Propriétaire" | HAUT | Ligne 354 — devrait lire userRole du store |
| S3 | Plan hardcodé "Premium" | HAUT | Ligne 379 — devrait lire resto.plan du store |
| S4 | Admin filtrage par hostname seul | MOYEN | Pas de vérification rôle, juste window.location.hostname |
| S5 | Couleurs alertes hardcodées | MINEUR | Devrait utiliser var(--am), var(--bl), etc. |

---

## 3. BOTTOMNAV — src/components/layout/BottomNav.tsx (37 lignes)

| # | Problème | Sévérité | Détail |
|---|----------|----------|--------|
| B1 | display: 'none' hardcodé | MOYEN | Composant existe mais jamais affiché — code mort ou future feature |

---

## 4. COMPOSANTS PARTAGÉS

### Stubs vides (return null) ⚠️
- **SubscriptionGate.tsx** — Gate de plan complètement désactivé
- **SubscriptionBanner.tsx** — Pas de prompt upgrade
- **DailyDigest.tsx** — Résumé quotidien désactivé
- **ReassignBanner.tsx** — Alertes réassignation désactivées

### Bugs

| # | Composant | Problème | Sévérité |
|---|-----------|----------|----------|
| C1 | OrphanBanner.tsx | `alert()` natif au lieu de toast | HAUT |
| C2 | Tutorial.tsx | Typos français ("Creer", "Decouvrir" sans accents) | MOYEN |
| C3 | SearchModal.tsx | Pas de null-check sur r.tel/r.note → "undefined" dans recherche | MOYEN |
| C4 | ModalResa.tsx | `confirm()` natif au lieu de ConfirmDialog | MOYEN |
| C5 | ResaFormModal.tsx | ID sans préfixe 'r' → `Date.now().toString()` vs `'r'+Date.now()` | MOYEN |
| C6 | StatusActions.tsx | Couleurs hardcodées inline vs StatusBadge qui utilise constantes | MINEUR |

---

## 5. FLUX RÉSERVATION — Cohérence cross-views

### Parcours complet
NouvelleResa → addResa() → store.resas → visible dans :
- Resas (liste)
- Grille (grille horaire)
- Plan (SVG salles)
- Agenda (timeline)
- Dashboard (KPIs)
- Historique (passé)

### Cohérence ✅
- Toutes les vues "opérations" (Resas, Grille, Plan, Agenda, Dashboard) lisent le même store
- setResaStatus() avec transitions validées (VALID_TRANSITIONS)
- Garde-fou double-booking dans addResa()
- IA placement partagé via iaPlacement()

### Incohérence ⚠️
- QuickResa.tsx génère ID `'r'+Date.now()` ✅
- ResaFormModal.tsx génère ID `Date.now().toString()` ❌
- ModalResa.tsx utilise `confirm()` natif ❌

---

## 6. API & SYNC

### Architecture
```
Store (Zustand) ← useApiSync (pull au mount)
                → apiPush (push debounced 2s)
```

### Endpoints
| Route | Méthode | Usage |
|-------|---------|-------|
| /sync/state | GET | Pull état complet |
| /sync/push | POST | Push état complet (debounced) |
| /auth/login | POST | Login → JWT |
| /auth/me | GET | Validation token |
| /crm/contacts | GET/PATCH/DELETE | CRM (bypass sync) |
| /newsletter/campaigns | GET/POST | Newsletter (bypass sync) |
| /create-checkout-session | POST | Stripe paiement |
| /create-portal-session | POST | Stripe portail |

### Problèmes critiques

| # | Problème | Sévérité | Détail |
|---|----------|----------|--------|
| A1 | Pas de retry sur échec sync | CRITIQUE | Push échoue → données perdues, juste un console.warn |
| A2 | Pas d'UI pour état sync | CRITIQUE | syncStatus existe mais jamais affiché → user ignore qu'il est offline |
| A3 | Race condition push concurrent | HAUT | Si state change pendant push, le changement est ignoré |
| A4 | Newsletter path backslashes | CRITIQUE | `'\newsletter\campaigns\'` → cassé en production Linux |
| A5 | Analytics URL hardcodée | MOYEN | Pointe toujours vers prod même en dev |
| A6 | Analytics ne lit que localStorage | MOYEN | Échoue si auth en sessionStorage |
| A7 | Stripe sans header auth | MOYEN | Endpoints potentiellement exposés CSRF |
| A8 | Pas de timeout sur fetch | MOYEN | Serveur mort = app bloquée indéfiniment |
| A9 | Pas de refresh token | MOYEN | JWT expiré = session morte sans relance |
| A10 | Token lu de 5 fichiers différents | BAS | Pas de getToken() centralisé partout |

---

## 7. TOASTS — État actuel

### Système Toast ✅
- ToastProvider + useToast() hook
- 4 types : success (vert), error (rouge), warning (amber), info (bleu)
- Auto-dismiss 3000ms, max 4 visibles
- Animation slide-in

### Faux toasts restants

| Vue | Problème |
|-----|----------|
| Salles.tsx | Toast "Salle ajoutée" mais écrivait en local → FIXÉ (store) |
| Fermetures.tsx | Toast "Fermeture ajoutée" sans action → FIXÉ (store) |
| Marketing.tsx | Toast "Toggle success" mais local → FIXÉ (options) |
| Groupes.tsx | Toast "Paramètres sauvegardés" sans save → FIXÉ (options) |
| OrphanBanner.tsx | `alert()` natif au lieu de toast → À FIXER |
| ModalResa.tsx | `confirm()` natif au lieu de ConfirmDialog → À FIXER |

---

## 8. PRIORITÉS DE CORRECTION

### P0 — Bloquant / Sécurité
1. **H1** — Logout doit clear token + reload
2. **A1** — Retry queue pour apiPush
3. **A4** — Fix backslashes Newsletter

### P1 — Fonctionnel cassé
4. **S1** — Implémenter module gating dans Sidebar
5. **C1** — Remplacer alert() par toast dans OrphanBanner
6. **C4** — Remplacer confirm() par ConfirmDialog dans ModalResa
7. **C5** — Fix ID generation ResaFormModal (préfixe 'r')
8. **A2** — Afficher syncStatus dans Header (banner orange si offline)

### P2 — Cohérence UX
9. **S2/S3** — Lire rôle et plan depuis store dans Sidebar footer
10. **C3** — Null-check dans SearchModal
11. **C2** — Fix typos Tutorial.tsx

### P3 — Amélioration
12. **H2** — Persister notification readIds dans store
13. **A8** — Ajouter timeout aux fetch()
14. **A9** — Implémenter refresh token

