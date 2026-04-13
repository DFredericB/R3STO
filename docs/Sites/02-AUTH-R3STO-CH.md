# auth.r3sto.ch — Authentification

> URL : https://auth.r3sto.ch
> Source : `src/views/Auth/Login.tsx`
> Statut : ✅ CONNECTED

## Architecture

Page de login unifiée servie par le même SPA. Tous les sous-domaines affichent ce composant quand `user` est null (sauf demo qui bypass).

## Éléments UI

### Design
- Fond sombre : #0a1020
- Surface carte : #111e33
- Accent bleu : #4480d8
- Font : DM Sans
- Carte centrée 420px max-width, border-radius 14px
- Gradient radial subtil en arrière-plan

### Formulaire Login
| Champ | Type | Détails |
|-------|------|---------|
| Email | input email | autocomplete="email" |
| Mot de passe | input password | Toggle oeil show/hide |
| Se souvenir | checkbox | Sauvegarde email dans localStorage |
| Connexion | button submit | État loading, bleu #4480d8 |

### Feedback
- Bandeau erreur rouge en cas d'échec
- Loading spinner sur le bouton submit

## Logique

### Flux standard
1. Saisie email + mdp
2. POST /auth/login → JWT (30j)
3. Store token + user dans localStorage
4. Reload → App.tsx détecte user → affiche app

### Auto-login via token URL
- URL `?token=xxx` → stocke token → GET /auth/me → reload
- Utilisé pour redirection admin → demo

### Détection demo
- `hostname.startsWith('demo.')` → bypass login, injecte demoUser

## Toggle CSS
- ⚠️ Historiquement instable (signalé 3-4x)
- Toujours vérifier le CSS complet du toggle password

## Problèmes identifiés
- Aucun — composant fonctionnel et connecté
