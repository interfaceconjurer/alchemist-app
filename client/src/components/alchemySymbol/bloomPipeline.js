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
    compile() { return scenePass.compileAsync(renderer); },
    dispose() {
      if (disposed) return;
      disposed = true;
      pipeline.dispose();
      glow.dispose();
      scenePass.dispose();
    },
  };
}
