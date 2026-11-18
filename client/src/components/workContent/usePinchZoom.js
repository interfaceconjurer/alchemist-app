import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Zoom and pan for the image in the artifact viewer. Pinching the picture zooms
 * the picture only, so the viewer's controls and caption stay put (pinching
 * anywhere else still zooms the page as usual). Zoom is capped at MAX_ZOOM to
 * bound how large the browser has to rasterize the artwork.
 *
 * Every gesture has a single-pointer or keyboard alternative (WCAG 2.5.1):
 * double-tap or double-click toggles DOUBLE_TAP_ZOOM at that point, drag pans
 * while zoomed, and `zoomBy` serves the viewer's + / - / 0 keys. A trackpad pinch
 * (a wheel event with ctrlKey) zooms the picture too.
 *
 * `resetKey`: the open image; changing it returns to the fitted view.
 * Returns `{ ref, handlers, style, zoomed, zoomBy, reset }`: put `ref` and
 * `handlers` on the box that clips the image, and `style` on the image.
 */
export const MAX_ZOOM = 4;
export const DOUBLE_TAP_ZOOM = 2.5;
const DOUBLE_TAP_MS = 300;
const TAP_SLOP = 10; // px a tap may move and still count as a tap
const FIT = { scale: 1, x: 0, y: 0 };

/** The view, kept within [1, MAX_ZOOM] and with the image always covering the box. */
export function clampView({ scale, x, y }, width, height) {
  const s = Math.min(MAX_ZOOM, Math.max(1, scale));
  return {
    scale: s,
    x: Math.min(0, Math.max(width - width * s, x)),
    y: Math.min(0, Math.max(height - height * s, y)),
  };
}

/** Scale `view` to `scale` about the box point (px, py), which stays where it is. */
export function zoomAbout(view, scale, px, py) {
  const k = scale / view.scale;
  return { scale, x: px - (px - view.x) * k, y: py - (py - view.y) * k };
}

export function usePinchZoom(resetKey) {
  const [box, setBox] = useState(null);
  const [view, setView] = useState(FIT);
  const [active, setActive] = useState(false); // a gesture is under way
  const viewRef = useRef(FIT);
  const pointers = useRef(new Map());
  const gesture = useRef(null);
  const lastTap = useRef(null);

  const commit = useCallback((next) => {
    if (!box) return;
    const clamped = clampView(next, box.clientWidth, box.clientHeight);
    viewRef.current = clamped;
    setView(clamped);
  }, [box]);
  const reset = useCallback(() => { viewRef.current = FIT; setView(FIT); }, []);

  const point = useCallback((e) => {
    const r = box.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }, [box]);

  /** Zoom by `factor` about the box centre (keyboard). */
  const zoomBy = useCallback((factor) => {
    if (!box) return;
    const v = viewRef.current;
    commit(zoomAbout(v, Math.min(MAX_ZOOM, Math.max(1, v.scale * factor)), box.clientWidth / 2, box.clientHeight / 2));
  }, [box, commit]);

  const toggleAt = useCallback((p) => {
    commit(viewRef.current.scale > 1 ? FIT : zoomAbout(viewRef.current, DOUBLE_TAP_ZOOM, p.x, p.y));
  }, [commit]);

  // A new image, or a new box size, starts from the fitted view.
  useEffect(reset, [resetKey, reset]);
  useEffect(() => {
    window.addEventListener("resize", reset);
    return () => window.removeEventListener("resize", reset);
  }, [reset]);

  useEffect(() => {
    if (!box) return undefined;
    // WebKit: stop a pinch that starts on the picture from also zooming the page.
    const stop = (e) => e.preventDefault();
    // Trackpad pinch arrives as ctrl + wheel; zoom the picture, not the page.
    const onWheel = (e) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const r = box.getBoundingClientRect();
      const v = viewRef.current;
      commit(zoomAbout(v, Math.min(MAX_ZOOM, Math.max(1, v.scale * Math.exp(-e.deltaY / 100))), e.clientX - r.left, e.clientY - r.top));
    };
    box.addEventListener("gesturestart", stop);
    box.addEventListener("gesturechange", stop);
    box.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      box.removeEventListener("gesturestart", stop);
      box.removeEventListener("gesturechange", stop);
      box.removeEventListener("wheel", onWheel);
    };
  }, [box, commit]);

  const startGesture = () => {
    const [a, b] = [...pointers.current.values()];
    gesture.current = b
      ? { type: "pinch", view: viewRef.current, distance: Math.hypot(b.x - a.x, b.y - a.y) || 1, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } }
      : { type: "pan", view: viewRef.current, start: a, moved: false };
  };

  const onPointerDown = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    box.setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, point(e));
    if (pointers.current.size > 2) return;
    setActive(true);
    startGesture();
  };

  const onPointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, point(e));
    const g = gesture.current;
    if (!g) return;
    if (g.type === "pinch" && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const scale = Math.min(MAX_ZOOM, Math.max(1, g.view.scale * (Math.hypot(b.x - a.x, b.y - a.y) / g.distance)));
      // Zoom about where the pinch began, then follow the fingers as they move.
      const zoomed = zoomAbout(g.view, scale, g.mid.x, g.mid.y);
      commit({ scale, x: zoomed.x + mid.x - g.mid.x, y: zoomed.y + mid.y - g.mid.y });
    } else if (g.type === "pan") {
      const p = pointers.current.get(e.pointerId);
      const dx = p.x - g.start.x;
      const dy = p.y - g.start.y;
      if (Math.hypot(dx, dy) > TAP_SLOP) g.moved = true;
      if (g.view.scale > 1) commit({ scale: g.view.scale, x: g.view.x + dx, y: g.view.y + dy });
    }
  };

  const onPointerEnd = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    const p = pointers.current.get(e.pointerId);
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (pointers.current.size > 0) {
      startGesture(); // a pinch that lost a finger carries on as a pan
      return;
    }
    gesture.current = null;
    setActive(false);
    // Double-tap (touch and pen; a mouse uses dblclick) toggles the zoom.
    if (e.type !== "pointerup" || e.pointerType === "mouse" || g?.type !== "pan" || g.moved) return;
    const now = e.timeStamp;
    const last = lastTap.current;
    if (last && now - last.at < DOUBLE_TAP_MS && Math.hypot(p.x - last.x, p.y - last.y) < TAP_SLOP * 3) {
      lastTap.current = null;
      toggleAt(p);
    } else {
      lastTap.current = { at: now, x: p.x, y: p.y };
    }
  };

  const onDoubleClick = (e) => { if (box) toggleAt(point(e)); };

  return {
    ref: setBox,
    handlers: { onPointerDown, onPointerMove, onPointerUp: onPointerEnd, onPointerCancel: onPointerEnd, onDoubleClick },
    // Rasterize as a layer only mid-gesture, so the picture re-renders sharp once it settles.
    style: view.scale === 1 && !active ? undefined : {
      transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
      willChange: active ? "transform" : undefined,
    },
    zoomed: view.scale > 1,
    zoomBy,
    reset,
  };
}
