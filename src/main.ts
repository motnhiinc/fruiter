import './style.css';
import { analyze, configured, prepareLocalModel } from './firebase.ts';
import { ScanTracker, type Verdict } from './scan.ts';

const video = document.querySelector('video')!;
const guide = document.querySelector<HTMLElement>('.guide')!;
const hint = document.querySelector<HTMLElement>('#view-hint')!;
const result = document.querySelector<HTMLElement>('.result')!;
const verdictText = document.querySelector<HTMLElement>('#verdict')!;
const reason = document.querySelector<HTMLElement>('#reason')!;
const sourceLabel = document.querySelector<HTMLElement>('#source')!;
const camera = document.querySelector<HTMLButtonElement>('#camera')!;
const retry = document.querySelector<HTMLButtonElement>('#retry')!;

const sampleCanvas = document.createElement('canvas');
sampleCanvas.width = sampleCanvas.height = 24;
const sampleContext = sampleCanvas.getContext('2d', { willReadFrequently: true })!;
const photoCanvas = document.createElement('canvas');
photoCanvas.width = photoCanvas.height = 640;
const photoContext = photoCanvas.getContext('2d')!;

type Session = {
  tracker: ScanTracker;
  stream?: MediaStream;
  frame?: number;
  request?: AbortController;
  lastSample: number;
};
const scanTimeout = 12_000;
let active: Session | undefined;

function show(kind: Verdict['kind'] | 'checking' | 'error', title: string, detail: string, source = '') {
  result.hidden = false;
  result.dataset.kind = kind;
  verdictText.textContent = title;
  reason.textContent = detail;
  sourceLabel.textContent = source;
  sourceLabel.hidden = source === '';
  retry.hidden = !configured || !active?.stream || kind === 'checking' || kind === 'aim';
  retry.textContent = kind === 'error' ? 'Try again' : 'Scan again';
}

function crop() {
  const preview = video.getBoundingClientRect();
  const target = guide.getBoundingClientRect();
  const scale = Math.max(preview.width / video.videoWidth, preview.height / video.videoHeight);
  const size = Math.min(target.width / scale, video.videoWidth, video.videoHeight);
  return [(video.videoWidth - size) / 2, (video.videoHeight - size) / 2, size, size] as const;
}

const titles = { buy: 'Buy', skip: 'Skip', unsure: 'Unsure', aim: 'Aim again' } as const;

async function checkFrame(session: Session, revision: number, area: ReturnType<typeof crop>) {
  if (!configured) {
    show('error', 'Firebase setup needed', 'Connect a Firebase project to rate the melon.');
    return;
  }
  const request = new AbortController();
  session.request = request;
  const isCurrent = () => active === session && session.tracker.revision === revision && session.request === request;
  const timeout = window.setTimeout(() => {
    if (!isCurrent()) return;
    cancelScan(session);
    show('error', 'That scan took too long', 'Try scanning this melon again.');
  }, scanTimeout);
  request.signal.addEventListener('abort', () => window.clearTimeout(timeout), { once: true });
  show('checking', 'Checking…', 'Looking at the rind');
  try {
    photoContext.drawImage(video, ...area, 0, 0, photoCanvas.width, photoCanvas.height);
    const image = photoCanvas.toDataURL('image/jpeg', 0.84).split(',')[1];
    photoContext.clearRect(0, 0, photoCanvas.width, photoCanvas.height);
    const { verdict, source } = await analyze(image, request.signal, scanTimeout);
    if (isCurrent()) {
      show(verdict.kind, titles[verdict.kind], verdict.reason, source);
    }
  } catch (error) {
    if (isCurrent()) {
      console.error('Scan failed', error);
      const detail = navigator.onLine ? 'Try scanning this melon again.' : 'Connect to the internet to use cloud scanning.';
      show('error', 'Couldn’t check this melon', detail);
    }
  } finally {
    window.clearTimeout(timeout);
    if (session.request === request) session.request = undefined;
  }
}

function cancelScan(session: Session) {
  const request = session.request;
  session.request = undefined;
  request?.abort();
}

function watch(session: Session, now: number) {
  if (active !== session) return;
  session.frame = requestAnimationFrame(next => watch(session, next));
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || now - session.lastSample < 125) return;
  session.lastSample = now;
  const area = crop();
  if (area[2] <= 0) return;
  sampleContext.drawImage(video, ...area, 0, 0, sampleCanvas.width, sampleCanvas.height);
  const pixels = sampleContext.getImageData(0, 0, sampleCanvas.width, sampleCanvas.height).data;
  const rgb = new Uint8Array(sampleCanvas.width * sampleCanvas.height * 3);
  for (let source = 0, target = 0; source < pixels.length; source += 4, target += 3) {
    rgb[target] = pixels[source];
    rgb[target + 1] = pixels[source + 1];
    rgb[target + 2] = pixels[source + 2];
  }
  const { capture, changed, revision } = session.tracker.update(rgb, now, !session.request);
  if (changed) {
    cancelScan(session);
    result.hidden = true;
  }
  if (capture) void checkFrame(session, revision, area);
}

function stop() {
  const session = active;
  active = undefined;
  if (session) cancelScan(session);
  if (session?.frame !== undefined) cancelAnimationFrame(session.frame);
  session?.stream?.getTracks().forEach(track => track.stop());
  video.srcObject = null;
  camera.textContent = 'Start';
  delete camera.dataset.active;
  hint.textContent = 'Camera is off';
  result.hidden = true;
  sampleContext.clearRect(0, 0, sampleCanvas.width, sampleCanvas.height);
}

async function start() {
  const session: Session = { tracker: new ScanTracker(), lastSample: 0 };
  active = session;
  result.hidden = true;
  camera.textContent = 'Stop';
  camera.dataset.active = '';
  hint.textContent = 'Opening camera…';
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera unavailable');
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
      audio: false,
    });
    if (active !== session) {
      stream.getTracks().forEach(track => track.stop());
      return;
    }
    session.stream = stream;
    video.srcObject = stream;
    await video.play();
    if (active !== session) return;
    stream.getVideoTracks().forEach(track => track.addEventListener('ended', () => {
      if (active !== session) return;
      stop();
      show('error', 'Camera disconnected', 'Tap Start to open the camera again.');
    }));
    hint.textContent = 'Center one cantaloupe';
    session.frame = requestAnimationFrame(now => watch(session, now));
  } catch (error) {
    if (active !== session) return;
    stop();
    const denied = error instanceof DOMException && error.name === 'NotAllowedError';
    const detail = denied ? 'Allow camera access in Chrome, then tap Start.' : 'Check that Chrome can access a camera on this page.';
    show('error', 'Camera unavailable', detail);
  }
}

camera.addEventListener('click', () => {
  if (active) {
    stop();
    return;
  }
  try {
    prepareLocalModel();
  } catch (error) {
    console.error('Model setup failed', error);
  }
  void start();
});
retry.addEventListener('click', () => {
  active?.tracker.retry();
  result.hidden = true;
  camera.focus();
});
window.addEventListener('pagehide', stop);
