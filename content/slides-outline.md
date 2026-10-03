# Slide skeleton (draft)

1. **One decision.** How long to run the pump today, if at all. Offline, Kiswahili, the phone they already have.
2. **The problem.** Watering by habit. Soil wet >70% of the time in sensor studies; nitrate leaching; fuel is the biggest running cost; under-watering at flowering can mean defaulting on the pump.
3. **Why World Bank Small AI.** The four principles table from the idea doc, one line each.
4. **How it works.** Four rhythms: 20 min once, 10 s daily, 2 min weekly, 5 min end of season.
4b. **The devices people already have.** Smartphone (offline app) · basic phone (USSD + one SMS a day, 2G, no data) · a neighbour's phone (lead-farmer relay) · a bucket, a tin can, their hands and feet. Kenya: 27.4 M feature phones, 34% of devices (CA, June 2026).
5. **The science is checkable.** iSDAsoil prior → ribbon test → Saxton & Rawls → FAO-56 bucket. Arithmetic an extension officer can redo by hand. (Our engine reproduces FAO-56 Example 8 and Saxton & Rawls Table 3 in tests.)
6. **Where the AI is.** Soil-photo classifier on the phone (or the text explainer, whichever we ship). Numbers never come from the model: it reads the engine's JSON, and any number it invents is rejected.
7. **Honest uncertainty.** Pause rule: unknown input → no minutes, one question. Disagreement → second check → extension officer.
8. **Simulated month.** 225 m³ vs 500 m³; zero deep percolation. Labelled simulated.
9. **Guardrails.** Efficiency paradox: savings shown as money and hours, never "irrigate more land". Salt, slope, clay, shared water.
9b. **Cost to serve.** Smartphone ≈ 0 after a 0.4 MB download; basic phone ≈ KES 190–240 per season in SMS (confirm tariff). Results framework: pump hours, water applied, drainage, fuel, yield, inclusion.
10. **Path to scale.** Pump dealers and PAYGo at point of sale; extension officers; KIAMIS; results-based financing. None integrated yet: potential partners.
11. **What we measured vs simulated.** Phone model, model size, inference time, flight-mode result (from docs/ACCEPTANCE.md). Parameters sourced vs assumed (docs/PARAMETERS.md).
12. **Future work.** Everything after the hour-18 freeze.
