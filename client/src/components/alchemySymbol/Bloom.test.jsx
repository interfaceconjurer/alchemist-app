import React from 'react';
import { act, render } from '@testing-library/react';
import { useFrame, useThree } from '@react-three/fiber';
import { createBloomPipeline } from './bloomPipeline';
import { GraphicsBoundary } from './GraphicsBoundary';
import { Bloom } from './Polyhedron';

vi.mock('@react-three/fiber', () => ({ useFrame: vi.fn(), useThree: vi.fn() }));
vi.mock('./bloomPipeline', () => ({ createBloomPipeline: vi.fn() }));

let graph, finishCompile, failCompile;
beforeEach(() => {
  useFrame.mockClear();
  useThree.mockReturnValue({ gl: {}, scene: {}, camera: {} });
  graph = {
    glow: { strength: { value: 0 } },
    update: vi.fn(),
    render: vi.fn(),
    dispose: vi.fn(),
    compile: vi.fn(() => new Promise((resolve, reject) => { finishCompile = resolve; failCompile = reject; })),
  };
  createBloomPipeline.mockReturnValue(graph);
});
const frame = () => useFrame.mock.calls.at(-1)[0]();

it('draws nothing and reports no first frame until the shaders have compiled', async () => {
  const onFirstFrame = vi.fn();
  render(<Bloom onFirstFrame={onFirstFrame} />);
  expect(graph.compile).toHaveBeenCalledTimes(1);
  act(() => { frame(); frame(); });
  expect(graph.render).not.toHaveBeenCalled();
  expect(onFirstFrame).not.toHaveBeenCalled();

  await act(async () => { finishCompile(); });
  act(() => frame());
  expect(graph.render).toHaveBeenCalledTimes(1);
  expect(onFirstFrame).toHaveBeenCalledTimes(1);
  act(() => { frame(); frame(); });
  expect(onFirstFrame).toHaveBeenCalledTimes(1); // once only
});

it('shows the graphics fallback when shader compilation fails', async () => {
  const onFailure = vi.fn();
  render(<GraphicsBoundary onFailure={onFailure}><Bloom /></GraphicsBoundary>);
  await act(async () => { failCompile(new Error('pipeline failed')); });
  expect(onFailure).toHaveBeenCalledTimes(1);
});

it('never uses a pipeline that finished compiling after teardown', async () => {
  const onFirstFrame = vi.fn();
  const { unmount } = render(<Bloom onFirstFrame={onFirstFrame} />);
  const draw = useFrame.mock.calls.at(-1)[0];
  unmount();
  expect(graph.dispose).toHaveBeenCalledTimes(1);
  await act(async () => { finishCompile(); });
  draw();
  expect(graph.render).not.toHaveBeenCalled();
  expect(onFirstFrame).not.toHaveBeenCalled();
});
