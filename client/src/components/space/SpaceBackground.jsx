import React, { useEffect, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import './space.css';

// Oversize each layer so its slow drift never reveals an edge.
const BLEED = 48;
const MAX_DPR = 1.5;
// Bound the three decoded textures to 6M pixels, including on large displays.
const MAX_LAYER_PIXELS = 2_000_000;
const KINDS = ['nebula', 'far', 'near'];
const revoke = (urls) => Object.values(urls).forEach((url) => URL.revokeObjectURL(url));

/**
 * Rasterize the sky in a worker; only CSS motion runs between regenerations.
 * Composited layers still share GPU memory/bandwidth with the crystal, so their
 * resolution is bounded. Unsupported workers use a static CSS sky.
 */
export default function SpaceBackground() {
  const { theme } = useTheme();
  const mode = theme === 'dark' ? 'dark' : 'light';
  const [urls, setUrls] = useState(null);
  const [renderer, setRenderer] = useState('pending');
  const [paused, setPaused] = useState(() => document.visibilityState === 'hidden');

  useEffect(() => {
    let active = null;
    let displayed = {};
    let completedKey = '';
    let resizeTimer;
    let disposed = false;
    setUrls(null);
    setRenderer('pending');

    const cancel = () => {
      const previous = active;
      active = null;
      previous?.cancelIdle?.();
      clearTimeout(previous?.timeout);
      previous?.worker?.terminate();
    };
    const fail = (job) => {
      if (active !== job) return;
      cancel();
      // Retain a successful sky if a later resize fails.
      if (!Object.keys(displayed).length) setRenderer('fallback');
    };
    const request = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const density = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const dpr = Math.min(density, Math.sqrt(MAX_LAYER_PIXELS / ((width + BLEED * 2) * (height + BLEED * 2))));
      // The key uses display density, not the area-adjusted DPR, so small mobile
      // viewport jitters within a bucket do not repeatedly cancel generation.
      const key = `${Math.ceil(width / 160)}x${Math.ceil(height / 160)}@${density}`;
      return { key, width, height, dpr, bleed: BLEED, mode };
    };
    const build = () => {
      if (disposed || document.visibilityState === 'hidden') return;
      const options = request();
      if (options.key === active?.key) return;
      cancel();
      if (options.key === completedKey) return;
      const job = { key: options.key };
      active = job;
      const start = () => {
        if (active !== job) return;
        job.cancelIdle = null;
        try {
          if (typeof Worker !== 'function' || typeof OffscreenCanvas !== 'function') {
            fail(job);
            return;
          }
          const worker = new Worker(new URL('./space.worker.js', import.meta.url), { type: 'module' });
          job.worker = worker;
          worker.onerror = (event) => { event.preventDefault(); fail(job); };
          worker.onmessageerror = () => fail(job);
          worker.onmessage = ({ data }) => {
            if (active !== job) return;
            const next = {};
            try {
              // All three layers must be usable before replacing the current sky.
              for (const kind of KINDS) {
                if (!(data?.[kind] instanceof Blob) || !data[kind].size) throw new Error('Invalid sky layer');
                next[kind] = URL.createObjectURL(data[kind]);
              }
            } catch {
              revoke(next);
              fail(job);
              return;
            }
            const previous = displayed;
            displayed = next;
            completedKey = job.key;
            cancel();
            setUrls(next);
            setRenderer('worker');
            revoke(previous);
          };
          job.timeout = setTimeout(() => fail(job), 10_000);
          worker.postMessage(options);
        } catch {
          fail(job);
        }
      };
      // Creating the worker is deferred; all rasterization/PNG encoding happens
      // off the main thread, including when an idle deadline expires.
      if (typeof window.requestIdleCallback === 'function') {
        const id = window.requestIdleCallback(start, { timeout: 1500 });
        job.cancelIdle = () => window.cancelIdleCallback?.(id);
      } else {
        const id = setTimeout(start, 200);
        job.cancelIdle = () => clearTimeout(id);
      }
    };
    const onResize = () => {
      clearTimeout(resizeTimer);
      const { key } = request();
      if (key === active?.key) return;
      cancel();
      if (key !== completedKey) resizeTimer = setTimeout(build, 250);
    };
    const onVisibility = () => {
      const hidden = document.visibilityState === 'hidden';
      setPaused(hidden);
      clearTimeout(resizeTimer);
      if (hidden) cancel();
      else build();
    };
    build();
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      disposed = true;
      cancel();
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      revoke(displayed);
    };
  }, [mode]);

  const ready = renderer !== 'pending';
  return (
    <div className={`space space--${mode}${ready ? ' space--ready' : ''}${renderer === 'fallback' ? ' space--fallback' : ''}${paused ? ' space--paused' : ''}`} data-space-renderer={renderer} aria-hidden="true">
      {ready && KINDS.map((kind) => (
        <div key={kind} className={`space-layer space-layer--${kind}`} style={urls ? { backgroundImage: `url(${urls[kind]})` } : undefined} />
      ))}
      <div className="space-vignette" />
    </div>
  );
}
