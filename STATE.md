# State

Updated 2026-10-03, hackathon day 1, late evening. Position, not rules: rules are in [CLAUDE.md](CLAUDE.md), decisions in [docs/DECISIONS.md](docs/DECISIONS.md).

**Live app:** https://univerdread.github.io/irrigation-coach/ (CI typechecks, tests and deploys every push to main).
**Team sync:** this folder is shared live with teammates through SyncHack (files only; `.git`, `node_modules`, `.env` stay local).

## Done

- **Engine** (`engine/`): FAO-56 water balance (Hargreaves + Ra, Kc curve, Ks, deep percolation), Saxton & Rawls (reproduces the paper's Table 3), texture triangle + ribbon test + map fusion, pause rule with one question, cap allocator, pre-purchase check, daily ETc series, and **shared state transitions** used by every channel.
- **Contracts** (`contracts/`): schemas for input, plan, log, area pack, AI functions; 9 golden fixtures.
- **App** (`app/`): first-run welcome with language choice; **guided setup** (paces or GPS corners with an error warning, crop + stage, method, soil map + ribbon test, bucket stopwatch, "when was the soil last soaked", plausibility checks); **Today** (big number, pump timer, one-tap answers to every question, Send by SMS, spoken version); **Season** (30-day coach vs. habit chart, stat tiles, fuel cost, pump check); **Log** (season so far, recompute check, export, about/privacy); **Phones** (live USSD + SMS simulator). My plot is saved on the phone; demo scenarios are separate. Checked at 360 and 320 px wide in both languages.
- **Basic phones** (`channels/`): USSD menu, SMS commands (EN/SW), morning messages, HTTP gateway in Africa's Talking's format with consent + deletion; tested to fit one GSM-7 SMS; tested to agree with the app.
- **Data** (`data/`): real Kimana area pack from iSDAsoil + Copernicus DEM + NASA POWER.
- **Docs**: [solution brief for the jury](docs/solution-brief.md), decisions, parameter registry, model integration guide, acceptance form.

Tests: `npm test` = 119 engine + 13 channels + 24 app.

## Blocked on the team / organisers

- [ ] **Submission format, deadline, judging criteria.**
- [ ] **Model teammate: which AI function ships (text or image)** and register it in `app/src/ai/registry.ts` ([docs/integration.md](docs/integration.md)).
- [ ] **Native Kiswahili review** of `app/src/i18n/sw.json`, `channels/src/i18n/sw.json`, `content/voice-script.md`.
- [ ] **Photo dataset** ([content/photo-dataset-protocol.md](content/photo-dataset-protocol.md)).
- [ ] **Real phone in flight mode** ([docs/ACCEPTANCE.md](docs/ACCEPTANCE.md)), ideally a cheap Android.
- [ ] Optional: Africa's Talking sandbox account + short code to demo USSD on a real feature phone.
- [ ] Licence for the public repo (MIT or Apache-2.0 would make it Digital Public Goods-ready); team decision.
- [ ] Agree the demo area (Kimana, Loitokitok proposed).

## Next if there is time

- Recorded voice clips (replace device text-to-speech).
- Multi-farmer "lead farmer" mode (several neighbours' plots on one phone).
- Area-pack lookup at the farmer's real GPS point outside the demo window (needs a pack per area).
- Suitability scores, KAMIS prices (cut first if behind).

Feature freeze at hour 18.
