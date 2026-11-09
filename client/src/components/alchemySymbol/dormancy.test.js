import { describe, expect, it } from 'vitest';
import { createDormancy, DORMANCY } from './dormancy';

const run = (d, seconds, step = 1 / 60) => {
  let s = d.state;
  for (let t = 0; t < seconds; t += step) s = d.step(step);
  return s;
};

describe('crystal dormancy', () => {
  it('starts fully awake', () => {
    expect(createDormancy().state).toMatchObject({ vitality: 1, light: 1, awake: true, dormant: false });
  });

  it('goes dormant while touched and stays dormant while held', () => {
    const d = createDormancy();
    d.engage();
    const s = run(d, DORMANCY.fallSeconds + 0.1);
    expect(s.dormant).toBe(true);
    expect(s.vitality).toBe(0);
    expect(s.light).toBeCloseTo(DORMANCY.dormantLight, 5);
    expect(run(d, 5).dormant).toBe(true); // still held: never wakes
  });

  it('only starts waking after the user has left it alone for the quiet period', () => {
    const d = createDormancy();
    d.engage();
    run(d, 2);
    d.release();
    expect(run(d, DORMANCY.quietSeconds - 0.1).dormant).toBe(true);
    const waking = run(d, 0.5);
    expect(waking.vitality).toBeGreaterThan(0);
    expect(waking.awake).toBe(false);
    expect(run(d, DORMANCY.wakeSeconds + 0.1).awake).toBe(true);
  });

  it('repeated pokes keep it dormant (each touch restarts the quiet period)', () => {
    const d = createDormancy();
    for (let i = 0; i < 4; i++) {
      d.engage(); run(d, 0.3); d.release(); run(d, DORMANCY.quietSeconds * 0.6);
    }
    expect(d.state.vitality).toBeLessThan(0.05);
  });

  it('eases smoothly: no jumps, and dims monotonically while falling asleep', () => {
    const d = createDormancy();
    d.engage();
    let prev = d.state.vitality;
    for (let i = 0; i < 70; i++) {
      const v = d.step(1 / 60).vitality;
      expect(v).toBeLessThanOrEqual(prev);
      expect(prev - v).toBeLessThan(0.05);
      prev = v;
    }
  });

  it('ignores invalid deltas and bounds unusually long active frames', () => {
    const d = createDormancy();
    d.engage();
    d.step(NaN); d.step(-1);
    expect(d.state.awake).toBe(true);
    d.step(30); // Resumed frames are separately skipped by DormancyController.
    expect(d.state.vitality).toBeGreaterThan(0.8);
  });
});
