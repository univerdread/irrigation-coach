// Demo scenarios = the golden fixtures' inputs, so the demo shows exactly what the tests prove.
// All of it is SIMULATED and the UI says so.
import type { FarmInput } from '@irrigation-coach/engine';
import single from '../../../contracts/fixtures/golden/07-worked-example-bucket-test.json';
import afterRain from '../../../contracts/fixtures/golden/02-rain-after-trigger.json';
import missingRain from '../../../contracts/fixtures/golden/03-missing-rain.json';
import threeCap from '../../../contracts/fixtures/golden/05-cap-1500.json';
import contradiction from '../../../contracts/fixtures/golden/08-photo-contradicts-engine.json';

export interface Scenario {
  id: string;
  label: { en: string; sw: string };
  input: FarmInput;
}

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

export const SCENARIOS: Scenario[] = [
  { id: 'single', label: { en: 'Quarter-acre tomatoes (worked example)', sw: 'Nyanya robo ekari' }, input: single.input as FarmInput },
  { id: 'after-rain', label: { en: 'After 20 mm of rain', sw: 'Baada ya mvua ya mm 20' }, input: afterRain.input as FarmInput },
  { id: 'missing-rain', label: { en: 'Rain not reported', sw: 'Mvua haijaripotiwa' }, input: missingRain.input as FarmInput },
  { id: 'three-cap', label: { en: 'Three plots, one pump, 1,500 L cap', sw: 'Sehemu tatu, pampu moja, kikomo lita 1,500' }, input: threeCap.input as FarmInput },
  { id: 'contradiction', label: { en: 'Soil check disagrees', sw: 'Ukaguzi wa udongo haukubaliani' }, input: contradiction.input as FarmInput },
];

export function scenario(id: string): FarmInput {
  return clone((SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0]!).input);
}
