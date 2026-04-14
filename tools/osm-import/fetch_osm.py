#!/usr/bin/env python3
"""
Fetch tous les restaurants de Suisse depuis OpenStreetMap (Overpass API).
Sortie : restaurants.json (brut OSM) + restaurants_clean.json (nettoyé).

Usage :
    python fetch_osm.py

Tourne sur la machine locale (pas de restriction réseau).
"""
import urllib.request
import urllib.parse
import json
import time
import os
import sys
import re

# Cantons suisses avec ISO 3166-2 et nom français
CANTONS = [
    ("CH-ZH", "Zürich"),       ("CH-BE", "Bern"),
    ("CH-LU", "Luzern"),       ("CH-UR", "Uri"),
    ("CH-SZ", "Schwyz"),       ("CH-OW", "Obwalden"),
    ("CH-NW", "Nidwalden"),    ("CH-GL", "Glarus"),
    ("CH-ZG", "Zug"),          ("CH-FR", "Fribourg"),
    ("CH-SO", "Solothurn"),    ("CH-BS", "Basel-Stadt"),
    ("CH-BL", "Basel-Landschaft"), ("CH-SH", "Schaffhausen"),
    ("CH-AR", "Appenzell A.Rh."), ("CH-AI", "Appenzell I.Rh."),
    ("CH-SG", "St. Gallen"),   ("CH-GR", "Graubünden"),
    ("CH-AG", "Aargau"),       ("CH-TG", "Thurgau"),
    ("CH-TI", "Ticino"),       ("CH-VD", "Vaud"),
    ("CH-VS", "Valais"),       ("CH-NE", "Neuchâtel"),
    ("CH-GE", "Genève"),       ("CH-JU", "Jura"),
]

# Mirrors Overpass — on bascule en cas de 429/504
OVERPASS_MIRRORS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
    "https://overpass.openstreetmap.ru/api/interpreter",
]
HEADERS = {"User-Agent": "R3STO-AnnuaireBot/1.0 (contact@r3sto.ch)"}

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))
RAW_FILE = os.path.join(OUTPUT_DIR, "restaurants_raw.json")
CLEAN_FILE = os.path.join(OUTPUT_DIR, "restaurants_clean.json")
PROGRESS_FILE = os.path.join(OUTPUT_DIR, "restaurants_progress.json")


def query_canton(iso, name):
    """Query all amenity=restaurant in a canton. Rotate mirrors + exponential backoff."""
    query = f"""[out:json][timeout:300];
area["ISO3166-2"="{iso}"][admin_level=4]->.c;
(
  nwr(area.c)["amenity"~"^(restaurant|fast_food|cafe|pub|bar|food_court|biergarten)$"]["name"];
);
out center tags;
"""
    data = urllib.parse.urlencode({"data": query}).encode()
    # 8 tentatives avec backoff 15,30,60,90,120,180,240,300 s, mirror rotatif
    delays = [15, 30, 60, 90, 120, 180, 240, 300]
    for attempt, sleep_s in enumerate(delays):
        url = OVERPASS_MIRRORS[attempt % len(OVERPASS_MIRRORS)]
        try:
            req = urllib.request.Request(url, data=data, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=330) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            print(f"  [{iso}] tentative {attempt+1}/{len(delays)} sur {url.split('/')[2]} : {e}")
            if attempt < len(delays) - 1:
                print(f"  [{iso}] backoff {sleep_s}s…")
                time.sleep(sleep_s)
    print(f"  [{iso}] ABANDON après {len(delays)} tentatives")
    return {"elements": []}


def load_progress():
    if os.path.exists(PROGRESS_FILE):
        try:
            with open(PROGRESS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


def save_progress(results):
    with open(PROGRESS_FILE, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False)


def fetch_all():
    # Resume : on recharge ce qui a déjà été fetché
    results = load_progress()
    if results:
        done = [iso for iso, data in results.items() if data.get("elements")]
        print(f"[RESUME] {len(done)} cantons déjà OK, on saute ceux-là")
    for iso, name in CANTONS:
        # Skip seulement si on a déjà au moins 1 POI (sinon on retry les canton vides)
        existing = results.get(iso)
        if existing and len(existing.get("elements", [])) > 0:
            print(f"[{iso}] {name} … déjà OK ({len(existing['elements'])} POIs) — skip")
            continue
        print(f"[{iso}] {name} …", end=" ", flush=True)
        r = query_canton(iso, name)
        els = r.get("elements", [])
        print(f"{len(els)} POIs")
        results[iso] = {"canton": name, "elements": els}
        save_progress(results)  # checkpoint après chaque canton
        time.sleep(12)  # politesse Overpass (augmentée de 5s à 12s)
    return results


CUISINE_MAP = {
    "italian": "italienne", "pizza": "pizzeria", "swiss": "suisse",
    "french": "française", "japanese": "japonaise", "chinese": "asiatique",
    "thai": "thaïlandaise", "indian": "indienne", "mexican": "mexicaine",
    "american": "américaine", "lebanese": "libanaise", "vegetarian": "végétarienne",
    "vegan": "végétarienne", "seafood": "fruits de mer", "regional": "suisse",
    "mediterranean": "méditerranéenne", "international": "fusion", "fusion": "fusion",
    "burger": "américaine", "steak_house": "steakhouse", "fondue": "suisse",
    "raclette": "suisse", "asian": "asiatique", "vietnamese": "asiatique",
    "korean": "asiatique", "greek": "méditerranéenne", "spanish": "méditerranéenne",
    "portuguese": "méditerranéenne", "turkish": "méditerranéenne", "kebab": "méditerranéenne",
}

PRICE_MAP = {"1": "$", "2": "$$", "3": "$$$", "4": "$$$$"}


def slugify(s):
    s = s.lower()
    s = re.sub(r"[àâä]", "a", s)
    s = re.sub(r"[éèêë]", "e", s)
    s = re.sub(r"[îï]", "i", s)
    s = re.sub(r"[ôö]", "o", s)
    s = re.sub(r"[ùûü]", "u", s)
    s = re.sub(r"[ç]", "c", s)
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = s.strip("-")
    return s[:80]


def clean_element(el, canton_iso, canton_name):
    tags = el.get("tags", {})
    name = (tags.get("name") or "").strip()
    if not name or len(name) < 2:
        return None
    city = tags.get("addr:city") or tags.get("addr:town") or tags.get("addr:village") or ""
    cuisine_raw = (tags.get("cuisine") or "").split(";")[0].strip().lower()
    cuisine_tag = CUISINE_MAP.get(cuisine_raw, cuisine_raw if cuisine_raw in {
        "française", "italienne", "suisse", "méditerranéenne", "japonaise", "asiatique",
        "thaïlandaise", "indienne", "mexicaine", "américaine", "libanaise", "fusion",
        "végétarienne", "fruits de mer", "gastronomique", "brasserie", "pizzeria", "steakhouse"
    } else "")
    amenity = tags.get("amenity", "")
    if not cuisine_tag:
        if amenity == "fast_food": cuisine_tag = "américaine"
        elif amenity == "cafe": cuisine_tag = "brasserie"
        elif amenity == "pub" or amenity == "bar": cuisine_tag = "brasserie"
    cuisine_desc = (tags.get("cuisine") or amenity.replace("_", " ").title() or "Restaurant").replace(";", ", ")

    # coords
    if el.get("type") == "node":
        lat, lon = el.get("lat"), el.get("lon")
    else:
        c = el.get("center") or {}
        lat, lon = c.get("lat"), c.get("lon")

    return {
        "osm_id": f"{el.get('type','')[0]}{el.get('id')}",
        "slug": slugify(name + "-" + (city or canton_name)),
        "name": name,
        "cuisine": cuisine_desc[:120],
        "cuisine_tag": cuisine_tag,
        "amenity": amenity,
        "address": " ".join(filter(None, [
            tags.get("addr:street", ""),
            tags.get("addr:housenumber", ""),
        ])).strip(),
        "postcode": tags.get("addr:postcode", ""),
        "city": city,
        "canton": canton_name,
        "canton_iso": canton_iso,
        "lat": lat,
        "lon": lon,
        "phone": tags.get("contact:phone") or tags.get("phone") or "",
        "website": tags.get("contact:website") or tags.get("website") or "",
        "email": tags.get("contact:email") or tags.get("email") or "",
        "opening_hours": tags.get("opening_hours", ""),
        "price_range": PRICE_MAP.get(tags.get("priceRange", ""), ""),
        "wheelchair": tags.get("wheelchair", ""),
        "outdoor_seating": tags.get("outdoor_seating", "") == "yes",
        "takeaway": tags.get("takeaway", "") == "yes",
        "delivery": tags.get("delivery", "") == "yes",
        "reservation": tags.get("reservation", ""),
        "wikidata": tags.get("wikidata", ""),
        "image": tags.get("image", ""),
    }


def clean_all(raw):
    out = []
    seen_slugs = set()
    for iso, bundle in raw.items():
        canton_name = bundle["canton"]
        for el in bundle["elements"]:
            rec = clean_element(el, iso, canton_name)
            if not rec:
                continue
            # Deduplicate by slug (add -2, -3 suffix if needed)
            base = rec["slug"]
            i = 1
            while rec["slug"] in seen_slugs:
                i += 1
                rec["slug"] = f"{base}-{i}"
            seen_slugs.add(rec["slug"])
            out.append(rec)
    return out


def main():
    print("═══════════════════════════════════════════════════")
    print(" R3STO Annuaire — Fetch OSM Suisse")
    print("═══════════════════════════════════════════════════\n")
    print(f"Sortie : {OUTPUT_DIR}\n")

    raw = fetch_all()

    with open(RAW_FILE, "w", encoding="utf-8") as f:
        json.dump(raw, f, ensure_ascii=False, indent=1)
    total_raw = sum(len(v["elements"]) for v in raw.values())
    print(f"\nBrut : {total_raw} POIs → {RAW_FILE}")

    clean = clean_all(raw)
    with open(CLEAN_FILE, "w", encoding="utf-8") as f:
        json.dump(clean, f, ensure_ascii=False, indent=1)
    print(f"Clean : {len(clean)} fiches → {CLEAN_FILE}")

    # Stats
    by_canton = {}
    with_website = 0
    with_phone = 0
    with_cuisine = 0
    for r in clean:
        by_canton[r["canton"]] = by_canton.get(r["canton"], 0) + 1
        if r["website"]: with_website += 1
        if r["phone"]: with_phone += 1
        if r["cuisine_tag"]: with_cuisine += 1

    print("\n── Stats par canton ──")
    for c, n in sorted(by_canton.items(), key=lambda x: -x[1]):
        print(f"  {c:<20s} {n:>5d}")
    print(f"\n── Enrichissement ──")
    print(f"  Site web    : {with_website} ({100*with_website//len(clean) if clean else 0}%)")
    print(f"  Téléphone   : {with_phone} ({100*with_phone//len(clean) if clean else 0}%)")
    print(f"  Cuisine tag : {with_cuisine} ({100*with_cuisine//len(clean) if clean else 0}%)")
    print(f"\nTotal : {len(clean)} restaurants suisses prêts à l'import.")


if __name__ == "__main__":
    main()
