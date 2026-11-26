# Firebase setup for Cantaloupe Scanner

The scanner uses Firebase AI Logic for cloud ratings and Firebase Hosting to serve an HTTPS URL for phone testing. Complete the setup below in the same Firebase and Google Cloud project.

1. **Open or create the project.** In the Firebase Console, select the project to use or create one for **Cantaloupe Scanner**. Google Analytics is optional. [Firebase Console](https://console.firebase.google.com/)
2. **Set up Firebase Hosting.** Choose **Hosting** for the static web app. Copy the site's hostname, usually `PROJECT_ID.web.app`. The developer will deploy the app after the project is configured. [Firebase Hosting guide](https://firebase.google.com/docs/hosting/quickstart)
3. **Register a Web app.** In **Project overview**, click the **Web `</>`** icon and register **Cantaloupe Scanner**. Copy `projectId`, `appId`, and `apiKey` from the `firebaseConfig` shown on screen. You can find them again under **Project settings → General → Your apps**. [Firebase Web setup](https://firebase.google.com/docs/web/setup)
4. **Enable Firebase AI Logic.** Go to **AI Services → AI Logic → Get started**, choose **Gemini Developer API**, and finish the setup. [Firebase AI Logic setup](https://firebase.google.com/docs/ai-logic/get-started?platform=web)
5. **Set up App Check.** In Google Cloud Console, select the same project and open **Fraud Defense**. Create a **score-based reCAPTCHA Enterprise Web key** and add the Hosting hostname from step 2 as an allowed domain. Back in **Firebase → Security → App Check → Apps**, select the registered Web app and register it with **reCAPTCHA Enterprise** using that site key. In the **APIs** tab, confirm **Firebase AI Logic** shows **Enforced**. [App Check setup](https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider)
6. **Grant deployment access.** In **Google Cloud Console → IAM & Admin → IAM**, add the deploying developer's Google account with **Firebase Hosting Admin** and **API Keys Viewer**. The developer can then run `firebase login` with that account. [Firebase deployment roles](https://firebase.google.com/docs/projects/iam/roles-predefined-product#firebase-hosting-roles)

## Send these values to the developer

```text
Firebase projectId:
Firebase appId:
Firebase Web apiKey:
reCAPTCHA Enterprise site key:
Firebase Hosting hostname:
```

Use the `apiKey` from the registered **Firebase Web app config**. Keep Gemini API keys, service account keys, and App Check debug tokens private.
