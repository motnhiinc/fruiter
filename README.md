# Cantaloupe Scanner

A camera-only shopping aid for whole cantaloupes. Tap **Start**, center one melon, and hold steady for a **Buy**, **Skip**, or **Unsure** recommendation based on the visible rind. Point at another melon to scan again. If the app misses the switch between similar-looking melons, tap **Scan again**.

Use the [Firebase setup guide](docs/firebase-setup.md) to configure the project, App Check, and Hosting before deployment.

## Run locally

Use Node.js 22.18 or newer.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

The local page can open the camera before Firebase is configured. To get ratings, register a Web app in Firebase and enable AI Logic with the Gemini Developer API. Copy `apiKey`, `appId`, and `projectId` from the registered Web app into `.env.local`. Use the Firebase Web app API key from the configuration. Keep Gemini API keys and App Check debug tokens out of source control.

Set `VITE_FIREBASE_APP_CHECK_SITE_KEY` to the public reCAPTCHA Enterprise site key registered for the web app. Allow your deployed hostname on the key and confirm that App Check is enforced for AI Logic. For localhost, set `VITE_FIREBASE_APP_CHECK_DEBUG=true`, restart Vite, and register the browser-generated token in Firebase App Check. The flag applies only to the development build. [Firebase AI Logic setup](https://firebase.google.com/docs/ai-logic/get-started?platform=web) · [App Check setup](https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider)

## Test both inference paths

1. On compatible desktop Chrome, enable multimodal Prompt API support and download Gemini Nano using the linked Firebase guide. Confirm the browser installed Gemini Nano 4. Open the app, scan a melon, and confirm **On device** appears. With the app loaded and model ready, repeat with the network disabled. [Firebase hybrid Web guide](https://firebase.google.com/docs/ai-logic/hybrid/web/get-started)
2. Build with your Firebase settings and serve `dist/` over HTTPS. With Firebase Hosting and an authenticated Firebase CLI, run `firebase deploy --only hosting --project <project-id>` from this directory. On the Nothing Phone (3a), open that HTTPS URL in Chrome, allow camera access, scan a whole cantaloupe, and confirm **Cloud** appears. Test that moving between melons clears the previous result and **Stop** closes the camera.

Both paths use Firebase AI Logic at runtime. The app crops one JPEG per stable view and sends it with a structured prompt. The SDK prefers local execution and uses Gemini 3.5 Flash-Lite when local inference is unavailable. The verdict is based on visible rind cues. Scan history and frames are kept out of persistent app storage.

```sh
npm test
npm run build
```

The automated tests cover verdict rules and scan tracking. Contest verification requires a real `On device` and `Cloud` scan. The [contest rules](https://firebasehybridaihackathon.devpost.com/rules) also call for a public open-source repository and a public demo video.
