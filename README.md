# Offline irrigation coach

An offline phone coach that tells a smallholder who has just bought a pump **how long to run it today, if at all**. Entry for Hack-Nation Challenge 4, *Small AI for Development* (World Bank), agriculture track. Pilot setting: semi-arid Kenya.

> *"Washa pampu kwa saa 4 na dakika 10"*: run the pump for 4 hours 10 minutes.

**Try it:** https://univerdread.github.io/irrigation-coach/ (works offline after the first load; add it to the home screen).

**For the jury:** [docs/solution-brief.md](docs/solution-brief.md). The idea and evidence: [docs/idea.md](docs/idea.md). Where we are: [STATE.md](STATE.md).

**Any phone.** Smartphones get the offline app. Basic phones get the same plan by **USSD and SMS** ([channels/](channels/README.md)): no data bundle, no app, 2G is enough. A lead farmer or dealer can relay the plan to a neighbour with one tap.

## Run it

```bash
npm install
npm test          # engine + channels + app (150+ tests: golden fixtures, FAO-56, Saxton & Rawls, SMS/USSD, offline guard)
npm run dev       # http://localhost:4640
npm run build     # offline-first PWA in app/dist (service worker precaches everything)
npm run gateway   # basic-phone USSD/SMS gateway on :4650 (see channels/README.md)
```

Node 22+. The data pipeline uses [uv](https://docs.astral.sh/uv/): `uv run data/build_area_pack.py --help`.

## Layout

| Path | What | Owner (idea doc roles) |
|---|---|---|
| `contracts/` | **The data contract.** JSON Schemas (farm input, plan, log entry, area pack, AI functions), language-neutral golden fixtures, crop and method tables with sources. | everyone |
| `engine/` | Deterministic engine, zero runtime dependencies, no AI, no network: FAO-56 (Hargreaves ETo, Kc, root-zone balance), Saxton & Rawls, texture triangle + ribbon test, pause rule, cap allocator, pre-purchase check. | 2. Engine + model |
| `app/` | React + Vite PWA: guided setup (paces/GPS, ribbon test, bucket stopwatch), today's plan with pump timer, season chart and pump check, log, basic-phone simulator. EN + Kiswahili (draft). AI adapter boundary in `app/src/ai/`. | 3. App |
| `channels/` | Basic phones: USSD menu, daily SMS with one-word replies, HTTP gateway (Africa's Talking format). Same engine, same answers. | 3. App |
| `data/` | Area-pack builder: iSDAsoil + Copernicus DEM + NASA POWER, straight from public cloud storage. | 1. Data |
| `content/` | Voice clip bank, photo-dataset protocol, demo script, slide skeleton. | 4. Pitch + content |
| `docs/` | Idea doc, decisions, parameter registry (sourced vs assumed), model integration guide, flight-mode acceptance form. | everyone |

## How the parts fit

```
area pack (soil map + climatology)  ─┐
ribbon test, bucket test (onboarding) ├─► engine.planFarm(input) ─► plan JSON ─┬─► smartphone app (rounded for display)
daily: rain reading, "done" tap      ─┘          ▲                            ├─► USSD menu / daily SMS (basic phones)
weekly: soil photo ─► on-device model ───────────┘ (moisture check)           └─► on-device model phrases it
                                                                                  (numbers checked, template fallback)
```

The engine decides; models only observe (soil photo) or phrase (text). See [docs/integration.md](docs/integration.md).

## What's real and what's simulated

Demo farm data is **simulated** and labelled in the UI. The soil map window around Kimana (Loitokitok, Kajiado) is **real open data** (iSDAsoil, CC-BY 4.0). Every parameter's status is in [docs/PARAMETERS.md](docs/PARAMETERS.md). Savings in the 30-day chart are simulated; we claim farmer-level fuel, fertilizer and labour gains, not basin water savings.

## Data attribution

iSDAsoil (CC-BY 4.0, Hengl et al. 2021); Copernicus DEM GLO-30 (© DLR e.V. 2010–2014 and © Airbus Defence and Space GmbH 2014–2018, provided under COPERNICUS by the EU and ESA); NASA POWER (NASA Langley Research Center). FAO-56 crop parameters (Allen et al. 1998).
