# 🌊 FloodWatch AI

**Real-time Multi-Agent Disaster Intelligence**

FloodWatch AI is a production-grade, multi-agent operational platform built to autonomously protect municipalities against catastrophic flooding. By synthetically fusing public cameras, IoT sewer telemetry, weather feeds, and traffic data, our AI pipeline detects, verifies, and resolves localized disasters in seconds—saving lives and dramatically reducing emergency response latency.

---

## 🎯 The Value Proposition
Current operational dashboards require humans to monitor dozens of disjointed screens (traffic, weather, NOAA tides, CCTV limits). 

**FloodWatch AI replaces human monitoring with an Agentic Pipeline.** 
Our system natively runs 5 isolated AI Agents internally:
1. **VisionAgent:** Extracts bounding confidence from infrastructure CCTV.
2. **SensorFusionAgent:** Correlates disparate API vectors into mathematical `ZoneRisk`.
3. **VerificationAgent:** Enforces multi-source consensus logic to prevent false alarms.
4. **DecisionAgent:** Synthesizes verified emergencies into prioritized operational intents.
5. **PublishingAgent:** Drafts citizen alerts and claims telemetry logs instantly.

## 🚀 Hackathon Demo Guide

We have built a deterministic, time-coded scenario engine specifically so judges can observe the pipeline's real-time reasoning without waiting for a real hurricane!

### 1. Setup
```bash
# Install dependencies
npm install

# Start the edge server
npm run dev
```

### 2. The Presentation Path
1. **Navigate** to `http://localhost:3000`. You will see a dark-mode premium Operations Dashboard mapping Miami-Dade.
2. Click **"Trigger AI Flood Event Demo"** at the top right of the main header.
3. **Watch the Timeline:** A progress bar will mount. Observe the map as anomalies spawn sequentially (Weather -> Traffic Drop -> Sewer Spikes -> Vision).
4. **Inspect the Incident:** Once the `UNVERIFIED` incident pops onto the map (Red Triangle over Brickell), **click it**.
5. **Audit the AI:** In the right-hand panel, click the **AI Reasoning Trace** tab. You will see chronological logs proving exactly how the `SensorFusionAgent` and `VerificationAgent` evaluated the telemetry variables.
6. **The Verdict:** Wait for the playback timeline to hit "Vision AI Verified". Watch the incident auto-upgrade to **CRITICAL**, spawning the gorgeous **Executive Action Summary** outlining the AI's exact orders to mitigate the disaster.
7. **Diagnostics Check:** Click `Diagnostics` in the left sidebar to audit the individual Live/Mock API data streams powering the backend!

## 🛠 Tech Stack
- **Framework:** Next.js 15 (App Router)
- **Frontend Core:** React, TailwindCSS, Recharts, Lucide Icons
- **Mapping:** Leaflet & React-Leaflet
- **Data Plumbing:** Next.js Server-Sent Events (SSE) & Abstracted `Adapter` patterns routing NWS, FDOT, and NOAA.
- **AI Integration:** Engineered via an `LLMProvider` abstraction handling templated deterministic boundaries perfectly primed for Gemini or Nemotron injected prompts.

---
*Built to save cities.*
