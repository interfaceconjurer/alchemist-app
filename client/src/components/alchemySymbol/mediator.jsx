import React, { useEffect, useRef, lazy, memo, Suspense } from 'react';
import './view.css';
import { GraphicsBoundary } from './GraphicsBoundary';
import { useSymbolVisibility } from './useSymbolVisibility';
import { profileObserver } from './profileObserver';

// One solid that carves itself into the next (faces grow 5→6→8→12→20).
const MorphingSolid = lazy(() => import('./MorphingSolid'));

/** Same box as the canvas, intentionally blank; keeps layout stable during startup. */
function SymbolPlaceholder({ reason }) {
  return <div className="symbol-placeholder" data-symbol-pending={reason} aria-hidden="true" />;
}

function AlchemySymbol() {
  const ref = useRef(null);
  const { active, visible, reducedMotion, started } = useSymbolVisibility(ref);
  useEffect(() => { profileObserver?.visibility({ at: performance.now(), active }); }, [active]);
  const renderState = reducedMotion ? 'reduced-motion' : active ? 'active' : 'paused';
  return (
    <article className="symbolContainer" ref={ref} data-render-state={renderState}>
      <section className="symbol" style={{ opacity: 1 }}>
        {/* The outline fallback is for real graphics failures only. While waiting to
            start or for the lazy chunk, render an empty placeholder so a normal load
            doesn't flash the outline before the crystal appears. Reduced motion fades
            the same crystal in and holds it still while only its light changes. */}
        {reducedMotion ? (
          <GraphicsBoundary>
            <Suspense fallback={<SymbolPlaceholder reason="loading" />}>
              <div className="symbol-transition symbol-visible"><MorphingSolid calm active={visible} /></div>
            </Suspense>
          </GraphicsBoundary>
        ) : !started ? <SymbolPlaceholder reason="paused" /> : (
          <GraphicsBoundary>
            <Suspense fallback={<SymbolPlaceholder reason="loading" />}>
              <div className="symbol-transition symbol-visible"><MorphingSolid active={active} /></div>
            </Suspense>
          </GraphicsBoundary>
        )}
      </section>
    </article>
  );
}

export default memo(AlchemySymbol);
