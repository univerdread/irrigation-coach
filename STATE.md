# State

Updated 2026-10-03 (hackathon day 1, evening). Position, not rules: rules are in [CLAUDE.md](CLAUDE.md), decisions in [docs/DECISIONS.md](docs/DECISIONS.md).

## Done (scaffold)

- **Contracts:** schemas for farm input, plan, log entry, area pack, 3 AI functions; 9 golden fixtures (the addendum's 6 + worked example + 2 pause cases).
- **Engine:** all golden tests pass. FAO-56 reproduces Example 8; Saxton & Rawls reproduces Table 3 (all 12 classes, Ksat to 0.1 mm/h); the 30-day simulation reproduces the worked example (225 vs 500 m³, zero drainage). Offline guard test.
- **App:** 3 screens on simulated data; EN + SW (draft); daily loop (done → next day → rain question → plan); 3-plot cap view; provenance badges; log with recompute check; soil-map prior → ribbon update → AWC; AI registry + mock + number guard + template fallback. PWA verified offline in the browser (server killed, app still loads and computes).
- **Data:** real Kimana area pack built from iSDAsoil + Copernicus DEM + NASA POWER (no Earth Engine needed).
- **Content:** 59-clip voice bank (SW draft), photo-dataset protocol, 3-minute demo script, 12-slide skeleton.

Tests: `npm test` = 111 engine + 14 app.

## Blocked on the team / organisers

- [ ] **Submission format, deadline and Challenge 4 judging criteria** (idea doc checklist #1). Public sources only say: English, built on 3–4 Oct, judged on technical quality, development relevance, inclusivity, design and impact in constrained environments.
- [ ] **Model teammate: which AI function ships (text or image) and which runtime.** Hour-8 gate. See [docs/integration.md](docs/integration.md).
- [ ] **Agree the demo area** (proposal: Kimana, Loitokitok; D19).
- [ ] **Native Kiswahili speaker** to check `app/src/i18n/sw.json` and record `content/voice-script.md`. Until then, don't claim Kiswahili support.
- [ ] **Photo dataset**: kit + protocol in `content/photo-dataset-protocol.md`.
- [ ] **Bucket-test props**: 20 L container + stopwatch.

## Next, by role

1. **Data:** suitability scores (cut first if behind); KAMIS official download check.
2. **Engine + model:** wire the chosen AI function; train the classifier on the photo set with the split rules; decide D8 (p adjustment).
3. **App:** onboarding flow polish (GPS walk for area, pack lookup at the real GPS point instead of the demo centre); 30-day chart screen; season report; recorded voice clips; Capacitor wrap if the model needs native.
4. **Pitch:** fill the slides; record the flight-mode acceptance on a real phone ([docs/ACCEPTANCE.md](docs/ACCEPTANCE.md)).

Feature freeze at hour 18. Cut order if behind: suitability scores → KAMIS prices → pre-purchase check → photo model falls back to the tap-based feel chart.
