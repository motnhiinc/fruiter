import assert from 'node:assert/strict';
import test from 'node:test';
import { rate, ScanTracker } from '../src/scan.ts';

test('a defect overrides positive appearance cues', () => {
  assert.equal(rate({ subject: 'one', view: 'clear', defect: 'crack', cue: 'even_rind' }).kind, 'skip');
});

test('only a clear single melon with positive evidence gets Buy', () => {
  const observation = { subject: 'one', view: 'clear', defect: 'none', cue: 'even_rind' } as const;
  assert.equal(rate(observation).kind, 'buy');
  assert.equal(rate({ ...observation, cue: 'unclear' }).kind, 'unsure');
  assert.equal(rate({ ...observation, view: 'partial' }).kind, 'unsure');
  assert.equal(rate({ ...observation, subject: 'multiple' }).kind, 'aim');
  assert.throws(() => rate({ ...observation, defect: 'invented' }));
});

test('one capture per stable view, ignoring brief motion', () => {
  const tracker = new ScanTracker();
  const first = new Uint8Array([10, 20, 30, 40]);
  const second = new Uint8Array([110, 120, 130, 140]);
  assert.equal(tracker.update(first, 0).capture, false);
  assert.deepEqual(tracker.update(first, 700), { capture: true, changed: false, revision: 0 });
  assert.equal(tracker.update(second, 800).changed, false);
  assert.deepEqual(tracker.update(first, 900), { capture: false, changed: false, revision: 0 });
  tracker.update(second, 1000);
  assert.deepEqual(tracker.update(second, 1300), { capture: false, changed: true, revision: 1 });
  assert.deepEqual(tracker.update(second, 2000), { capture: true, changed: false, revision: 1 });
});

test('moving while a request is pending invalidates the old revision', () => {
  const tracker = new ScanTracker();
  const first = new Uint8Array([10, 20, 30]);
  const next = new Uint8Array([100, 150, 200]);
  tracker.update(first, 0);
  const sent = tracker.update(first, 700);
  assert.equal(sent.capture, true);
  tracker.update(next, 850, false);
  const changed = tracker.update(next, 1200, false);
  assert.equal(changed.changed, true);
  assert.notEqual(changed.revision, sent.revision);
  assert.equal(tracker.update(next, 2000, false).capture, false);
  assert.equal(tracker.update(next, 2200).capture, true);
});
