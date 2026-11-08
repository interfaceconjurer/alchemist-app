import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { renderLayer } from './spaceField';
import './space.css';

// How far (CSS px) each layer is oversized so the slow drift never shows an edge.
const BLEED = 48;
// Cap the backdrop's pixel density: it's soft, distant detail, and this keeps
// generation fast on very dense displays.
const MAX_DPR = 1.5;
const KINDS = ['nebula', 'far', 'near'];

function canvasFactory(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function toBlobUrl(canvas) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob ? URL.createObjectURL(blob) : null), 'image/png');
  });
}

/**
 * Fixed, full-window deep-space layer behind the app (dark mode only).
 * Generated once per viewport size; animated purely with CSS so it costs
 * nothing per frame on the main thread or the symbol's GPU budget.
 */
export default function SpaceBackground() {
  const { isDark } = useTheme();
  const [urls, setUrls] = useState(null);
  const [paused, setPaused] = useState(() => document.visibilityState === 'hidden');
  const sizeKey = useRef('');

  // Generate (and regenerate on meaningful resize) only while dark mode is on.
  useEffect(() => {
    if (!isDark) return undefined;
    let cancelled = false;
    let created = [];
    let timer;

    const build = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      // Round so small viewport jitters (mobile URL bar) don't regenerate.
      const key = `${Math.ceil(width / 160)}x${Math.ceil(height / 160)}@${dpr}`;
      if (key === sizeKey.current) return;
      sizeKey.current = key;
      const idle = window.requestIdleCallback ?? ((fn) => setTimeout(fn, 200));
      const nextIdle = () => new Promise((resolve) => idle(resolve, { timeout: 1500 }));
      const render = async () => {
        const next = {};
        for (const kind of KINDS) {
          // One layer per idle slot keeps each task short (~25-30 ms) instead
          // of one long task, so input and the symbol's startup stay responsive.
          await nextIdle();
          if (cancelled) break;
          const canvas = renderLayer(kind, { width, height, dpr, bleed: BLEED, createCanvas: canvasFactory });
          next[kind] = await toBlobUrl(canvas);
          if (cancelled) break;
        }
        if (cancelled) { Object.values(next).forEach((u) => u && URL.revokeObjectURL(u)); return; }
        const previous = created;
        created = Object.values(next).filter(Boolean);
        setUrls(next);
        previous.forEach((u) => URL.revokeObjectURL(u));
      };
      // Deferred off the critical path (idle slots) so first paint and the symbol start first.
      render();
    };

    build();
    const onResize = () => { clearTimeout(timer); timer = setTimeout(build, 250); };
    window.addEventListener('resize', onResize);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      window.removeEventListener('resize', onResize);
      created.forEach((u) => URL.revokeObjectURL(u));
      sizeKey.current = '';
      setUrls(null);
    };
  }, [isDark]);

  // Pause CSS motion when the tab is hidden (reduced motion is handled in CSS).
  useEffect(() => {
    const onVisibility = () => setPaused(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  if (!isDark) return null;
  return (
    <div className={`space${urls ? ' space--ready' : ''}${paused ? ' space--paused' : ''}`} aria-hidden="true">
      {urls && KINDS.map((kind) => (
        <div key={kind} className={`space-layer space-layer--${kind}`} style={{ backgroundImage: `url(${urls[kind]})` }} />
      ))}
      <div className="space-vignette" />
    </div>
  );
}
