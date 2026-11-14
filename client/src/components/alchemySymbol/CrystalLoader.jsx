import React, { useEffect, useState } from 'react';

/**
 * A braille spinner shown in the crystal's place while it loads, styled like the
 * busy indicator in terminal tools. It only appears if the crystal still hasn't
 * drawn SHOW_AFTER_MS into the page load, so a fast load never flashes it; once
 * shown it runs at least MIN_CYCLES full cycles of its animation and fades out,
 * and only then does the crystal appear and play its intro (see mediator.jsx).
 *
 * The cell is drawn as CSS dots from each frame's braille character rather than
 * as text: the site font has no braille glyphs, and system fallbacks vary (some
 * draw empty dots as rings).
 */
export const SHOW_AFTER_MS = 1000; // into the page load (fast desktops draw by ~0.6–0.9 s)
export const MIN_CYCLES = 2; // once shown, it plays at least this many full cycles
export const FADE_MS = 250;

// The classic six-dot spinner (the one Pi uses): a short trail of dots running
// around a 2×3 cell.
export const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
export const FRAME_MS = 80;
/** How long the minimum run takes: MIN_CYCLES passes through every frame. */
export const MIN_VISIBLE_MS = MIN_CYCLES * FRAMES.length * FRAME_MS;

/**
 * Dev-only preview switch (stripped from production builds), for judging the
 * loader in the real page sequence on a machine that loads too fast to show it:
 *   ?crystal-delay=2500   hold the crystal's code back 2.5 s, like a slow phone
 */
export const previewDelayMs = () => (import.meta.env.DEV
  ? Math.min(10000, Math.max(0, Number(new URLSearchParams(window.location.search).get('crystal-delay')) || 0))
  : 0);

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

// Unicode braille: U+2800 + one bit per dot. Dots 1–3 run down the left column,
// 4–6 down the right; listed a row at a time.
const DOT_BITS = [0, 3, 1, 4, 2, 5];
export function CrystalLoaderFrame({ char }) {
  const bits = char.codePointAt(0) - 0x2800;
  return (
    <span className="crystal-loader-cell" data-frame={char}>
      {DOT_BITS.map((bit) => (
        <span key={bit} className={`crystal-loader-dot${bits & (1 << bit) ? ' crystal-loader-dot--on' : ''}`} />
      ))}
    </span>
  );
}

/** `visible`: the crystal is still loading and the threshold has passed (see useCrystalLoader). */
export function CrystalLoader({ visible }) {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    // Only spin while showing, always from the first frame, so the minimum run is
    // whole cycles. Reduced motion holds the first frame.
    if (!visible) return undefined;
    setFrame(0);
    if (prefersReducedMotion()) return undefined;
    const id = setInterval(() => setFrame((f) => (f + 1) % FRAMES.length), FRAME_MS);
    return () => clearInterval(id);
  }, [visible]);
  return (
    <div className={`crystal-loader${visible ? ' crystal-loader--visible' : ''}`} aria-hidden="true" data-crystal-loader={visible ? 'visible' : 'hidden'}>
      <CrystalLoaderFrame char={FRAMES[frame]} />
    </div>
  );
}

/**
 * The loader's state. `loading`: the crystal hasn't drawn its first frame.
 * Shows once the page has been loading SHOW_AFTER_MS; once shown, hides no sooner
 * than MIN_VISIBLE_MS later, so it never blinks.
 *
 * Returns `{ visible, holding }`. `holding` is true from the moment the loader appears
 * until it has finished fading out: the crystal stays hidden and paused meanwhile, so
 * the two are never on screen together and the crystal's intro plays in full after it.
 */
export function useCrystalLoader(loading) {
  const [shownAt, setShownAt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [faded, setFaded] = useState(false);
  useEffect(() => {
    if (!loading || shownAt !== null) return undefined;
    // Measured from the start of the page load, not from when the slot mounted.
    const id = setTimeout(() => { setShownAt(performance.now()); setVisible(true); }, Math.max(0, SHOW_AFTER_MS - performance.now()));
    return () => clearTimeout(id);
  }, [loading, shownAt]);
  useEffect(() => {
    if (loading || shownAt === null || !visible) return undefined;
    const id = setTimeout(() => setVisible(false), Math.max(0, MIN_VISIBLE_MS - (performance.now() - shownAt)));
    return () => clearTimeout(id);
  }, [loading, shownAt, visible]);
  useEffect(() => {
    // Release the crystal once the fade-out has finished.
    if (visible || shownAt === null || faded) return undefined;
    const id = setTimeout(() => setFaded(true), FADE_MS);
    return () => clearTimeout(id);
  }, [visible, shownAt, faded]);
  return { visible, holding: shownAt !== null && !faded };
}
