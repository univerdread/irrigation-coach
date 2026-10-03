# Flight-mode acceptance (on a real phone)

Build addendum: "Acceptance on a named phone in flight mode: the app opens, computes, runs the AI function, and saves and reopens a log." The automated half (core path with network stubbed out) runs in `npm test`. This is the manual half. Fill it in; don't round up.

## Setup

1. `npm run build && npm run preview -w app`, then open `http://<laptop-ip>:4641` on the phone over the same Wi-Fi (or deploy the `app/dist` folder anywhere static).
2. Load once online. Wait for "offline ready" (service worker installed). Optionally "Add to home screen".
3. Turn on flight mode. Close the browser fully.

## Checklist

| Step | Pass? | Notes |
|---|---|---|
| App opens from the home screen / browser in flight mode | | |
| Today's plan computes (worked example: 4 h 10 min) | | |
| Switch scenario and language; numbers update | | |
| AI function runs on device (text or image; say which) | | |
| Tap Done; "Simulate next day"; answer the rain question | | |
| Close app, reopen in flight mode: the log is still there and "recomputed: matches" | | |

## Record

| Field | Value |
|---|---|
| Date / tester | |
| Phone model | |
| Android version / browser | |
| App commit | |
| AI function shipped (text or image) | |
| Model id | |
| Model file size (bytes) | |
| Inference time, median of 10 (ms) | |
| Anything that needed the network | |
