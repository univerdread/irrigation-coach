// Where live on-device models plug in. The app works with nothing registered.
//
// Integration (model teammate): at startup, before render, call e.g.
//   registerTextModel(myOnDeviceTextModel)      // implements TextModel
//   registerSoilClassifier(myOnDeviceClassifier) // implements SoilPhotoClassifier
// from whatever bridge the phone stack provides (Capacitor plugin, WebAssembly/WebGPU runtime, ...).
// Nothing here may call the network: inference is on the phone or not at all.
import type { SoilPhotoClassifier, TextModel } from './types';
import { mockSoilClassifier } from './mock';

let textModel: TextModel | null = null;
let soilClassifier: SoilPhotoClassifier | null = null;

export function registerTextModel(m: TextModel | null): void {
  textModel = m;
}
export function registerSoilClassifier(c: SoilPhotoClassifier | null): void {
  soilClassifier = c;
}
export function getTextModel(): TextModel | null {
  return textModel;
}
/** The live classifier if registered, else the mock (whose results are labelled mocked). */
export function getSoilClassifier(): SoilPhotoClassifier {
  return soilClassifier ?? mockSoilClassifier;
}
