import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeDurations, summarizeFrames, summarizeLongTasks, summarizeInteractions, summarizeWindow, validateCoverage } from './performance-metrics.mjs';

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);

test('frame percentiles and missed-refresh estimates reflect variable cadence', () => {
  const result = summarizeFrames([0, 10, 30, 60, 100], { targetHz: 100 });
  assert.equal(result.intervalCount, 4);
  assert.equal(result.activeDurationMs, 100);
  assert.equal(result.meanFps, 40);
  assert.equal(result.p50Ms, 25);
  near(result.p95Ms, 38.5);
  near(result.p99Ms, 39.7);
  assert.equal(result.maxMs, 40);
  assert.equal(result.lateFrameCount, 3);
  assert.equal(result.estimatedMissedRefreshes, 6);
  assert.equal(result.estimatedMissedRefreshRatio, 0.6);
});

test('the same cadence is assessed against configured 60 or 120 Hz', () => {
  const timestamps = Array.from({ length: 61 }, (_, index) => index * 1000 / 60);
  const sixty = summarizeFrames(timestamps, { targetHz: 60 });
  const oneTwenty = summarizeFrames(timestamps, { targetHz: 120 });
  assert.equal(sixty.estimatedMissedRefreshes, 0);
  assert.equal(sixty.lateFrameCount, 0);
  assert.equal(oneTwenty.estimatedMissedRefreshes, 60);
  assert.equal(oneTwenty.estimatedMissedRefreshRatio, 0.5);
});

test('pauses omit boundary-crossing intervals instead of inflating jank or inventing frames', () => {
  const result = summarizeFrames([0, 10, 20, 100, 110, 120], {
    targetHz: 100,
    pausedRanges: [{ startMs: 15, endMs: 105 }, { startMs: 18, endMs: 108 }],
  });
  assert.equal(result.intervalCount, 2);
  assert.equal(result.omittedIntervals, 3);
  assert.equal(result.activeDurationMs, 20);
  assert.equal(result.p99Ms, 10);
  assert.equal(result.estimatedMissedRefreshes, 0);
});

test('cold and warm windows exclude partially overlapping frame intervals', () => {
  const capture = { timestampsMs: [0, 100, 116, 132, 148], longTasks: [], events: [] };
  const cold = summarizeWindow(capture, { startMs: 0, endMs: 110 });
  const warm = summarizeWindow(capture, { startMs: 110, endMs: 148 });
  assert.equal(cold.frames.intervalCount, 1);
  assert.equal(cold.frames.maxMs, 100);
  assert.equal(warm.frames.intervalCount, 2);
  assert.equal(warm.frames.maxMs, 16);
});

test('empty cadence produces missing statistics rather than zero latency or infinite fps', () => {
  const result = summarizeFrames([]);
  assert.equal(result.intervalCount, 0);
  assert.equal(result.p95Ms, null);
  assert.equal(result.meanFps, null);
  assert.equal(result.estimatedMissedRefreshRatio, null);
});

test('invalid timestamps, refresh targets, windows and pauses reject invalid captures', () => {
  for (const timestamps of [[0, 0], [10, 0], [0, NaN]]) assert.throws(() => summarizeFrames(timestamps));
  assert.throws(() => summarizeFrames([0, 10], { targetHz: 0 }));
  assert.throws(() => summarizeFrames([0, 10], { startMs: 10, endMs: 0 }));
  assert.throws(() => summarizeFrames([0, 10], { pausedRanges: [{ startMs: 5, endMs: 4 }] }));
});

test('long tasks attribute only their active overlap and blocking portion', () => {
  const result = summarizeLongTasks([{ startTime: 0, duration: 100 }, { startTime: 200, duration: 60 }], {
    startMs: 40, endMs: 150, pausedRanges: [{ startMs: 60, endMs: 80 }, { startMs: 65, endMs: 85 }],
  });
  assert.equal(result.count, 1);
  assert.equal(result.totalActiveDurationMs, 35);
  assert.equal(result.blockingActiveDurationMs, 25);
  assert.equal(result.maxMs, 100);
});

test('fully paused tasks do not contaminate the active window', () => {
  const result = summarizeLongTasks([{ startTime: 0, duration: 100 }], { pausedRanges: [{ startMs: 0, endMs: 100 }] });
  assert.equal(result.count, 0);
  assert.equal(result.totalActiveDurationMs, 0);
  assert.equal(result.maxMs, null);
});

test('Event Timing groups related event entries by interaction without claiming field INP', () => {
  const result = summarizeInteractions([
    { startTime: 0, duration: 16, interactionId: 1 },
    { startTime: 20, duration: 48, interactionId: 1 },
    { startTime: 100, duration: 24, interactionId: 2 },
    { startTime: 200, duration: 64, interactionId: 0 },
  ]);
  assert.equal(result.eventCount, 4);
  assert.equal(result.interactionCount, 2);
  assert.equal(result.unattributedEventCount, 1);
  assert.equal(result.p50Ms, 36);
  assert.equal(result.maxMs, 48);
  assert.equal(summarizeInteractions([]).p95Ms, null);
});

const requiredTransitions = ['pyramid->cube', 'cube->octahedron', 'octahedron->dodecahedron', 'dodecahedron->icosahedron', 'icosahedron->triacontahedron', 'triacontahedron->pyramid'];
function completeCapture() {
  return {
    frames: requiredTransitions.flatMap((key, index) => {
      const [from, to] = key.split('->');
      return [
        { at: index * 1000, from, to, phase: 'morph', progress: 0.5, backend: 'webgpu' },
        { at: index * 1000 + 500, from, to, phase: 'morph', progress: 1, transitionComplete: true, backend: 'webgpu' },
      ];
    }),
    backend: { actual: 'webgpu', software: false, adapter: { vendor: 'apple', architecture: 'metal-3' } },
    frameSummary: { intervalCount: 3000, activeDurationMs: 50_000 },
    errors: [], overflowed: false,
  };
}

test('complete transition evidence and actual hardware metadata qualify the capture', () => {
  const result = validateCoverage(completeCapture(), { requiredTransitions, requireHardware: true });
  assert.equal(result.ok, true);
  assert.equal(result.hardwareQualified, true);
  assert.equal(result.observedTransitions.length, 6);
});

test('elapsed wall time alone does not prove complete simulation coverage', () => {
  const capture = completeCapture();
  capture.frames = capture.frames.slice(0, -2);
  const result = validateCoverage(capture, { requiredTransitions });
  assert.equal(result.ok, false);
  assert.deepEqual(result.missingTransitions, ['triacontahedron->pyramid']);
});

test('endpoint-only markers cannot claim the full morph was measured', () => {
  const capture = completeCapture();
  capture.frames = capture.frames.filter(frame => frame.transitionComplete);
  const result = validateCoverage(capture, { requiredTransitions });
  assert.equal(result.ok, false);
  assert.equal(result.missingInteriorTransitions.length, 6);
});

test('software rendering and navigator exposure do not qualify a hardware result', () => {
  const capture = completeCapture();
  capture.backend = { actual: 'webgpu', software: false, adapter: { vendor: 'Google', description: 'SwiftShader' } };
  const result = validateCoverage(capture, { requiredTransitions, requireHardware: true });
  assert.equal(result.hardwareQualified, false);
  assert.equal(result.ok, false);
  capture.backend = { actual: 'webgpu', software: false, navigatorGpu: true };
  assert.equal(validateCoverage(capture, { requiredTransitions, requireHardware: true }).hardwareQualified, false);
});

test('software fallback may be a valid diagnostic but never a hardware certification', () => {
  const capture = completeCapture();
  capture.frames.forEach(frame => { frame.backend = 'webgl2'; });
  capture.backend = { actual: 'webgl2', software: true, renderer: 'SwiftShader' };
  const result = validateCoverage(capture, { requiredTransitions });
  assert.equal(result.ok, true);
  assert.equal(result.hardwareQualified, false);
});

test('insufficient samples, overflow, errors and conflicting backend invalidate a run', () => {
  const capture = completeCapture();
  capture.frameSummary.intervalCount = 1;
  capture.overflowed = true;
  capture.errors = ['render failure'];
  capture.frames[0].backend = 'webgl2';
  const result = validateCoverage(capture, { requiredTransitions });
  assert.equal(result.ok, false);
  assert.equal(result.reasons.length, 4);
});


test('duration statistics describe CPU spans without interpreting them as frame cadence', () => {
  const result = summarizeDurations([0, 1, 2, 3]);
  assert.equal(result.count, 4);
  assert.equal(result.totalMs, 6);
  assert.equal(result.meanMs, 1.5);
  assert.equal(result.p50Ms, 1.5);
  near(result.p95Ms, 2.85);
  near(result.p99Ms, 2.97);
  assert.equal(result.maxMs, 3);
});

test('empty duration statistics remain explicitly missing', () => {
  const result = summarizeDurations([]);
  assert.equal(result.count, 0);
  assert.equal(result.totalMs, 0);
  assert.equal(result.meanMs, null);
  assert.equal(result.p99Ms, null);
});

test('negative or non-finite durations reject corrupt CPU measurements', () => {
  for (const values of [[-1], [NaN], [Infinity], ['1'], null]) assert.throws(() => summarizeDurations(values));
  assert.equal(summarizeDurations([0]).meanMs, 0);
});
