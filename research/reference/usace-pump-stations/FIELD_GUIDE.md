# USACE Pump Station Inventory — Field Guide
**For: Neal & Mash**
**Source: US Army Corps of Engineers (USACE) — National Levee Database (NLD)**
**Coverage: Nationwide (this script filters to South Florida)**

---

## What is this data?

The US Army Corps of Engineers maintains the **National Levee Database (NLD)** —
a federal inventory of flood control infrastructure across the country. This
specific layer tracks **pump stations** built as part of USACE levee systems.

These are different from the Miami-Dade WASD sewer pump stations:
- **WASD stations** move *sewage* through the sewer network
- **USACE stations** move *stormwater / floodwater* — they pump water
  out from behind levees and flood walls during storm events

In South Florida, these stations are critical during hurricanes and major
rain events — they keep water from backing up behind flood barriers.

---

## The Fields — Plain English

### Identity Fields

| Field | What it means |
|-------|---------------|
| **PUMPSTATION_NAME** | The name of the pump station (e.g. "WHEELER AVE", "WARREN CREEK"). |
| **PUMPSTATION_ID** | USACE internal numeric ID for the station. |
| **SEGMENT_NAME** | The name of the levee *segment* this station belongs to (e.g. "Red River of the North - Pembina"). A levee system is divided into segments; each segment may have one or more pump stations. |
| **SEGMENT_ID** | Numeric ID for the levee segment. |
| **SYSTEM_NAME** | The broader levee *system* the segment belongs to (e.g. "Minnesota River - North Mankato"). One system can span multiple segments. |
| **SYSTEM_ID** | Numeric ID for the levee system. |

---

### 💧 Capacity & Configuration

| Field | What it means |
|-------|---------------|
| **NUMBER_PUMPS** | How many individual pumps are installed at this station. More pumps = more redundancy. If one fails, others can keep running. |
| **PUMP_CAPACITY** | Total pumping capacity in **gallons per minute (gpm)**. This is how fast the station can move water. For reference: 10,000 gpm = a large station. 50,000+ gpm = a major regional facility. |

> **In plain terms:** A station with 5 pumps and 50,000 gpm capacity can move
> a massive amount of water very fast. A station with 1 pump and no backup
> power is a single point of failure during a storm.

---

### 🔋 Backup Power

| Field | What it means |
|-------|---------------|
| **BACKUP_POWER** | **Yes / No** — whether the station has backup power (generator or other source). |

> **In plain terms:** If `BACKUP_POWER = No`, the station stops working the
> moment the grid goes down — exactly when you need it most (during a
> hurricane). This is one of the most critical risk indicators in the dataset.

---

### 🏗️ Age & Survey

| Field | What it means |
|-------|---------------|
| **CONSTRUCTION_YEAR** | The year the pump station was originally built. Older stations (pre-1980s) may have outdated equipment, less capacity, and higher maintenance risk. |
| **SURVEY_DATE** | When USACE last physically inspected and recorded data for this station. If this is many years old, the data may not reflect current conditions. |
| **DATA_SOURCE** | How the location/data was captured — e.g. "Heads-up digitizing" (someone placed it on a map visually) vs. GPS survey. Affects accuracy of the coordinates. |

---

### 🏛️ Ownership & Responsibility

| Field | What it means |
|-------|---------------|
| **RESPONSIBLE_ORGANIZATION** | Which USACE district is responsible for this station — e.g. "USACE - Jacksonville District" covers South Florida. This tells you who to contact and who is accountable for maintenance. |

> **USACE Districts in South Florida:**
> - **Jacksonville District** — covers all of Florida, Puerto Rico, and the US Virgin Islands

---

### 📍 Location

| Field | What it means |
|-------|---------------|
| **latitude / longitude** | Coordinates in standard WGS84 (same as Google Maps). Paste directly into Google Maps or any mapping tool. |

---

## Summary — What to Watch

| Signal | What it means |
|--------|---------------|
| **BACKUP_POWER = No** | High risk during power outages / storms. No pumping when it's needed most. |
| **CONSTRUCTION_YEAR < 1970** | Station is 55+ years old. Age increases failure risk. |
| **NUMBER_PUMPS = 1** | Single pump — no redundancy. If it fails, the station is offline. |
| **PUMP_CAPACITY is null / N/A** | Data gap — capacity unknown. Usually means older, less-documented station. |
| **SURVEY_DATE is old** | Data may not reflect current physical condition. |

---

## How this differs from the WASD data

| | Miami-Dade WASD | USACE NLD |
|---|---|---|
| **What it pumps** | Sewage / wastewater | Stormwater / floodwater |
| **Who runs it** | Miami-Dade County | US Army Corps of Engineers |
| **Update frequency** | Near real-time (GIS edits) | Periodic surveys |
| **Key risk flag** | SSO overflow, NAPOT, Moratorium | Backup power, age, single pump |
| **Relevance** | Development capacity, environmental | Flood protection, storm resilience |

---

## Data Source

- **URL:** https://geospatial.sec.usace.army.mil/dls/rest/services/NLD/Public/MapServer/4
- **Format:** ArcGIS REST / GeoJSON / pJSON (open, no login required)
- **Coverage:** Nationwide — script filters to South Florida bounding box
- **Coordinate system:** NAD83 / WGS84 (WKID 4269) — standard lat/lon, Google Maps compatible

---

*Field guide prepared based on USACE National Levee Database public data schema.*
