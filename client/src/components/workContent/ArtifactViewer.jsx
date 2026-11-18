import React, { useCallback, useEffect, useRef } from "react";
import { coverPage } from "../../utils/pageCover";
import { usePinchZoom } from "./usePinchZoom";

/** How far a finger must travel sideways to page (CSS px). */
export const SWIPE_PX = 50;

/**
 * Full-screen viewer for a work item's visual artifacts: images, diagrams and
 * embedded documents (the deck). Built on the native modal <dialog>, which
 * provides the backdrop, focus containment, Escape to close and inert page
 * content. Focus returns to the artifact that opened it.
 *
 * Pinching an image zooms the image alone (see usePinchZoom); double-tap, drag
 * and the + / - / 0 keys do the same without a gesture. Swiping left or right
 * pages through the gallery, alongside the previous / next buttons and arrow keys.
 *
 * `items`: [{ kind: 'image' | 'embed', src, alt?, title?, label?, description?, width?, height? }]
 * `index`: the open item, or null when closed.
 */
export default function ArtifactViewer({ items, index, onIndexChange, onClose }) {
  const dialogRef = useRef(null);
  const open = index !== null && index >= 0 && index < items.length;
  const item = open ? items[index] : null;
  const count = items.length;

  const zoom = usePinchZoom(open ? item.src : null);

  // The viewer is opaque and fills the screen: pause what's behind it (the crystal).
  useEffect(() => (open ? coverPage() : undefined), [open]);

  const returnFocus = useRef(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnFocus.current = document.activeElement;
      dialog.showModal();
    }
    if (!open && dialog.open) dialog.close();
    if (!open && returnFocus.current) {
      returnFocus.current.focus?.({ preventScroll: true });
      returnFocus.current = null;
    }
  }, [open]);

  // An embedded deck receives keys inside its own frame: move focus there so the
  // arrow keys drive the slides at once, and let Escape inside it close the viewer.
  const onEmbedLoad = (e) => {
    const win = e.currentTarget.contentWindow;
    if (!win) return;
    try {
      win.addEventListener("keydown", (event) => { if (event.key === "Escape") onClose(); });
      win.focus();
    } catch { /* cross-origin embeds keep the default focus */ }
  };

  const step = useCallback((delta) => {
    if (!open || count < 2) return;
    onIndexChange((index + delta + count) % count);
  }, [open, count, index, onIndexChange]);

  // Swipe to page, so a thumb doesn't have to reach the buttons. One finger,
  // mostly sideways, anywhere in the viewer; never while the image is zoomed in
  // (dragging pans it then) or during a pinch. An embedded deck swipes its own
  // slides inside its frame. Touches report through pointer events, which bubble
  // here from the image even while it captures the pointer.
  // `down` holds the fingers on the screen; `swipe` is the swipe being tracked,
  // dropped by a second finger or a zoomed image. A new one starts only once
  // every finger has lifted.
  const down = useRef(new Set());
  const swipe = useRef(null);
  const swiped = useRef(false);
  const onSwipeStart = (e) => {
    swiped.current = false;
    if (e.pointerType === "mouse") return;
    down.current.add(e.pointerId);
    swipe.current = down.current.size === 1 && count > 1 && !zoom.zoomed
      ? { id: e.pointerId, x: e.clientX, y: e.clientY }
      : null;
  };
  const onSwipeEnd = (e) => {
    if (!down.current.delete(e.pointerId)) return;
    const s = swipe.current;
    swipe.current = null;
    if (!s || s.id !== e.pointerId || e.type !== "pointerup") return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    swiped.current = true; // the click that follows isn't a tap on the backdrop
    step(dx < 0 ? 1 : -1);
  };

  const onKeyDown = (e) => {
    // Arrow keys page through a gallery; an embedded deck keeps its own keys
    // because it receives them inside its frame.
    if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
    else if (item?.kind !== "embed" && (e.key === "+" || e.key === "=")) { e.preventDefault(); zoom.zoomBy(1.5); }
    else if (item?.kind !== "embed" && e.key === "-") { e.preventDefault(); zoom.zoomBy(1 / 1.5); }
    else if (item?.kind !== "embed" && e.key === "0") { e.preventDefault(); zoom.reset(); }
  };

  // Clicking empty space around the artifact closes; the artifact and controls don't.
  const onClick = (e) => {
    if (swiped.current) { swiped.current = false; return; }
    if (e.target === e.currentTarget || e.target.classList?.contains("artifact-viewer-frame") || e.target.classList?.contains("artifact-viewer-stage")) onClose();
  };

  const titleId = "artifact-viewer-title";
  const heading = item?.label || item?.title || item?.alt;

  return (
    <dialog
      ref={dialogRef}
      className="artifact-viewer"
      aria-labelledby={heading ? titleId : undefined}
      aria-label={heading ? undefined : "Artifact"}
      onClose={onClose}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onKeyDown={onKeyDown}
      onClick={onClick}
    >
      {item && (
        <div className="artifact-viewer-frame" onPointerDown={onSwipeStart} onPointerUp={onSwipeEnd} onPointerCancel={onSwipeEnd}>
          <div className="artifact-viewer-toolbar">
            {count > 1 && <span className="artifact-viewer-count" aria-live="polite">{index + 1} / {count}</span>}
            <button type="button" className="artifact-viewer-close" onClick={onClose} aria-label="Close" autoFocus>×</button>
          </div>

          <div className="artifact-viewer-stage">
            {count > 1 && (
              <button type="button" className="artifact-viewer-nav artifact-viewer-nav--prev" onClick={() => step(-1)} aria-label="Previous">‹</button>
            )}
            {item.kind === "embed" ? (
              <div className="artifact-viewer-embed" style={{ aspectRatio: `${item.width || 16} / ${item.height || 9}`, "--artifact-ratio": `${item.width || 16} / ${item.height || 9}` }}>
                <iframe key={item.src} src={item.src} title={item.title || item.label} allow="fullscreen" allowFullScreen onLoad={onEmbedLoad} />
              </div>
            ) : (
              // The box clips the zoomed picture; it keeps the image's place in the layout.
              <div ref={zoom.ref} className="artifact-viewer-image" data-zoomed={zoom.zoomed || undefined} {...zoom.handlers}>
                <img key={item.src} src={item.src} alt={item.alt || ""} decoding="async" draggable={false} style={zoom.style} />
              </div>
            )}
            {count > 1 && (
              <button type="button" className="artifact-viewer-nav artifact-viewer-nav--next" onClick={() => step(1)} aria-label="Next">›</button>
            )}
          </div>

          {(heading || item.description) && (
            <div className="artifact-viewer-caption">
              {heading && <h2 className="artifact-viewer-title" id={titleId}>{heading}</h2>}
              {item.description && <p className="artifact-viewer-description">{item.description}</p>}
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}
