# Offline irrigation coach: solution brief

For the Hack-Nation Challenge 4 jury (World Bank, Small AI for Development, agriculture track). Built 3–4 October 2026. Everything below is either running code in this repository or labelled as an assumption.

## In one sentence

Every morning, a smallholder who has just bought a pump learns **how long to run it today, if at all**, in Kiswahili, on whatever phone they have, with no internet.

## The farmer's problem

First-time irrigators can't see their root zone, so they water by habit, usually too much: wasted fuel, fertilizer washed past the roots, waterlogged clay, shared water drawn down. Sometimes too little at flowering, which can lose the crop that was meant to pay for the pump. Simple soil-water feedback roughly halved water use in Mozambique ([IDRC](https://idrc-crdi.ca/en/research-in-action/improving-irrigation-smallholder-farmers-mozambique)), but sensors must be bought and maintained farm by farm. The phone is already in the farmer's pocket.

## Designed around the devices people already have

The challenge asks for solutions "designed around local languages, real-world data and the devices people already have". We took that literally, device by device.

| Device the farmer already has | What it does in the coach | Status |
|---|---|---|
| **A smartphone** (65.6% of Kenya's 79.7 M connected devices, June 2026 [1]) | Full offline app: setup, daily plan, pump timer, soil photo check, season chart, log. ~105 KB of app code (gzipped) plus a ~300 KB area pack; works in flight mode after one load. | Built, tested, deployed as a PWA |
| **A basic (feature) phone** (27.4 M devices, 34.4% [1]) | **USSD menu** (any GSM phone, 2G, no data bundle, no app) and a **daily SMS** with one-word replies in Kiswahili or English (MVUA 5, NIMEMALIZA, KAVU). Every message fits one 160-character GSM-7 SMS. | Built and tested. A live service needs a short code from an SMS/USSD aggregator |
| **Someone else's smartphone**: a lead farmer, pump dealer or extension officer | Keeps a neighbour's plot and taps **Send by SMS**, which opens their own SMS app with the plan filled in. No server, no internet, no cost beyond one SMS. | Built |
| **A bucket and a stopwatch** (the phone's) | Measures the pump: litres in seconds becomes flow. | Built (stopwatch in setup) |
| **Their hands** | Ribbon test for soil texture; squeeze test for soil moisture. | Built (guided taps) |
| **Their feet** | Pace the plot when GPS is too rough for a small plot. | Built (paces or GPS corners, with an error warning) |
| **A tin can** | Rain gauge: the water depth is the rainfall. | Built (rain asked in mm; unknown is never treated as zero) |

**Why the basic-phone channel matters.** GSMA's State of Mobile Internet Connectivity 2026 finds about 60% of Africa's population lives under mobile-broadband coverage but does not use mobile internet [2]: cost of data and devices, not masts, is the barrier. USSD and SMS reach those farmers today.

## How it works (one engine, every channel)

```
open soil map (iSDAsoil) ─┐
ribbon + bucket tests     ├─► deterministic FAO-56 engine ─► one plan ─► smartphone app
daily rain (tin can)      │                                         ├─► USSD menu (2G)
soil check (hand / photo) ┘                                         └─► daily SMS
```

- **The engine decides; AI never invents a number.** The water balance is FAO Irrigation and Drainage Paper 56 arithmetic an extension officer can redo by hand. Our tests reproduce FAO-56's own worked example (extraterrestrial radiation, Example 8) and Saxton & Rawls' published soil-water table for all 12 texture classes.
- **Small AI where judgement from messy inputs is needed**: an on-device soil-photo classifier (moisture band) and an on-device text model that explains the plan. Model text is checked digit-by-digit against the engine's numbers; any mismatch falls back to a template, so the app works with no model at all.
- **Same answer on every device.** The smartphone app, USSD and SMS call the same engine and the same state transitions; a test pins that they agree.
- **Honest uncertainty.** If an essential input is unknown or contradicted (rain not reported, soil check disagrees), the coach shows **no minutes** and asks **one** question. Two disagreements in a row go to the extension officer.

## Built on existing infrastructure (Small AI principle 2)

| Channel | Role | Integrated today? |
|---|---|---|
| Pump dealers and pay-as-you-go companies | 20-minute onboarding at the point of sale; they carry repayment risk, so they gain most from a good first season | No: design partner to seek |
| County extension officers | Run onboarding, receive escalations, spot-check logs | No |
| SMS/USSD aggregators (e.g. Africa's Talking) | Short code for basic phones; our gateway speaks its callback format | Code ready; needs account + short code |
| KIAMIS farmer registry | Identity and plot data without re-entry | No: future |
| Results-based irrigation finance (Kenya + World Bank) | Spot-checked logs as performance evidence | No: future |

## Cost to serve (transparent assumptions)

| Channel | Per farmer per 4-month season | Basis |
|---|---|---|
| Smartphone app | ~0: one download of ~0.4 MB compressed (1.4 MB on the phone); no data needed after that | measured build output |
| Daily SMS + replies | ~240 SMS ≈ **KES 190–240** at KES 0.80–1.00 per SMS | Africa's Talking documentation examples show KES 0.80–1.00 per SMS [3]; confirm the current tariff and whether replies are zero-rated |
| USSD | network- and aggregator-dependent | to be quoted |
| Lead-farmer relay | one SMS per day from the relay's own bundle | — |

For comparison, the World Bank's Small AI article cites the Rori maths tutor at about $5 per student per year [4].

## Results framework (how a pilot would show impact)

| Level | Indicator | Measured how | Baseline |
|---|---|---|---|
| Output | Farmers onboarded; share of days with a plan delivered (by channel) | App/gateway logs | — |
| Outcome | Pump hours and water applied per season vs. the farmer's prior habit | Self-reported log + **spot checks** (dealer pump hours, PAYGo telemetry where it exists) | Habit recorded at onboarding |
| Outcome | Days the root zone was past field capacity (drainage) | Engine estimate, validated with a sensor sub-sample | Sensor sub-sample |
| Impact | Fuel and fertilizer cost; dry-season yield and income; pump-loan repayment | Survey + dealer records | Matched comparison farms |
| Inclusion | Share of women farmers and basic-phone users served | Onboarding record | — |

Water savings are claimed for the farmer (fuel, money, hours, fertilizer that stays in the soil), **not** as basin water savings. Reducing applications can raise depletion at basin scale (the efficiency paradox), so the coach never suggests irrigating more land where water is shared.

## Data protection and trust

- Smartphone: the plot, location and log stay on the phone; nothing leaves without the farmer choosing to share it.
- Basic phones: a server is unavoidable (a feature phone can't compute). It stores the minimum (phone number, plot inputs, log), only after recorded consent, with deletion on request, in line with Kenya's Data Protection Act 2019. The registration endpoint refuses a profile without a consent timestamp.
- Logs are **self-reported** and labelled as such; lenders should treat them as evidence only after spot checks.

## Inclusion

- **Shared phones and women farmers**: the basic-phone channel and the lead-farmer relay don't require owning a smartphone.
- **Literacy**: big numbers, one sentence a day, icons, a spoken version (device text-to-speech now; a recorded 59-clip voice bank is scripted).
- **Language**: Kiswahili and English now (Kiswahili drafts awaiting native review). Loitokitok's farmers also speak Maa, Kikuyu and Kamba; adding a language is a translation file plus ~60 recorded clips.

## What is real and what is simulated

| Real | Simulated or assumed |
|---|---|
| iSDAsoil soil map for a 11 km window at Kimana, Loitokitok (Kajiado South) | Farm scenarios in the demo |
| NASA POWER climatology; Copernicus DEM slope | The 30-day "coach vs habit" month (one illustrative shower) |
| FAO-56 and Saxton & Rawls methods, reproduced in tests | Stage lengths (FAO-56 has no Kenyan rows), effective-rain fraction, plausibility ranges: see docs/PARAMETERS.md |
| App, USSD, SMS and gateway code, 150+ automated tests | Kiswahili wording (native review pending); live short code |

## Scaling path

1. **Pilot (one season):** one sub-county, one dealer, one extension office; 100–300 farmers across smartphone and basic-phone channels; sensor sub-sample for validation.
2. **County:** an area pack per sub-county (open data, built by one script), local crop calendars from KALRO, recorded voice in local languages.
3. **National:** dealers and PAYGo firms as distribution; KIAMIS for identity; spot-checked logs feeding results-based irrigation finance.

## Sources

1. Communications Authority of Kenya, Sector Statistics Q4 FY2025/26 (June 2026): 79.68 M devices, 52.26 M smartphones (65.6%), 27.42 M feature phones (34.4%). Reported by [TechTrends KE](https://techtrendske.co.ke/2026/09/19/52-million-smartphones-kenya-mobile-data/); CA reports at [ca.go.ke](https://www.ca.go.ke/).
2. GSMA, State of Mobile Internet Connectivity 2026: ~906 M people (~60% of Africa's population) covered by mobile broadband but not using mobile internet in 2025. Reported by [Biometric Update](https://www.biometricupdate.com/202609/africas-digital-id-push-runs-into-mobile-internet-usage-gap).
3. [Africa's Talking SMS API documentation](https://developers.africastalking.com/docs/sms/sending/premium) (example responses show KES 0.80–1.00 per SMS).
4. [Small AI, big impact (World Bank Blogs)](https://blogs.worldbank.org/en/voices/small-ai-big-impact-harnessing-artificial-intelligence-for-development).
5. Full evidence base: [docs/idea.md](idea.md).
