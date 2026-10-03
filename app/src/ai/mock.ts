import type { SoilPhotoClassifier } from './types';

/**
 * Stand-in until the real classifier is wired. It does not look at the photo: it maps the
 * ribbon taps to a band so the flow can be demoed. Every result says mocked: true and the UI
 * labels it. Never present its output as a model result.
 */
export const mockSoilClassifier: SoilPhotoClassifier = {
  id: 'mock-soil-photo-v0',
  async classify(req) {
    const band = req.taps.forms_ball === false ? 'dry' : req.taps.ribbon === 'long' ? 'wet' : 'ok';
    return { moisture_band: band, texture_group: null, confidence: 0, model_id: 'mock-soil-photo-v0', mocked: true };
  },
};
