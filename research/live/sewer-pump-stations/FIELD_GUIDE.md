# Miami-Dade Sewer Pump Station Data — Field Guide
**For: Neal & Mash**
**Source: Miami-Dade Water & Sewer Department (WASD) — Public GIS Feed**
**Updated: Near real-time (refreshed each time WASD edits the GIS service)**

---

## What is this data?

Miami-Dade WASD operates hundreds of **sewer pump stations** across the county.
Each pump station serves a geographic area called a **basin** — the zone that
drains into that station. This dataset gives us one record per basin, including
the station's address, operational status, and any active flags like overflows
or development freezes.

---

## The Fields — Plain English

### Identity Fields

| Field | What it means |
|-------|---------------|
| **PS** | Pump Station number. The physical station (e.g. "0436"). Multiple basins can share one PS number if the station serves sub-basins. |
| **BASINID** | Basin ID. The unique ID for this specific drainage area (e.g. "0436", "0436-F1"). The "-F1", "-F2" suffixes denote sub-basins feeding into the same pump station. |
| **NAME** | Short name for the station — usually same as PS number. |
| **ADDRESS** | Street address of the pump station itself. |
| **DISTRICT** | Which WASD operational district manages it: **North**, **Central**, **South**, **NorthF**, **SouthF**, **CentralF** (the "F" variants are sub-districts). |
| **OWNER** | Code for the owning municipality. "30" = Miami-Dade County (WASD). |

---

### 🚨 SSO — Sanitary Sewer Overflow

| Field | What it means |
|-------|---------------|
| **SSO** | **Y = Active overflow. N = No overflow.** This is the most urgent flag. An SSO means raw or partially treated sewage is escaping the pipe system — spilling into streets, canals, or the environment. Regulated by the EPA and Florida DEP. WASD is required to report and remediate these immediately. |
| **SSOHAMA** | SSO HAMA flag. "Y" means the overflow has been formally flagged under a Harm Assessment / Management Action. A secondary escalation layer on top of SSO. |
| **SSOHAMADTE** | Date the HAMA flag was set. Null if no active HAMA. |

> **In plain terms:** If SSO = Y, sewage is getting out somewhere in that basin right now. That's a public health and environmental event.

---

### 🚫 MORAT — Moratorium (Development Freeze)

| Field | What it means |
|-------|---------------|
| **MORATFLAG** | **Yes = Moratorium is active. No = No moratorium.** A moratorium means WASD has **frozen new sewer connections** in this basin. No new developments, no new building permits that need sewer hookups, until capacity is restored. |
| **MORATSTAT** | Status code: **OK** = no restriction, **OH** = on hold / moratorium active. |
| **MORATDATE** | Date the moratorium started (stored as a Unix timestamp in milliseconds). |

> **In plain terms:** A moratorium is WASD saying "this pump station is too close to capacity — we can't take on any more load." It directly blocks new development in that area. Developers, real estate investors, and planners watch this closely.

---

### ⏱️ NAPOT — Pump Operation Time

| Field | What it means |
|-------|---------------|
| **NAPOT** | **Nominal Average Pump Operation Time** — measured in **hours per day**. This is how long the pumps are running on an average day. The closer to 24, the more stressed the system. **Above 10 hrs is considered high load. Above 18 hrs is critical.** |
| **PROJNAPOT** | **Projected NAPOT** — the forecasted future NAPOT based on approved developments that haven't been built yet but are already permitted. If PROJNAPOT is significantly higher than NAPOT, the basin is heading for trouble even before new growth. |

> **In plain terms:** Think of NAPOT like a engine running hot. A pump running 2 hrs/day is fine. One running 20 hrs/day is near failure. The "Projected" number tells you where it's headed once all the approved buildings are occupied.
>
> **Red flag:** A station where NAPOT is high AND PROJNAPOT is even higher means future capacity problems are already locked in.

---

### 🔋 GNRTRFLAG — Generator / Backup Power

| Field | What it means |
|-------|---------------|
| **GNRTRFLAG** | Whether the station has a backup generator. **Y = Yes, N = No, U = Unknown.** |

> **In plain terms:** Without a generator, if power goes out (hurricane, storm), the pumps stop and sewage backs up fast. "N" stations are the ones most vulnerable during a storm event. Miami-Dade has been upgrading these post-Irma, so "U" (unknown) may mean the data hasn't been updated.

---

### Station Type Codes

| Field | Code | Meaning |
|-------|------|---------|
| **STATYPCODE** | B | Submersible pump station |
| | C | Conventional (wet well / dry well) station |
| **STACLSCODE** | L | Low capacity |
| | M | Medium capacity |
| | H | High capacity |
| **STACTGY** | ET | Existing — to be maintained |
| | AB | To be abandoned |
| | RE | To be replaced |
| **TLMFLAG** | Y | Has telemetry (remote monitoring connected) |
| | N | No telemetry — must be physically checked |
| **PMPSPDCODE** | 1 | Single-speed pumps |
| | 2 | Variable-speed pumps (more efficient, better for managing load) |

---

### Hierarchy / Sub-basin Fields

| Field | What it means |
|-------|---------------|
| **LEVELN** | How many levels deep this basin is in the drainage hierarchy (0 = top-level, flows direct to treatment plant; higher = further upstream). |
| **LEVEL1–LEVEL5** | The chain of pump stations that this basin's flow passes through on the way to the treatment plant. Useful for understanding which upstream problems affect which downstream stations. |
| **NEXTSTANO** | The Station ID of the next downstream pump station this basin's flow is sent to. |

---

## Summary — What to Watch

| Signal | What it means for you |
|--------|-----------------------|
| **SSO = Y** | Active overflow. Environmental/legal event in progress. |
| **MORATFLAG = Yes** | No new connections allowed. Development is frozen in this basin. |
| **NAPOT ≥ 10** | High pump load. Basin is under strain. |
| **PROJNAPOT >> NAPOT** | Future capacity crunch already baked in from approved permits. |
| **GNRTRFLAG = N** | No backup power — risk during storm events. |
| **PROJNAPOT near 24** | System is effectively at or over capacity in the near future. |

---

## Data Source

- **URL:** https://gisweb.miamidade.gov/arcgis/rest/services/Wasd/WASDSewerPumpStationBasins_2_v1/MapServer/0
- **Format:** ArcGIS REST / GeoJSON / pJSON (open, no login required)
- **Update frequency:** Near real-time — refreshed when WASD updates their GIS
- **Coordinate system:** Florida East State Plane (WKID 2236) — needs conversion for Google Maps

---

*Field guide prepared based on Miami-Dade WASD GIS public data schema.*
