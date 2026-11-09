import React from 'react';
import { act, render } from '@testing-library/react';
import { useFrame, useThree } from '@react-three/fiber';
import { GraphicsBoundary } from './GraphicsBoundary';
import RenderPolicyController from './RenderPolicyController';

vi.mock('@react-three/fiber', () => ({ useFrame: vi.fn(), useThree: vi.fn() }));

let gl;
beforeEach(() => {
  gl = {};
  useFrame.mockClear();
  useThree.mockImplementation(selector => selector({ gl }));
});
const frame = (delta) => useFrame.mock.calls.at(-1)[0]({ viewport: { dpr: 1.5 } }, delta);

it('advances shared shader time only during active frames and skips the resumed interval', () => {
  const animationTime = { value: 0 };
  const lowerDpr = vi.fn();
  const { rerender } = render(<RenderPolicyController active lowerDpr={lowerDpr} animationTime={animationTime} />);
  expect(useFrame.mock.calls.at(-1)[1]).toBe(-100);
  act(() => { frame(2); frame(1 / 60); });
  expect(animationTime.value).toBeCloseTo(1 / 60);
  rerender(<RenderPolicyController active={false} lowerDpr={lowerDpr} animationTime={animationTime} />);
  act(() => frame(12));
  expect(animationTime.value).toBeCloseTo(1 / 60);
  rerender(<RenderPolicyController active lowerDpr={lowerDpr} animationTime={animationTime} />);
  act(() => { frame(12); frame(1 / 60); });
  expect(animationTime.value).toBeCloseTo(2 / 60);
  expect(lowerDpr).not.toHaveBeenCalled();
});

it('reports device loss through the graphics boundary and restores the previous handler', () => {
  const previous = vi.fn();
  gl.onDeviceLost = previous;
  const { container } = render(<GraphicsBoundary><RenderPolicyController active lowerDpr={() => {}} /></GraphicsBoundary>);
  act(() => gl.onDeviceLost({ reason: 'unknown' }));
  expect(previous).toHaveBeenCalledOnce();
  expect(container.querySelector('[data-symbol-fallback="unavailable"]')).not.toBeNull();
  expect(gl.onDeviceLost).toBe(previous);
});
