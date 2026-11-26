export const fields = {
  subject: ['one', 'none', 'multiple'],
  view: ['clear', 'partial', 'poor'],
  defect: ['none', 'crack', 'damaged_area', 'unclear'],
  cue: ['even_rind', 'unclear'],
} as const;

export type Verdict = {
  kind: 'buy' | 'skip' | 'unsure' | 'aim';
  reason: string;
};

function isAllowed<T extends string>(options: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && options.some(option => option === value);
}

export function rate(input: unknown): Verdict {
  if (input === null || typeof input !== 'object') throw new Error('Invalid observation');
  const { subject, view, defect, cue } = input as Record<string, unknown>;
  if (!isAllowed(fields.subject, subject) || !isAllowed(fields.view, view) ||
      !isAllowed(fields.defect, defect) || !isAllowed(fields.cue, cue)) {
    throw new Error('Invalid observation');
  }

  if (subject !== 'one') return { kind: 'aim', reason: 'Center one cantaloupe' };
  if (view === 'poor') return { kind: 'unsure', reason: 'Try a brighter, steadier view' };
  if (defect === 'crack') return { kind: 'skip', reason: 'Visible crack' };
  if (defect === 'damaged_area') return { kind: 'skip', reason: 'Visible rind damage' };
  if (view === 'partial') return { kind: 'unsure', reason: 'Turn the melon for a better view' };
  if (defect === 'none' && cue === 'even_rind') {
    return { kind: 'buy', reason: 'Rind looks even and intact' };
  }
  return { kind: 'unsure', reason: 'Visible cues are inconclusive' };
}

function frameDifference(first: Uint8Array, second: Uint8Array): number {
  let total = 0;
  for (let index = 0; index < first.length; index++) {
    total += Math.abs(first[index] - second[index]);
  }
  return total / first.length;
}

export class ScanTracker {
  revision = 0;
  private reference?: Uint8Array;
  private steadyFrame?: Uint8Array;
  private steadySince = 0;
  private moveSince?: number;

  update(frame: Uint8Array, now: number, canCapture = true) {
    let changed = false;
    if (this.reference) {
      if (frameDifference(this.reference, frame) < 19) {
        this.moveSince = undefined;
      } else {
        this.moveSince ??= now;
        if (now - this.moveSince >= 300) {
          this.revision++;
          changed = true;
          this.retry();
        }
      }
    }

    let capture = false;
    if (!this.reference) {
      if (!this.steadyFrame || frameDifference(this.steadyFrame, frame) > 8) {
        this.steadyFrame = frame;
        this.steadySince = now;
      }
      if (canCapture && now - this.steadySince >= 650) {
        this.reference = frame;
        capture = true;
      }
    }
    return { capture, changed, revision: this.revision };
  }

  retry() {
    this.reference = undefined;
    this.steadyFrame = undefined;
    this.moveSince = undefined;
  }
}
