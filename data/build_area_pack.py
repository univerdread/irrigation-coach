# /// script
# requires-python = ">=3.11,<3.14"
# dependencies = ["rasterio>=1.4", "numpy>=1.26", "requests>=2.31"]
# ///
"""Build an area data pack (contracts/schemas/area-pack.schema.json) for one bounding box.

Sources, all open and read directly over HTTPS (no account, no Earth Engine needed):
  - iSDAsoil 30 m (CC-BY 4.0): sand, clay, organic carbon + standard deviations, 0-20 and 20-50 cm.
    Public COGs on AWS (bucket `isdasoil`, us-west-2), EPSG:3857, 4 bands each:
    mean_0_20, mean_20_50, stdev_0_20, stdev_20_50. Sand/clay stored as %, organic carbon as
    expm1(x/10) g/kg (back-transform read from the STAC item, verified 2026-10-03).
  - Copernicus DEM GLO-30 (public COGs, bucket `copernicus-dem-30m`) for slope.
  - NASA POWER monthly climatology (Tmax, Tmin, rain) at the box centre.

Usage:
  uv run data/build_area_pack.py --name "Kimana, Loitokitok" --area-id ke-kajiado-kimana \
      --bbox 37.48 -2.85 37.58 -2.75 --out data/out/ke-kajiado-kimana.json

Size note: a whole sub-county at 30 m is millions of cells per layer (Loitokitok is ~6,000 km2,
about 7 M cells, so ~40 MB raw across layers). Use a demo window, or --cell-deg 0.0008 (~90 m).
"""
from __future__ import annotations

import argparse
import base64
import datetime as dt
import json
import math
import sys

import numpy as np
import rasterio
import requests
from rasterio.warp import Resampling, reproject

ISDA = "https://isdasoil.s3.amazonaws.com/soil_data/{layer}/{layer}.tif"
COP_DEM = (
    "https://copernicus-dem-30m.s3.amazonaws.com/"
    "Copernicus_DSM_COG_10_{ns}{lat:02d}_00_{ew}{lon:03d}_00_DEM/"
    "Copernicus_DSM_COG_10_{ns}{lat:02d}_00_{ew}{lon:03d}_00_DEM.tif"
)
POWER = "https://power.larc.nasa.gov/api/temporal/climatology/point"
NODATA = 255


def warp_band(src_url: str, band: int, west: float, north: float, cell: float, w: int, h: int, resampling=Resampling.bilinear) -> np.ndarray:
    """Read one band, reprojected onto our EPSG:4326 grid. Only the needed COG tiles are fetched."""
    dst = np.full((h, w), np.nan, dtype="float32")
    transform = rasterio.transform.from_origin(west, north, cell, cell)
    with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR", AWS_NO_SIGN_REQUEST="YES"):
        with rasterio.open(src_url) as src:
            reproject(
                source=rasterio.band(src, band),
                destination=dst,
                src_nodata=src.nodata,
                dst_transform=transform,
                dst_crs="EPSG:4326",
                dst_nodata=np.nan,
                resampling=resampling,
            )
    return dst


def root_zone(top: np.ndarray, sub: np.ndarray) -> np.ndarray:
    """Thickness-weighted mean of 0-20 cm and 20-50 cm (the upper root zone)."""
    return (20 * top + 30 * sub) / 50


def encode_linear(values: np.ndarray, scale: float, offset: float = 0.0) -> str:
    raw = np.where(np.isnan(values), NODATA, np.clip(np.round((values - offset) / scale), 0, 254)).astype("uint8")
    return base64.b64encode(raw.tobytes()).decode("ascii")


def layer(values: np.ndarray, scale: float, unit: str, source: str, note: str | None = None, transform: dict | None = None) -> dict:
    d = {
        "encoding": "uint8",
        "transform": transform or {"kind": "linear", "scale": scale, "offset": 0},
        "nodata": NODATA,
        "unit": unit,
        "data_b64": encode_linear(values, scale) if transform is None else values,
        "source": source,
    }
    if note:
        d["note"] = note
    return d


def slope_pct(west: float, north: float, cell: float, w: int, h: int) -> np.ndarray:
    lat_c = north - cell * h / 2
    lon_c = west + cell * w / 2
    lat_tile = math.floor(lat_c)
    lon_tile = math.floor(lon_c)
    url = COP_DEM.format(ns="S" if lat_tile < 0 else "N", lat=abs(lat_tile), ew="W" if lon_tile < 0 else "E", lon=abs(lon_tile))
    dem = warp_band(url, 1, west, north, cell, w, h)
    dy = cell * 110_574.0
    dx = cell * 111_320.0 * math.cos(math.radians(lat_c))
    gy, gx = np.gradient(dem, dy, dx)
    return 100 * np.sqrt(gx * gx + gy * gy)


def climatology(lat: float, lon: float) -> dict:
    r = requests.get(
        POWER,
        params={"parameters": "T2M_MAX,T2M_MIN,PRECTOTCORR", "community": "AG", "latitude": lat, "longitude": lon, "format": "JSON"},
        timeout=60,
    )
    r.raise_for_status()
    p = r.json()["properties"]["parameter"]
    months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
    return {
        "source": f"NASA POWER climatology API (community=AG), fetched {dt.date.today().isoformat()}; coarse grid, mixes elevations",
        "lat": lat,
        "lon": lon,
        "tmax_c": [p["T2M_MAX"][m] for m in months],
        "tmin_c": [p["T2M_MIN"][m] for m in months],
        "rain_mm_per_day": [p["PRECTOTCORR"][m] for m in months],
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--name", required=True)
    ap.add_argument("--area-id", required=True)
    ap.add_argument("--bbox", nargs=4, type=float, metavar=("WEST", "SOUTH", "EAST", "NORTH"), required=True)
    ap.add_argument("--cell-deg", type=float, default=0.00027, help="grid cell size in degrees (0.00027 ~ 30 m)")
    ap.add_argument("--no-slope", action="store_true")
    ap.add_argument("--out", required=True)
    a = ap.parse_args()

    west, south, east, north = a.bbox
    w = int(round((east - west) / a.cell_deg))
    h = int(round((north - south) / a.cell_deg))
    print(f"grid {w} x {h} = {w * h:,} cells", file=sys.stderr)

    layers: dict[str, dict] = {}
    for name, isda in (("sand", "sand_content"), ("clay", "clay_content")):
        url = ISDA.format(layer=isda)
        mean = root_zone(*(warp_band(url, b, west, north, a.cell_deg, w, h) for b in (1, 2)))
        sd = root_zone(*(warp_band(url, b, west, north, a.cell_deg, w, h) for b in (3, 4)))
        src = f"iSDAsoil {isda} (CC-BY 4.0), thickness-weighted 0-50 cm"
        layers[f"{name}_pct"] = layer(mean, 1, "%", src)
        layers[f"{name}_sd"] = layer(sd, 1, "% points (1 SD)", src, "SD averaged across depths (assumes full correlation: conservative)")
        print(f"  {name}: mean {np.nanmean(mean):.1f}%, sd {np.nanmean(sd):.1f}", file=sys.stderr)

    # Organic carbon: keep iSDAsoil's own byte encoding (x = 10*ln(1+OC)), averaged in that space.
    url = ISDA.format(layer="carbon_organic")
    oc_raw = root_zone(*(warp_band(url, b, west, north, a.cell_deg, w, h) for b in (1, 2)))
    raw = np.where(np.isnan(oc_raw), NODATA, np.clip(np.round(oc_raw), 0, 254)).astype("uint8")
    layers["oc_g_per_kg"] = layer(
        base64.b64encode(raw.tobytes()).decode("ascii"),
        1,
        "g/kg",
        "iSDAsoil carbon_organic (CC-BY 4.0), 0-50 cm in log space",
        transform={"kind": "expm1_div10"},
    )
    print(f"  oc: mean {np.nanmean(np.expm1(oc_raw / 10)):.1f} g/kg", file=sys.stderr)

    if not a.no_slope:
        s = slope_pct(west, north, a.cell_deg, w, h)
        layers["slope_pct"] = layer(s, 0.25, "%", "Copernicus DEM GLO-30 (ESA, free licence with attribution)")
        print(f"  slope: mean {np.nanmean(s):.1f}%", file=sys.stderr)

    pack = {
        "schema_version": "0.1.0",
        "area_id": a.area_id,
        "name": a.name,
        "built_at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "simulated": False,
        "grid": {"west": west, "north": north, "cell_deg": a.cell_deg, "width": w, "height": h},
        "layers": layers,
        "climatology": climatology((north + south) / 2, (west + east) / 2),
        "licenses": [
            "iSDAsoil: CC-BY 4.0, Hengl et al. 2021, doi:10.1038/s41598-021-85639-y",
            "Copernicus DEM GLO-30: produced using Copernicus WorldDEM-30 (c) DLR e.V. 2010-2014 and (c) Airbus Defence and Space GmbH 2014-2018, provided under COPERNICUS by the European Union and ESA",
            "NASA POWER: NASA Langley Research Center POWER Project",
        ],
    }
    with open(a.out, "w") as f:
        json.dump(pack, f, separators=(",", ":"))
    print(f"wrote {a.out}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
