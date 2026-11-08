import { Scene, PerspectiveCamera } from 'three/webgpu';
import { createBloomPipeline } from './bloomPipeline';

it('updates theme uniforms without replacing or disposing the render graph', () => {
  const graph = createBloomPipeline({}, new Scene(), new PerspectiveCamera());
  const original = { pipeline: graph.pipeline, pass: graph.scenePass, bloom: graph.glow };
  const disposed = vi.fn();
  graph.scenePass.addEventListener('dispose', disposed);
  graph.glow.addEventListener('dispose', disposed);
  for (let i = 0; i < 20; i++) {
    graph.update({ strength: i % 2 ? 0.2 : 0.28, radius: 0.4, threshold: 0.35 });
  }
  expect(graph.pipeline).toBe(original.pipeline);
  expect(graph.scenePass).toBe(original.pass);
  expect(graph.glow).toBe(original.bloom);
  expect(graph.glow.strength.value).toBe(0.2);
  expect(disposed).not.toHaveBeenCalled();
  graph.dispose();
});

it('releases the scene and bloom render targets exactly once at teardown', () => {
  const graph = createBloomPipeline({}, new Scene(), new PerspectiveCamera());
  const sceneDisposed = vi.fn();
  const bloomDisposed = vi.fn();
  const materialDisposed = vi.fn();
  graph.scenePass.renderTarget.addEventListener('dispose', sceneDisposed);
  graph.glow.addEventListener('dispose', bloomDisposed);
  graph.pipeline._quadMesh.material.addEventListener('dispose', materialDisposed);
  graph.dispose();
  graph.dispose();
  expect(sceneDisposed).toHaveBeenCalledTimes(1);
  expect(bloomDisposed).toHaveBeenCalledTimes(1);
  expect(materialDisposed).toHaveBeenCalledTimes(1);
});
