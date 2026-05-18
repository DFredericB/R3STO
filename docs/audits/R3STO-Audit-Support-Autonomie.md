# R3STO — Audit Support & Automatisation

**Objectif** : Piloter R3STO seul, avec un support client qui fonctionne sans intervention humaine dans 90% des cas.

---

## 1. État actuel

| Composant | Existe | Fonctionne | Priorité |
|-----------|--------|------------|----------|
| Chat IA dans l'app | Oui (UI) | Non (placeholder) | CRITIQUE |
| 18 vidéos tutoriels | Oui (cartes) | Non (pas enregistrées) | HAUTE |
| 15 FAQ avec recherche | Oui | Oui (texte statique) | OK |
| Système de tickets | Oui (UI) | Non (toast seulement) | HAUTE |
| SLA par plan | Oui (affiché) | Non (pas mesuré) | MOYENNE |
| Assistant IA landing | Oui (KB regex) | Partiellement | MOYENNE |
| Onboarding wizard | Oui | Oui | OK |
| Tutoriel in-app | Oui (checklist) | Oui | OK |
| Monitoring/alertes | Non | Non | HAUTE |
| Status page | Non | Non | MOYENNE |

---

## 2. Stratégie "Zéro humain" — Les 3 couches

### Couche 1 : Self-service (résout 70% des demandes)
Avant même qu'un client contacte le support :

- **Onboarding guidé** (existe, à enrichir) : wizard initial + checklist de configuration
- **Tutoriel contextuel** (existe) : tooltips et guidance dans chaque vue
- **Vidéos intégrées** (structure existe, contenu manque) : à enregistrer
- **FAQ dynamique** (existe) : liée aux modules
- **Documentation in-app** : chaque fonctionnalité a un "?" qui ouvre l'aide

### Couche 2 : IA (résout 20% des demandes)
Le client pose une question, l'IA répond instantanément :

- **Chat IA dans l'app** : connecté à une vraie base de connaissances
- **Assistant landing** : déjà en place avec regex, à migrer vers IA
- **Suggestions proactives** : "Vous n'avez pas encore configuré les rappels SMS"

### Couche 3 : Tickets escaladés (10% restants)
Quand l'IA ne peut pas résoudre :

- **Auto-catégorisation** par l'IA avant envoi
- **Contexte automatique** (navigateur, plan, dernière action, logs)
- **Email notification** à toi (Didier) uniquement pour les cas critiques
- **Réponse automatique** avec ETA basée sur le plan

---

## 3. Plan d'implémentation

### Phase 1 : Chat IA fonctionnel (1-2 jours)

**Option A — IA locale (regex amélioré, 0 coût)**

Reprendre le modèle de l'assistant landing (KB regex) et l'intégrer dans le chat de l'app. Couvrir les 50 questions les plus fréquentes. Avantage : gratuit, rapide, prévisible. Inconvénient : rigide, pas de conversation naturelle.

**Option B — Claude API (recommandé)**

Connecter le chat à l'API Claude avec un system prompt contenant toute la documentation R3STO. Le prompt inclurait : fonctionnalités par plan, tarifs, configuration, troubleshooting courant.

Coût estimé : ~5-20 CHF/mois pour un petit volume de clients.

Architecture :
```
Client (chat) → api.r3sto.ch/support/chat → Claude API → réponse
                                    ↓
                    System prompt avec KB R3STO
                    + contexte client (plan, config)
```

**Option C — Hybride (recommandé pour démarrer)**

1. D'abord essayer de répondre avec le KB local (regex)
2. Si pas de match → appeler Claude API
3. Si Claude ne peut pas → proposer de créer un ticket

### Phase 2 : Tickets automatisés (1 jour)

Quand un ticket est soumis :

1. L'app envoie un POST à `api.r3sto.ch/support/ticket` avec :
   - Sujet, description, type, priorité
   - Contexte auto : plan, navigateur, dernière page, version app
   - Screenshot optionnel

2. L'API :
   - Stocke le ticket en base de données
   - Envoie un email à `support@r3sto.ch` (= toi)
   - Envoie un email de confirmation au client avec numéro de ticket
   - Auto-répond si le sujet matche un pattern connu

3. Le client voit le statut dans "Mes tickets" (au lieu du placeholder actuel)

Technologies nécessaires : rien de nouveau, juste un endpoint Express + Infomaniak SMTP.

### Phase 3 : Vidéos tutoriels (2-3 jours de tournage)

Les 18 cartes vidéo sont déjà définies avec durées estimées. Il faut :

1. **Enregistrer** chaque vidéo (screen recording de l'app + voix off)
2. **Héberger** sur un serveur vidéo (options : Infomaniak VOD, Bunny.net CDN, ou YouTube non-répertorié)
3. **Intégrer** les URLs dans les cartes existantes

Outil recommandé : OBS Studio (gratuit) ou Loom (rapide).

Priorité de tournage :
1. Setup initial (salles, services, tables) — 4:32
2. Première réservation — 3:18
3. Widget sur votre site — 5:10
4. Plan de salle IA — 6:22
5. Clients et CRM — 3:40

### Phase 4 : Monitoring & alertes (1 jour)

Sans monitoring, tu ne sais pas quand quelque chose ne va pas. Minimum vital :

**Uptime monitoring** :
- UptimeRobot (gratuit, 5 min intervalle) pour surveiller les 10 sous-domaines
- Alerte SMS/email si un site tombe

**Error tracking** :
- Sentry (gratuit jusqu'à 5K events/mois) pour capturer les erreurs JS côté client
- Intégrer dans l'app : `<script src="sentry-cdn">` + `Sentry.init()`

**Métriques business** :
- Dashboard dans admin.r3sto.ch : nombre d'inscriptions, CA MRR, taux de churn
- Alerte si 0 inscription pendant 7 jours
- Alerte si un client n'a pas de réservation depuis 14 jours (risque churn)

### Phase 5 : Status page (optionnel, 2h)

Page publique `status.r3sto.ch` affichant :
- Statut de chaque sous-domaine (operational / degraded / down)
- Historique des incidents
- Uptime sur 30/90 jours

Options : Upptime (gratuit, GitHub Pages) ou simple page HTML mise à jour par cron.

---

## 4. Automatisations critiques pour gérer seul

Au-delà du support client, voici les automatisations nécessaires pour piloter R3STO seul :

| Processus | Solution |
|-----------|----------|
| **Inscription nouveau client** | 100% self-service (auth.r3sto.ch → onboarding → widget) |
| **Paiement abonnement** | Stripe Billing automatique (déjà en place) |
| **Relance impayé** | Stripe Dunning automatique (email 1, 3, 7 jours) |
| **Annulation/churn** | Webhook Stripe → désactiver compte → email de rétention |
| **Support niveau 1** | Chat IA (phase 1) |
| **Support niveau 2** | Ticket email (phase 2) |
| **Onboarding** | Wizard + checklist + vidéos (phases existantes + phase 3) |
| **Monitoring** | UptimeRobot + Sentry (phase 4) |
| **Mise à jour app** | Deploy script existant (`DEPLOY-TOUT-R3STO.ps1`) |
| **Backup base de données** | Cron Infomaniak (automatique) |
| **Emails transactionnels** | Templates automatiques (confirmation, rappel, etc.) |
| **Analytics business** | Dashboard admin automatisé |

### Ce qui reste manuel (et c'est OK) :

- Répondre aux tickets escaladés (~2-3/semaine estimé)
- Publier des mises à jour de l'app
- Enregistrer de nouvelles vidéos tutoriels
- Rédiger des articles de blog (SEO)
- Gérer les cas de fraude ou litiges Stripe
- Négocier avec des partenaires (intégrations, restaurants)

---

## 5. Prochaines étapes recommandées

1. **Maintenant** : Intégrer le KB regex de l'assistant dans le chat in-app (Option C hybride) — 2h
2. **Cette semaine** : Créer l'endpoint ticket + notification email — 4h
3. **Cette semaine** : Installer UptimeRobot sur les 10 sous-domaines — 30 min
4. **Ce mois** : Enregistrer les 5 vidéos prioritaires — 1 jour
5. **Ce mois** : Intégrer Sentry pour error tracking — 1h
6. **T2** : Connecter Claude API pour le chat intelligent — 4h

---

*Audit support — R3STO — Avril 2026*
