# R3STO Annuaire — Pipeline OSM

Pipeline gratuit pour remplir l'annuaire R3STO avec tous les restaurants suisses d'OpenStreetMap (~20 000 fiches).

## Pourquoi local ?

La sandbox Cowork bloque l'accès réseau vers Overpass API. Ces scripts tournent sur ta machine locale Windows (pas de restriction réseau).

## Workflow (4 étapes)

```
1. FETCH-RESTAURANTS.bat   (local, 5-10 min)
   → restaurants_raw.json
   → restaurants_clean.json
   → restaurants_import.sql

2. IMPORT-TO-MARIADB.bat   (local → Infomaniak, 2-3 min)
   → upload SSH + mysql execute
   → directory_restaurants rempli

3. Deploy server.js        (DEPLOY.bat api.r3sto.ch-node)
   → nouveaux endpoints /public/directory

4. Deploy r3sto.ch         (DEPLOY.bat r3sto.ch)
   → front pagine les 20k fiches
```

## Fichiers

| Fichier | Rôle |
|---|---|
| `fetch_osm.py` | Interroge Overpass API par canton, nettoie, écrit JSON |
| `to_sql.py` | Convertit JSON → INSERT batchs MariaDB (ON DUPLICATE KEY UPDATE) |
| `schema.sql` | Tables `directory_restaurants`, `directory_claims`, `directory_submissions` |
| `FETCH-RESTAURANTS.bat` | Orchestrateur local (fetch + sql gen) |
| `IMPORT-TO-MARIADB.bat` | Upload + execute via SSH Infomaniak |

## Prérequis

- Python 3.8+ (`python --version`)
- PuTTY installé dans `C:\Program Files\PuTTY\` (pour pscp + plink)
- Mot de passe SSH Infomaniak (pl7wy9_db)
- Mot de passe MariaDB (pl7wy9_R3STO)

## Sources de données

**Phase 1 (gratuit, maintenant) :**
- OpenStreetMap via Overpass API (nom, adresse, coords, téléphone, site, horaires, cuisine)
- Cantons ISO 3166-2 (CH-VD, CH-GE, etc.)

**Phase 2 (payant, plus tard) :**
- Google Places API pour photos (~0.017 USD/fiche × 20k = ~340 USD one-shot)
- Wikimedia Commons pour restos célèbres (gratuit)
- Unsplash fallback par type de cuisine (gratuit)

## Idempotence

`ON DUPLICATE KEY UPDATE` sur `osm_id` : tu peux relancer l'import chaque mois sans doublonner, les claims manuels ne sont PAS écrasés (seul `last_synced_at` remonte).

## Stats attendues

- ~20 000 POIs en Suisse (restaurant + fast_food + cafe + pub + bar)
- ~70 % avec adresse complète
- ~30 % avec site web
- ~25 % avec téléphone
- ~40 % avec tag cuisine exploitable

## Après import

Vérifie via curl :

```bash
curl "https://api.r3sto.ch/public/directory?page=1&limit=10"
curl "https://api.r3sto.ch/public/directory?region=vd&cuisine=italienne"
```

Dans l'admin `admin.r3sto.ch` → section Annuaire → modérer les claims + submissions.
