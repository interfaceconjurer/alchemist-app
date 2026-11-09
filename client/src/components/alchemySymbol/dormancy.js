/**
 * Dormancy: touching the crystal makes it go still and dark until it's left
 * alone. Pure state + easing so it can be unit tested without a renderer.
 *
 * `vitality` runs 1 (awake) → 0 (dormant). It drives two things:
 *   - the shared animation clock's rate (morph, spin, shader motion and
 *     bubbles all slow to a halt together, then ease back up), and
 *   - light: halo, backlight, bloom and bubble opacity fade with it.
 *
 * Going dormant is quick and soft (the crystal "flinches" still); waking is
 * slower, like it's gathering itself. Waking only starts once the pointer has
 * been released or left AND a short quiet period has passed, so repeated
 * pokes keep it dormant.
 */

export const DORMANCY = Object.freeze({
  fallSeconds: 0.9, // awake → dormant
  wakeSeconds: 2.4, // dormant → awake
  quietSeconds: 1.2, // how long the user must leave it alone before it wakes
  // Some faint residual glow so a dormant crystal still reads as an object.
  dormantLight: 0.12,
});

const ease = (x) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };

export function createDormancy(config = DORMANCY) {
  let level = 1; // linear progress 1 (awake) … 0 (dormant), eased on read
  let engaged = false; // pointer currently down on / held over the crystal
  let quiet = Infinity; // seconds since the user last let go / left

  return {
    /** Pointer pressed on the crystal (click, drag start, touch). */
    engage() { engaged = true; quiet = 0; },
    /** Pointer released or left the crystal. Wake begins after the quiet period. */
    release() { engaged = false; quiet = 0; },
    get engaged() { return engaged; },
    /** Advance by real (wall-clock) seconds; returns the current state. */
    step(dt) {
      const d = Number.isFinite(dt) && dt > 0 ? Math.min(dt, 0.1) : 0;
      if (!engaged) quiet += d;
      const sleeping = engaged || quiet < config.quietSeconds;
      if (sleeping) level = Math.max(0, level - d / config.fallSeconds);
      else level = Math.min(1, level + d / config.wakeSeconds);
      return this.state;
    },
    get state() {
      const vitality = ease(level);
      return {
        vitality, // 0..1, motion rate
        light: config.dormantLight + (1 - config.dormantLight) * vitality, // 0..1, glow
        dormant: level === 0,
        awake: level === 1,
      };
    },
  };
}
