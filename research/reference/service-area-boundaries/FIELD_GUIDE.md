# Miami-Dade Water & Sewer Service Areas — Field Guide
**For: Neal & Mash**
**Source: Miami-Dade GIS — CommunityServices/MD_WaterSewer MapServer**

---

## What is this data?

Miami-Dade County's water and sewer infrastructure is not all run by one
organisation. Different municipalities operate their own utility systems
within their borders. This dataset shows the **geographic boundaries** of
who is responsible for water and sewer service in each part of the county.

There are two layers:
- **Sewer Service Areas** — who handles sewage collection and treatment
- **Water Service Areas** — who handles drinking water supply

---

## The Fields — Plain English

| Field | What it means |
|-------|---------------|
| **UTILITYNAME** | Short code identifying the utility operator (see table below). |
| **TYPE** | Single character — typically `S` for sewer or `W` for water. |
| **MUNICID** | Municipal ID code for the municipality. |
| **UTILITYURL** | Website for the utility operator. |
| **CRTDATE** | Date this record was first created in the GIS system. |
| **MODDATE** | Date this record was last modified — most reliable indicator of data freshness. |

---

## Utility Name Codes

| Code | Utility / Municipality |
|------|------------------------|
| **MDWS** | Miami-Dade Water & Sewer (the County — serves the majority of unincorporated areas) |
| **MB** | Miami Beach |
| **CG** | Coral Gables |
| **CH** | Hialeah |
| **NMB** | North Miami Beach |
| **NM** | North Miami |
| **HOMSTD** | Homestead |
| **FLCITY** | Florida City |
| **OPLOC** | Opa-Locka |
| **SM** | South Miami |
| **MS** | Miami Springs |
| **WM** | West Miami |
| **MED** | Medley |
| **SURFS** | Surfside |
| **BLH** | Bal Harbour |
| **BHI** | Bay Harbor Islands |
| **IC** | Indian Creek |
| **MSH** | Miami Shores |
| **VG** | Virginia Gardens |
| **HG** | Hialeah Gardens |
| **NBV** | North Bay Village |

---

## Why this matters

Knowing which utility serves an area is important because:

- **Development permits** go to different utilities depending on location
- **Moratoriums and capacity limits** are set per utility — a moratorium in MDWS territory doesn't affect Miami Beach's system
- **Incident reporting** goes to different organisations depending on which utility zone an overflow or issue occurs in
- **Contact for new connections** differs by zone

---

## What this data does NOT include

- The physical pipe network (pipe routes, sizes, depths)
- Pump station locations
- Any operational or live status data
- Flow rates, capacity utilisation, or pressure data

---

## Data Source

- **URL:** https://gisweb.miamidade.gov/arcgis/rest/services/CommunityServices/MD_WaterSewer/MapServer
- **Layer 0:** SewerServiceArea (18 zones)
- **Layer 1:** WaterServiceArea
- **Format:** ArcGIS REST / pJSON (open, no login required)
- **Update frequency:** Rarely — only when service boundaries change

---

*Field guide prepared based on Miami-Dade GIS public data schema.*
