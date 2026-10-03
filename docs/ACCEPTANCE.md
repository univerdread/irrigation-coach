# Flight-mode acceptance (on a real phone)

Build addendum: "Acceptance on a named phone in flight mode: the app opens, computes, runs the AI function, and saves and reopens a log." The automated half (core path with network stubbed out) runs in `npm test`. This is the manual half. Fill it in; don't round up.

## Setup

1. Serve `app/dist` over **HTTPS** (e.g. GitHub Pages or any static host) and open it on the phone. Service workers only install on HTTPS or `localhost`, so `http://<laptop-ip>:4641` over Wi-Fi will open but will **not** work offline.
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
| Set up a plot from scratch (paces, ribbon, bucket stopwatch) in flight mode | | |
| Start the pump timer, close the app, reopen: the timer is still running | | |
| "Send by SMS" opens the phone's SMS app with the plan (flight mode off, no data needed) | | |

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

## Low-end device check

Test on the cheapest Android phone the team can find (Android Go, 1–2 GB RAM, 320–360 px wide). Record: model, Android version, time from tap to plan (cold start), and anything cut off or hard to tap.

## Basic phone (if a sandbox short code is set up)

Dial the code on a feature phone: menu appears, option 1 gives the same minutes as the app for the same plot; SMS "MVUA 0" replies with today's plan in one SMS.
