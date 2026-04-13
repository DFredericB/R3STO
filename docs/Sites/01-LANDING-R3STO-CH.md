# r3sto.ch — Landing Page (Site Vitrine Builder)

> URL : https://r3sto.ch
> Source : `src/views/SiteVitrine/SiteVitrine.tsx`
> Statut : ⚠️ PARTIAL — config locale, pas de persistence store

## Architecture

La landing page n'est **pas un site statique séparé**. C'est une vue React à l'intérieur du même SPA, accessible via la route `/site-vitrine`. Le sous-domaine r3sto.ch affiche le résultat généré par cette vue.

## Éléments UI

### Toolbar
- Titre : "🌐 Site vitrine · Votre présence en ligne"
- Onglets : **Design** | **Contenu** | **SEO** | **Aperçu**

### Onglet Design — Thèmes
5 thèmes pré-définis + custom :
- dark-elegant (sombre, élégant)
- light-fresh (clair, frais)
- warm-bistro (chaleureux)
- modern-minimal (moderne, épuré)
- zen-japanese (zen, japonais)
- Custom : color picker pour couleur accent

### Onglet Contenu — Sections configurables
| Section | Description | Source données |
|---------|-------------|----------------|
| Notre histoire | Texte + année fondation + image | Saisie manuelle |
| Spécialités | Plats vedettes (emoji + prix) | Saisie manuelle |
| La carte | Menu complet | Auto-sync module Menu |
| Horaires | Jours/heures + statut live | Auto-sync resto |
| Événements | Liste événements | Auto-sync store |
| Espaces | Photos salles/terrasse | Upload |
| Avis clients | Notes + commentaires | Auto store OU manuel |
| Contact | Adresse, tel, email, maps | Champs formulaire |
| Réservation | Widget booking embarqué | Module Widget |

Chaque section a un toggle ON/OFF pour l'afficher/masquer.

### Onglet SEO
- Meta title (input)
- Meta description (textarea)
- OG image (upload)
- Favicon (upload)

### Options hébergement
- Plan `r3sto` : sous-domaine `monresto.r3sto.ch`
- Plan `own` : domaine propre
- Plan `existing` : migration domaine existant

### Gate
Requiert plan **Resto** (59 CHF) ou **Gastro** (79 CHF).

## Formulaires
- Tous les champs de contenu (texte, couleur, uploads)
- ❌ Aucun enregistrement vers le store — tout reste en local state

## Actions
- Bouton "Publier" → pas de vrai publish (stub)
- Copier URL publique → clipboard
- 🔔 Tester sonnette → notification locale

## Problèmes identifiés
- Config non persistée dans le store (perdue au reload)
- Pas de vrai mécanisme de publication vers le CDN/hosting
