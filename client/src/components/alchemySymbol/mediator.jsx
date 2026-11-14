import React, { useCallback, useEffect, useRef, useState, lazy, memo, Suspense } from 'react';
import './view.css';
import { GraphicsBoundary } from './GraphicsBoundary';
import { useSymbolVisibility } from './useSymbolVisibility';
import { profileObserver } from './profileObserver';
import { CrystalLoader, useCrystalLoader, previewDelayMs } from './CrystalLoader';

// One solid that carves itself into the next (faces grow 5→6→8→12→20).
const MorphingSolid = lazy(() => {
  // Dev-only: ?crystal-delay=<ms> simulates a slow download (see CrystalLoader.jsx).
  const delay = previewDelayMs();
  const chunk = import('./MorphingSolid');
  return delay ? Promise.all([chunk, new Promise((r) => setTimeout(r, delay))]).then(([m]) => m) : chunk;
});

/** Same box as the canvas, intentionally blank; keeps layout stable during startup. */
function SymbolPlaceholder({ reason }) {
  return <div className="symbol-placeholder" data-symbol-pending={reason} aria-hidden="true" />;
}

function AlchemySymbol() {
  const ref = useRef(null);
  const { active, visible, reducedMotion, started } = useSymbolVisibility(ref);
  useEffect(() => { profileObserver?.visibility({ at: performance.now(), active }); }, [active]);
  const renderState = reducedMotion ? 'reduced-motion' : active ? 'active' : 'paused';
  // Loading until the crystal draws its first frame. A graphics failure shows the
  // outline instead, which also ends loading (GraphicsBoundary's onFailure).
  const [drawn, setDrawn] = useState(false);
  const markDrawn = useCallback(() => setDrawn(true), []);
  const loader = useCrystalLoader((started || reducedMotion) && !drawn);
  // While the loader is up (and fading), the crystal is hidden and paused at its
  // first frame; it starts its intro once the loader has gone.
  const held = loader.holding;
  return (
    <article className="symbolContainer" ref={ref} data-render-state={renderState} data-crystal-held={held || undefined}>
      <CrystalLoader visible={loader.visible} />
      <section className="symbol" style={{ opacity: held ? 0 : 1, transition: 'opacity 200ms ease' }}>
        {/* The outline fallback is for real graphics failures only. While waiting to
            start or for the lazy chunk, render an empty placeholder so a normal load
            doesn't flash the outline before the crystal appears. Reduced motion fades
            the same crystal in and holds it still while only its light changes. */}
        {reducedMotion ? (
          <GraphicsBoundary onFailure={markDrawn}>
            <Suspense fallback={<SymbolPlaceholder reason="loading" />}>
              <div className="symbol-transition symbol-visible"><MorphingSolid calm active={visible} held={held} onFirstFrame={markDrawn} /></div>
            </Suspense>
          </GraphicsBoundary>
        ) : !started ? <SymbolPlaceholder reason="paused" /> : (
          <GraphicsBoundary onFailure={markDrawn}>
            <Suspense fallback={<SymbolPlaceholder reason="loading" />}>
              <div className="symbol-transition symbol-visible"><MorphingSolid active={active} held={held} onFirstFrame={markDrawn} /></div>
            </Suspense>
          </GraphicsBoundary>
        )}
      </section>
    </article>
  );
}

export default memo(AlchemySymbol);
