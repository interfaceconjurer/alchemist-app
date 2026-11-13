import { useLayoutEffect, useRef, useState } from 'react';

const DURATION = 560;
const PANEL_FILL_FADE = 600; // the panel's background eases in once the stage has arrived
const EASING = 'cubic-bezier(0.32, 0.72, 0, 1)';

/**
 * Animates the stage opening and closing on desktop. Layout changes at once
 * (the panel takes its final width in a single step, so the crystal canvas
 * resizes once); the panel's content is then slid from where it was to where
 * it is (FLIP), and the stage slides in from the right. Transforms only, so the
 * animation stays on the compositor.
 *
 * Skipped on mobile (the stage is an overlay there), on the initial restore of
 * persisted tabs, and replaced by a short fade when the user prefers reduced motion.
 *
 * Returns `settled`: false while the stage is sliding into place, so content that
 * animates inside it (the terminal loader) can wait for it to arrive.
 */
export function useStageReveal({ panelRef, stageRef, stageVisible, panelWidth, enabled, ready }) {
  const previous = useRef({ stageVisible, ready });
  const [settled, setSettled] = useState(true);
  const run = useRef(0);

  useLayoutEffect(() => {
    const before = previous.current;
    previous.current = { stageVisible, ready };
    const panel = panelRef.current;
    const stage = stageRef.current;
    if (!enabled || !before.ready || before.stageVisible === stageVisible) return;
    if (!panel?.animate || !panel.parentElement) return;

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      if (stageVisible) stage?.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'ease-out' });
      setSettled(true);
      return;
    }

    // The panel's content is centred, so it travels by half the width change:
    // from the middle of the row to the middle of the narrow panel, or back.
    const full = panel.parentElement.getBoundingClientRect().width;
    // `panelWidth`: the panel's width beside the stage, in px or as a function of the row width.
    const narrow = Math.min(typeof panelWidth === 'function' ? panelWidth(full) : panelWidth, full);
    const dx = stageVisible ? (full - narrow) / 2 : (narrow - full) / 2;
    if (Math.abs(dx) < 1) return;

    const content = [...panel.children].filter((el) => !el.classList.contains('left-panel-resize-handle'));
    const animations = content.map((el) => el.animate(
      [{ transform: `translateX(${dx}px)` }, { transform: 'none' }],
      { duration: DURATION, easing: EASING },
    ));
    // While content travels from the middle of the row it starts outside the
    // narrow panel; let it show instead of being clipped by the panel's scroller.
    if (stageVisible) {
      // The panel's fill takes its final width at once while the stage is still
      // sliding in from the right, which would leave a dark band between the two.
      // Keep the panel clear for the whole slide; fade its fill in once the stage
      // has arrived (below).
      const clear = { backgroundColor: 'transparent', boxShadow: 'none' };
      const holdFill = panel.animate([clear, clear], { duration: DURATION, fill: 'forwards' });
      panel.classList.add('left-panel--revealing');
      Promise.all(animations.map((a) => a.finished.catch(() => {}))).then(() => panel.classList.remove('left-panel--revealing'));
      // A pure slide, no fade: the stage and everything in it arrive as one piece.
      const slide = stage?.animate?.(
        [{ transform: `translateX(${full - narrow}px)` }, { transform: 'none' }],
        { duration: DURATION, easing: EASING },
      );
      // Settled once the stage has arrived (or the slide was cancelled by closing it again).
      const id = ++run.current;
      setSettled(false);
      const done = () => {
        if (run.current !== id) { holdFill.cancel(); return; }
        setSettled(true);
        holdFill.cancel();
        panel.animate([clear, {}], { duration: PANEL_FILL_FADE, easing: 'ease-in-out' });
      };
      if (slide?.finished) slide.finished.then(done, done);
      else done();
    } else {
      run.current++;
      setSettled(true);
    }
  }, [stageVisible, panelWidth, enabled, ready, panelRef, stageRef]);

  return { settled };
}
