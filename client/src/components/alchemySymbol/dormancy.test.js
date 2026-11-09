import { describe, expect, it } from 'vitest';
import { createDormancy, DORMANCY } from './dormancy';

const run = (d, seconds, step = 1 / 60) => {
  let s = d.state;
  for (let t = 0; t < seconds;) {
    const dt = Math.min(step, seconds - t);
    s = d.step(dt);
    t += dt;
  }
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

  it('ignores non-finite, negative and zero deltas', () => {
    const d = createDormancy();
    d.engage();
    for (const dt of [NaN, Infinity, -Infinity, -1, 0]) d.step(dt);
    expect(d.state.awake).toBe(true);
    d.step(DORMANCY.fallSeconds);
    d.release();
    for (const dt of [NaN, Infinity, -Infinity, -1, 0]) d.step(dt);
    expect(d.step(DORMANCY.quietSeconds).dormant).toBe(true);
  });

  it('keeps the intended fall and wake duration at four frames per second', () => {
    const d = createDormancy();
    d.engage();
    expect(run(d, 1, 0.25).dormant).toBe(true);
    expect(d.step(5).dormant).toBe(true); // A held crystal never wakes.
    d.release();
    const changing = run(d, 3.5, 0.25);
    expect(changing.vitality).toBeGreaterThan(0);
    expect(changing.awake).toBe(false);
    expect(d.step(0.25).awake).toBe(true); // quiet + wake is 3.6 s.
  });

  it('divides a long active frame between the quiet period and waking', () => {
    const d = createDormancy();
    d.engage();
    expect(d.step(30).dormant).toBe(true);
    d.release();
    const halfAwake = d.step(DORMANCY.quietSeconds + DORMANCY.wakeSeconds / 2);
    expect(halfAwake.vitality).toBeCloseTo(0.5, 10);
    expect(halfAwake.light).toBeCloseTo(DORMANCY.dormantLight + (1 - DORMANCY.dormantLight) / 2, 10);
    expect(d.step(DORMANCY.wakeSeconds / 2).awake).toBe(true);
  });

  it.each([1 / 120, 1 / 60, 0.1, 0.25, 0.5, 3])('preserves the same easing progress with %s second frames', (step) => {
    const d = createDormancy();
    d.engage();
    run(d, DORMANCY.fallSeconds + 0.1, step);
    d.release();
    const halfAwake = run(d, DORMANCY.quietSeconds + DORMANCY.wakeSeconds / 2, step);
    expect(halfAwake.vitality).toBeCloseTo(0.5, 10);
    expect(halfAwake.awake).toBe(false);
    expect(halfAwake.dormant).toBe(false);
  });
});
