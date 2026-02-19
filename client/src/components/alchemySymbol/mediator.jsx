import React, { useState, useEffect } from 'react';
import MetatronsCube3D from './MetatronsCube3D';
import FlowerOfLife3D from './FlowerOfLife3D';
import './view.css';

const COMPONENTS = [MetatronsCube3D, FlowerOfLife3D];
const CYCLE_DURATION = 6000; // Matches internal animation cycle

function AlchemySymbol() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % COMPONENTS.length);
    }, CYCLE_DURATION);
    return () => clearInterval(timer);
  }, []);

  const ActiveComponent = COMPONENTS[activeIndex];

  return (
    <article className="symbolContainer">
      <section className="symbol" style={{ opacity: 1 }}>
        <ActiveComponent />
      </section>
    </article>
  );
}

export default AlchemySymbol;