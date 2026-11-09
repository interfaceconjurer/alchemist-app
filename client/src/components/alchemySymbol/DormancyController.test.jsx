import React from 'react';
import { act, render } from '@testing-library/react';
import { useFrame } from '@react-three/fiber';
import DormancyController from './DormancyController';
import { createDormancy, DORMANCY } from './dormancy';

vi.mock('@react-three/fiber', () => ({ useFrame: vi.fn() }));

beforeEach(() => useFrame.mockClear());
const frame = (delta) => useFrame.mock.calls.at(-1)[0]({}, delta);
const frames = (count) => { for (let i = 0; i < count; i++) frame(1 / 60); };
const controls = () => ({
  dormancy: createDormancy(),
  timeScale: { current: 1 },
  uVitality: { value: 1 },
  bubbleVisibility: { current: 1 },
  setBloomGain: vi.fn(),
  onState: vi.fn(),
});

it('freezes vitality, light and bubbles while hidden and on the first resumed frame', () => {
  const props = controls();
  props.dormancy.engage();
  const { rerender } = render(<DormancyController active {...props} />);
  expect(useFrame.mock.calls.at(-1)[1]).toBe(-200);
  act(() => frame(30));
  expect(props.dormancy.state.awake).toBe(true);
  act(() => frames(18));
  const before = props.dormancy.state;
  expect(before.vitality).toBeGreaterThan(0);
  expect(before.vitality).toBeLessThan(1);

  rerender(<DormancyController active={false} {...props} />);
  act(() => frame(30));
  rerender(<DormancyController active {...props} />);
  act(() => frame(30));
  expect(props.dormancy.state).toEqual(before);
  expect(props.timeScale.current).toBe(before.vitality);
  expect(props.uVitality.value).toBe(before.light);
  expect(props.bubbleVisibility.current).toBe(before.light);
  expect(props.setBloomGain).toHaveBeenLastCalledWith(before.light);
  act(() => frame(1 / 60));
  expect(props.dormancy.state.vitality).toBeLessThan(before.vitality);
});

it('does not count hidden time toward the quiet period or repeatedly publish held state', () => {
  const props = controls();
  props.dormancy.engage();
  const { rerender } = render(<DormancyController active {...props} />);
  act(() => { frame(0); frames(120); });
  expect(props.onState.mock.calls.map(([phase]) => phase)).toEqual(['awake', 'changing', 'dormant']);
  expect(props.uVitality.value).toBe(DORMANCY.dormantLight);
  props.dormancy.release();
  act(() => frames(30));
  rerender(<DormancyController active={false} {...props} />);
  act(() => frame(30));
  rerender(<DormancyController active {...props} />);
  act(() => { frame(30); frames(20); });
  expect(props.dormancy.state.dormant).toBe(true);
  expect(props.onState).toHaveBeenCalledTimes(3);
  act(() => frames(30));
  expect(props.dormancy.state.vitality).toBeGreaterThan(0);
  expect(props.onState).toHaveBeenLastCalledWith('changing');
});
