import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { getAI, getGenerativeModel, GoogleAIBackend, InferenceMode, InferenceSource, Schema } from 'firebase/ai';
import { fields, rate } from './scan.ts';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
};
const appCheckKey = import.meta.env.VITE_FIREBASE_APP_CHECK_SITE_KEY;
export const configured = Object.values(config).every(Boolean) && Boolean(appCheckKey);

const prompt = `Inspect the whole cantaloupe centered in this image for a shopper.
Use only visible evidence. Normal tan netting is part of the rind, not damage.
Set subject to one only if there is one clear central cantaloupe. Use multiple if there is no clear target among several melons, or none if there is no cantaloupe.
Use view clear for a well-lit, sharp view of most of the fruit in this crop, partial for incomplete coverage, and poor for blur or poor lighting.
Use defect crack for an actual split, damaged_area for obvious rind damage, none when the visible rind looks intact, or unclear when uncertain.
Use cue even_rind only when the visible rind looks evenly developed, with a mature-looking background color and normal netting. Otherwise use unclear.
Base the observation on the visible surface only. Do not estimate sweetness or safety.`;

function makeModel() {
  if (!configured) throw new Error('Firebase configuration is missing');
  const app = initializeApp(config);
  if (import.meta.env.DEV && import.meta.env.VITE_FIREBASE_APP_CHECK_DEBUG === 'true') {
    Object.assign(globalThis, { FIREBASE_APPCHECK_DEBUG_TOKEN: true });
  }
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(appCheckKey),
    isTokenAutoRefreshEnabled: true,
  });
  const schema = Schema.object({
    properties: {
      subject: Schema.enumString({ enum: [...fields.subject] }),
      view: Schema.enumString({ enum: [...fields.view] }),
      defect: Schema.enumString({ enum: [...fields.defect] }),
      cue: Schema.enumString({ enum: [...fields.cue] }),
    },
  });
  const localSchema = {
    type: 'object',
    properties: Object.fromEntries(Object.entries(fields).map(([name, options]) => [
      name, { type: 'string', enum: [...options] },
    ])),
    required: Object.keys(fields),
    additionalProperties: false,
  };
  return getGenerativeModel(getAI(app, { backend: new GoogleAIBackend() }), {
    mode: InferenceMode.PREFER_ON_DEVICE,
    inCloudParams: {
      model: import.meta.env.VITE_FIREBASE_CLOUD_MODEL || 'gemini-3.5-flash-lite',
      generationConfig: { responseMimeType: 'application/json', responseSchema: schema },
    },
    onDeviceParams: { promptOptions: { responseConstraint: localSchema } },
  });
}

let model: ReturnType<typeof makeModel> | undefined;
let preparing: Promise<void> | undefined;

export function prepareLocalModel() {
  if (configured && 'LanguageModel' in globalThis) {
    model ??= makeModel();
    preparing ??= model.initializeDeviceModel().catch(() => { preparing = undefined; });
  }
}

export async function analyze(image: string, signal: AbortSignal, timeout: number) {
  model ??= makeModel();
  const { response } = await model.generateContent([
    prompt,
    { inlineData: { mimeType: 'image/jpeg', data: image } },
  ], { signal, timeout });
  const source = response.inferenceSource;
  return {
    verdict: rate(JSON.parse(response.text())),
    source: source === InferenceSource.ON_DEVICE ? 'On device' :
      source === InferenceSource.IN_CLOUD ? 'Cloud' : '',
  };
}
