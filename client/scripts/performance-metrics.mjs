// Pure post-capture statistics. rAF cadence estimates refresh opportunities; it
// does not measure GPU execution time or prove that a frame was presented.
const finite = (value, name) => {
  if (!Number.isFinite(value)) throw new TypeError(`${name} must be finite.`);
  return value;
};

function windowOptions({ startMs = -Infinity, endMs = Infinity, pausedRanges = [] } = {}) {
  if (typeof startMs !== 'number' || Number.isNaN(startMs) || typeof endMs !== 'number' || Number.isNaN(endMs) || endMs < startMs) {
    throw new RangeError('The capture window must have ordered numeric bounds.');
  }
  const ranges = pausedRanges.map((range) => {
    const start = finite(range.startMs, 'pause startMs');
    const end = finite(range.endMs, 'pause endMs');
    if (end < start) throw new RangeError('Pause end must not precede its start.');
    return { startMs: start, endMs: end };
  }).filter((range) => range.endMs > range.startMs).sort((a, b) => a.startMs - b.startMs);
  const merged = [];
  for (const range of ranges) {
    const previous = merged.at(-1);
    if (previous && range.startMs <= previous.endMs) previous.endMs = Math.max(previous.endMs, range.endMs);
    else merged.push({ ...range });
  }
  return { startMs, endMs, pausedRanges: merged };
}

function intersectsPause(start, end, ranges) {
  return ranges.some((range) => start < range.endMs && end > range.startMs);
}

function activeDuration(start, end, options) {
  const left = Math.max(start, options.startMs);
  const right = Math.min(end, options.endMs);
  if (right <= left) return 0;
  let duration = right - left;
  for (const range of options.pausedRanges) {
    duration -= Math.max(0, Math.min(right, range.endMs) - Math.max(left, range.startMs));
  }
  return Math.max(0, duration);
}

function distribution(values) {
  if (!values.length) return { p50Ms: null, p95Ms: null, p99Ms: null, maxMs: null };
  const sorted = [...values].sort((a, b) => a - b);
  // Linear interpolation (R7), with empty measurements represented as null.
  const at = (fraction) => {
    const index = (sorted.length - 1) * fraction;
    const lower = Math.floor(index);
    return sorted[lower] + (sorted[Math.ceil(index)] - sorted[lower]) * (index - lower);
  };
  return { p50Ms: at(0.5), p95Ms: at(0.95), p99Ms: at(0.99), maxMs: sorted.at(-1) };
}

export function summarizeDurations(values) {
  if (!Array.isArray(values)) throw new TypeError('Durations must be an array.');
  let totalMs = 0;
  for (const value of values) {
    finite(value, 'duration');
    if (value < 0) throw new RangeError('Duration must not be negative.');
    totalMs += value;
  }
  return { count: values.length, totalMs, meanMs: values.length ? totalMs / values.length : null, ...distribution(values) };
}

export function summarizeFrames(timestampsMs, options = {}) {
  const targetHz = options.targetHz ?? 60;
  if (!Number.isFinite(targetHz) || targetHz <= 0) throw new RangeError('targetHz must be positive and finite.');
  const window = windowOptions(options);
  const budgetMs = 1000 / targetHz;
  const intervals = [];
  let omittedIntervals = 0;
  let estimatedMissedRefreshes = 0;
  let lateFrameCount = 0;
  for (let i = 0; i < timestampsMs.length; i++) {
    const end = finite(timestampsMs[i], 'frame timestamp');
    if (!i) continue;
    const start = timestampsMs[i - 1];
    if (end <= start) throw new RangeError('Frame timestamps must be strictly increasing.');
    // Do not clip a partially included frame into a fictional fast interval.
    // Pauses also exclude their boundary-crossing interval on both sides.
    if (start < window.startMs || end > window.endMs || intersectsPause(start, end, window.pausedRanges)) {
      omittedIntervals++;
      continue;
    }
    const duration = end - start;
    intervals.push(duration);
    if (duration > budgetMs * 1.1) lateFrameCount++;
    estimatedMissedRefreshes += Math.max(0, Math.round(duration / budgetMs) - 1);
  }
  const activeDurationMs = intervals.reduce((sum, value) => sum + value, 0);
  const estimatedRefreshes = intervals.length + estimatedMissedRefreshes;
  return {
    targetHz, budgetMs, intervalCount: intervals.length, omittedIntervals, activeDurationMs,
    ...distribution(intervals),
    meanFps: activeDurationMs ? intervals.length * 1000 / activeDurationMs : null,
    lateFrameCount,
    lateFrameRatio: intervals.length ? lateFrameCount / intervals.length : null,
    estimatedMissedRefreshes,
    estimatedMissedRefreshRatio: estimatedRefreshes ? estimatedMissedRefreshes / estimatedRefreshes : null,
  };
}

export function summarizeLongTasks(entries, options = {}) {
  const window = windowOptions(options);
  const durations = [];
  let totalActiveDurationMs = 0;
  let blockingActiveDurationMs = 0;
  let maxActiveDurationMs = 0;
  for (const entry of entries) {
    const start = finite(entry.startTime, 'long task startTime');
    const duration = finite(entry.duration, 'long task duration');
    if (duration < 0) throw new RangeError('Task duration must not be negative.');
    if (duration < 50) continue;
    const active = activeDuration(start, start + duration, window);
    if (!active) continue;
    durations.push(duration);
    totalActiveDurationMs += active;
    // This is blocking time within the selected active window, not Lighthouse
    // Total Blocking Time (which uses its own navigation interval).
    blockingActiveDurationMs += activeDuration(start + 50, start + duration, window);
    maxActiveDurationMs = Math.max(maxActiveDurationMs, active);
  }
  return { count: durations.length, totalActiveDurationMs, blockingActiveDurationMs, maxActiveDurationMs, ...distribution(durations) };
}

export function summarizeInteractions(entries, options = {}) {
  const window = windowOptions(options);
  const grouped = new Map();
  let eventCount = 0;
  let unattributedEventCount = 0;
  for (const entry of entries) {
    const start = finite(entry.startTime, 'event startTime');
    const duration = finite(entry.duration, 'event duration');
    if (duration < 0) throw new RangeError('Event duration must not be negative.');
    if (start < window.startMs || start + duration > window.endMs || intersectsPause(start, start + duration, window.pausedRanges)) continue;
    eventCount++;
    if (!Number.isFinite(entry.interactionId) || entry.interactionId <= 0) {
      unattributedEventCount++;
      continue;
    }
    grouped.set(entry.interactionId, Math.max(grouped.get(entry.interactionId) ?? 0, duration));
  }
  return {
    eventCount, interactionCount: grouped.size, unattributedEventCount,
    // Event Timing reports only entries above its configured duration threshold.
    // These percentiles describe observed synthetic interactions, not field INP.
    ...distribution([...grouped.values()]),
  };
}

export function summarizeWindow(capture, options = {}) {
  return {
    frames: summarizeFrames(capture.timestampsMs ?? [], options),
    longTasks: summarizeLongTasks(capture.longTasks ?? [], options),
    interactions: summarizeInteractions(capture.events ?? [], options),
  };
}

const transitionKey = (value) => typeof value === 'string' ? value : `${value.from}->${value.to}`;

/** Validate measurement completeness separately from any performance threshold. */
export function validateCoverage(capture, {
  requiredTransitions,
  minimumIntervals = 120,
  requireHardware = false,
} = {}) {
  if (!Array.isArray(requiredTransitions) || !requiredTransitions.length) throw new TypeError('requiredTransitions must identify the full morph sequence.');
  const required = [...new Set(requiredTransitions.map(transitionKey))];
  if (required.some((key) => !/^[^>]+->[^>]+$/.test(key))) throw new TypeError('Transitions require source and destination names.');
  const frames = capture.frames ?? [];
  const completed = new Set();
  const interior = new Set();
  const actualBackends = new Set();
  for (const frame of frames) {
    if (frame.backend) actualBackends.add(frame.backend);
    const key = transitionKey(frame);
    if (frame.transitionComplete === true) completed.add(key);
    if (frame.phase === 'morph' && Number.isFinite(frame.progress) && frame.progress > 0 && frame.progress < 1) interior.add(key);
  }
  const missingTransitions = required.filter((key) => !completed.has(key));
  const missingInteriorTransitions = required.filter((key) => !interior.has(key));
  const backend = capture.backend ?? {};
  const adapter = backend.adapter;
  const adapterText = adapter && [adapter.vendor, adapter.architecture, adapter.device, adapter.description].filter(Boolean).join(' ');
  const softwareText = `${adapterText ?? ''} ${backend.renderer ?? ''}`;
  const hardwareQualified = backend.actual === 'webgpu' && backend.software === false && !!adapterText
    && !/swiftshader|llvmpipe|lavapipe|software|basic render/i.test(softwareText)
    && actualBackends.size === 1 && actualBackends.has('webgpu');
  const reasons = [];
  if (missingTransitions.length) reasons.push(`Missing completed transitions: ${missingTransitions.join(', ')}.`);
  if (missingInteriorTransitions.length) reasons.push(`Missing interior morph samples: ${missingInteriorTransitions.join(', ')}.`);
  if (!Number.isInteger(capture.frameSummary?.intervalCount) || capture.frameSummary.intervalCount < minimumIntervals) reasons.push(`At least ${minimumIntervals} measured active frame intervals are required.`);
  if (!Number.isFinite(capture.frameSummary?.activeDurationMs) || capture.frameSummary.activeDurationMs <= 0) reasons.push('Active frame duration is missing.');
  if (!['webgpu', 'webgl2'].includes(backend.actual)) reasons.push('Actual scene backend is missing or unsupported.');
  if (actualBackends.size !== 1 || !actualBackends.has(backend.actual)) reasons.push('Scene backend samples are absent, mixed, or disagree with the reported backend.');
  if (capture.overflowed) reasons.push('The bounded collector overflowed; coverage is incomplete.');
  if (capture.errors?.length) reasons.push('The capture contains runtime errors.');
  if (requireHardware && !hardwareQualified) reasons.push('Verified non-software WebGPU adapter and matching scene backend are required.');
  return { ok: reasons.length === 0, reasons, missingTransitions, missingInteriorTransitions, observedTransitions: [...completed], hardwareQualified };
}
