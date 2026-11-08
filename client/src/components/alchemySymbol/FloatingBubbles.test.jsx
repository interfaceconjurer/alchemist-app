import { act, renderHook } from '@testing-library/react';
import { Vector3 } from 'three';
import FloatingBubbles from './FloatingBubbles';

const { sprites, frames } = vi.hoisted(() => ({ sprites: [], frames: [] }));
vi.mock('@react-three/fiber', () => ({ useFrame: callback => frames.push(callback) }));
vi.mock('three', async importOriginal => {
  const actual = await importOriginal();
  return {
    ...actual,
    Sprite: class extends actual.Sprite {
      constructor(material) { super(material); sprites.push(this); }
    },
  };
});

beforeEach(() => {
  sprites.length = 0;
  frames.length = 0;
  vi.spyOn(Math, 'random').mockReturnValue(0.25);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    clearRect() {}, beginPath() {}, arc() {}, fill() {},
  });
});
afterEach(() => vi.restoreAllMocks());
const tick = delta => act(() => frames.at(-1)({}, delta));

it('keeps particle life and position fixed when the shared clock resumes without advancing', () => {
  const animationTime = { value: 0 };
  renderHook(() => FloatingBubbles({ color: '#ffffff', count: 1, spawnPoint: () => new Vector3(), animationTime }));
  const particle = sprites[0];
  animationTime.value = 0.1;
  tick(0.1);
  const life = particle.userData.life;
  const position = particle.position.toArray();
  // The controller skips a resumed gap. The raw R3F delta still contains it.
  tick(12);
  expect(particle.userData.life).toBe(life);
  expect(particle.position.toArray()).toEqual(position);
  animationTime.value += 1 / 60;
  tick(1 / 60);
  expect(particle.userData.life).toBeCloseTo(life + 1 / 60);
  expect(particle.position.y).toBeGreaterThan(position[1]);
});

it('keeps legacy callers bounded when they do not supply a shared clock', () => {
  renderHook(() => FloatingBubbles({ color: '#ffffff', count: 1, spawnPoint: () => new Vector3() }));
  const particle = sprites[0];
  const life = particle.userData.life;
  tick(12);
  expect(particle.userData.life).toBeCloseTo(life + 0.05);
});
