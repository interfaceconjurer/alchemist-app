import React, { useRef } from 'react';
import { act } from '@testing-library/react';
import { render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useStageReveal } from './useStageReveal';

function Harness({ stageVisible, ready = true, enabled = true }) {
  const panelRef = useRef(null);
  const stageRef = useRef(null);
  useStageReveal({ panelRef, stageRef, stageVisible, panelWidth: 380, enabled, ready });
  return (
    <div className="main" style={{ width: 1440 }}>
      <section className="left-panel" ref={panelRef}><header className="App-header" /></section>
      <section className="stage" ref={stageRef} />
    </div>
  );
}

afterEach(() => vi.restoreAllMocks());

function trackAnimations() {
  const calls = [];
  Element.prototype.animate = vi.fn(function (keyframes) {
    calls.push({ el: this.className, keyframes });
    return { finished: Promise.resolve(), cancel() {} };
  });
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 1440, left: 0, top: 0, height: 900 });
  return calls;
}

it('slides the panel content over from the middle and the stage in when it opens', () => {
  const calls = trackAnimations();
  const { rerender } = render(<Harness stageVisible={false} />);
  expect(calls).toHaveLength(0);
  rerender(<Harness stageVisible />);
  const content = calls.find((c) => c.el === 'App-header');
  expect(content.keyframes[0].transform).toBe('translateX(530px)'); // (1440 - 380) / 2
  expect(calls.some((c) => c.el === 'stage')).toBe(true);
  rerender(<Harness stageVisible={false} />);
  expect(calls.at(-1).keyframes[0].transform).toBe('translateX(-530px)');
});

it('does not animate the initial restore, on mobile, or before state has loaded', () => {
  const calls = trackAnimations();
  const { rerender } = render(<Harness stageVisible={false} ready={false} />);
  rerender(<Harness stageVisible ready />);
  expect(calls).toHaveLength(0);
  const mobile = render(<Harness stageVisible={false} enabled={false} />);
  mobile.rerender(<Harness stageVisible enabled={false} />);
  expect(calls).toHaveLength(0);
});

it('accepts the panel width as a fraction of the row', () => {
  const calls = trackAnimations();
  function Fraction({ stageVisible }) {
    const panelRef = useRef(null);
    const stageRef = useRef(null);
    useStageReveal({ panelRef, stageRef, stageVisible, panelWidth: (row) => row * 0.4, enabled: true, ready: true });
    return <div><section ref={panelRef}><header className="App-header" /></section><section className="stage" ref={stageRef} /></div>;
  }
  const { rerender } = render(<Fraction stageVisible={false} />);
  rerender(<Fraction stageVisible />);
  expect(calls.find((c) => c.el === 'App-header').keyframes[0].transform).toBe('translateX(432px)'); // (1440 - 576) / 2
});

it('reports the stage unsettled until its slide-in finishes', async () => {
  let finish;
  Element.prototype.animate = vi.fn(function () {
    const finished = this.className === 'stage' ? new Promise((r) => { finish = r; }) : Promise.resolve();
    return { finished, cancel() {} };
  });
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 1440, left: 0, top: 0, height: 900 });
  const seen = [];
  function Probe({ stageVisible }) {
    const panelRef = useRef(null);
    const stageRef = useRef(null);
    const { settled } = useStageReveal({ panelRef, stageRef, stageVisible, panelWidth: 576, enabled: true, ready: true });
    seen.push(settled);
    return <div><section ref={panelRef}><header className="App-header" /></section><section className="stage" ref={stageRef} /></div>;
  }
  const { rerender } = render(<Probe stageVisible={false} />);
  expect(seen.at(-1)).toBe(true);
  rerender(<Probe stageVisible />);
  expect(seen.at(-1)).toBe(false);
  await act(async () => { finish(); await Promise.resolve(); });
  expect(seen.at(-1)).toBe(true);
});
