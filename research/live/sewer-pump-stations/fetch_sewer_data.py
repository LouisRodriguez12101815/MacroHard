#!/usr/bin/env python3
"""
Miami-Dade WASD — Live Sewer Pump Station Data Fetcher
-------------------------------------------------------
Pulls live data from Miami-Dade's public GIS service and generates a report.
Run with:  python3 fetch_sewer_data.py
"""

import json
import ssl
import urllib.request
from datetime import datetime, timezone

# ── Config ──────────────────────────────────────────────────────────────────

BASE_URL = (
    "https://gisweb.miamidade.gov/arcgis/rest/services/"
    "Wasd/WASDSewerPumpStationBasins_2_v1/MapServer/0/query"
    "?where=1%3D1"
    "&outFields=PS,BASINID,NAME,ADDRESS,DISTRICT,SSO,SSOHAMA,SSOHAMADTE,"
    "MORATFLAG,MORATSTAT,MORATDATE,NAPOT,PROJNAPOT,GNRTRFLAG,"
    "STATYPCODE,STACLSCODE,TLMFLAG,STACTGY"
    "&f=pjson"
)

# ── Fetch ────────────────────────────────────────────────────────────────────

# Miami-Dade's GIS server uses a self-signed certificate chain
_SSL_CTX = ssl.create_default_context()
_SSL_CTX.check_hostname = False
_SSL_CTX.verify_mode = ssl.CERT_NONE

def fetch_data():
    print("Fetching live data from Miami-Dade GIS...", flush=True)
    with urllib.request.urlopen(BASE_URL, timeout=30, context=_SSL_CTX) as response:
        raw = response.read().decode("utf-8")
    data = json.loads(raw)
    features = [f["attributes"] for f in data.get("features", [])]
    print(f"  {len(features)} basins retrieved.\n")
    return features

# ── Analysis ─────────────────────────────────────────────────────────────────

def analyse(features):
    sso_active    = [a for a in features if a.get("SSO") == "Y"]
    morat_active  = [a for a in features if a.get("MORATFLAG") == "Yes"]
    high_napot    = [a for a in features if a.get("NAPOT") and a["NAPOT"] >= 10 and a["NAPOT"] < 999]
    no_generator  = [a for a in features if a.get("GNRTRFLAG") == "N"]
    data_gaps     = [a for a in features if a.get("SSO") is None]

    high_napot_sorted = sorted(high_napot, key=lambda x: x["NAPOT"], reverse=True)
    morat_sorted      = sorted(
        [a for a in morat_active if a.get("NAPOT") and a["NAPOT"] < 999],
        key=lambda x: x["NAPOT"],
        reverse=True
    )

    return {
        "total":          len(features),
        "sso_active":     sso_active,
        "morat_active":   morat_active,
        "morat_sorted":   morat_sorted,
        "high_napot":     high_napot_sorted,
        "no_generator":   no_generator,
        "data_gaps":      data_gaps,
    }

# ── Report ───────────────────────────────────────────────────────────────────

def print_report(r, timestamp):
    divider = "=" * 72

    print(divider)
    print(f"  MIAMI-DADE WASD — PUMP STATION LIVE REPORT")
    print(f"  Generated: {timestamp}")
    print(divider)
    print(f"  Total basins in dataset : {r['total']}")
    print(f"  Active SSO overflows    : {len(r['sso_active'])}")
    print(f"  Moratoriums in effect   : {len(r['morat_active'])}")
    print(f"  High NAPOT (≥10 hrs)    : {len(r['high_napot'])}")
    print(f"  No backup generator     : {len(r['no_generator'])}")
    print(f"  Basins with data gaps   : {len(r['data_gaps'])}")
    print()

    # SSO
    print("─" * 72)
    print(f"  🚨  ACTIVE SANITARY SEWER OVERFLOWS — {len(r['sso_active'])} basins")
    print("─" * 72)
    if r["sso_active"]:
        print(f"  {'PS':<6} {'BASIN ID':<14} {'ADDRESS':<38} {'DISTRICT'}")
        for a in r["sso_active"]:
            print(f"  {str(a['PS']):<6} {str(a['BASINID']):<14} {str(a['ADDRESS'] or ''):<38} {a['DISTRICT']}")
    else:
        print("  No active overflows at this time.")
    print()

    # MORATORIUMS — top 20 by NAPOT
    print("─" * 72)
    print(f"  🚫  MORATORIUMS ACTIVE — {len(r['morat_active'])} basins  (top 20 by NAPOT)")
    print("─" * 72)
    print(f"  {'PS':<6} {'BASIN ID':<14} {'ADDRESS':<38} {'NAPOT':>6}  {'PROJ':>6}")
    for a in r["morat_sorted"][:20]:
        print(f"  {str(a['PS']):<6} {str(a['BASINID']):<14} {str(a['ADDRESS'] or ''):<38} {a['NAPOT']:>6}  {a['PROJNAPOT']:>6}")
    print()

    # HIGH NAPOT
    print("─" * 72)
    print(f"  ⚠️   HIGH NAPOT (≥10 hrs) — {len(r['high_napot'])} basins")
    print("─" * 72)
    print(f"  {'PS':<6} {'BASIN ID':<14} {'ADDRESS':<38} {'NAPOT':>6}  {'PROJ':>6}")
    for a in r["high_napot"]:
        print(f"  {str(a['PS']):<6} {str(a['BASINID']):<14} {str(a['ADDRESS'] or ''):<38} {a['NAPOT']:>6}  {a['PROJNAPOT']:>6}")
    print()

    # NO GENERATOR
    print("─" * 72)
    print(f"  🔋  NO BACKUP GENERATOR — {len(r['no_generator'])} basins")
    print("─" * 72)
    print(f"  (List omitted for brevity — export to JSON for full list)")
    print()

def save_json(features, timestamp_str):
    filename = f"sewer_data_{timestamp_str}.json"
    with open(filename, "w") as f:
        json.dump(features, f, indent=2)
    print(f"  Full data saved to: {filename}")

def save_report_txt(r, timestamp, timestamp_str):
    """Write the same report to a .txt file."""
    import io, sys
    filename = f"sewer_report_{timestamp_str}.txt"
    buf = io.StringIO()
    old_stdout = sys.stdout
    sys.stdout = buf
    print_report(r, timestamp)
    sys.stdout = old_stdout
    with open(filename, "w") as f:
        f.write(buf.getvalue())
    print(f"  Report saved to    : {filename}")

# ── Main ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    now = datetime.now(timezone.utc)
    timestamp     = now.strftime("%Y-%m-%d %H:%M UTC")
    timestamp_str = now.strftime("%Y%m%d_%H%M")

    features = fetch_data()
    r = analyse(features)

    print_report(r, timestamp)
    save_json(features, timestamp_str)
    save_report_txt(r, timestamp, timestamp_str)
