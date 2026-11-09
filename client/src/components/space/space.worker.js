import { renderLayer } from './spaceField';

// No pixel buffers are copied to the main thread: only the three encoded PNGs.
self.onmessage = async ({ data }) => {
  try {
    const blobs = {};
    for (const kind of ['nebula', 'far', 'near']) {
      const canvas = renderLayer(kind, { ...data, createCanvas: (w, h) => new OffscreenCanvas(w, h) });
      try {
        blobs[kind] = await canvas.convertToBlob({ type: 'image/png' });
      } finally {
        canvas.width = 0;
        canvas.height = 0;
      }
    }
    self.postMessage(blobs);
  } catch {
    // Missing worker 2D support, encoding failures, and resource limits all use
    // the same inexpensive CSS fallback. Partial generations are never posted.
    self.postMessage(null);
  }
};
