# CRM Prospects - /crm
Fichier : src/views/CRM/CRM.tsx
Store : AUCUN (API directe)

## Elements
- Barre recherche/filtres : nom, email, entreprise, canton, statut, source
- Liste contacts avec pagination (50/page)
- Colonnes : nom, email, tel, entreprise, ville, canton, statut, source, consentement email
- Panneau detail
- Stats : total, avec email, avec tel, desinscrit, par statut/source/canton

## Connexion : API directe (GET /crm/contacts?search=&canton=&status=&source=&page=)
## Actions : Rechercher, filtrer, voir detail, exporter
## Filtres : Canton (24 suisses), Statut, Source

---

# Newsletter - /newsletter
Fichier : src/views/Newsletter/Newsletter.tsx
Store : AUCUN (API directe)

## Elements
- Liste campagnes : nom, sujet, statut (draft/sending/sent/cancelled), destinataires, envoyes, echecs
- Editeur campagne : nom, sujet, from_name, from_email
- Editeur blocs (6 types) : Header, Text, Button, Image, Divider, Social
- Selecteur segment (tous / canton / statut / email-only)
- Preview HTML
- Envoi : Envoyer, Planifier, Tester

## Connexion : API directe (POST /newsletter/campaigns, /send, /test)
## Actions : Creer, editer, previsualiser, envoyer, planifier, tester
## Templates : Promo, Confirmation, Reminder, Thanks, Loyalty, etc.
