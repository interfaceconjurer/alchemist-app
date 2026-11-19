/**
 * Whether an opaque overlay (the full-screen artifact viewer) covers the whole
 * page. Background animation such as the crystal pauses while it does: it
 * can't be seen, and on a phone its GPU work competes with the overlay's own
 * content, such as a large artwork being pinch-zoomed.
 *
 * A count, not a flag, so two overlays can't uncover each other.
 */
let covers = 0;
const listeners = new Set();

export const isPageCovered = () => covers > 0;

/** Marks the page covered until the returned function is called (once). */
export function coverPage() {
  covers += 1;
  if (covers === 1) listeners.forEach((listener) => listener(true));
  let released = false;
  return () => {
    if (released) return;
    released = true;
    covers -= 1;
    if (covers === 0) listeners.forEach((listener) => listener(false));
  };
}

/** Calls `listener(covered)` whenever the page becomes covered or uncovered. */
export function onPageCover(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
