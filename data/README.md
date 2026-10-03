# Data pipeline (Role 1)

Builds the **area data pack**: everything location-specific the phone needs offline. Schema: `contracts/schemas/area-pack.schema.json`.

```bash
uv run data/build_area_pack.py --name "Kimana, Loitokitok" --area-id ke-kajiado-kimana-demo \
    --bbox 37.48 -2.85 37.58 -2.75 --out app/src/demo/packs/ke-kajiado-kimana-demo.json
```

`uv` installs Python deps on the fly (rasterio, numpy, requests). No Earth Engine account is needed: everything reads from public HTTPS endpoints, fetching only the COG tiles the box needs. The committed demo pack (370 × 370 cells at 30 m, 1.1 MB) took about a minute.

| Layer | Source | Notes |
|---|---|---|
| `sand_pct`, `clay_pct` (+ `_sd`) | iSDAsoil 30 m, CC-BY 4.0, bucket `isdasoil` | Stored as % (no back-transform). Thickness-weighted 0–20 / 20–50 cm. |
| `oc_g_per_kg` | iSDAsoil `carbon_organic` | iSDAsoil's own byte encoding kept: value = expm1(x/10) g/kg (read from the STAC item). |
| `slope_pct` | Copernicus DEM GLO-30, bucket `copernicus-dem-30m` | Stored at 0.25% steps. |
| climatology | NASA POWER monthly Tmax, Tmin, rain | One point at the box centre; coarse grid. |

**What the demo window shows:** Kimana averages **clay loam** (sand ≈ 34%, clay ≈ 38%, OC ≈ 8.6 g/kg), so Saxton & Rawls gives ≈ 130 mm/m, with map SDs of ±5–7 pp sand. The worked example's "sandy loam" was illustrative; the map disagrees, which is the point of a prior plus a ribbon test.

**Size:** 30 m is fine for a demo window. A whole sub-county at 30 m is ~40 MB raw; use `--cell-deg 0.0008` (~90 m) or ship windows around irrigated areas.

**Earth Engine (alternative):** assets `ISDASOIL/Africa/v1/sand_content`, `clay_content`, `carbon_organic` (bands `mean_0_20`, `mean_20_50`, `stdev_0_20`, `stdev_20_50`). Same encodings.

**Attribution:** the pack's `licenses` field carries the required credits; keep them in the app's about screen and the pitch.

## Next (Role 1)

- [ ] Agree the demo area with the team (D19 in `docs/DECISIONS.md`).
- [ ] Suitability scores (Model 2, cut first if behind): dry-season Sentinel-2 greenness as *candidate* positives only; needs field checks.
- [ ] KAMIS prices for the season report: check for an official download before any scraping.
