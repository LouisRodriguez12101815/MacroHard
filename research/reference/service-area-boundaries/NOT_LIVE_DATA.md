# ⚠️ Important — This Is NOT Live Data

The files in this folder are **static reference boundaries**.
They show which utility company is responsible for water and sewer service
in each zone of Miami-Dade County. They do NOT reflect current conditions.

---

## What "not live" means in practice

- These are boundary maps — they show territory, not operational status
- There are no alerts, no flow data, no overflow flags, no real-time anything
- The boundaries change rarely (only when service agreements between municipalities change)
- Running the script again will return the same data unless Miami-Dade has redrawn a boundary

---

## What you can trust from this data

- Which utility (MDWS, Miami Beach, Coral Gables, Hialeah, etc.) is responsible for sewer/water in a given area
- The geographic boundaries of each utility's service zone
- When each boundary record was last modified

---

## What you cannot trust from this data

- Whether service is currently active or disrupted
- Any operational or infrastructure status
- Pipe locations, pump station locations, or network topology

---

## If you need live data

The **Miami-Dade WASD sewer data** (`sewer-data` folder) is the live feed —
it has real-time SSO overflow flags, pump load (NAPOT), and moratorium status.
