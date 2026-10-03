# Soil-photo dataset protocol (Model 1)

Goal: enough labelled photos to train and **honestly evaluate** a three-class moisture classifier (dry / ok / wet) on one soil. The labels come from **weighed water**, not from looking at the photo. Scraped images are useless here: they carry no measured water content.

## Kit

Soil (one bag, ~3 kg), kitchen scale (1 g resolution), measuring jug or syringe, 2 mm sieve or a kitchen colander, zip bags, marker, phone, a plain neutral background card (and a grey card if available), a ruler for scale.

## Prepare

1. **Air-dry** the soil (spread thin for a day, or in a low oven at ≤ 40 °C so organic matter isn't burnt). Crush clods, sieve.
2. Split into **preparations** of 200 g air-dry soil. Each preparation gets an ID (`P01`, `P02`, …) and one target water content.
3. Add water **by weight** and mix thoroughly; seal the bag; rest ≥ 30 min so the water spreads evenly. Re-weigh to record the actual mass.

| Class | Target water (% of dry soil weight) | Water per 200 g |
|---|---|---|
| dry | 5% | 10 g |
| ok | 15% | 30 g |
| wet | 25% | 50 g |

These steps (from the idea doc) suit a loamy soil. For a sand, field capacity is lower (wet ≈ 12–15%); for a clay, higher. If the team's soil is clearly sand or clay, adjust and write the new targets here.

Make **at least 3 preparations per class** (9+ bags), so the test set can hold out whole preparations.

## Photograph

For each preparation: take a handful, **squeeze it into a ball**, open the hand, photograph; then try a **ribbon**, photograph. Repeat with fresh handfuls.

- **Lighting conditions** (record which): shade outdoors, direct sun, indoor light, phone flash.
- Phone ~25 cm above the hand, soil filling ~1/3 of the frame, background card behind.
- **50+ photos per class** in total, spread across preparations and lighting.
- No faces in frame. Photos stay off git (`photos/` is ignored); share via a team drive.

## Label (metadata.csv)

```
file,preparation_id,class,target_w_pct,dry_mass_g,water_added_g,light,shape,phone,taken_at,photographer
P01_001.jpg,P01,dry,5,200,10,shade,ball,Pixel 7,2026-10-03T22:10,AB
```

`shape` = ball / ribbon. Also record the three ribbon taps (forms ball? ribbon length? feel?) for each preparation once: they're side inputs for the model.

## Split (non-negotiable)

- **Never split a preparation across train and test.** Photos of the same bag are near-duplicates; mixing them inflates accuracy.
- Hold out **one whole lighting condition** for test as well, to see whether the model survives light changes.
- Report per-class accuracy and the **dry↔wet confusion** (the error that flips a decision).

## What this proves, and what it doesn't

One soil under controlled lighting proves the concept only. A pilot needs field photos across soils, phones and farmers (idea doc, risks table).
