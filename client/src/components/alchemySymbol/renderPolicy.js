// Keep a bounded pixel workload even on very dense displays.
export const DPR_RANGE = [0.75, 1.5];
export const FRAME_BUDGET = Object.freeze({
  targetHz: 60,
  frameSeconds: 1 / 60,
  meanFrameSeconds: (1 / 60) * 1.05,
  missedFrameSeconds: (1 / 60) * 1.5,
  maxMissedFraction: 0.05,
  windowSeconds: 2,
  warmupSeconds: 1,
});

export function animationDelta(delta) {
  return Number.isFinite(delta) ? Math.max(0, Math.min(delta, 0.05)) : 0;
}

/** Samples cadence without per-frame allocation or React state updates. */
export function createDprBudget() {
  let warmup = 0;
  let elapsed = 0;
  let frames = 0;
  let worst = 0;
  let missed = 0;
  function clearWindow() { elapsed = 0; frames = 0; worst = 0; missed = 0; }
  return {
    reset() { warmup = 0; clearWindow(); },
    sample(delta, dpr) {
      if (!Number.isFinite(delta) || delta <= 0 || !Number.isFinite(dpr)) return null;
      if (warmup < FRAME_BUDGET.warmupSeconds) { warmup += delta; return null; }
      elapsed += delta;
      frames++;
      worst = Math.max(worst, delta);
      if (delta > FRAME_BUDGET.missedFrameSeconds) missed++;
      if (elapsed < FRAME_BUDGET.windowSeconds || frames < 2) return null;

      // Ignore one external/compile stall, but retain repeated missed frames.
      // A good mean cannot hide a poor tail, including on a faster display.
      const measuredFrames = frames - 1;
      const mean = (elapsed - worst) / measuredFrames;
      const missedFraction = (missed - (worst > FRAME_BUDGET.missedFrameSeconds ? 1 : 0)) / measuredFrames;
      const slow = mean > FRAME_BUDGET.meanFrameSeconds || missedFraction > FRAME_BUDGET.maxMissedFraction;
      clearWindow();
      if (!slow || dpr <= DPR_RANGE[0]) return null;
      const current = Math.min(dpr, DPR_RANGE[1]);
      return Math.max(DPR_RANGE[0], Math.round((current - 0.25) * 100) / 100);
    },
  };
}
