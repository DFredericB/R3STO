# demo.r3sto.ch — Mode Démo

> URL : https://demo.r3sto.ch
> Source : `App.tsx` (détection hostname), `utils/demoData.ts`
> Statut : ✅ FONCTIONNEL

## Comportement

### Au démarrage
1. Détection `hostname.startsWith('demo.')`
2. `localStorage.removeItem('r3sto-app-data')` — RESET COMPLET
3. `loadDemoFallback()` → charge données "Le Comptoir du Lac"
4. `useAppStore.getState().loadDemoData(demoData)` → injecte dans Zustand
5. Auto-login : demoUser `{ id:0, email:'demo@r3sto.ch', role:'owner', plan:'gastro' }`
6. Token : `demo-token`
7. Pas de sync API (skip si demo-token ou demo hostname)

### Données démo
- Restaurant : Le Comptoir du Lac
- Plan : Gastro (toutes fonctionnalités)
- Tables, salles, services, réservations pré-remplies
- Clients demo avec historique

### Restaurants demo sur le site vitrine
Référencés dans le code :
- lepetitboeuf
- lecomptoirdulac
- legourmet

## Particularités
- Chaque visite = données fraîches (pas de persistence)
- Toutes les vues sont accessibles (plan gastro)
- Les modifications sont perdues au reload
