import React, { useState, useEffect, useCallback } from 'react';
import MetatronsCube3D from './MetatronsCube3D';
import FlowerOfLife3D from './FlowerOfLife3D';
import Tetrahedron3D from './Tetrahedron3D';
import Cube3D from './Cube3D';
import Octahedron3D from './Octahedron3D';
import Dodecahedron3D from './Dodecahedron3D';
import Icosahedron3D from './Icosahedron3D';
import './view.css';

const COMPONENTS = [Tetrahedron3D, Cube3D, Octahedron3D, Dodecahedron3D, Icosahedron3D];

// const COMPONENTS = [Icosahedron3D];
const HOLD_DURATION = 5000; // How long to display each shape
const SHRINK_DURATION = 1600; // Shrink-out time (ms) — matches CSS
const GROW_DURATION = 1600; // Grow-in time (ms) — matches CSS

// Phases: 'showing' -> 'shrinking' -> 'growing' -> 'showing'
function AlchemySymbol() {
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
          <ActiveComponent />
        </div>
      </section>
    </article>
  );
}

export default AlchemySymbol;
