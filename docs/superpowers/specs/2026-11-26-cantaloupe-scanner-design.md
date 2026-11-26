# Cantaloupe scanner MVP

## Goal

Help a shopper who is unsure how to pick a cantaloupe make a decision in the supermarket. The shopper uses only the camera and sees one recommendation for the melon in view. The first prototype tests how quickly and consistently the scanner gives a useful recommendation. It evaluates visible rind condition and cues consistent with ripeness. Sweetness, internal quality, and food safety are outside the rating.

## Approach

The selected approach is a mobile-first Chrome web app using Firebase AI Logic. It can scan at the supermarket on the Nothing Phone (3a) with cloud inference and demonstrate local image inference on compatible desktop Chrome. Keeping one web app lets the same scanner exercise both paths.

Native Android would let a supported handset run the scan locally. The Nothing Phone (3a) is absent from Google's compatibility list, so this approach would depend on access to another handset to verify Gemini Nano 4. A custom model trained on supermarket photos and taste measurements could later test sweetness prediction. The first version focuses on the shopping flow and uses an existing vision model to identify visible cues.

## Scan flow

1. **Start** requests video permission and opens a live preview. Prefer the rear camera on a phone and use the available webcam on desktop. Show **Center one cantaloupe** in the framing guide.
2. After the view steadies, automatically crop to the guide and send one JPEG frame for analysis. Show **Checking…** and keep the preview visible.
3. Display one stable verdict with a short reason. Examples are **Buy · Rind looks even and intact**, **Skip · Visible crack**, and **Unsure · Turn the melon**. A clear view with inconclusive cues also returns **Unsure**. If the image shows no cantaloupe or several plausible targets, prompt the shopper to center one.
4. When a sustained change in the center of the preview indicates that the shopper has moved on or turned the melon, clear the old result, wait for the view to settle, and scan again. Ignore responses for a view the shopper has left. A **Stop** control closes the camera and clears the current scan.

Track frame changes at low resolution in the crop. Use a short stability window and allow one model request at a time. Tune thresholds with a real camera so minor hand movement preserves the verdict while moving to the next melon clears it. Show a retry for inference errors and a clear message for camera denial or an unavailable internet connection on cloud-only devices.

## Rating and inference

Use Firebase AI Logic Web with `PREFER_ON_DEVICE`, a Gemini Flash-family cloud fallback, and Firebase App Check. Both routes receive the same prompt and JPEG. Request a constrained response describing whether exactly one cantaloupe is visible, whether the image is usable, and which supported rind cue is visible. Validate those values before applying the same scoring rules on both routes.

Use the Gemini Developer API backend. A real cloud test requires a Firebase project with a registered web app, AI Logic enabled, and App Check configured for the HTTPS test origin. Keep project configuration injectable so local development can proceed before the project and origin are available. Use App Check debug tokens only for controlled development or judging, and keep those tokens out of source control.

Give visible defects such as a clear crack precedence for **Skip**. Give **Buy** when the frame has sufficient coverage, the rind looks intact, and the model reports a positive visual cue such as an even, mature-looking rind. Use **Unsure** for ambiguous cues or limited visibility. Keep the reason tied to the reported cue. Use fixed UI strings and never render a model's free-form text as a shopping recommendation.

Show **On device** or **Cloud** beside a successful verdict using the SDK's actual `inferenceSource`. Tell the user before scanning that a selected image can be sent to the cloud when local inference is unavailable. Keep camera frames and results in memory for the current scan. The app has no history, accounts, photo library, or database.

## Verification and contest demo

- First prove a single image request returns `ON_DEVICE` via Firebase AI Logic on compatible desktop Chrome and verify that the installed local model is Gemini Nano 4. Following initial model setup, repeat the scan on the loaded page with networking off. The desktop local path remains unverified on the available Mac. If the Mac cannot run it, use another compatible desktop for this demo.
- Open the same app over HTTPS on the Nothing Phone (3a). Verify rear-camera access and confirm real `IN_CLOUD` fallback. Verify that scanning stops cleanly and that moving between melons clears the old verdict even if its response is pending.
- Try whole cantaloupes in good and poor light, with visible damage, partially out of frame, and beside another melon. Record time to first verdict, unnecessary rescans, and repeatability. Aim for a verdict in a few seconds once the model is ready and report observed latency.
- Prepare an English-language Devpost description and judge-accessible demo. Include setup instructions and an open-source license in the public source repository. The proposed license is Apache 2.0. Record a public YouTube demo of up to three minutes that shows the two real inference paths. The deadline is November 30 at 2 p.m. PST, December 1 at 5 a.m. Vietnam time.

## References

- [Contest rules and submission requirements](https://firebasehybridaihackathon.devpost.com/rules)
- [Firebase AI Logic Web hybrid setup](https://firebase.google.com/docs/ai-logic/hybrid/web/get-started)
- [Firebase Web inference configuration](https://firebase.google.com/docs/ai-logic/hybrid/web/configuration-options)
- [Firebase Web structured output](https://firebase.google.com/docs/ai-logic/hybrid/web/generate-structured-output)
- [Chrome hardware and model requirements](https://developer.chrome.com/docs/ai/prompt-api)
- [Google's Android model compatibility list](https://developers.google.com/ml-kit/genai/)
- [UC Davis cantaloupe quality guide](https://postharvest.ucdavis.edu/produce-facts-sheets/cantaloupe)
