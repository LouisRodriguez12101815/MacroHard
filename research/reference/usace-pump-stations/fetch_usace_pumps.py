#!/usr/bin/env python3
"""
USACE National Levee Database — Pump Station Inventory Fetcher
--------------------------------------------------------------
Source: US Army Corps of Engineers, National Levee Database (NLD)
Layer:  MapServer/4 — Pump Stations (nationwide)
Run with:  python3 fetch_usace_pumps.py

This script:
  1. Pages through the full nationwide dataset (2,000 records/page)
  2. Filters to South Florida by bounding box
  3. Saves a JSON export and a human-readable report
"""

import json
import ssl
import urllib.request
import urllib.parse
from datetime import datetime, timezone

# ── Config ───────────────────────────────────────────────────────────────────

BASE_URL = (
    "https://geospatial.sec.usace.army.mil/dls/rest/services/"
    "NLD/Public/MapServer/4/query"
)

FIELDS = (
    "SEGMENT_ID,SEGMENT_NAME,SYSTEM_NAME,PUMPSTATION_NAME,PUMPSTATION_ID,"
    "NUMBER_PUMPS,CONSTRUCTION_YEAR,PUMP_CAPACITY,BACKUP_POWER,"
    "SURVEY_DATE,DATA_SOURCE,RESPONSIBLE_ORGANIZATION"
)

PAGE_SIZE = 2000   # server max

# South Florida bounding box (NAD83 / WGS84 lat-lon, same CRS as the layer)
# Covers Miami-Dade, Broward, Palm Beach, Monroe, Collier, Lee
SF_BBOX = {
    "xmin": -82.0,
    "ymin": 24.4,
    "xmax": -79.8,
    "ymax": 27.5,
}

# ── SSL (USACE also has certificate quirks) ───────────────────────────────────

_SSL_CTX = ssl.create_default_context()
_SSL_CTX.check_hostname = False
_SSL_CTX.verify_mode = ssl.CERT_NONE

# ── Fetch — paginated ─────────────────────────────────────────────────────────

def fetch_all():
    """Pull every record from the layer using offset pagination."""
    all_features = []
    offset = 0
    page = 1

    while True:
        params = urllib.parse.urlencode({
            "where":           "1=1",
            "outFields":       FIELDS,
            "returnGeometry":  "true",
            "resultOffset":    offset,
            "resultRecordCount": PAGE_SIZE,
            "f":               "pjson",
        })
        url = f"{BASE_URL}?{params}"
        print(f"  Fetching page {page} (offset {offset})...", flush=True)

        with urllib.request.urlopen(url, timeout=30, context=_SSL_CTX) as r:
            data = json.loads(r.read().decode("utf-8"))

        features = data.get("features", [])
        all_features.extend(features)
        print(f"    → {len(features)} records received (total so far: {len(all_features)})")

        if not data.get("exceededTransferLimit", False):
            break   # last page

        offset += PAGE_SIZE
        page   += 1

    return all_features

# ── Filter to South Florida ───────────────────────────────────────────────────

def filter_south_florida(features):
    results = []
    for f in features:
        geom = f.get("geometry")
        if not geom:
            continue
        x, y = geom.get("x"), geom.get("y")
        if x is None or y is None:
            continue
        if (SF_BBOX["xmin"] <= x <= SF_BBOX["xmax"] and
                SF_BBOX["ymin"] <= y <= SF_BBOX["ymax"]):
            row = dict(f["attributes"])
            row["longitude"] = round(x, 6)
            row["latitude"]  = round(y, 6)
            results.append(row)
    return results

# ── Analysis ──────────────────────────────────────────────────────────────────

def analyse(records):
    has_backup  = [r for r in records if str(r.get("BACKUP_POWER", "")).strip().lower() == "yes"]
    no_backup   = [r for r in records if str(r.get("BACKUP_POWER", "")).strip().lower() == "no"]
    old_stations = sorted(
        [r for r in records if r.get("CONSTRUCTION_YEAR") and r["CONSTRUCTION_YEAR"] > 0],
        key=lambda x: x["CONSTRUCTION_YEAR"]
    )
    high_cap = sorted(
        [r for r in records if r.get("PUMP_CAPACITY") and r["PUMP_CAPACITY"] > 0],
        key=lambda x: x["PUMP_CAPACITY"],
        reverse=True
    )
    by_org = {}
    for r in records:
        org = r.get("RESPONSIBLE_ORGANIZATION") or "Unknown"
        by_org.setdefault(org, []).append(r)

    return {
        "total":       len(records),
        "has_backup":  has_backup,
        "no_backup":   no_backup,
        "old_stations": old_stations,
        "high_cap":    high_cap,
        "by_org":      by_org,
    }

# ── Report ────────────────────────────────────────────────────────────────────

def print_report(r, timestamp):
    div  = "=" * 72
    line = "─" * 72

    print(div)
    print(f"  USACE NLD — SOUTH FLORIDA PUMP STATION INVENTORY")
    print(f"  Generated: {timestamp}")
    print(div)
    print(f"  Total stations (South FL bbox)  : {r['total']}")
    print(f"  With backup power               : {len(r['has_backup'])}")
    print(f"  WITHOUT backup power            : {len(r['no_backup'])}")
    print()

    # By organisation
    print(line)
    print("  STATIONS BY RESPONSIBLE ORGANIZATION")
    print(line)
    for org, items in sorted(r["by_org"].items(), key=lambda x: -len(x[1])):
        print(f"  {len(items):>4}  {org}")
    print()

    # Full inventory
    print(line)
    print(f"  FULL SOUTH FLORIDA INVENTORY — {r['total']} stations")
    print(line)
    hdr = f"  {'STATION NAME':<35} {'SYSTEM':<30} {'PUMPS':>5} {'YEAR':>5} {'CAP (gpm)':>10} {'BACKUP':<8} {'LAT':>8} {'LON':>10}"
    print(hdr)
    print("  " + "-" * 100)
    for rec in r["old_stations"]:  # sorted by construction year
        name  = str(rec.get("PUMPSTATION_NAME") or "")[:34]
        sys_n = str(rec.get("SYSTEM_NAME") or "")[:29]
        pumps = str(int(rec["NUMBER_PUMPS"])) if rec.get("NUMBER_PUMPS") else "?"
        year  = str(rec.get("CONSTRUCTION_YEAR") or "?")
        cap   = f"{int(rec['PUMP_CAPACITY']):,}" if rec.get("PUMP_CAPACITY") else "N/A"
        bkp   = str(rec.get("BACKUP_POWER") or "?")
        lat   = str(rec.get("latitude", ""))
        lon   = str(rec.get("longitude", ""))
        print(f"  {name:<35} {sys_n:<30} {pumps:>5} {year:>5} {cap:>10} {bkp:<8} {lat:>8} {lon:>10}")
    print()

    # Highest capacity
    print(line)
    print(f"  TOP 10 BY PUMP CAPACITY (gpm)")
    print(line)
    print(f"  {'STATION NAME':<35} {'CAP (gpm)':>12} {'PUMPS':>6} {'YEAR':>6} {'BACKUP'}")
    for rec in r["high_cap"][:10]:
        name  = str(rec.get("PUMPSTATION_NAME") or "")[:34]
        cap   = f"{int(rec['PUMP_CAPACITY']):,}"
        pumps = str(int(rec["NUMBER_PUMPS"])) if rec.get("NUMBER_PUMPS") else "?"
        year  = str(rec.get("CONSTRUCTION_YEAR") or "?")
        bkp   = str(rec.get("BACKUP_POWER") or "?")
        print(f"  {name:<35} {cap:>12} {pumps:>6} {year:>6} {bkp}")
    print()

    # No backup
    if r["no_backup"]:
        print(line)
        print(f"  ⚠️  NO BACKUP POWER — {len(r['no_backup'])} stations")
        print(line)
        for rec in r["no_backup"]:
            name = str(rec.get("PUMPSTATION_NAME") or "")
            sys_n = str(rec.get("SYSTEM_NAME") or "")
            org  = str(rec.get("RESPONSIBLE_ORGANIZATION") or "")
            print(f"  {name:<35} {sys_n:<35} {org}")
        print()

def save_json(records, timestamp_str):
    filename = f"usace_pumps_southfl_{timestamp_str}.json"
    with open(filename, "w") as f:
        json.dump(records, f, indent=2)
    print(f"  Full data saved to : {filename}")

def save_report_txt(r, timestamp, timestamp_str):
    import io, sys
    filename = f"usace_report_southfl_{timestamp_str}.txt"
    buf = io.StringIO()
    old = sys.stdout; sys.stdout = buf
    print_report(r, timestamp)
    sys.stdout = old
    with open(filename, "w") as f:
        f.write(buf.getvalue())
    print(f"  Report saved to    : {filename}")

# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    now           = datetime.now(timezone.utc)
    timestamp     = now.strftime("%Y-%m-%d %H:%M UTC")
    timestamp_str = now.strftime("%Y%m%d_%H%M")

    print("USACE NLD Pump Station Fetcher")
    print("=" * 40)
    print("Step 1 — Fetching nationwide dataset...")
    all_features = fetch_all()
    print(f"\nStep 2 — Filtering to South Florida bbox...")
    sf_records = filter_south_florida(all_features)
    print(f"  {len(sf_records)} stations found in South Florida.\n")

    r = analyse(sf_records)
    print_report(r, timestamp)
    save_json(sf_records, timestamp_str)
    save_report_txt(r, timestamp, timestamp_str)
