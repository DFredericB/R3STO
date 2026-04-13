# AUDIT COMPLET — Connectivité des vues R3STO

> Date : 13 avril 2026
> Scope : Toutes les vues src/views/ (52 fichiers)
> Critères : Formulaires→API, Toasts réels, Filtres branchés, Actions fonctionnelles

---

## LÉGENDE

- ✅ = Connecté, fonctionne
- ⚠️ = Partiellement connecté (mix store + données locales)
- ❌ = Déconnecté (données hardcodées, fonctions stub)
- 🔒 = LockedModule / non implémenté (par design)

---

## RÉSUMÉ EXÉCUTIF

| Statut | Nombre | % |
|--------|--------|---|
| ✅ Connecté | 20 | 38% |
| ⚠️ Partiel | 7 | 14% |
| ❌ Déconnecté | 18 | 35% |
| 🔒 Non implémenté | 7 | 13% |
| **Total** | **52** | 100% |

---

## SECTION 1 — OPÉRATIONS (✅ majoritairement connectées)

### Dashboard.tsx — ✅ CONNECTED
- **Store** : resas, tables, services, salles, resto, activeDate
- **Formulaires** : aucun (vue lecture seule)
- **Filtres** : période (jour/semaine/mois) ✅, navigation date ✅
- **Actions** : setActiveDate() ✅, navigation vers autres vues ✅
- **Toasts** : N/A

### Agenda.tsx — ✅ CONNECTED
- **Store** : resas, services, activeDate, tables
- **Formulaires** : aucun direct (ouvre modales)
- **Filtres** : service ✅, salle ✅
- **Actions** : setResaStatus() via StatusActions ✅
- **Toasts** : via StatusActions ✅

### Resas.tsx — ✅ CONNECTED
- **Store** : resas, services, tables, combos, users, activeDate
- **Formulaires** : modal resa (tous champs) → addResa()/updateResa() ✅
- **Filtres** : statut ✅, salle ✅, recherche nom/table/tel ✅
- **Actions** : edit ✅, delete ✅, status change ✅
- **Toasts** : succès/erreur ✅

### Grille.tsx — ✅ CONNECTED
- **Store** : resas, tables, combos, services, activeDate
- **Formulaires** : aucun direct
- **Filtres** : service ✅, salle ✅
- **Actions** : déplacement table ✅, blocage ✅, status via StatusActions ✅
- **Toasts** : via StatusActions ✅

### Plan.tsx — ✅ CONNECTED
- **Store** : resas, tables, combos, services, activeDate, options
- **Formulaires** : placement via click SVG → modales
- **Filtres** : service ✅, salle ✅
- **Actions** : placement ✅, sélection ✅, drag ✅
- **Toasts** : ✅

### NouvelleResa.tsx — ✅ CONNECTED
- **Store** : resas, tables, services, combos, salles, options, clients
- **Formulaires** : formulaire complet (nom, prénom, tel, email, cvt, notes, occasion) → addResa() ✅
- **Filtres** : service, date (dans le flux)
- **Actions** : placement IA ✅, détection client récurrent ✅
- **Toasts** : succès/erreur ✅

### Waitlist.tsx — ✅ CONNECTED
- **Store** : tables, combos, resas, activeDate
- **Formulaires** : ajout waitlist (local) + placement → addResa() ✅
- **Filtres** : N/A
- **Actions** : placer client ✅ (IA placement)
- **Toasts** : feedback placement ✅
- **⚠️ Note** : waitlist elle-même est en demo local (demoWaitlist)

---

## SECTION 2 — CLIENTS & MARKETING

### Clients.tsx — ✅ CONNECTED
- **Store** : clients, resas
- **Formulaires** : modal client → addClient()/updateClient() ✅
- **Filtres** : recherche nom/tel ✅, statut (VIP/blacklisted/noshow) ✅
- **Actions** : edit ✅, delete ✅, syncFromResas() ✅, export CSV ✅
- **Toasts** : ✅

### Blacklist.tsx — ❌ DISCONNECTED
- **Store** : aucun import useAppStore
- **Données** : BLACKLIST hardcodé (array local)
- **Formulaires** : ajout bloc manuel → setClients() local ❌
- **Filtres** : recherche ❌ (pas branché)
- **Actions** : réhabiliter → local ❌, supprimer → local ❌
- **Toasts** : UI feedback mais pas de persistence
- **FIX REQUIS** : Lire clients.filter(c=>c.status==='blacklisted') depuis store, utiliser updateClient()

### Marketing.tsx — ⚠️ PARTIAL
- **Store** : resto.plan (gate uniquement)
- **Données** : AUTOMATIONS, TEMPLATES hardcodés
- **Formulaires** : toggle activation → local ⚠️
- **Filtres** : aucun
- **Actions** : activer/désactiver automation → local state ❌
- **Toasts** : feedback visuel ✅ mais pas de persistence
- **FIX REQUIS** : Stocker automations dans options.marketingAutomations, toggle → updateOptions()

### Avis.tsx — ✅ CONNECTED
- **Store** : reviews
- **Formulaires** : aucun (vue lecture)
- **Filtres** : étoiles ✅, source ✅
- **Actions** : lecture seule ✅
- **Toasts** : N/A

### Fidelite.tsx — ✅ CONNECTED
- **Store** : loyaltyConfig, loyaltyCards, clients, resas
- **Formulaires** : config fidélité → updateLoyaltyConfig() ✅
- **Filtres** : recherche membre ✅
- **Actions** : tamponner ✅, ajouter membre ✅, supprimer ✅
- **Toasts** : ✅

---

## SECTION 3 — CANAUX & REVENUS

### Widget.tsx — ❌ DISCONNECTED
- **Store** : aucun import
- **Données** : RESTO, SERVICES, TABLES, SIBLING_SITES hardcodés
- **Formulaires** : config widget (couleur, layout, toggles) → local ❌
- **Filtres** : N/A
- **Actions** : preview ❌ (local), copier embed ✅ (clipboard)
- **Toasts** : N/A
- **FIX REQUIS** : Lire services/tables depuis store, persister config dans options.widgetConfig

### QRCode.tsx — ❌ DISCONNECTED
- **Store** : aucun import
- **Données** : SALLES, TABLES hardcodés
- **Formulaires** : choix mode/taille QR → local ❌
- **Filtres** : N/A
- **Actions** : génération QR via qrserver.com API ✅ (externe), télécharger ✅
- **FIX REQUIS** : Lire tables/salles depuis store

### Menu.tsx — ❌ DISCONNECTED
- **Store** : aucun import
- **Données** : items menu hardcodés
- **Formulaires** : edit item (nom, prix, catégorie, desc, allergènes) → local ❌
- **Filtres** : catégorie ✅ (local)
- **Actions** : ajouter ❌, éditer ❌, supprimer ❌, sauvegarder ❌ (tout local)
- **Toasts** : feedback visuel sans persistence
- **FIX REQUIS** : Créer menuItems dans store ou utiliser options.menuItems

### Commandes.tsx — ❌ DISCONNECTED
- **Store** : aucun import visible
- **Données** : commandes demo locales
- **Formulaires** : status update → local ❌
- **Filtres** : statut commande (local) ⚠️
- **Actions** : préparer/prêt/servir → local ❌
- **Audio** : système sonore implémenté (beep, ding) ✅
- **FIX REQUIS** : Créer orders dans store, brancher KDS

### Cadeaux.tsx — ✅ CONNECTED
- **Store** : giftCards
- **Formulaires** : génération carte → store ✅
- **Filtres** : recherche ✅
- **Actions** : créer ✅, activer/désactiver ✅
- **Toasts** : ✅

### Prepaiement.tsx — ❌ DISCONNECTED
- **Store** : aucun import
- **Données** : DEMO_BILL_ITEMS hardcodé
- **Formulaires** : flux paiement → local ❌
- **Filtres** : N/A
- **Actions** : payer → stub ❌
- **FIX REQUIS** : Connecter à Stripe + store resas pour items réels

### SiteVitrine.tsx — ⚠️ PARTIAL
- **Store** : resto, reviews, options (lecture)
- **Données** : THEMES hardcodé (OK par design)
- **Formulaires** : toute la config site → local state ❌ (pas de persistence)
- **Filtres** : N/A
- **Actions** : publier → stub ❌, copier URL ✅
- **FIX REQUIS** : Persister dans options.siteVitrine, mécanisme publish

### Marketplace.tsx — 🔒 NON IMPLÉMENTÉ
- Affiche `<LockedModule>` "La marketplace R3STO sera bientôt disponible"

### Modules.tsx — ✅ CONNECTED
- **Store** : resto.plan
- **Formulaires** : N/A
- **Filtres** : N/A
- **Actions** : navigation vers modules ✅, gate par plan ✅

---

## SECTION 4 — R3STO DELIVERY

### DeliveryDashboard.tsx — ❌ DISCONNECTED
- **Store** : aucun import
- **Données** : DEMO_ORDERS (6 commandes hardcodées)
- **Formulaires** : N/A
- **Filtres** : type (livraison/takeaway) local ⚠️
- **Actions** : status update → local ❌
- **FIX REQUIS** : Créer deliveryOrders dans store

### DeliveryOrders.tsx — 🔒 NON IMPLÉMENTÉ
- `<LockedModule>` "Module livraison à venir"

### DeliveryTracking.tsx — ❌ DISCONNECTED
- Données demo, pas de suivi réel

### DeliveryZones.tsx — ❌ DISCONNECTED
- Zones hardcodées, pas de persistence

---

## SECTION 5 — R3STO ORDER (KDS)

### KDSCuisine.tsx — ❌ DISCONNECTED
- **Store** : aucun import
- **Données** : orders demo dans useState()
- **Actions** : préparer/prêt → local ❌
- **FIX REQUIS** : Partager flux commandes avec Commandes.tsx

### KDSBar.tsx — ❌ DISCONNECTED
- Idem KDSCuisine, séparé pour bar
- **FIX REQUIS** : Même flux commandes, filtré par catégorie

### ServiceView.tsx — ❌ DISCONNECTED
- **Données** : Orders, BellAlerts, Tables hardcodés
- **Actions** : tout local ❌
- **FIX REQUIS** : Lire resas/tables/orders depuis store

### CaisseView.tsx — ❌ DISCONNECTED
- **Données** : servedOrders hardcodé
- **Actions** : encaisser → local ❌
- **FIX REQUIS** : Feed depuis orders terminées

---

## SECTION 6 — CONFIGURATION

### Profil.tsx — ✅ CONNECTED
- **Store** : resto
- **Formulaires** : tous champs resto → updateResto() ✅
- **Actions** : sauvegarder ✅
- **Toasts** : ✅

### Salles.tsx — ⚠️ PARTIAL
- **Store** : aucune lecture directe
- **Données** : DEMO_SALLES, DEMO_SERVICES, DEMO_TABLES hardcodés
- **Formulaires** : ajouter/éditer salle → local ❌, ajouter/éditer service → local ❌
- **Actions** : CRUD salles/services → local state ❌
- **FIX REQUIS** : Lire salles/services/tables depuis store, utiliser setSalles()/setServices()

### Fermetures.tsx — ⚠️ PARTIAL
- **Store** : fermetures, salles, services (lecture)
- **Données** : demoFermetures comme fallback
- **Formulaires** : ajouter fermeture → aucune action store ❌
- **Actions** : supprimer → aucune action store ❌
- **FIX REQUIS** : Ajouter addFermeture()/deleteFermeture() au store

### TablesSetup.tsx / Tables — ⚠️ PARTIAL
- **Store** : tables, salles, combos
- **Données** : DEMO_TABLES, DEMO_COMBOS fallback
- **Formulaires** : config tables → setTables()/setCombos() ✅ (quand store non vide)
- **Actions** : CRUD combos ✅, mais fallback demo si store vide
- **FIX REQUIS** : Supprimer fallback demo, toujours lire store

### Options.tsx — ✅ CONNECTED
- **Store** : theme, options
- **Formulaires** : 80+ toggles/champs → updateOptions() ✅
- **Actions** : setTheme() ✅, sauvegarder ✅
- **Toasts** : ✅

### MultiSite.tsx — ✅ CONNECTED
- **Store** : sites, activeSiteId, resto.plan
- **Formulaires** : CRUD sites → addSite()/updateSite()/deleteSite() ✅
- **Actions** : changer site actif ✅
- **Gate** : plan gastro ✅

### AccesRoles.tsx — ✅ CONNECTED
- **Store** : users
- **Formulaires** : invite (email/role/nom) → store ✅
- **Actions** : modifier rôle ✅, révoquer ✅

---

## SECTION 7 — CRM & NEWSLETTER

### CRM.tsx — ✅ CONNECTED (API directe)
- **Store** : N/A (utilise API REST directement — volontaire pour 6800+ contacts)
- **Formulaires** : import/export contacts, tags → API POST ✅
- **Filtres** : recherche, tags, segments ✅
- **Actions** : CRUD via fetch() + Bearer token ✅
- **Toasts** : ✅

### Newsletter.tsx — ✅ CONNECTED (API directe)
- **Store** : N/A (service email séparé)
- **Formulaires** : éditeur campagne → API POST ✅
- **Actions** : créer, envoyer, tester → API ✅
- **Toasts** : ✅

---

## SECTION 8 — ADMIN ERP

### AdminDashboard.tsx — ❌ DISCONNECTED
- **Données** : DEMO_KPI, DEMO_ACTIVITY, DEMO_SUBDOMAINS, DEMO_RESTAURANTS, DEMO_REVENUE
- **FIX REQUIS** : API admin multi-tenant pour KPIs réels

### Equipes.tsx — ❌ DISCONNECTED
- **Données** : INIT_EMPLOYEES, INIT_ABSENCES
- **FIX REQUIS** : API employees

### Finance.tsx — ❌ DISCONNECTED
- **Données** : INVOICES, EXPENSES
- **FIX REQUIS** : API comptabilité / Stripe billing

### Plateforme.tsx — ❌ DISCONNECTED
- **Données** : config plateforme hardcodée
- **FIX REQUIS** : API settings admin

### AdminMarketplace.tsx — 🔒 NON IMPLÉMENTÉ

---

## SECTION 9 — ADMINISTRATION

### Historique.tsx — ✅ CONNECTED
- **Store** : resas
- **Filtres** : statut ✅, recherche ✅, date range ✅
- **Pagination** : ✅
- **Actions** : lecture seule ✅

### Support.tsx — ✅ CONNECTED
- **Store** : resto.plan (gate)
- **Données** : VIDEOS, FAQS (statiques par design ✅)
- **Chat** : local state (backend IA prévu)

### AdminTickets.tsx — ⚠️ PARTIAL
- Vue tickets support admin

### Audit.tsx — ✅ CONNECTED
- **Store** : resas, tables, salles, services, users, clients
- **Filtres** : sévérité ✅
- **Actions** : lecture seule (diagnostics) ✅

### Alertes.tsx — ✅ CONNECTED
- **Store** : resas, activeDate, tables, services
- **Filtres** : type alerte ✅
- **Actions** : navigation vers vues concernées ✅

---

## SECTION 10 — AUTH & ONBOARDING

### Login.tsx — ✅ CONNECTED
- **Auth** : useAuth() → login() ✅
- **Formulaires** : email/mdp → POST /auth/login ✅

### Onboarding.tsx — ✅ CONNECTED
- **Store** : addSalle(), addService(), setTables() ✅
- **Formulaires** : 4 étapes → store ✅

---

## PRIORITÉS DE CORRECTION

### Priorité 1 — Vues config (impact immédiat sur fonctionnement)
1. **Salles.tsx** → Lire store, utiliser actions store
2. **Fermetures.tsx** → Ajouter actions au store (addFermeture/deleteFermeture)
3. **Blacklist.tsx** → Lire clients blacklistés depuis store

### Priorité 2 — Canaux publics (visibles par clients)
4. **Widget.tsx** → Lire services/tables store, persister config
5. **Menu.tsx** → Créer menuItems store ou options.menu
6. **QRCode.tsx** → Lire tables/salles store

### Priorité 3 — Modules métier
7. **Commandes.tsx** → Créer orders dans store
8. **Marketing.tsx** → Persister automations dans options
9. **Groupes.tsx** → Implémenter groupRequests dans store
10. **SiteVitrine.tsx** → Persister config dans options

### Priorité 4 — KDS / Service / Caisse (chaîne complète)
11. **KDSCuisine.tsx** → Partager flux commandes
12. **KDSBar.tsx** → Idem, filtré bar
13. **ServiceView.tsx** → Lire resas/tables/orders
14. **CaisseView.tsx** → Feed orders terminées

### Priorité 5 — Delivery (module complet)
15. **DeliveryDashboard.tsx** → Store deliveryOrders
16. **DeliveryTracking.tsx** → Suivi réel
17. **DeliveryZones.tsx** → Zones persistées

### Priorité 6 — Admin ERP (audience restreinte)
18. **AdminDashboard.tsx** → API admin
19. **Equipes.tsx** → API employees
20. **Finance.tsx** → API/Stripe
21. **Plateforme.tsx** → API settings

### Non-prioritaire (par design)
- Marketplace.tsx (🔒)
- DeliveryOrders.tsx (🔒)
- AdminMarketplace.tsx (🔒)
- Prepaiement.tsx (dépend Stripe)

