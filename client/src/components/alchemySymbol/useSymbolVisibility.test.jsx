import React, { useRef } from 'react';
import { act, render, screen } from '@testing-library/react';
import { useSymbolVisibility } from './useSymbolVisibility';

function Probe() {
  const ref = useRef();
  const policy = useSymbolVisibility(ref);
  return <div ref={ref} data-testid="policy" data-active={policy.active} data-visible={policy.visible} data-reduced={policy.reducedMotion} data-started={policy.started} />;
}

it('waits for visibility, then pauses without discarding the mounted scene', () => {
  let observer;
  const disconnect = vi.fn();
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback) { observer = callback; }
    observe() {}
    disconnect = disconnect;
  });
  try {
    const { unmount } = render(<Probe />);
    const probe = screen.getByTestId('policy');
    expect(probe).toHaveAttribute('data-started', 'false');
    act(() => observer([{ isIntersecting: true }]));
    expect(probe).toHaveAttribute('data-active', 'true');
    expect(probe).toHaveAttribute('data-started', 'true');
    act(() => observer([{ isIntersecting: false }]));
    expect(probe).toHaveAttribute('data-active', 'false');
    expect(probe).toHaveAttribute('data-started', 'true');
    unmount();
    expect(disconnect).toHaveBeenCalledTimes(1);
  } finally { vi.unstubAllGlobals(); }
});

it('observes live reduced-motion preferences and cleans up their listener', () => {
  let change;
  const query = { matches: true, addEventListener: vi.fn((event, listener) => { change = listener; }), removeEventListener: vi.fn() };
  const media = vi.spyOn(window, 'matchMedia').mockReturnValue(query);
  try {
    const { unmount } = render(<Probe />);
    expect(screen.getByTestId('policy')).toHaveAttribute('data-reduced', 'true');
    expect(screen.getByTestId('policy')).toHaveAttribute('data-active', 'false');
    // Still visible: reduced motion keeps rendering its calm crystal.
    expect(screen.getByTestId('policy')).toHaveAttribute('data-visible', 'true');
    act(() => { query.matches = false; change(); });
    expect(screen.getByTestId('policy')).toHaveAttribute('data-active', 'true');
    unmount();
    expect(query.removeEventListener).toHaveBeenCalledWith('change', change);
  } finally { media.mockRestore(); }
});

it('suspends rendering while the document is hidden', () => {
  const original = Object.getOwnPropertyDescriptor(document, 'visibilityState');
  try {
    render(<Probe />);
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(screen.getByTestId('policy')).toHaveAttribute('data-active', 'false');
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(screen.getByTestId('policy')).toHaveAttribute('data-active', 'true');
  } finally {
    if (original) Object.defineProperty(document, 'visibilityState', original);
    else delete document.visibilityState;
  }
});
