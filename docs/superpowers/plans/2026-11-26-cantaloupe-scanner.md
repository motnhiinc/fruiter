# Cantaloupe Scanner Implementation Plan

The [approved design](../specs/2026-11-26-cantaloupe-scanner-design.md) calls for a mobile-first Chrome app that keeps one cantaloupe verdict on screen and uses Firebase AI Logic for on-device inference and cloud fallback. Build a static TypeScript and Vite app with the Firebase Web SDK and Node's test runner.

## Rating and camera state

- [x] In `src/scan.ts`, implement `rate(observation)` and `ScanTracker.update(frame, now)`. Map one usable melon with a visible defect to Skip, an intact rind with a positive cue to Buy, and inconclusive evidence to Unsure. Advance the scan ID after sustained movement. Allow at most one automatic capture per stable view.
- [x] In `tests/scan.test.ts`, exercise defect precedence, invalid model values, stable views, brief movement, and a change of view while a result is pending. Use synthetic sample vectors so the tests need no webcam.

## Firebase inference

- [x] In `src/firebase.ts`, read web configuration and the App Check site key from Vite environment variables. Initialize App Check for cloud requests, configure `PREFER_ON_DEVICE`, and call `generateContent` with one JPEG and a prompt requiring visible cues. Validate the response and propagate the SDK's `inferenceSource`.
- [x] Keep demo credentials out of the repository.

## Scanner and verification

- [x] Build the live preview and accessible controls in `index.html`, `src/main.ts`, and `src/style.css`. Capture from the framing guide, prefer the rear camera, and clear obsolete results when the view changes. Stop tracks on Stop or page exit. Let the user retry a failed request or rescan if the scene detector misses a switch.
- [x] Verify rating and scene tracking with `npm test` and build with `npm run build`. Use a simulated video stream to verify camera denial, stable capture, scene changes, and Stop followed by Start.
- [x] Document HTTPS hosting, Firebase setup, and real-device proof in `README.md`.
- [ ] With a configured Firebase project, verify `ON_DEVICE` on compatible desktop Chrome and `IN_CLOUD` on the 3a. Test scene tracking and rating repeatability with real fruit.
