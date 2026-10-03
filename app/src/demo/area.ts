// Demo area climatology until data/build_area_pack.py produces a real pack.
// Kimana, Loitokitok sub-county, Kajiado (-2.80, 37.53). NASA POWER monthly climatology
// (native-resolution grid, so it mixes elevations): provenance = mapped.
export const DEMO_AREA = {
  name: 'Kimana, Loitokitok (Kajiado South), demo',
  lat: -2.8,
  lon: 37.53,
  source: 'NASA POWER climatology API, community=AG, fetched 2026-10-03',
  tmax_c: [30.09, 30.88, 29.44, 29.29, 26.64, 26.07, 25.57, 27.01, 28.53, 29.48, 29.21, 28.56],
  tmin_c: [7.32, 9.26, 10.6, 10.71, 9.59, 7.84, 6.85, 7.59, 6.95, 8.65, 10.53, 10.31],
  rain_mm_per_day: [2.41, 2.39, 3.24, 5.03, 3.5, 0.93, 0.56, 0.62, 0.72, 2.52, 4.72, 4.23],
};
