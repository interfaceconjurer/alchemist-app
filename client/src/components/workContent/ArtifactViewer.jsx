import React, { useCallback, useEffect, useRef } from "react";

/**
 * Full-screen viewer for a work item's visual artifacts: images, diagrams and
 * embedded documents (the deck). Built on the native modal <dialog>, which
 * provides the backdrop, focus containment, Escape to close and inert page
 * content. Focus returns to the artifact that opened it.
 *
 * `items`: [{ kind: 'image' | 'embed', src, alt?, title?, label?, description?, width?, height? }]
 * `index`: the open item, or null when closed.
 */
export default function ArtifactViewer({ items, index, onIndexChange, onClose }) {
  const dialogRef = useRef(null);
  const open = index !== null && index >= 0 && index < items.length;
  const item = open ? items[index] : null;
  const count = items.length;

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

  const onKeyDown = (e) => {
    // Arrow keys page through a gallery; an embedded deck keeps its own keys
    // because it receives them inside its frame.
    if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
  };

  // Clicking empty space around the artifact closes; the artifact and controls don't.
  const onClick = (e) => {
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
        <div className="artifact-viewer-frame">
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
              <img key={item.src} className="artifact-viewer-image" src={item.src} alt={item.alt || ""} decoding="async" />
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
