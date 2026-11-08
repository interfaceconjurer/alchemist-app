// Keep only the latest pointer sample; commit at most once per browser frame.
export function createFrameBatch(commit) {
  let frame = null;
  let pending = null;
  function flush() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    if (pending === null) return;
    const args = pending;
    pending = null;
    commit(...args);
  }
  return {
    schedule(...args) {
      pending = args;
      if (frame === null) frame = requestAnimationFrame(flush);
    },
    flush,
    cancel() {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      pending = null;
    },
  };
}
