import { parseArgs } from 'node:util';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { summarizeDurations, summarizeWindow, validateCoverage } from './performance-metrics.mjs';

const { values } = parseArgs({ options: {
  headless: { type: 'boolean', default: false },
  'no-build': { type: 'boolean', default: false },
  enforce: { type: 'boolean', default: false },
  output: { type: 'string', default: 'performance-results/animation-profile.json' },
  'max-seconds': { type: 'string', default: '150' },
  hz: { type: 'string', default: '60' },
  width: { type: 'string', default: '1440' },
  height: { type: 'string', default: '1000' },
  dpr: { type: 'string', default: '2' },
} });
const withTimeout = (promise, milliseconds, label) => new Promise((resolveValue, reject) => {
  const timer = setTimeout(() => reject(new Error(`${label} timed out.`)), milliseconds);
  promise.then(value => { clearTimeout(timer); resolveValue(value); }, error => { clearTimeout(timer); reject(error); });
});
const clientDir = fileURLToPath(new URL('../', import.meta.url));
const positive = name => {
  const n = Number(values[name]);
  if (!Number.isFinite(n) || n <= 0) throw new Error(`${name} must be positive and finite.`);
  return n;
};
const settings = { targetHz: positive('hz'), width: positive('width'), height: positive('height'), dpr: positive('dpr'), maxSeconds: positive('max-seconds'), headless: values.headless };
if (settings.maxSeconds > 600) throw new Error('Capture timeout must be at most 600 seconds.');
if (!values['no-build']) {
  const build = spawnSync('npm', ['run', 'build'], { cwd: clientDir, env: { ...process.env, NODE_ENV: 'production' }, stdio: 'inherit' });
  if (build.status !== 0) process.exit(build.status || 1);
}
const require = createRequire(import.meta.url);
const { createApp } = require('../../server.js');
const server = createApp({ env: { NODE_ENV: 'test' } }).listen(0, '127.0.0.1');
await new Promise((resolveReady, reject) => { server.once('listening', resolveReady); server.once('error', reject); });
let browser;
let report;
try {
  browser = await chromium.launch({ headless: settings.headless });
  const context = await browser.newContext({ viewport: { width: settings.width, height: settings.height }, deviceScaleFactor: settings.dpr });
  const page = await context.newPage();
  page.setDefaultTimeout(10_000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const session = await browser.newBrowserCDPSession();
  const system = await session.send('SystemInfo.getInfo');
  const gpu = { devices: system.gpu.devices, featureStatus: system.gpu.featureStatus };
  await page.bringToFront();
  const refresh = await withTimeout(page.evaluate(() => new Promise(done => {
    const at = [];
    function frame(t) { at.push(t); if (at.length < 45) requestAnimationFrame(frame); else {
      const delta = at.slice(1).map((value, i) => value - at[i]).sort((a, b) => a - b);
      done({ medianIntervalMs: delta[Math.floor(delta.length / 2)], estimatedHz: 1000 / delta[Math.floor(delta.length / 2)] });
    } }
    requestAnimationFrame(frame);
  })), 10_000, 'Display calibration');
  await page.addInitScript(() => {
    const capture = window.__animationCapture = { frames: [], submits: [], timestampsMs: [], longTasks: [], events: [], visibility: [], sequence: [], overflowed: false, lcp: null, cls: 0 };
    const push = (key, value, max = 30_000) => { if (capture[key].length < max) capture[key].push(value); else capture.overflowed = true; };
    window.__ALCHEMY_PROFILE__ = {
      frame: value => push('frames', value), render: value => push('submits', value),
      visibility: value => push('visibility', value, 1000), sequence: value => { capture.sequence = value; },
    };
    function frame(at) { push('timestampsMs', at); requestAnimationFrame(frame); }
    requestAnimationFrame(frame);
    const observe = (type, receive, extra = {}) => {
      if (!PerformanceObserver.supportedEntryTypes.includes(type)) return;
      new PerformanceObserver(list => list.getEntries().forEach(receive)).observe({ type, buffered: true, ...extra });
    };
    observe('longtask', entry => push('longTasks', { startTime: entry.startTime, duration: entry.duration }, 2000));
    observe('event', entry => push('events', { name: entry.name, startTime: entry.startTime, duration: entry.duration, interactionId: entry.interactionId }, 2000), { durationThreshold: 16 });
    observe('largest-contentful-paint', entry => { capture.lcp = entry.startTime; });
    observe('layout-shift', entry => { if (!entry.hadRecentInput) capture.cls += entry.value; });
  });
  const url = `http://127.0.0.1:${server.address().port}`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.bringToFront();
  const adapter = await withTimeout(page.evaluate(async () => {
    const adapter = await navigator.gpu?.requestAdapter();
    if (!adapter) return null;
    const info = adapter.info;
    return { vendor: info.vendor, architecture: info.architecture, device: info.device, description: info.description };
  }), 10_000, 'GPU adapter discovery');
  const actions = [];
  const deadline = Date.now() + settings.maxSeconds * 1000;
  let complete = false;
  while (Date.now() < deadline) {
    const state = await page.evaluate(() => ({ last: window.__animationCapture.frames.at(-1), failed: !!document.querySelector('[data-symbol-fallback="unavailable"]'), overflowed: window.__animationCapture.overflowed }));
    if (state.failed || state.overflowed || errors.length) break;
    const simulationMs = state.last?.simulationMs ?? 0;
    if (simulationMs > 15_000 && !actions.some(action => action.name === 'theme')) {
      await page.getByRole('button', { name: /Switch to .* mode/ }).click();
      actions.push({ name: 'theme', simulationMs });
    }
    if (simulationMs > 30_000 && !actions.some(action => action.name === 'search')) {
      await page.getByRole('button', { name: 'Search', exact: true }).click();
      await page.getByPlaceholder('Search work items and actions...').waitFor();
      await page.getByPlaceholder('Search work items and actions...').press('Escape');
      actions.push({ name: 'search', simulationMs });
    }
    // Touch: a press-and-drag on the crystal sends it dormant (motion and light
    // ease out) and it wakes after being left alone. This exercises the fade
    // both ways; the simulation clock slows while dormant, so coverage waits.
    if (simulationMs > 40_000 && !actions.some(action => action.name === 'touch')) {
      const box = await page.locator('.symbolContainer canvas').boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2 + 30, { steps: 12 });
        await page.mouse.up();
        actions.push({ name: 'touch', simulationMs });
      }
    }
    if (state.last?.cycle >= 1) { complete = true; break; }
    await new Promise(resolveWait => setTimeout(resolveWait, 250));
  }
  // Let buffered observers publish entries from the final frame/interaction.
  await page.waitForTimeout(100);
  const capture = await page.evaluate(() => window.__animationCapture);
  const first = capture.frames[0];
  const end = capture.frames.at(-1)?.at ?? 0;
  const warmStart = capture.frames.find(frame => frame.phase !== 'intro')?.at ?? end;
  const pausedRanges = [];
  let pausedAt = null;
  for (const event of capture.visibility) {
    if (!event.active && pausedAt === null) pausedAt = event.at;
    if (event.active && pausedAt !== null) { pausedRanges.push({ startMs: pausedAt, endMs: event.at }); pausedAt = null; }
  }
  if (pausedAt !== null && pausedAt < end) pausedRanges.push({ startMs: pausedAt, endMs: end });
  const warmOptions = { startMs: warmStart, endMs: end, pausedRanges, targetHz: settings.targetHz };
  const warm = summarizeWindow(capture, warmOptions);
  const renderer = gpu.devices.map(device => [device.vendorString, device.deviceString].filter(Boolean).join(' ')).join('; ');
  const actual = capture.frames.at(-1)?.backend;
  const featureStatus = gpu.featureStatus[actual === 'webgpu' ? 'webgpu' : 'webgl'];
  const backend = { actual, adapter, renderer, software: /swiftshader|llvmpipe|lavapipe|software raster/i.test(renderer) || featureStatus?.includes('software') === true };
  const names = capture.sequence;
  const requiredTransitions = names.map((from, i) => ({ from, to: names[(i + 1) % names.length] }));
  const coverage = names.length > 1 ? validateCoverage({ frames: capture.frames, backend, frameSummary: warm.frames, overflowed: capture.overflowed, errors }, { requiredTransitions, requireHardware: !settings.headless }) : { ok: false, reasons: ['No sequence metadata was received.'], hardwareQualified: false };
  const warmFrames = capture.frames.filter(frame => frame.at >= warmStart);
  const cpuByTransition = Object.fromEntries(requiredTransitions.map(({ from, to }) => [`${from}->${to}`, summarizeDurations(warmFrames.filter(frame => frame.phase === 'morph' && frame.from === from && frame.to === to).map(frame => frame.cpuMorphMs))]));
  const budgetLimits = { p95Ms: 1000 / settings.targetHz * 1.1, p99Ms: 1000 / settings.targetHz * 2, missedRefreshRatio: 0.01, warmLongTasks: 0 };
  const budget = {
    limits: budgetLimits,
    passed: coverage.ok && coverage.hardwareQualified && warm.frames.p95Ms <= budgetLimits.p95Ms && warm.frames.p99Ms <= budgetLimits.p99Ms && warm.frames.estimatedMissedRefreshRatio <= budgetLimits.missedRefreshRatio && warm.longTasks.count <= budgetLimits.warmLongTasks,
  };
  report = {
    recordedAt: new Date().toISOString(), geometryMode: capture.frames[0]?.geometryMode ?? 'unreported', settings, refresh, backend, coverage, budget, complete,
    pageMetrics: { lcpMs: capture.lcp, cls: capture.cls },
    cold: { firstSceneUpdateMs: first?.at ?? null, firstRenderSubmitMs: capture.submits[0]?.at ?? null, introFinishedMs: warmStart, ...summarizeWindow(capture, { targetHz: settings.targetHz, startMs: 0, endMs: warmStart }) },
    warm,
    observedRefreshCadence: summarizeWindow(capture, { ...warmOptions, targetHz: Math.round(refresh.estimatedHz) }),
    cpu: { sceneUpdate: summarizeDurations(warmFrames.map(frame => frame.cpuMorphMs)), byTransition: cpuByTransition, renderSubmission: summarizeDurations(capture.submits.filter(frame => frame.at >= warmStart).map(frame => frame.cpuSubmitMs)) },
    dprValues: [...new Set(capture.frames.map(frame => frame.dpr))],
    actions, errors, pausedRanges, gpu,
    measurement: 'rAF cadence estimates browser delivery opportunities; CPU submission spans are not GPU execution times. Synthetic EventTiming is not field INP. Hardware qualification applies only to this recorded device and viewport.',
  };
  const destination = resolve(clientDir, values.output);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, JSON.stringify(report, null, 2) + '\n');
  await writeFile(destination.replace(/\.json$/, '') + '.raw.json', JSON.stringify(capture) + '\n');
  console.log(JSON.stringify({ output: destination, backend, coverage, budget, warm: warm.frames, sceneUpdate: report.cpu.sceneUpdate, renderSubmission: report.cpu.renderSubmission, longTasks: warm.longTasks.count, actions }, null, 2));
  if (!complete || !coverage.ok || (values.enforce && !budget.passed)) process.exitCode = 1;
} finally {
  try { await browser?.close(); }
  finally { await new Promise(done => server.close(done)); }
}
