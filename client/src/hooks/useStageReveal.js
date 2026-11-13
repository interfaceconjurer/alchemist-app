import { useLayoutEffect, useRef } from 'react';

const DURATION = 560;
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
 */
export function useStageReveal({ panelRef, stageRef, stageVisible, panelWidth, enabled, ready }) {
  const previous = useRef({ stageVisible, ready });

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
      // The panel's own background arrives with the content instead of popping in.
      panel.animate([{ backgroundColor: 'transparent', boxShadow: 'none' }, {}], { duration: DURATION, easing: EASING });
      panel.classList.add('left-panel--revealing');
      Promise.all(animations.map((a) => a.finished.catch(() => {}))).then(() => panel.classList.remove('left-panel--revealing'));
      stage?.animate?.(
        [{ transform: `translateX(${full - narrow}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }],
        { duration: DURATION, easing: EASING },
      );
    }
  }, [stageVisible, panelWidth, enabled, ready, panelRef, stageRef]);
}
