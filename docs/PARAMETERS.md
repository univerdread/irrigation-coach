# Parameters: sourced or assumed?

Answers the idea doc's open question "which numerical parameters are sourced, and which are demo assumptions?". Every number that can change a recommendation is listed. **Status:** `sourced` = from a cited publication and checked; `placeholder` = from a publication but not for Kenya; `assumed` = team/demo assumption, must be validated before a pilot.

## Methods (engine)

| Parameter | Value | Where | Source | Status |
|---|---|---|---|---|
| Ra (extraterrestrial radiation) | FAO-56 eqs 21–25 | `engine/src/fao56/radiation.ts` | FAO-56 ch. 3; test reproduces Example 8 (32.2 MJ m⁻² d⁻¹) | sourced |
| Hargreaves ETo | 0.0023 (T+17.8)√ΔT · 0.408 Ra | same | FAO-56 eq. 52 + eq. 20 conversion | sourced |
| Root-zone balance, Ks, DP | FAO-56 eqs 84–88 | `engine/src/fao56/balance.ts` | FAO-56 ch. 8 | sourced |
| Kc curve | FAO-56 eq. 66 | `engine/src/fao56/kc.ts` | FAO-56 ch. 6 | sourced |
| Pedotransfer | Saxton & Rawls 2006 | `engine/src/soil/saxton-rawls.ts` | SSSAJ 70:1569; test reproduces Table 3 for all 12 classes incl. Ksat | sourced |
| OM = 1.72 × OC | 1.72 | `omPctFromOcGPerKg` | van Bemmelen convention (idea doc) | sourced (convention) |
| Texture triangle | USDA rules | `engine/src/soil/texture.ts` | USDA NRCS | sourced |
| Texture-by-feel flowchart | Thien 1979 | same | USDA NRCS feel method | sourced |
| Texture class centroids | Saxton & Rawls Table 3 | same | as above | sourced |
| Ribbon trust (1 SD) | sand 12 pp, clay 8 pp | `RIBBON_SD` | ~half a class width | **assumed** |

## Crops (`contracts/data/crops.json`)

| Crop | Kc ini/mid/end | Stage days | Zr (m) | p | Status |
|---|---|---|---|---|---|
| Tomato | 0.6 / 1.15 / 0.8 | 30/40/40/25 | 0.7–1.5 | 0.40 | Kc, Zr, p sourced (FAO-56 T12, T22); Kc end = midpoint of 0.70–0.90; stage days **placeholder** (Arid Region row) |
| Onion (dry) | 0.7 / 1.05 / 0.75 | 15/25/70/40 | 0.3–0.6 | 0.30 | sourced; stage days **placeholder** (Mediterranean) |
| Cabbage | 0.7 / 1.05 / 0.95 | 40/60/50/15 | 0.5–0.8 | 0.45 | sourced; stage days **placeholder** (Calif. desert) |
| Kale (sukuma wiki) | = cabbage | = cabbage | = cabbage | = cabbage | **assumed** proxy; flagged in UI |
| Sweet pepper | 0.6 / 1.05 / 0.9 | 30/40/110/30 | 0.5–1.0 | 0.30 | sourced; stage days **placeholder** (Arid Region) |

## Irrigation (`contracts/data/methods.json`, `engine/src/rain.ts`, `engine/src/plan.ts`)

| Parameter | Value | Status |
|---|---|---|
| Furrow / sprinkler / drip efficiency | 0.60 / 0.75 / 0.90 | textbook typical values; **verify** (idea doc uses 60% and ~90%) |
| Effective rain fraction | 0.8 | **placeholder** (golden fixtures use 1.0) |
| Ignore showers below | 1 mm | **placeholder** (FAO-56: < 0.2 ETo evaporates) |
| p adjustment for ETc | off | decision D8 |
| Steep-slope warning | ≥ 8% with furrows | **assumed** |
| Clay short-sets warning | ≥ 40% clay | **assumed** |
| Pre-purchase load flag | > 80% of available pump hours | **assumed** |
| Solar pumping hours/day | 6 (peak-sun-hours equivalent) | **assumed**, caller supplies |
| Default topsoil OM (ribbon-only path) | 1.5% | **assumed** (`app/src/screens/PlotInputs.tsx`) |

## Worked example (illustrative, not measured)

| Input | Value | Note |
|---|---|---|
| Plot | 1,000 m² | |
| AWC | 125 mm/m | USDA feel-guide range for sandy loam is 108–142. **Saxton & Rawls gives ~99 mm/m** for a typical sandy loam (65% sand, 10% clay, 2.5% OM). A ~25% spread between two respected methods is exactly why the ribbon test and local checks matter. |
| Root depth | 0.6 m | below FAO-56's 0.7 m minimum for tomato; kept as an override |
| ETc | 5.0 × 1.15 = 5.75 mm/day | |
| Pump | 20 L in 6 s = 200 L/min | |

## Area data

| Layer | Source | Status |
|---|---|---|
| Sand, clay, OC (+ SD) | iSDAsoil 30 m, CC-BY 4.0 | sourced; plot-scale error is large (sand RMSE 13.7, clay 9.6 pp): a prior, not a measurement |
| Slope | Copernicus DEM GLO-30 | sourced |
| Tmax, Tmin, rain climatology | NASA POWER | sourced; coarse grid (mixes Kilimanjaro slopes into Kimana's cell). Hargreaves with a large diurnal range likely overestimates ETo. Check against a local station before claiming accuracy. |

## Setup and channels (added with the device layer)

| Parameter | Value | Where | Status |
|---|---|---|---|
| One walking pace | 0.75 m | `app/src/lib/geo.ts` | **assumed**: calibrate on a measured 10 m |
| Plausible plot area | 20 m² – 2 ha | `app/src/screens/Setup.tsx` | **assumed** (D27) |
| Plausible pump flow | 3 – 1,500 L/min; bucket ≥ 2 s | same | **assumed** (D27) |
| Starting deficit from a first soil check | wet 0 / damp ½ trigger / dry = trigger | `engine/src/state.ts` | **assumed** (D25) |
| SMS length | ≤ 160 GSM-7 characters | `channels/src/gsm.ts` | standard (3GPP TS 23.038) |
| USSD screen | ≤ 182 characters | same | common network limit; confirm per operator |
| SMS cost | KES 0.80–1.00 per SMS | docs/solution-brief.md | from aggregator documentation examples; **confirm tariff** |
| Weather for "my plot" | Kimana climatology (NASA POWER) | `app/src/demo/area.ts` | **demo**: one area pack per sub-county in a deployment |
