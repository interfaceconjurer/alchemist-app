import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import './view.css';

const Pyramid3D = lazy(() => import('./Pyramid3D'));
const Cube3D = lazy(() => import('./Cube3D'));
const Octahedron3D = lazy(() => import('./Octahedron3D'));
const Dodecahedron3D = lazy(() => import('./Dodecahedron3D'));
const Icosahedron3D = lazy(() => import('./Icosahedron3D'));

const MorphingSolid = lazy(() => import('./MorphingSolid'));

const COMPONENTS = [Pyramid3D, Cube3D, Octahedron3D, Dodecahedron3D, Icosahedron3D];

// 'morph': one solid that carves itself into the next (faces grow 5→6→8→12→20).
// 'fade':  the original cross-fade between separate canvases.
const TRANSITION = 'morph';

const HOLD_DURATION = 5000; // How long to display each shape
const SHRINK_DURATION = 1600; // Shrink-out time (ms) — matches CSS
const GROW_DURATION = 1600; // Grow-in time (ms) — matches CSS

// Phases: 'showing' -> 'shrinking' -> 'growing' -> 'showing'
function AlchemySymbol() {
  if (TRANSITION === 'morph') {
    return (
      <article className="symbolContainer">
        <section className="symbol" style={{ opacity: 1 }}>
          <div className="symbol-transition symbol-visible">
            <Suspense fallback={null}>
              <MorphingSolid />
            </Suspense>
          </div>
        </section>
      </article>
    );
  }
  return <FadeSequence />;
}

function FadeSequence() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [phase, setPhase] = useState('growing');

  const advanceShape = useCallback(() => {
    setPhase('shrinking');
  }, []);

  useEffect(() => {
    if (phase === 'showing') {
      const timer = setTimeout(advanceShape, HOLD_DURATION);
      return () => clearTimeout(timer);
    }

    if (phase === 'shrinking') {
      const timer = setTimeout(() => {
        setActiveIndex((prev) => (prev + 1) % COMPONENTS.length);
        setPhase('growing');
      }, SHRINK_DURATION);
      return () => clearTimeout(timer);
    }

    if (phase === 'growing') {
      const timer = setTimeout(() => {
        setPhase('showing');
      }, GROW_DURATION);
      return () => clearTimeout(timer);
    }
  }, [phase, advanceShape]);

  const ActiveComponent = COMPONENTS[activeIndex];

  let wrapperClass = 'symbol-transition';
  if (phase === 'shrinking') wrapperClass += ' symbol-shrink';
  else if (phase === 'growing') wrapperClass += ' symbol-grow';
  else wrapperClass += ' symbol-visible';

  return (
    <article className="symbolContainer">
      <section className="symbol" style={{ opacity: 1 }}>
        <div className={wrapperClass}>
          <Suspense fallback={null}>
            <ActiveComponent />
          </Suspense>
        </div>
      </section>
    </article>
  );
}

export default AlchemySymbol;
