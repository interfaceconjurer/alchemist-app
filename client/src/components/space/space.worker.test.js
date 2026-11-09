import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderLayer } from './spaceField';

vi.mock('./spaceField', () => ({ renderLayer: vi.fn() }));

let scope;
let canvases;
const options = { width: 1440, height: 900, dpr: 1, bleed: 48, mode: 'dark' };

beforeEach(async () => {
  vi.resetModules();
  canvases = [];
  scope = { postMessage: vi.fn() };
  vi.stubGlobal('self', scope);
  renderLayer.mockReset().mockImplementation(() => {
    const canvas = { width: 1536, height: 996, convertToBlob: vi.fn(async () => new Blob(['png'], { type: 'image/png' })) };
    canvases.push(canvas);
    return canvas;
  });
  await import('./space.worker');
});

afterEach(() => vi.unstubAllGlobals());

describe('space raster worker', () => {
  it('posts only one complete set of encoded layers and releases raster surfaces', async () => {
    await scope.onmessage({ data: options });
    expect(renderLayer.mock.calls.map(([kind]) => kind)).toEqual(['nebula', 'far', 'near']);
    for (const [, request] of renderLayer.mock.calls) expect(request).toMatchObject(options);
    expect(scope.postMessage).toHaveBeenCalledOnce();
    expect(Object.keys(scope.postMessage.mock.calls[0][0])).toEqual(['nebula', 'far', 'near']);
    for (const canvas of canvases) {
      expect(canvas.convertToBlob).toHaveBeenCalledWith({ type: 'image/png' });
      expect(canvas.width).toBe(0);
      expect(canvas.height).toBe(0);
    }
  });

  it('reports a failed generation without posting earlier partial layers', async () => {
    renderLayer.mockImplementationOnce(() => ({
      width: 1, height: 1, convertToBlob: async () => new Blob(['png']),
    })).mockImplementationOnce(() => { throw new Error('No worker 2D canvas'); });
    await scope.onmessage({ data: options });
    expect(scope.postMessage).toHaveBeenCalledExactlyOnceWith(null);
  });

  it('releases the current surface when PNG serialization fails', async () => {
    const canvas = { width: 10, height: 10, convertToBlob: async () => { throw new Error('Encoding failed'); } };
    renderLayer.mockReturnValue(canvas);
    await scope.onmessage({ data: options });
    expect(scope.postMessage).toHaveBeenCalledExactlyOnceWith(null);
    expect(canvas.width).toBe(0);
    expect(canvas.height).toBe(0);
  });
});
