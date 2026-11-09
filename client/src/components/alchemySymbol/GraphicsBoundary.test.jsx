import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { GraphicsBoundary, useGraphicsFailure } from './GraphicsBoundary';

it('keeps the application usable when graphics construction throws', () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  function BrokenScene() { throw new Error('Graphics unavailable'); }
  try {
    render(<main><button>Search work</button><GraphicsBoundary><BrokenScene /></GraphicsBoundary></main>);
    expect(screen.getByRole('button', { name: 'Search work' })).toBeVisible();
    expect(screen.getByRole('img', { name: 'Crystal symbol' })).toHaveAttribute('data-symbol-fallback', 'unavailable');
  } finally { consoleError.mockRestore(); }
});

it('contains asynchronous render and device failures reported by the runtime', () => {
  function Scene() {
    const fail = useGraphicsFailure();
    return <button onClick={fail}>Simulate device loss</button>;
  }
  render(<GraphicsBoundary><Scene /></GraphicsBoundary>);
  fireEvent.click(screen.getByRole('button', { name: 'Simulate device loss' }));
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'Crystal symbol' })).toBeVisible();
});
