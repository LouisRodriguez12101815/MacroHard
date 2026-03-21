# FloodWatch AI — Data Source Research

## Live Data Sources

### `live/sewer-pump-stations/` — Miami-Dade WASD ✅ LIVE
- **Source:** Miami-Dade Water & Sewer Department (WASD) public GIS
- **Endpoint:** `https://gisweb.miamidade.gov/arcgis/rest/services/Wasd/WASDSewerPumpStationBasins_2_v1/MapServer/0/query`
- **Updates:** Near real-time (refreshed when WASD edits the GIS service)
- **Coverage:** 1,000 pump station basins county-wide
- **Key signals:** SSO (active sewer overflows), Moratoriums, NAPOT (pump load hours/day), Generator status
- **Auth:** None — public API, no key required
- **Fetch script:** `fetch_sewer_data.py`

---

## Static Reference Data

### `reference/usace-pump-stations/` — USACE NLD ⚠️ STATIC
- **Source:** US Army Corps of Engineers, National Levee Database
- **Coverage:** 56 flood/stormwater pump stations in South Florida
- **Key fields:** Number of pumps, capacity (gpm), construction year, backup power
- **Update frequency:** Only when USACE physically surveys a station (could be years)
- **See:** `NOT_LIVE_DATA.md` before using

### `reference/service-area-boundaries/` — Miami-Dade GIS ⚠️ STATIC
- **Source:** Miami-Dade GIS — CommunityServices/MD_WaterSewer MapServer
- **Coverage:** 18 sewer zones + 20 water zones — which utility serves which area
- **Update frequency:** Only when service boundaries are redrawn
- **See:** `NOT_LIVE_DATA.md` before using

---

## Additional Live Sources (To Be Connected)

| Source | Endpoint | Auth | Status |
|--------|----------|------|--------|
| NWS Weather Alerts | `api.weather.gov/alerts/active/zone/FLZ074` | None | Ready to connect |
| NOAA Tides — Virginia Key | `tidesandcurrents.noaa.gov/api/datagetter` (station 8723214) | None | Ready to connect |
| FDOT SunGuide Cameras | `sunguide.info` (District 6 — Miami-Dade) | None | Needs URL discovery |
| SFWMD Real-Time Data | `sfwmd.gov/science-data/real-time-data` | None | Ready to connect |
