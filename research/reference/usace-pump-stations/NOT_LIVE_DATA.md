# ⚠️ Important — This Is NOT Live Data

The USACE pump station files in this folder are a **static federal inventory**.
They are a snapshot of what stations exist and their physical specifications.
They are NOT monitoring tools and do NOT reflect current conditions.

---

## What "not live" means in practice

- The data does not update automatically
- There are no real-time flags — no alerts, no overflow status, no "is it running right now"
- Each record was last captured when a USACE engineer physically visited and surveyed the site
- That survey could have happened **last year, or five years ago** — there is no guarantee of currency
- Running the script again tomorrow will return the same data unless USACE has manually updated their database

---

## What you can trust from this data

- The station **exists** (or existed at time of survey)
- Its approximate **location** (coordinates)
- Its **construction year**
- Its **number of pumps** and **capacity** (where filled in)
- Whether it had **backup power** at time of survey

---

## What you cannot trust from this data

- Whether the station is currently **operational**
- Whether backup power is **still in place** or has been added/removed since the survey
- Whether capacity figures are **current** (stations get upgraded)
- Any sense of **live risk or alert status**

---

## If you need live data

The **Miami-Dade WASD sewer data** (in the `sewer-data` folder) is live.

For live flood/stormwater pump status in South Florida, the correct source is the
**South Florida Water Management District (SFWMD)** — they operate the flood
control system day-to-day and publish real-time data at:
https://www.sfwmd.gov/science-data/real-time-data
