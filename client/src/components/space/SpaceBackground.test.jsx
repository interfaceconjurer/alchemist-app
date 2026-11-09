import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../../contexts/ThemeContext';
import SpaceBackground from './SpaceBackground';

let workers;
let idle;
let visibility;
let created;
let revoked;

class SkyWorker {
  constructor() { workers.push(this); }
  postMessage = vi.fn((options) => { this.options = options; });
  terminate = vi.fn();
  deliver(data = layers()) { this.onmessage({ data }); }
}

function layers() {
  return Object.fromEntries(['nebula', 'far', 'near'].map((kind) => [kind, new Blob([kind], { type: 'image/png' })]));
}

function ThemeToggle() {
  const { toggleTheme } = useTheme();
  return <button onClick={toggleTheme}>Theme</button>;
}

function mount(theme = 'dark') {
  vi.stubGlobal('localStorage', { getItem: () => theme, setItem: vi.fn() });
  return render(<ThemeProvider><SpaceBackground /><ThemeToggle /></ThemeProvider>);
}

function runIdle() {
  const [id, callback] = idle.entries().next().value;
  idle.delete(id);
  act(() => callback());
}

function resize(width, height = 1000) {
  vi.stubGlobal('innerWidth', width);
  vi.stubGlobal('innerHeight', height);
  act(() => window.dispatchEvent(new Event('resize')));
  act(() => vi.advanceTimersByTime(250));
}

function setVisibility(value) {
  visibility.mockReturnValue(value);
  act(() => document.dispatchEvent(new Event('visibilitychange')));
}

beforeEach(() => {
  vi.useFakeTimers();
  workers = [];
  idle = new Map();
  let id = 0;
  let url = 0;
  created = vi.fn(() => `blob:sky-${url++}`);
  revoked = vi.fn();
  visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  vi.stubGlobal('innerWidth', 1440);
  vi.stubGlobal('innerHeight', 1000);
  vi.stubGlobal('devicePixelRatio', 2);
  vi.stubGlobal('Worker', SkyWorker);
  vi.stubGlobal('OffscreenCanvas', class {});
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL = created;
    static revokeObjectURL = revoked;
  });
  vi.stubGlobal('requestIdleCallback', vi.fn((callback) => { idle.set(++id, callback); return id; }));
  vi.stubGlobal('cancelIdleCallback', vi.fn((slot) => idle.delete(slot)));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('SpaceBackground', () => {
  it.each(['light', 'dark'])('defers the decorative %s sky, then atomically installs three worker PNGs', (theme) => {
    const { container } = mount(theme);
    const space = container.querySelector('.space');
    expect(space).toHaveClass(`space--${theme}`);
    expect(space).toHaveAttribute('aria-hidden', 'true');
    expect(space).toHaveAttribute('data-space-renderer', 'pending');
    expect(workers).toHaveLength(0);
    runIdle();
    expect(workers[0].options.mode).toBe(theme);
    expect(created).not.toHaveBeenCalled();
    act(() => workers[0].deliver());
    expect(space).toHaveClass('space--ready');
    expect(space).toHaveAttribute('data-space-renderer', 'worker');
    expect(container.querySelectorAll('.space-layer')).toHaveLength(3);
    expect(created).toHaveBeenCalledTimes(3);
    expect(workers[0].terminate).toHaveBeenCalledOnce();
  });

  it('bounds output pixels on large dense displays without changing the CSS sky box', () => {
    vi.stubGlobal('innerWidth', 3840);
    vi.stubGlobal('innerHeight', 2160);
    vi.stubGlobal('devicePixelRatio', 4);
    mount();
    runIdle();
    const { width, height, dpr, bleed } = workers[0].options;
    expect(width).toBe(3840);
    expect(height).toBe(2160);
    expect(dpr).toBeLessThanOrEqual(1.5);
    expect(Math.floor((width + bleed * 2) * dpr) * Math.floor((height + bleed * 2) * dpr)).toBeLessThanOrEqual(2_000_000);
  });

  it('keeps a pending worker through small viewport jitter within the same size bucket', () => {
    mount();
    runIdle();
    resize(1439, 1001);
    expect(workers[0].terminate).not.toHaveBeenCalled();
    expect(workers).toHaveLength(1);
    expect(idle.size).toBe(0);
  });

  it('terminates superseded workers and ignores their late messages', () => {
    const { container } = mount();
    runIdle();
    const stale = workers[0];
    resize(1000);
    expect(stale.terminate).toHaveBeenCalledOnce();
    runIdle();
    act(() => workers[1].deliver());
    const background = container.querySelector('.space-layer').style.backgroundImage;
    act(() => stale.deliver());
    expect(created).toHaveBeenCalledTimes(3);
    expect(container.querySelector('.space-layer').style.backgroundImage).toBe(background);
    expect(workers[1].options.width).toBe(1000);
  });

  it('cancels obsolete idle slots before a replacement build starts', () => {
    mount();
    const obsolete = idle.values().next().value;
    resize(1000);
    expect(window.cancelIdleCallback).toHaveBeenCalledOnce();
    act(() => obsolete());
    expect(workers).toHaveLength(0);
    runIdle();
    expect(workers[0].options.width).toBe(1000);
  });

  it('releases exactly the old three URLs on replacement and the new three on unmount', () => {
    const { unmount } = mount();
    runIdle();
    act(() => workers[0].deliver());
    resize(1000);
    runIdle();
    act(() => workers[1].deliver());
    expect(revoked.mock.calls.flat()).toEqual(['blob:sky-0', 'blob:sky-1', 'blob:sky-2']);
    unmount();
    expect(revoked.mock.calls.flat()).toEqual(Array.from({ length: 6 }, (_, i) => `blob:sky-${i}`));
  });

  it('cancels pending work and releases displayed URLs when switching themes', () => {
    const { getByRole, container } = mount();
    runIdle();
    act(() => workers[0].deliver());
    resize(1000);
    runIdle();
    fireEvent.click(getByRole('button', { name: 'Theme' }));
    expect(workers[1].terminate).toHaveBeenCalledOnce();
    expect(revoked).toHaveBeenCalledTimes(3);
    expect(container.querySelector('.space')).toHaveAttribute('data-space-renderer', 'pending');
    act(() => workers[1].deliver());
    expect(created).toHaveBeenCalledTimes(3);
    runIdle();
    expect(workers[2].options.mode).toBe('light');
    act(() => workers[2].deliver());
    expect(container.querySelector('.space')).toHaveClass('space--light', 'space--ready');
  });

  it('defers initial hidden generation and terminates unfinished work on hide', () => {
    visibility.mockReturnValue('hidden');
    const { container, unmount } = mount();
    expect(idle.size).toBe(0);
    expect(container.querySelector('.space')).toHaveClass('space--paused');
    setVisibility('visible');
    runIdle();
    setVisibility('hidden');
    expect(workers[0].terminate).toHaveBeenCalledOnce();
    act(() => workers[0].deliver());
    expect(created).not.toHaveBeenCalled();
    setVisibility('visible');
    runIdle();
    act(() => workers[1].deliver());
    setVisibility('hidden');
    setVisibility('visible');
    expect(idle.size).toBe(0);
    expect(created).toHaveBeenCalledTimes(3);
    unmount();
    expect(revoked).toHaveBeenCalledTimes(3);
  });

  it('cancels a queued idle callback on hide and on unmount', () => {
    const { unmount } = mount();
    setVisibility('hidden');
    expect(idle.size).toBe(0);
    setVisibility('visible');
    expect(idle.size).toBe(1);
    unmount();
    expect(idle.size).toBe(0);
    expect(window.cancelIdleCallback).toHaveBeenCalledTimes(2);
  });

  it('cancels the timer fallback when unmounted before worker startup', () => {
    vi.stubGlobal('requestIdleCallback', undefined);
    const { unmount } = mount();
    unmount();
    act(() => vi.advanceTimersByTime(15_000));
    expect(workers).toHaveLength(0);
  });

  it.each(['unsupported', 'constructor', 'postMessage', 'error', 'messageerror', 'timeout'])('uses static layers after a worker %s failure', (failure) => {
    if (failure === 'unsupported') vi.stubGlobal('OffscreenCanvas', undefined);
    if (failure === 'constructor') vi.stubGlobal('Worker', class { constructor() { throw new Error('blocked'); } });
    const { container } = mount();
    if (failure === 'postMessage') {
      vi.stubGlobal('Worker', class extends SkyWorker {
        postMessage = () => { throw new Error('clone failed'); };
      });
    }
    runIdle();
    if (failure === 'error') act(() => workers[0].onerror({ preventDefault: vi.fn() }));
    if (failure === 'messageerror') act(() => workers[0].onmessageerror());
    if (failure === 'timeout') act(() => vi.advanceTimersByTime(10_000));
    expect(container.querySelector('.space')).toHaveAttribute('data-space-renderer', 'fallback');
    expect(container.querySelectorAll('.space-layer')).toHaveLength(3);
    expect(created).not.toHaveBeenCalled();
    if (workers.length) expect(workers[0].terminate).toHaveBeenCalledOnce();
  });

  it.each(['missing blob', 'URL failure'])('releases partial URLs and retries the same viewport after %s', (failure) => {
    const { container } = mount();
    runIdle();
    if (failure === 'URL failure') created.mockImplementationOnce(() => 'blob:partial').mockImplementationOnce(() => { throw new Error('allocation'); });
    act(() => workers[0].deliver(failure === 'missing blob' ? { nebula: layers().nebula } : layers()));
    expect(revoked).toHaveBeenCalledOnce();
    expect(container.querySelector('.space')).toHaveAttribute('data-space-renderer', 'fallback');
    resize(1440);
    runIdle();
    act(() => workers[1].deliver());
    expect(container.querySelector('.space')).toHaveAttribute('data-space-renderer', 'worker');
  });

  it('retains the last complete sky when a resized generation fails', () => {
    const { container } = mount();
    runIdle();
    act(() => workers[0].deliver());
    const background = container.querySelector('.space-layer').style.backgroundImage;
    resize(1000);
    runIdle();
    act(() => workers[1].deliver(null));
    expect(container.querySelector('.space')).toHaveAttribute('data-space-renderer', 'worker');
    expect(container.querySelector('.space-layer').style.backgroundImage).toBe(background);
    expect(revoked).not.toHaveBeenCalled();
  });
});
