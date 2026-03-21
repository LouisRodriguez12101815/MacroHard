#!/usr/bin/env python3
"""
Miami-Dade Water & Sewer Service Area Boundaries
-------------------------------------------------
Source: Miami-Dade GIS — CommunityServices/MD_WaterSewer MapServer
  Layer 0: Sewer Service Areas (which utility provides sewer to each zone)
  Layer 1: Water Service Areas  (which utility provides water to each zone)

Run with:  python3 fetch_service_areas.py

NOTE: This is static reference data — NOT a live feed.
      See NOT_LIVE_DATA.md for important context before using this data.
"""

import json
import ssl
import urllib.request
from datetime import datetime, timezone

# ── Config ───────────────────────────────────────────────────────────────────

BASE = "https://gisweb.miamidade.gov/arcgis/rest/services/CommunityServices/MD_WaterSewer/MapServer"

LAYERS = {
    0: "SewerServiceArea",
    1: "WaterServiceArea",
}

FIELDS = "OBJECTID,TYPE,UTILITYNAME,MUNICID,UTILITYURL,CRTDATE,MODDATE"

_SSL_CTX = ssl.create_default_context()
_SSL_CTX.check_hostname = False
_SSL_CTX.verify_mode    = ssl.CERT_NONE

# ── Fetch ─────────────────────────────────────────────────────────────────────

def fetch_layer(layer_id, layer_name):
    url = (
        f"{BASE}/{layer_id}/query"
        f"?where=1%3D1&outFields={FIELDS}&returnGeometry=false&f=pjson"
    )
    print(f"  Fetching layer {layer_id}: {layer_name}...", flush=True)
    with urllib.request.urlopen(url, timeout=30, context=_SSL_CTX) as r:
        data = json.loads(r.read().decode("utf-8"))
    features = [f["attributes"] for f in data.get("features", [])]
    print(f"    → {len(features)} records")
    return features

# ── Report ────────────────────────────────────────────────────────────────────

UTILITY_NAMES = {
    "MDWS":   "Miami-Dade Water & Sewer (County)",
    "NMB":    "North Miami Beach",
    "FLCITY": "Florida City",
    "HOMSTD": "Homestead",
    "MED":    "Medley",
    "MB":     "Miami Beach",
    "MS":     "Miami Springs",
    "NM":     "North Miami",
    "OPLOC":  "Opa-Locka",
    "SM":     "South Miami",
    "SURFS":  "Surfside",
    "WM":     "West Miami",
    "BLH":    "Bal Harbour",
    "BHI":    "Bay Harbor Islands",
    "CG":     "Coral Gables",
    "CH":     "Hialeah",
    "IC":     "Indian Creek",
    "MSH":    "Miami Shores",
    "VG":     "Virginia Gardens",
    "HG":     "Hialeah Gardens",
    "NBV":    "North Bay Village",
}

def print_report(sewer, water, timestamp):
    div  = "=" * 68
    line = "─" * 68

    print(div)
    print("  MIAMI-DADE WATER & SEWER — SERVICE AREA BOUNDARIES")
    print(f"  Generated: {timestamp}")
    print("  ⚠️  STATIC REFERENCE DATA — NOT LIVE")
    print(div)
    print(f"  Sewer service area zones : {len(sewer)}")
    print(f"  Water service area zones : {len(water)}")
    print()

    for label, records in [("SEWER SERVICE AREAS", sewer), ("WATER SERVICE AREAS", water)]:
        print(line)
        print(f"  {label}")
        print(line)
        print(f"  {'CODE':<8} {'UTILITY / MUNICIPALITY':<35} {'TYPE':<5} {'LAST MODIFIED'}")
        print(f"  {'-'*7} {'-'*34} {'-'*4} {'-'*20}")
        for a in sorted(records, key=lambda x: str(x.get("UTILITYNAME") or "")):
            code    = str(a.get("UTILITYNAME") or "?")
            name    = UTILITY_NAMES.get(code, code)
            typ     = str(a.get("TYPE") or "?")
            moddate = a.get("MODDATE")
            if moddate:
                try:
                    mod_str = datetime.fromtimestamp(moddate / 1000, tz=timezone.utc).strftime("%Y-%m-%d")
                except Exception:
                    mod_str = str(moddate)
            else:
                mod_str = "Unknown"
            print(f"  {code:<8} {name:<35} {typ:<5} {mod_str}")
        print()

def save_outputs(sewer, water, timestamp, timestamp_str):
    # JSON
    combined = {"sewer_service_areas": sewer, "water_service_areas": water}
    json_file = f"service_areas_{timestamp_str}.json"
    with open(json_file, "w") as f:
        json.dump(combined, f, indent=2)
    print(f"  Data saved to  : {json_file}")

    # TXT report
    import io, sys
    txt_file = f"service_areas_report_{timestamp_str}.txt"
    buf = io.StringIO()
    old = sys.stdout; sys.stdout = buf
    print_report(sewer, water, timestamp)
    sys.stdout = old
    with open(txt_file, "w") as f:
        f.write(buf.getvalue())
    print(f"  Report saved to: {txt_file}")

# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    now           = datetime.now(timezone.utc)
    timestamp     = now.strftime("%Y-%m-%d %H:%M UTC")
    timestamp_str = now.strftime("%Y%m%d_%H%M")

    print("Miami-Dade Water & Sewer Service Area Fetcher")
    print("=" * 45)
    sewer = fetch_layer(0, "SewerServiceArea")
    water = fetch_layer(1, "WaterServiceArea")
    print()
    print_report(sewer, water, timestamp)
    save_outputs(sewer, water, timestamp, timestamp_str)
