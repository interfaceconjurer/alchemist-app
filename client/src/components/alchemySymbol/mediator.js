import React from 'react';
import FlowerOfLife3D from './FlowerOfLife3D';
import './view.css';

// Simplified mediator that renders the 3D Flower of Life
function AlchemySymbol() {
  return (
    <article className="symbolContainer">
      <section className="symbol" style={{ opacity: 1 }}>
        <FlowerOfLife3D />
      </section>
    </article>
  );
}

export default AlchemySymbol;