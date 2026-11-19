import React from 'react';
import { act, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { CrystalLoader, CrystalLoaderFrame, useCrystalLoader, FADE_MS, FRAMES, FRAME_MS, MIN_CYCLES, MIN_VISIBLE_MS, SHOW_AFTER_MS } from './CrystalLoader';
import { GraphicsBoundary } from './GraphicsBoundary';

// `loading`: the crystal hasn't drawn yet. Turning it false reports the first frame.
function Slot({ loading }) {
  const { visible, holding, markDrawn } = useCrystalLoader(true);
  React.useEffect(() => { if (!loading) markDrawn(); }, [loading, markDrawn]);
  return <div data-holding={holding}><CrystalLoader visible={visible} /></div>;
}
const holding = () => document.querySelector('[data-holding]').getAttribute('data-holding');
const state = () => document.querySelector('.crystal-loader').getAttribute('data-crystal-loader');
const advance = (ms) => act(() => { vi.advanceTimersByTime(ms); });
// The threshold counts from the start of the page load; tests start the clock at 0.
const startPageClock = () => {
  vi.useFakeTimers();
  const pageStart = Date.now();
  vi.spyOn(performance, 'now').mockImplementation(() => Date.now() - pageStart);
};
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

it('never appears when the crystal draws before the threshold', () => {
  startPageClock();
  const { rerender } = render(<Slot loading />);
  advance(SHOW_AFTER_MS - 50);
  rerender(<Slot loading={false} />);
  advance(2000);
  expect(state()).toBe('hidden');
});

it('runs two full cycles of the spinner once shown', () => {
  expect(MIN_CYCLES).toBe(2);
  expect(MIN_VISIBLE_MS).toBe(2 * 10 * 80); // ten frames at 80 ms, twice
  startPageClock();
  const { rerender } = render(<Slot loading />);
  advance(SHOW_AFTER_MS);
  rerender(<Slot loading={false} />); // the crystal is ready the moment the loader appears
  advance(MIN_VISIBLE_MS - 1);
  expect(state()).toBe('visible');
  advance(1);
  expect(state()).toBe('hidden');
});

it('holds the crystal back from the moment the loader appears until it has faded out', () => {
  startPageClock();
  const { rerender } = render(<Slot loading />);
  expect(holding()).toBe('false'); // nothing held before the loader shows
  advance(SHOW_AFTER_MS);
  expect(holding()).toBe('true');
  rerender(<Slot loading={false} />);
  advance(MIN_VISIBLE_MS);
  expect(state()).toBe('hidden'); // fading out
  expect(holding()).toBe('true');
  advance(FADE_MS);
  expect(holding()).toBe('false'); // now the crystal can start
});

it('never appears once the crystal has drawn, even if the threshold had already passed', () => {
  // A slow device: the slot mounts after the threshold, so the timer is already due,
  // and the crystal draws before that timer gets to run.
  startPageClock();
  vi.advanceTimersByTime(SHOW_AFTER_MS + 2000);
  let report;
  function Late() {
    const { visible, holding, markDrawn } = useCrystalLoader(true);
    report = markDrawn;
    return <div data-holding={holding}><CrystalLoader visible={visible} /></div>;
  }
  render(<Late />);
  report(); // drawn synchronously, before the due timer fires
  advance(3000);
  expect(state()).toBe('hidden');
  expect(holding()).toBe('false');
});

it('never holds the crystal when the loader never appears', () => {
  startPageClock();
  const { rerender } = render(<Slot loading />);
  advance(SHOW_AFTER_MS - 100);
  rerender(<Slot loading={false} />);
  for (let t = 0; t < 3000; t += 100) { advance(100); expect(holding()).toBe('false'); }
});

it('appears after the threshold and stays at least the minimum time once shown', () => {
  startPageClock();
  const { rerender } = render(<Slot loading />);
  advance(SHOW_AFTER_MS);
  expect(state()).toBe('visible');
  advance(50);
  rerender(<Slot loading={false} />); // crystal drew 50 ms after the loader appeared
  advance(MIN_VISIBLE_MS - 100);
  expect(state()).toBe('visible'); // held, so it doesn't blink
  advance(100);
  expect(state()).toBe('hidden');
});

it('hides straight away when it has already been up for the minimum time', () => {
  startPageClock();
  const { rerender } = render(<Slot loading />);
  advance(SHOW_AFTER_MS + MIN_VISIBLE_MS + 500);
  rerender(<Slot loading={false} />);
  advance(0);
  expect(state()).toBe('hidden');
});

it('draws every braille frame for the CSS spin, in order, and is hidden from assistive tech', () => {
  render(<CrystalLoader visible />);
  const loader = document.querySelector('.crystal-loader');
  expect(loader).toHaveAttribute('aria-hidden', 'true');
  // Stacked frames, each offset by its step in the cycle (the spin itself is CSS,
  // so it keeps turning while the main thread is busy loading the crystal).
  const frames = [...loader.querySelectorAll('.crystal-loader-frame')];
  expect(frames.map((f) => f.querySelector('.crystal-loader-cell').getAttribute('data-frame'))).toEqual(FRAMES);
  expect(frames.map((f) => f.style.getPropertyValue('--frame'))).toEqual(FRAMES.map((_, i) => String(i)));
  const strip = loader.querySelector('.crystal-loader-frames');
  expect(strip.style.getPropertyValue('--frame-count')).toBe(String(FRAMES.length));
  expect(strip.style.getPropertyValue('--frame-ms')).toBe(`${FRAME_MS}ms`);
  // Each frame is a six-dot (2×3) cell.
  expect(frames[0].querySelectorAll('.crystal-loader-dot')).toHaveLength(6);
});

it('places each braille dot in its cell position', () => {
  // Read as rows of [left, right]. ⠸ = dots 4, 5, 6: the whole right column.
  const lit = (char) => {
    const { container, unmount } = render(<CrystalLoaderFrame char={char} />);
    const on = [...container.querySelectorAll('.crystal-loader-dot')].map((d) => d.classList.contains('crystal-loader-dot--on') ? 1 : 0);
    unmount();
    return on;
  };
  expect(lit('⠸')).toEqual([0, 1, 0, 1, 0, 1]);
  expect(lit('⠇')).toEqual([1, 0, 1, 0, 1, 0]); // dots 1, 2, 3: the left column
  expect(lit('⠋')).toEqual([1, 1, 1, 0, 0, 0]); // dots 1, 4, 2: top row and middle-left
});

it('reports a graphics failure so the loader stops waiting for the crystal', () => {
  const onFailure = vi.fn();
  const Boom = () => { throw new Error('no GPU'); };
  const error = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    render(<GraphicsBoundary onFailure={onFailure}><Boom /></GraphicsBoundary>);
  } finally { error.mockRestore(); }
  expect(onFailure).toHaveBeenCalledTimes(1);
  expect(document.querySelector('[data-symbol-fallback]')).not.toBeNull();
});
