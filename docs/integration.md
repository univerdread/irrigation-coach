# Integrating the on-device model

For the teammate who owns the small offline models. Everything else (engine, app, data, contracts) is built so your model plugs in at one place, and the app works with nothing plugged in.

## The rule (build addendum)

Ship **one** AI function that the phone stack is *shown* to support, either **text** (explain the plan and phrase questions) or **image** (soil-photo classifier). Don't claim both without tests. Decide this by **hour 8**: if the app can't call the model by then, switch to the fallback (template text / tap-based feel chart).

## Where it plugs in

`app/src/ai/registry.ts`:

```ts
registerTextModel(model: TextModel)               // text path
registerSoilClassifier(classifier: SoilPhotoClassifier)  // image path
```

Call it once at startup, before render (`app/src/main.tsx`). The interfaces are in `app/src/ai/types.ts` and mirror the language-neutral JSON contracts in `contracts/schemas/ai/`:

| Function | Request | Response | Contract |
|---|---|---|---|
| Explain | engine plan JSON + locale + `allowed_numbers` | `{ text, model_id, inference_ms }` | `contracts/schemas/ai/explain.schema.json` |
| Phrase question | `{ question: { key, params }, locale }` | `{ text, model_id }` | `contracts/schemas/ai/question.schema.json` |
| Soil photo | image (local URI or base64) + ribbon taps + optional soil prior | `{ moisture_band: dry/ok/wet, texture_group?, confidence, model_id, model_file_bytes, inference_ms, mocked }` | `contracts/schemas/ai/soil-photo.schema.json` |

## What the app does with your output (already built and tested)

- **Text:** every digit in your text must be one of `allowed_numbers` (the plan's numbers as displayed), and spelled-out numbers ("four", "nne") are rejected. Any mismatch, error or timeout falls back to the template. See `app/src/ai/guard.ts` and `app/test/app-core.test.ts`. Prompt your model to copy digits from the JSON and never compute.
- **Questions:** the deterministic validator decides *which* input is missing (`engine/src/plan.ts`, `missingInputs`). Your model only phrases it.
- **Image:** the band becomes a `moisture_check` on the plot. If it disagrees with the engine's decision ("wet" while due, "dry" while not due), the app shows no minutes and asks for a second check; two disagreements in a row go to the extension officer. Your `confidence` is never shown as a percentage.
- Until something is registered, `mockSoilClassifier` is used and every result is labelled **MOCK** in the UI.

## How to bridge, by stack

| Your runtime | Bridge |
|---|---|
| Runs in a browser (ONNX Runtime Web, transformers.js, WebLLM, MediaPipe Tasks for Web, TF.js) | Import it in `app/`, implement the interface, register it. Model files go in `app/public/models/` so the service worker precaches them (raise `maximumFileSizeToCacheInBytes` in `app/vite.config.ts` if needed). |
| Native Android (llama.cpp, MediaPipe, ExecuTorch, TFLite, ONNX Runtime Mobile) | Wrap the app with Capacitor and expose the model as a small Capacitor plugin; the TS interface calls the plugin. |
| Your app is native Kotlin / Flutter | Either embed this PWA in a WebView, or port `engine/` (~600 lines, no dependencies) and prove the port with `contracts/fixtures/golden/*.json`. |

No path may call the network at inference time. The offline tests fail if the core path touches `fetch`, XHR, WebSocket or EventSource.

## Evaluation (soil photo)

- Photos of one soil preparation never appear in both train and test. Split by `preparation_id` (see `content/photo-dataset-protocol.md`).
- Hold out at least one lighting condition entirely.
- Report accuracy per class on the held-out set, and the confusion between dry and wet (the decision-relevant error).
- The USDA "within about 5%" figure is for trained people, not for our model. Don't quote it as model accuracy.

## Record honestly (docs/ACCEPTANCE.md)

Phone model, Android version, model file size, observed inference time (median of 10 runs), flight-mode result. No fabricated benchmarks.
