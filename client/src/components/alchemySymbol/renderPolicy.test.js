import { animationDelta, createDprBudget, DPR_RANGE, FRAME_BUDGET } from './renderPolicy';

function sampleFrames(budget, interval, count, startingDpr = DPR_RANGE[1]) {
  let dpr = startingDpr;
  const changes = [];
  for (let i = 0; i < count; i++) {
    const delta = typeof interval === 'function' ? interval(i) : interval;
    const next = budget.sample(delta, dpr);
    if (next !== null) { changes.push(next); dpr = next; }
  }
  return changes;
}

describe('rendering budget', () => {
  it('keeps quality stable at both 60 Hz and 120 Hz', () => {
    expect(FRAME_BUDGET.targetHz).toBe(60);
    expect(sampleFrames(createDprBudget(), 1 / 60, 1200)).toEqual([]);
    expect(sampleFrames(createDprBudget(), 1 / 120, 2400)).toEqual([]);
  });

  it('reduces gradually at a sustained 55 fps rather than accepting the old 50 fps threshold', () => {
    expect(sampleFrames(createDprBudget(), 1 / 55, 600)).toEqual([1.25, 1, 0.75]);
  });

  it('reduces for repeated missed frames even when the mean is comfortably inside the budget', () => {
    // 10% of frames take 50 ms, the rest 8.3 ms: mean 12.5 ms but poor pacing.
    const interval = i => i % 10 === 0 ? 0.05 : 1 / 120;
    expect(sampleFrames(createDprBudget(), interval, 1200)).toEqual([1.25, 1, 0.75]);
  });

  it('does not reduce quality because of a single scheduling stall after warmup', () => {
    const interval = i => i === 150 ? 0.5 : 1 / 60;
    expect(sampleFrames(createDprBudget(), interval, 1200)).toEqual([]);
  });

  it('does not carry a partially slow window across a pause', () => {
    const budget = createDprBudget();
    expect(sampleFrames(budget, 1 / 30, 75)).toEqual([]);
    budget.reset();
    expect(sampleFrames(budget, 1 / 60, 600)).toEqual([]);
    budget.reset();
    expect(sampleFrames(budget, 1 / 30, 60)).toEqual([]);
  });

  it('ignores invalid intervals and keeps requested quality bounded', () => {
    const budget = createDprBudget();
    for (const invalid of [0, -1, NaN, Infinity]) expect(budget.sample(invalid, 1.5)).toBeNull();
    expect(budget.sample(0.1, NaN)).toBeNull();
    expect(sampleFrames(createDprBudget(), 1 / 30, 600, 2)).toEqual([1.25, 1, 0.75]);
    expect(sampleFrames(createDprBudget(), 1 / 30, 600, 0.75)).toEqual([]);
  });

  it('bounds animation progress after a scheduling gap', () => {
    expect(animationDelta(12)).toBe(0.05);
    expect(animationDelta(1 / 60)).toBe(1 / 60);
    expect(animationDelta(-1)).toBe(0);
    expect(animationDelta(NaN)).toBe(0);
  });
});
