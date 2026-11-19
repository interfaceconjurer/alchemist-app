import { RenderPipeline } from 'three/webgpu';
import { pass, vec4, luminance, clamp } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';

/** Own the complete graph: RenderPipeline.dispose does not dispose its passes. */
export function createBloomPipeline(renderer, scene, camera) {
  const pipeline = new RenderPipeline(renderer);
  const scenePass = pass(scene, camera);
  const color = scenePass.getTextureNode('output');
  const glow = bloom(color);
  pipeline.outputNode = vec4(color.rgb.add(glow.rgb), clamp(color.a.add(luminance(glow.rgb)), 0, 1));
  let disposed = false;
  return {
    pipeline, scenePass, glow,
    update({ strength, radius, threshold }) {
      glow.strength.value = strength;
      glow.radius.value = radius;
      glow.threshold.value = threshold;
    },
    render() { pipeline.render(); },
    /**
     * Compile the scene's shaders ahead of the first draw. Without this the first
     * render builds every material's pipeline synchronously and the page freezes
     * for seconds on a slow phone; precompiling yields to the browser between
     * items, so the loader keeps running. The post-processing pass (bloom) still
     * compiles on the first render, which is the brief remainder.
     */
    async compile() {
      await scenePass.compileAsync(renderer);
      if (disposed || !renderer.backend.isWebGPUBackend) return;
      // In pinned Three r187, WebGPU validation failures resolve compileAsync.
      // The backend marks the failed pipeline and silently skips its draws.
      for (const compiled of renderer._pipelines.caches.values()) {
        if (renderer.backend.get(compiled).error) throw new Error('Crystal GPU pipeline failed to compile');
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      pipeline.dispose();
      glow.dispose();
      scenePass.dispose();
    },
  };
}
