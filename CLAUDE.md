# Offline irrigation coach: rules for AI sessions

Read [docs/idea.md](docs/idea.md) (source of truth), [STATE.md](STATE.md) (position) and [docs/DECISIONS.md](docs/DECISIONS.md) before changing behaviour.

## Invariants (tests enforce most of these)

1. **The engine decides; AI never produces a number.** `engine/` is deterministic, has no runtime dependencies, and never imports a model. Models only observe (soil photo → band) or phrase (text from the plan JSON).
2. **Offline.** No network on the core path: engine, app plan/explain/log. `engine/test/offline.test.ts` and `app/test/app-core.test.ts` fail if `fetch`/XHR/WebSocket/EventSource are touched, and the engine source may not contain URLs.
3. **Unknown is never zero.** Missing rain, flow or deficit → `status: paused` with exactly one question. Never turn uncertainty into a precise-looking number.
4. **Golden fixtures are the contract.** `contracts/fixtures/golden/*.json` must keep passing. Changing an expected value needs a reason in DECISIONS.md.
5. **Exact in the engine, rounded only in the UI** (`app/src/format.ts`).
6. **Provenance on every input**, visibly different in the UI. Simulated data is always labelled. Mocked model output is always labelled.
7. **Guardrails are messages, not numbers.** Mulch, fertilizer and salinity stay out of the recommendation until locally reviewed.
8. **Every UI string lives in `app/src/i18n/{en,sw}.json`.** Same keys, same placeholders (tested). Kiswahili is a draft until a native speaker signs off. No spelled-out numbers in templates.
9. **Every parameter has a status** in docs/PARAMETERS.md (sourced / placeholder / assumed). Add new ones there.
10. **Honest claims:** farmer-level fuel/fertilizer/labour savings, not basin water savings. Simulated savings are called simulated.
11. **Every device gets the same answer.** Farm state changes go through engine/src/state.ts; channels and app pass the same `PlanOptions`. SMS text must stay GSM-7 and ≤ 160 characters (tested).
12. **The folder is live-synced to teammates by SyncHack** (`.git`, `node_modules`, `.env` excepted). Every save reaches their Macs; keep to your role's folder and don't leave half-written files.

## Commands

`npm test` · `npm run typecheck` · `npm run dev` (port 4640) · `npm run build` · `npm run gateway` (port 4650) · `uv run data/build_area_pack.py --help`
