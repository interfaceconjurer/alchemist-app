import { readFile, writeFile, rm } from 'node:fs/promises';

// Three r187 omits a backend renderTarget binding used during WebGL disposal.
// Texture.renderTarget is the public ownership already used by Textures.js.
// Keep this workaround tied to the inspected release and remove it when the
// upstream fix is adopted. Browser regressions verify actual handle disposal.
const threeRoot = new URL('../node_modules/three/', import.meta.url);
const { version } = JSON.parse(await readFile(new URL('package.json', threeRoot), 'utf8'));
if (version !== '0.187.0') {
  throw new Error(`Revalidate/remove the Three WebGL disposal compatibility patch before using three ${version}.`);
}
const broken = 'const { textureGPU, renderTarget } = backend.get( texture );';
const fixed = 'const { textureGPU } = backend.get( texture );\n\t\tconst renderTarget = texture.renderTarget;';
const files = [
  'src/renderers/webgl-fallback/utils/WebGLTextureUtils.js',
  'build/three.webgpu.js',
  'build/three.webgpu.nodes.js',
];
const changes = [];
for (const name of files) {
  const file = new URL(name, threeRoot);
  const source = await readFile(file, 'utf8');
  if (source.includes(fixed) && !source.includes(broken)) continue;
  if (source.split(broken).length !== 2) {
    throw new Error(`Unexpected Three source in ${name}; inspect the disposal fix before building.`);
  }
  changes.push({ file, source: source.replace(broken, fixed) });
}
for (const { file, source } of changes) await writeFile(file, source);
if (changes.length) {
  // Prevent a previously optimized development dependency from hiding the fix.
  await rm(new URL('../node_modules/.vite/', import.meta.url), { recursive: true, force: true });
  console.log('Applied guarded Three r187 WebGL framebuffer disposal fix.');
}
