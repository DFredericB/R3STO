#!/usr/bin/env python3
"""
Convertit restaurants_clean.json en fichier SQL (INSERTs en batchs).
Output : restaurants_import.sql (prêt à mysql < restaurants_import.sql)
"""
import json
import os
import sys

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))
CLEAN_FILE = os.path.join(OUTPUT_DIR, "restaurants_clean.json")
SQL_FILE = os.path.join(OUTPUT_DIR, "restaurants_import.sql")

BATCH_SIZE = 500


def esc(v):
    if v is None or v == "":
        return "NULL"
    if isinstance(v, bool):
        return "1" if v else "0"
    if isinstance(v, (int, float)):
        return str(v)
    s = str(v)
    s = s.replace("\\", "\\\\").replace("'", "\\'").replace("\n", " ").replace("\r", " ")
    return "'" + s[:400] + "'"


def build_row(r):
    # Columns order MUST match INSERT below
    return "(" + ",".join([
        esc(r.get("osm_id")),
        esc(r.get("slug")),
        esc(r.get("name")),
        esc(r.get("cuisine")),
        esc(r.get("cuisine_tag")),
        esc(r.get("amenity")),
        esc(r.get("address")),
        esc(r.get("postcode")),
        esc(r.get("city")),
        esc(r.get("canton")),
        esc(r.get("canton_iso")),
        esc(r.get("lat")),
        esc(r.get("lon")),
        esc(r.get("phone")),
        esc(r.get("website")),
        esc(r.get("email")),
        esc(r.get("opening_hours")),
        esc(r.get("price_range")),
        esc(r.get("wheelchair")),
        esc(r.get("outdoor_seating")),
        esc(r.get("takeaway")),
        esc(r.get("delivery")),
        esc(r.get("reservation")),
        esc(r.get("wikidata")),
        esc(r.get("image")),
    ]) + ")"


COLS = ("osm_id,slug,name,cuisine,cuisine_tag,amenity,"
        "address,postcode,city,canton,canton_iso,lat,lon,"
        "phone,website,email,opening_hours,price_range,wheelchair,"
        "outdoor_seating,takeaway,delivery,reservation,wikidata,image")


def main():
    if not os.path.exists(CLEAN_FILE):
        print(f"ERREUR : {CLEAN_FILE} introuvable. Lance d'abord fetch_osm.py")
        sys.exit(1)
    with open(CLEAN_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    with open(SQL_FILE, "w", encoding="utf-8") as out:
        out.write("-- R3STO Annuaire Import OSM\n")
        out.write("-- Généré automatiquement par to_sql.py\n")
        out.write(f"-- Total : {len(data)} restaurants\n\n")
        out.write("SET autocommit=0;\nSTART TRANSACTION;\n\n")
        out.write("-- Indexer par source=osm pour un nettoyage ultérieur simple\n")
        out.write("-- (ne touche pas les claims manuels faits depuis)\n\n")

        for i in range(0, len(data), BATCH_SIZE):
            batch = data[i:i+BATCH_SIZE]
            rows = ",\n  ".join(build_row(r) for r in batch)
            out.write(f"INSERT INTO directory_restaurants ({COLS}) VALUES\n  {rows}\n")
            out.write("ON DUPLICATE KEY UPDATE "
                      "name=VALUES(name), cuisine=VALUES(cuisine), cuisine_tag=VALUES(cuisine_tag), "
                      "amenity=VALUES(amenity), address=VALUES(address), postcode=VALUES(postcode), "
                      "city=VALUES(city), canton=VALUES(canton), canton_iso=VALUES(canton_iso), "
                      "lat=VALUES(lat), lon=VALUES(lon), phone=VALUES(phone), website=VALUES(website), "
                      "email=VALUES(email), opening_hours=VALUES(opening_hours), "
                      "outdoor_seating=VALUES(outdoor_seating), takeaway=VALUES(takeaway), "
                      "delivery=VALUES(delivery), last_synced_at=NOW();\n\n")

        out.write("COMMIT;\n")
    sz = os.path.getsize(SQL_FILE)
    print(f"OK — {SQL_FILE}")
    print(f"   {len(data)} restaurants, {sz//1024} KB, batchs de {BATCH_SIZE}")


if __name__ == "__main__":
    main()
