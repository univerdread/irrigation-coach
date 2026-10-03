# Offline irrigation coach: combined idea document

Oct 3, 2026 · @univer

## Summary

We build an offline phone coach that tells a smallholder who has just bought a pump how long to run it today, if at all. It is our entry for the World Bank's Small AI for Development challenge (agriculture track), piloted in semi-arid Kenya.

- **One decision:** pump minutes per day on one plot, spoken in Kiswahili.
- **Inputs:** an open soil map, the FAO crop-water method, a ribbon test and a bucket test the farmer does once, and a soil-photo model running on the phone.
- **By-product:** a self-reported irrigation log that pump dealers, lenders and Kenya's results-based irrigation financing can build on once it is spot-checked.

New in this version: soil organic matter and mulch inside the water calculation, fertilizer-aware scheduling against nutrient runoff, a drip decision with a guardrail against the efficiency paradox, where Bright Data credits help, and a 24-hour plan for four people.

## Why it fits the World Bank

The idea answers each thing the World Bank says it wants from Small AI, its jobs agenda and its irrigation strategy. The obvious alternative, a leaf-disease photo app, is already featured in the Bank's own article (Kenya's Nuru), and irrigation also has established tools and active research, so our candidate contribution is an accessible offline workflow for this setting, not a new method.

| What the World Bank says | How we answer it |
| --- | --- |
| **Small AI** is affordable, context-specific, works on small datasets and runs on everyday phones ([source](https://blogs.worldbank.org/en/voices/small-ai-big-impact-harnessing-artificial-intelligence-for-development)) | Small models on a mid-range Android phone; no server needed for advice |
| **Principle 1:** a hyper-local, clearly defined problem | One decision on one plot: pump minutes today |
| **Principle 2:** build on existing infrastructure (farmer registries, WhatsApp, health workers) | Kenya's farmer registry, extension officers, pump dealers, mobile money (next section) |
| **Principle 3:** mobile-first and offline | GPS, soil data, models and voice all on the phone; sync only when there is signal |
| **Principle 4:** public-private partnership | Dealers distribute at point of sale; government financing pays for verified results |
| **Jobs:** job creation is the Bank's central mission; agribusiness commitments double to $9 billion a year by 2030 ([source](https://nannews.ng/?p=297299)) | A dry-season vegetable harvest adds income and work; Kenya projects farm-level returns above 50% from farmer-led irrigation ([source](https://www.standardmedia.co.ke/amp/smart-harvest/article/2001541364/new-irrigation-drive-boost-for-smallholder-farmers)) |
| **Farmer-led irrigation:** farmers set up or expand irrigation themselves ([source](https://www.worldbank.org/en/brief/2021/05/19/farmer-led-irrigation-development-flid)); under 10% of Africa's arable land is irrigated ([source](https://www.unwater.org/node/1051)) | Built for exactly the first-time irrigator this creates |
| **Kenya's finance gap:** lenders see high risk and data is missing; a planned facility would reward verified installation and performance ([source](https://knowledge4policy.ec.europa.eu/node/85268_pt)) | The daily log and season report are self-reported; with spot checks by dealers or extension officers they can become that evidence |

## Existing infrastructure we plug into

"Existing infrastructure" means channels that already reach people, so Small AI doesn't need its own distribution network. The Bank's three examples, with Kenyan versions:

- **Farmer registries:** government databases of who farms, where and what. Kenya's KIAMIS had 8.9 million farmers registered by 30 September 2026, and the government says it will connect them to finance, insurance and markets ([source](https://www.businessquest.co.ke/cs-mutahi-kagwe-outlines-digital-registration-for-farmers/)). County agricultural officers register farmers, who can reach the system via USSD code *616*3# ([source](https://tell.co.ke/kiamis-kenya-embarks-on-farmer-registration-to-facilitate-access-to-subsidies/)).
- **WhatsApp:** already on people's phones. The Bank's example is the Rori maths tutor in Ghana, about $5 per student per year ([source](https://blogs.worldbank.org/en/voices/small-ai-big-impact-harnessing-artificial-intelligence-for-development)).
- **Health-worker networks:** people who already visit every household. Kenya has about 107,000 community health promoters with smartphones and a national digital system ([source](https://newsroom.amref.org/blog/2025/06/built-from-the-ground-up-how-107000-community-health-promoters-are-changing-the-face-of-health-care-in-kenya/)).

Channels the coach could use later. None is integrated yet: there are no data permissions or partner commitments, and the demo runs without any of them.

| Channel | What it gives us |
| --- | --- |
| Pump dealers and pay-as-you-go companies | Onboarding at the moment of purchase; they carry repayment risk, so they gain most from a good first season |
| County extension officers | Run the 20-minute onboarding; receive escalations when the app is unsure |
| KIAMIS | Farmer identity and plot data without re-entry; a place for irrigation records once spot-checked |
| Mobile money | Pump repayments already run here; the season report sits beside them |
| Kenya's farmer-led irrigation financing | Results-based financing for 350,000 smallholders is being designed with the World Bank, which is also building digital sales and rebate tools with the Gates Foundation ([source](https://www.mygov.go.ke/state-seeks-partnerships-scale-irrigation)) |

## The problem

Farmers who can't see their root zone water by habit, usually too much. When they get simple feedback, they cut back fast.

- **Mozambique:** farmers watered whenever the topsoil looked dry, often daily, which wasted water and raised pump fuel costs. A colour-coded soil-moisture sensor cut water use by about half ([source](https://idrc-crdi.ca/en/research-in-action/improving-irrigation-smallholder-farmers-mozambique)).
- **Small schemes in southern and eastern Africa:** sensors showed soil wet more than 70% of the time, with evidence of nitrate leaching from over-irrigation. All 20 farmers at one scheme read the sensor correctly and reduced irrigation ([source](https://www.tandfonline.com/doi/full/10.1080/07900627.2017.1320981)).

What over-watering costs:

- **Money:** fuel is the biggest running cost of petrol and diesel pumps. One solar-pump vendor puts fuel and labour at up to KES 20,000 a month in Kenya ([source](https://www.startup-energy-transition.com/award-finalist-sunculture-from-kenya-exponentially-improves-the-livelihoods-of-smallholder-farmers/)); treat it as a vendor figure.
- **Soil and water:** drainage below the roots carries fertilizer away; clay waterlogs; salty water builds salt in the soil.
- **Shared sources:** every extra hour draws on a river or well neighbours also use.

Under-watering is the quieter failure: a dry spell at flowering loses the crop that justified the pump, and can mean defaulting on it.

Lenders can't see either. A November 2025 workshop of IWMI, Kenya's irrigation department and the World Bank listed high perceived lending risk and data gaps among the main constraints on irrigation finance ([source](https://knowledge4policy.ec.europa.eu/node/85268_pt)).

Hardware sensors prove the cure but must be bought, installed and maintained farm by farm. The phone is already in the farmer's pocket.

## How it works for the farmer

The farmer spends about 20 minutes once, then 10 seconds a day. Onboarding happens with the pump dealer or an extension officer present.

&#91;embedded content: farmer journey · 4 rhythms\]

The daily loop (highlighted) is the product; onboarding is the only step that needs a helper.

**The ribbon test** is the classic field test for soil texture. Moisten a handful of soil, squeeze it into a ball, then push it out between thumb and finger. Sand feels gritty and won't ribbon; loam makes a short ribbon; clay makes a long, sticky one. The app takes a photo plus two or three taps and combines the answer with the soil map.

**The bucket test** measures the pump: time how long it takes to fill a 20-litre bucket at the outlet. That flow rate turns "your soil needs 30 mm" into "run the pump for 4 hours 10 minutes". Repeat it when the pump, hose or water source changes.

**Rain** is entered in millimetres, read from any straight-sided container left in the open: the depth of water in it is the rainfall. A "light" or "heavy" tap gives no defensible number. The app stores reported rain separately from the share assumed to reach the roots, and missing rain counts as unknown, never zero.

**What the farmer hears** is one sentence in their language, for example: *"Washa pampu kwa saa 4 na dakika 10, Alhamisi asubuhi"* ("run the pump for 4 hours 10 minutes on Thursday morning"). A native speaker should check the phrasing. On most days the message is that no pumping is needed, which is where the savings come from.

## Soil science inside the engine

The engine treats the root zone as a bucket, and the bucket's size comes from the soil's sand, silt, clay and organic matter. Pedology is the core of the model, not a talking point.

**Why texture matters.** Sand drains fast and holds little; clay holds a lot but drains slowly and can waterlog; silt sits between. Loam, a balance of the three, is the reference case: good drainage and good holding. Organic matter (humus) glues particles into crumbs, which improves structure, infiltration and nutrient holding.

**From soil to bucket size.** iSDAsoil predicts sand, clay and organic carbon for every 30 m pixel of Africa, each with an uncertainty estimate; categorical layers such as texture class and slope have none ([source](https://www.isda-africa.com/isdasoil/faq/)). At plot scale the errors are large (sand RMSE 13.7 and clay 9.6 percentage points), so the map is a prior, not a measurement, and the ribbon test corrects texture where it is unsure. Silt is 100 minus sand minus clay; organic matter is conventionally about 1.72 times organic carbon. A pedotransfer function (Saxton & Rawls, 2006) turns sand, clay and organic matter into the water held at field capacity and at wilting point; the difference is the available water capacity. None of this says how wet the soil is today: that comes from the daily balance and the farmer's checks.

Sanity-check ranges from the USDA feel-and-appearance guide ([source](https://www.canr.msu.edu/irrigation/upoads/files/FeelSoil.pdf)), converted to mm of water per metre of soil:

| Texture group | Available water (mm per m) |
| --- | --- |
| Fine sand, loamy fine sand | 50–100 |
| Sandy loam, fine sandy loam | 108–142 |
| Sandy clay loam, loam | 125–175 |
| Clay loam, silty clay loam, clay | 133–200 |

**Be honest about humus.** More organic matter raises water holding only modestly in mineral soils; its bigger benefits are structure and nutrients. For pumping, mulch matters more because it cuts evaporation from the soil surface, especially while the crop is small. A "mulched?" toggle could lower the evaporation share of water use, but until its effect is parameterised and reviewed it appears only as a labelled what-if, outside the recommendation.

**The daily calculation** follows FAO Irrigation and Drainage Paper 56 ([source](https://www.fao.org/4/x0490e/x0490e00.htm)). Temperature alone estimates evaporation demand (Hargreaves), so no weather station is needed:

```latex
\begin{aligned}
TAW &= AWC \times Z_r \qquad RAW = p \times TAW \\
ET_0 &= 0.0023\, R_a\, (T_{mean} + 17.8)\sqrt{T_{max} - T_{min}} \qquad ET_c = K_c \times ET_0 \\
D_t &= D_{t-1} + ET_c - P_{eff} - I_{net} \\
\text{pump time} &= \frac{D_t}{\text{efficiency}} \times \frac{\text{area}}{\text{flow rate}} \quad \text{when } D_t \ge RAW
\end{aligned}
```

TAW is total available water, Zr root depth, p the depletion the crop tolerates (about 0.4 for tomato), Kc the crop coefficient for the growth stage and Dt the deficit on day t. Keeping this part as plain arithmetic is deliberate: an extension officer can check every recommendation by hand.

## Nutrients and eutrophication

Over-watering is where downstream algal blooms start on a small farm: water draining past the roots carries nitrate with it. Sensor studies in African irrigation schemes found exactly this leaching ([source](https://www.tandfonline.com/doi/full/10.1080/07900627.2017.1320981)).

The schedule itself is the main protection; a fertilizer-specific rule waits for local review.

- **Never past field capacity.** The coach only ever replaces the current deficit, so it doesn't push water, or the nitrate it carries, below the roots. That holds every day, fertilizer or not.
- **"Applied fertilizer today" tap.** Logged only, for now. Whether to split or delay irrigation after fertilizer depends on the fertilizer, soil, crop and method, so no numeric rule enters the recommendation until it is reviewed locally.
- **Same saving, two framings.** For the farmer it is fertilizer money not washed away; for the World Bank it is less nutrient pollution reaching rivers and lakes.

In the pitch, call this a co-benefit. A demo cannot measure downstream water quality, so we don't promise a number.

## Drip, the efficiency paradox and diversification

Drip irrigation is decades old, so it isn't our innovation. What we add is deciding whether drip pays on a given plot, scheduling it, and guarding against its known side effect.

**The drip decision.** Drip is roughly 90% efficient versus about 60% for furrows, but costs more up front. The pre-purchase check compares the two for this plot's soil, crop, water source and pump, and flags a pump too small for the area (see the worked example).

**The efficiency paradox.** A basin-scale study of the Upper Rio Grande found that subsidies for water-saving irrigation are unlikely to reduce total water use in many basins. Efficient systems cut return flows and aquifer recharge, and policies that reduce water applications can increase water depletion ([source](https://agris.fao.org/search/en/records/65de48840f3e94b9e5ccee1a)). Two consequences for us:

- **Guardrail:** savings are shown as money, fuel and hours, never as "now irrigate more land" where water is scarce.
- **Honest claims:** part of over-watering drains back to groundwater, so we claim fuel, fertilizer, labour, soil and yield gains for the farmer, not basin water savings. Water specialists on the jury will notice this distinction.

**Diversification (one pitch line, no features).** Dry-season irrigation lets farmers add vegetables beside their rain-fed staple, which diversifies income and diet. The only engineering consequence is that smallholders mix crops, so the app handles several crops per plot, each with its own crop coefficient.

## Models and data

Two AI models sit where judgement from messy inputs is needed; everything else is transparent arithmetic. The soil-photo model is the one the AI story depends on, so a minimal version of it is a must-have.

&#91;embedded content: where each part runs · 3 zones\]

The middle column is the product; the left is prep work and the right is optional upside.

**Area data pack (built once per sub-county).** iSDAsoil sand, clay and organic carbon with their uncertainty layers, plus slope, rainfall and temperature climatology. iSDAsoil is open (CC-BY 4.0) and downloadable from the AWS open-data registry or Google Earth Engine ([source](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8584968/)). At one byte per layer, a sub-county should fit in a few megabytes.

**Model 1: soil-photo classifier (on the phone).** Input: a photo of a squeezed soil ball or ribbon plus two taps. Output: a moisture band, and a texture group where the map is unsure. The bands follow the USDA feel-and-appearance method, which an experienced person can use to within about 5% ([source](https://www.canr.msu.edu/resources/estimating-soil-moisture-by-feel-and-appearance-usda-nrcs)). That figure describes trained people, not our model: the classifier's accuracy must be measured separately on held-out soil samples and lighting. Minimum for the demo: three classes (dry / OK / wet) on one soil, trained on photos we make by adding measured water to weighed soil.

**Model 2: irrigation-suitability scores (precomputed).** This is the team-chat map idea, aimed at land already farmed rather than new land, which avoids deforestation and land-rights problems. Plots that stay green in dry-season Sentinel-2 images are only candidate positive examples: greenness can also mean wetland, trees or perennial crops, and it says nothing about success, so labels need field checks. The model learns what currently irrigated land looks like and flags similar rain-fed plots. Min karta only covers Sweden; the African equivalents are iSDAsoil, Sentinel-2, a global elevation model and rainfall data.

**How the parts correct each other.**

- Texture starts as the map estimate; a ribbon test updates it, weighted by the map's uncertainty at that spot.
- The engine tracks soil water daily; a weekly photo check adds one observation. It samples a handful of soil, not the whole root zone, so how much it should correct the balance has to be tested.
- If engine and photo disagree, the app picks no winner, since timing or sampling may explain the gap: it pauses precise minutes and asks for a second check. Repeated disagreement goes to the extension officer.

**Voice and sync.** Each language gets a bank of about 60 recorded clips (numbers, units, weekdays, stock phrases) that the app stitches together. Logs sync when the phone sees signal; nothing the farmer needs depends on it.

## Worked example

On a quarter-acre of tomatoes, the coach pumps about 225 m³ in 30 days instead of about 500 m³, with nothing draining below the roots. All numbers are illustrative, chosen to be typical rather than measured.

| Input | Value | From |
| --- | --- | --- |
| Plot | about 1,000 m² (a quarter acre) | GPS walk |
| Soil | sandy loam, about 125 mm available water per m | Soil map + ribbon test |
| Root depth | 0.6 m, so 75 mm total available water | Crop table |
| Allowed depletion | 40%: pump when the deficit reaches 30 mm | FAO-56, tomato |
| Water use | 5.0 mm/day × 1.15 = 5.75 mm/day | Hargreaves; FAO-56 mid-season coefficient |
| Pump | 20 L in 6 s = 12 m³/hour | Bucket test |
| Furrow efficiency | 60% | Method chosen at onboarding |
| **Recommendation** | **every \~5 days: 50 m³ = 4 h 10 min** | Engine |

&#91;embedded content: illustrative FAO-56 simulation · one plot, 30 days\]

The simulation assumes one 20 mm shower on day 12. The habit run puts 10 mm into the soil every day, as when farmers water whenever the topsoil looks dry. The roughly halved water use is in the same range as the Mozambique sensor project, but that is not evidence for our app; every saving here is simulated.

**Pre-purchase check.** On drip (about 90% efficient) the plot needs about 33 m³ every five days. A small solar pump at 1,200 L/hour would need roughly 28 hours per cycle, close to all the daylight available. The coach flags that before the farmer signs: shrink the irrigated area or buy a bigger pump.

## Guardrails

The coach protects the soil, the water source and the farmer's trust before it optimises minutes.

- **Salty water:** if the water tastes salty or the area is known to be saline, flag it and recommend a water test and extension advice. No automatic extra pumping: flushing salt safely needs water-quality and drainage information.
- **Clay:** shorter, more frequent sets; warn against flooding a waterlogged field.
- **Slopes:** on steep plots, furrow irrigation triggers an erosion warning and a suggestion to run furrows along the contour.
- **Fertilizer days:** logged only; no numeric rule until reviewed locally.
- **Scarce or shared water:** never suggest expanding the irrigated area; steer towards drip.
- **Honest uncertainty:** when an essential input is unknown or contradicted, show no minutes and ask one question; never turn uncertainty into a precise-looking number. Repeated disagreement goes to the extension officer.
- **Farmer owns the data:** nothing leaves the phone without an explicit choice to share with a named dealer, lender or programme.
- **Advice, not a guarantee:** the coach supports the farmer and extension officer; it doesn't replace them.

## How it compares with what exists

Every piece of this already exists somewhere. What we test is a simple, offline, daily pump instruction for smallholders without sensors: a delivery gap to validate, not an unsolved problem.

| Existing approach | What it does | Limitation for our farmer | Relationship to us |
| --- | --- | --- | --- |
| [Irrigation Calculator Pro](https://apps.apple.com/id/app/irrigation-calculator-pro/id6751106220) | Fully offline FAO-based calculator with effective rainfall, 58+ crops, 6 soil types and a next-irrigation date | iPhone only (iOS 18.5+), English only, and the user must enter ETo | Offline FAO calculation isn't new; we differ on Android, Kiswahili, no ETo input and pump minutes from a bucket test |
| [Amatsi](https://amatsi.vercel.app/) | Web app that says it tells smallholders when to irrigate from weather and soil data | Sign-up web app, apparently online; traction unknown | Closest concept; we differ on offline use and pump minutes |
| [SmartIrrigation apps (Florida, Georgia)](https://elibrary.asabe.org/abstract.asp?aid=46590) | Water-balance schedules with irrigation depth and duration | Need live weather-station data; built for US farms | Same output shape, which we make work offline for smallholders |
| [FAO CROPWAT](https://www.fao.org/sustainable-development-goals-helpdesk/champion/article-detail/cropwat/en) | Standard tool for crop water needs and irrigation scheduling | Built for planners, not farmers on a phone | Same FAO method we use |
| [LandPKS (USDA)](https://landpotential.org/knowledge/landinfo-training) | Offline soil texture by feel; water-holding capacity adjusted for organic matter | No daily irrigation decision | Our soil onboarding can follow its method |
| Colour-coded soil sensors and [VIA's offline app](https://via.farm/app_guide/) | Proven to cut over-irrigation ([source](https://idrc-crdi.ca/en/research-in-action/improving-irrigation-smallholder-farmers-mozambique)); offline collection of sensor readings | Hardware bought and maintained farm by farm | Complementary: sensor colours can be an input |
| IoT irrigation platforms, e.g. [Gweens](https://agritech.gweenscraft.co.ke/) (Kenya) | Installed sensors automate scheduling on 0.5–5 acre farms | Hardware and technicians | We need neither |
| Connected solar pump kits on pay-as-you-go (e.g. SunCulture) | Remove fuel cost; repayments tied to farm income ([source](https://www.startup-energy-transition.com/award-finalist-sunculture-from-kenya-exponentially-improves-the-livelihoods-of-smallholder-farmers/)) | Only for buyers of that hardware | Pump-agnostic: works with any pump |
| Water allocation: [K-State Crop Water Allocator](https://milab.ksu.edu/crop-water-allocator), [SPHERAG](https://spherag.com/) | Seasonal crop and water allocation; community limits and scheduling in an IoT/cloud system | Seasonal planning or cloud and IoT platforms | Our water-cap feature is a simpler daily adaptation, not a new algorithm |
| [IWMI solar pump sizing tool](https://www.iwmi.org/data/solar-irrigation-pump-sizing-tool/) | Excel tool for water needs, discharge, head loss and pump selection | Desktop spreadsheet | Our pre-purchase check is a mobile adaptation |
| Smartphone soil-image research ([texture](https://doi.org/10.1016/j.geoderma.2020.114562), [moisture](https://arxiv.org/abs/2303.11527)) | Published studies estimate texture and moisture from phone photos | Research results, not field-proven tools | Our photo model is a precedent-backed experiment, not a new idea |

Irrigation Calculator Pro's listing was checked on 3 October 2026; the K-State, SPHERAG, VIA, IWMI and soil-image links come from the team's evidence supplement. None of these apps was tested hands-on.

## Where Bright Data credits help

Bright Data helps a little, at the edges. The core data is free to download and the app runs offline, so scraping is never part of the product. Cap it at about an hour, and respect each site's terms.

| Use | Worth it? | Why |
| --- | --- | --- |
| Crop prices from KAMIS | Yes, best use | KAMIS covers five markets in each of Kenya's 47 counties and over 150 products, with wholesale, retail and farm-gate prices ([source](https://website.kalro.org/?p=9879)). Prices turn the season report into "what your water earned" and make the payback check real. Check for an official download before scraping. |
| Pump catalogues from Kenyan dealers | Maybe | Flow rates, lift heights and prices give the pre-purchase check a real pump list |
| Soil photos for training | No | Scraped images have no measured water content, so they can't label moisture. Our own photos of weighed soil are worth more. |

A KAMIS story worth using in the pitch: farmers in one Kajiado self-help group said they sold a crate of tomatoes for KES 1,500–2,500 when market prices were KES 5,000–8,000 ([source](https://www.businessdailyafrica.com/bd/data-hub/kajiado-targets-mobile-phone-improve-farmer-yields-income-3550744)).

## Feasibility: 24 hours, 4 people

Viable if scoped hard. Most of the product is simple software; the only real uncertainty is the soil-photo model, so build a minimal version and freeze features at hour 18.

| Role | Owns | First task |
| --- | --- | --- |
| 1. Data | Area data pack; Saxton & Rawls water-holding layer | Export one sub-county from Earth Engine; fall back to AWS if access stalls |
| 2. Engine + model | FAO-56 engine with tests; soil-photo classifier on our framework | Unit-test the engine against the worked example |
| 3. App | Onboarding, daily screen with voice, season report; works in flight mode | Screens on mock data; prove framework integration by hour 8 |
| 4. Pitch + content | Slides, demo script, video, voice clips, props, photo dataset | Check deadline and submission format; outline slides |

&#91;embedded content: 24-hour plan · 4 roles\]

The hour-8 framework check is the real gate: if the app can't call the model by then, switch to the fallback early.

If we fall behind, cut in this order:

1. Suitability scores: show a static map instead.
2. KAMIS prices via Bright Data.
3. The drip pre-purchase check.
4. Photo model falls back to the tap-based feel chart. Last resort, because it weakens the AI story.

Cheap add-ons to keep (about an hour in total): organic matter in the water-holding formula, the mulch toggle and the fertilizer tap. Every idea after hour 18 goes on the "future work" slide.

## Build addendum (team review, 3 October)

The build starts with a deterministic calculator and golden tests. AI only asks questions and explains, and the demo stays honest that its data is simulated.

**Scope.** Baseline is one tomato plot; the optional upgrade is three plots sharing one pump under a daily water cap. Three screens: plot inputs, today's plan, explanation and log. Demo data is simulated and labelled so in the UI.

**Engine rules (deterministic, no AI).**

- Litres = area (m²) × deficit (mm) ÷ efficiency; pump minutes = litres ÷ flow (L/min). One mm over one m² is one litre.
- Flow is stored in L/min and converted at input, since the bucket test gives litres per seconds and dealers quote L/hour or m³/hour.
- Efficiency applies to pumped water only, never to rain.
- The deficit is non-negative mm from a pluggable source: simulated fixtures now, the FAO-56 balance later, behind one interface. The full balance must also handle runoff, drainage and the field-capacity bound; the single-step formula above is not FAO-56 on its own.
- **Trigger:** a plot is due only when its deficit reaches its threshold (30 mm in the tomato example); below that the answer is "no irrigation yet". The cap allocator works only on due plots, so the three-plot fixtures declare A, B and C due as a stated fixture assumption.
- **Rain:** stored in mm as reported; a separate, configurable effective-rain step, capped at the current deficit, decides what enters the root zone. Its default is a placeholder until validated locally. Missing rain is unknown, never zero.
- **Pause rule:** essential inputs are area, flow, method efficiency, crop and stage, soil water capacity, the last deficit with its date, and rain since that date. If any is unknown, or a newer observation contradicts it, show no minutes and ask one question.
- Under a cap, due plots fill greedily in a visible priority order (a demo order, not agronomic advice), partial fills allowed. The engine returns unmet litres per plot and the UI flags them.
- Exact values stay in the engine; rounding happens only for display.
- Mulch, fertilizer and salinity adjustments stay out of the numeric recommendation; at most they appear as labelled what-ifs.

| Golden test | Inputs | Expected |
| --- | --- | --- |
| Single plot | 1,000 m²; 30 mm deficit at a 30 mm trigger; 60% efficiency; 12 m³/hour | 50,000 L; 250 min |
| Rain after the trigger | As above, plus 20 mm effective rain | Deficit 10 mm, below the trigger: no irrigation yet, with the reason |
| Missing rain | As above, rain since the last update unknown | No minutes; asks for rain since that date |
| Three plots, no cap (all due by fixture) | 100 m² each; deficits A/B/C = 10/6/4 mm; 80% efficiency; 1,000 L/hour | 1,250 / 750 / 500 L; 2,500 L; 150 min |
| Cap of 1,500 L | As above | 1,250 / 250 / 0 L; 90 min; unmet B = 500 L, C = 500 L |
| Cap of 1,500 L, rain on A | A receives 10 mm effective rain | 0 / 750 / 500 L; 1,250 L; 75 min; nothing unmet |

**AI rules.**

- Ship one AI function the phone stack is shown to support: text (input help and explanations) or image (soil classification). Don't claim both without tests.
- A deterministic validator decides which inputs are missing; the on-device model only phrases the question.
- The model receives the engine's result as JSON and writes the explanation. Numbers in its text are checked against the JSON, any mismatch falls back to the template, and it never invents measurements.
- Templated text works when no model is loaded, so the app always works.
- Soil-photo classifier: evaluated on held-out samples and lighting, with photos of one soil preparation never split across training and test sets. Its confidence score is not a calibrated probability, and any photo result not produced by a live model is labelled as mocked.

**Offline and data.**

- App, model and crop tables are preinstalled; no cloud inference, weather API, registry or price feed at runtime. An automated test fails if the core path touches the network.
- Acceptance on a named phone in flight mode: the app opens, computes, runs the AI function, and saves and reopens a log.
- Record the phone model, model file size and observed inference time; no fabricated benchmarks.
- Each log entry stores inputs with units, timestamps, provenance (measured, reported, mapped or simulated) and engine version, so any plan can be recomputed. Simulated, self-reported and measured values look visibly different.
- Every UI string lives in a translation file from day one (English and Kiswahili, checked by a native speaker). Voice playback is optional; no offline speech recognition is promised.
- KIAMIS, dealers, lenders and financing programmes stay out of the demo; they are potential future partners.

## Start now, before the model teammate arrives

Everything except the classifier and the framework wiring can start tonight without them. In priority order:

- [ ] Check the deadline, submission format (video, repo, live pitch?) and Challenge 4 judging criteria.
- [ ] Register an Earth Engine noncommercial project now, since approval can take time; keep the AWS iSDAsoil download as the fallback.
- [ ] Pick one semi-arid Kenyan sub-county as the demo area (agree it with the team).
- [ ] Write the data contract: fields in the area pack, the daily state and the log, so app, engine and model plug together later.
- [ ] Write the water-balance engine in plain code, passing the golden tests in the build addendum.
- [ ] Add the Saxton & Rawls pedotransfer step: sand, clay and organic matter in, available water capacity out.
- [ ] Draft the \~60-phrase voice script in English; ask the hub organisers for a Kiswahili speaker, or plan a text-to-speech fallback and say so in the pitch.
- [ ] Prepare the photo dataset kit: soil, kitchen scale, measuring jug, phone. Protocol: weigh air-dry soil, add water in steps (for example 5%, 15% and 25% of the soil's weight), photograph squeezed balls in varied light, 50+ photos per class.
- [ ] Get the bucket-test props: a container of known volume and a stopwatch.
- [ ] Draft the slide skeleton and the 3-minute demo script.
- [ ] Only if time remains: check KAMIS for a price download, then Bright Data.

Leave for the model teammate: training the classifier and connecting it to the app.

## Risks and open questions

The biggest build risks are data access and framework wiring; the biggest product risk is soil-map accuracy at plot scale.

| Risk | Mitigation |
| --- | --- |
| Earth Engine registration stalls | Download iSDAsoil from AWS instead |
| App–framework integration fails late | Test it by hour 8, not hour 16 |
| Scope creep | Feature freeze at hour 18 |
| Soil map wrong at plot scale | Uncertainty layer plus ribbon test are central, not optional |
| Temperature-only evaporation estimate is rough | Manual checks may reveal discrepancies; whether they correct accumulated error needs testing |
| Pump flow drifts with lift, hose and engine | Prompt a new bucket test when predictions keep missing |
| Photo model doesn't generalise across soils and light | Hackathon data proves the concept only; a pilot needs field photos |
| Self-reported logs aren't independent evidence | Spot checks by dealers or extension officers; pump telemetry where it exists |
| Shared phones, especially for women | Design for shared use; keep voice and USSD fallbacks in view |
| Weak groundwater data | Be conservative where water is scarce |

Open questions for the next revision:

- Which AI input type does our phone framework support: text, image or both?
- Which demo observations are measured, manually reported, mapped or simulated?
- Which numerical parameters are sourced, and which are demo assumptions?
- Which components have already passed a flight-mode test on a real phone?

Opportunity: in sensor studies, better practice spread from farmer to farmer, so a group mode for irrigation groups could use that.

## Sources

- [Small AI, big impact (World Bank Blogs, Sep 2025)](https://blogs.worldbank.org/en/voices/small-ai-big-impact-harnessing-artificial-intelligence-for-development)
- [World Bank commits to turning agriculture into viable business (NAN, 2025)](https://nannews.ng/?p=297299)
- [Farmer-led Irrigation Development brief (World Bank)](https://www.worldbank.org/en/brief/2021/05/19/farmer-led-irrigation-development-flid)
- [World Bank launches Farmer-led Irrigation Development Guide (UN-Water)](https://www.unwater.org/node/1051)
- [Co-designing blended finance for farmer-led irrigation in Kenya (IWMI / World Bank workshop, Nov 2025)](https://knowledge4policy.ec.europa.eu/node/85268_pt)
- [State seeks partnerships to scale up irrigation (Government of Kenya)](https://www.mygov.go.ke/state-seeks-partnerships-scale-irrigation)
- [New irrigation drive boost for smallholder farmers (The Standard)](https://www.standardmedia.co.ke/amp/smart-harvest/article/2001541364/new-irrigation-drive-boost-for-smallholder-farmers)
- [CS Kagwe outlines digital registration for farmers (Business Quest, 30 Sep 2026)](https://www.businessquest.co.ke/cs-mutahi-kagwe-outlines-digital-registration-for-farmers/)
- [KIAMIS farmer registration (Tell.co.ke)](https://tell.co.ke/kiamis-kenya-embarks-on-farmer-registration-to-facilitate-access-to-subsidies/)
- [107,000 community health promoters in Kenya (Amref)](https://newsroom.amref.org/blog/2025/06/built-from-the-ground-up-how-107000-community-health-promoters-are-changing-the-face-of-health-care-in-kenya/)
- [Improving irrigation for smallholder farmers in Mozambique (IDRC)](https://idrc-crdi.ca/en/research-in-action/improving-irrigation-smallholder-farmers-mozambique)
- [A soil water and solute learning system for small-scale irrigators in Africa (Stirzaker et al., 2017)](https://www.tandfonline.com/doi/full/10.1080/07900627.2017.1320981)
- [SunCulture award finalist profile](https://www.startup-energy-transition.com/award-finalist-sunculture-from-kenya-exponentially-improves-the-livelihoods-of-smallholder-farmers/)
- [iSDAsoil: continent-scale soil map at 30 m (PLoS Biology, 2021)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8584968/)
- [iSDAsoil FAQ: layers, uncertainty and accuracy](https://www.isda-africa.com/isdasoil/faq/)
- [Estimating Soil Moisture by Feel and Appearance (USDA NRCS, via MSU)](https://www.canr.msu.edu/resources/estimating-soil-moisture-by-feel-and-appearance-usda-nrcs)
- [USDA feel guide with available water by texture (PDF)](https://www.canr.msu.edu/irrigation/upoads/files/FeelSoil.pdf)
- [FAO Irrigation and Drainage Paper 56: Crop evapotranspiration](https://www.fao.org/4/x0490e/x0490e00.htm)
- [FAO-56: root-zone water balance and irrigation scheduling](https://www.fao.org/4/x0490e/x0490e0e.htm)
- [Water conservation in irrigation can increase water use (Ward & Pulido-Velazquez, 2008)](https://agris.fao.org/search/en/records/65de48840f3e94b9e5ccee1a)
- [KAMIS market information system (KALRO)](https://website.kalro.org/?p=9879)
- [Kajiado targets mobile phone to improve farmer yields (Business Daily)](https://www.businessdailyafrica.com/bd/data-hub/kajiado-targets-mobile-phone-improve-farmer-yields-income-3550744)
- [LandPKS LandInfo module (Land Potential)](https://landpotential.org/knowledge/landinfo-training)
- [Smartphone apps for irrigation scheduling (ASABE)](https://elibrary.asabe.org/abstract.asp?aid=46590)
- [Gweens AgriTech (Kenya)](https://agritech.gweenscraft.co.ke/)
- [Amatsi](https://amatsi.vercel.app/)
- [Irrigation Calculator Pro (App Store listing)](https://apps.apple.com/id/app/irrigation-calculator-pro/id6751106220)
- [FAO: CROPWAT capabilities](https://www.fao.org/sustainable-development-goals-helpdesk/champion/article-detail/cropwat/en)
- [VIA: offline Android data-collection guide](https://via.farm/app_guide/)
- [K-State: Crop Water Allocator](https://milab.ksu.edu/crop-water-allocator)
- [SPHERAG](https://spherag.com/)
- [IWMI: Solar Irrigation Pump Sizing Tool](https://www.iwmi.org/data/solar-irrigation-pump-sizing-tool/)
- [Predicting soil texture from smartphone images (Geoderma, 2020)](https://doi.org/10.1016/j.geoderma.2020.114562)
- [Machine learning techniques for estimating soil moisture from smartphone images (2023)](https://arxiv.org/abs/2303.11527)

Saxton & Rawls (2006) is cited from memory; pull the equations from the paper before coding.
