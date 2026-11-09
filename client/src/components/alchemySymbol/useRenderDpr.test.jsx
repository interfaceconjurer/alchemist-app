import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { useRenderDpr } from './useRenderDpr';

it('keeps the adapted DPR across parent/theme rerenders', () => {
  const descriptor = Object.getOwnPropertyDescriptor(window, 'devicePixelRatio');
  Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 2 });
  try {
    const { result, rerender } = renderHook(() => useRenderDpr());
    expect(result.current.dpr).toBe(1.5);
    act(() => result.current.lowerDpr(1.25));
    rerender();
    expect(result.current.dpr).toBe(1.25);
    act(() => result.current.lowerDpr(0.75));
    rerender();
    expect(result.current.dpr).toBe(0.75);
    act(() => result.current.lowerDpr(1.5));
    expect(result.current.dpr).toBe(0.75);
  } finally { Object.defineProperty(window, 'devicePixelRatio', descriptor); }
});

it('honors a lower-density display without discarding the adaptive ceiling', () => {
  const descriptor = Object.getOwnPropertyDescriptor(window, 'devicePixelRatio');
  Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 2 });
  try {
    const { result } = renderHook(() => useRenderDpr());
    act(() => result.current.lowerDpr(1.25));
    Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 1 });
    act(() => window.dispatchEvent(new Event('resize')));
    expect(result.current.dpr).toBe(1);
    Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 2 });
    act(() => window.dispatchEvent(new Event('resize')));
    expect(result.current.dpr).toBe(1.25);
  } finally { Object.defineProperty(window, 'devicePixelRatio', descriptor); }
});


it('rejects invalid adaptation requests, clamps the floor, and never raises quality', () => {
  const { result } = renderHook(() => useRenderDpr());
  const initial = result.current.dpr;
  act(() => { result.current.lowerDpr(NaN); result.current.lowerDpr(Infinity); });
  expect(result.current.dpr).toBe(initial);
  act(() => result.current.lowerDpr(-1));
  expect(result.current.dpr).toBe(0.75);
  act(() => result.current.lowerDpr(2));
  expect(result.current.dpr).toBe(0.75);
});
