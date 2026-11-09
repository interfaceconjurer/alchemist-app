import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { createDormancy } from './dormancy';
import { useDormancyInteraction } from './useDormancyInteraction';

function Surface({ dormancy }) {
  const { pressed, handlers } = useDormancyInteraction(dormancy);
  return <div role="button" tabIndex={0} aria-pressed={pressed} {...handlers} />;
}

const setup = () => {
  const dormancy = createDormancy();
  const { getByRole } = render(<Surface dormancy={dormancy} />);
  const surface = getByRole('button');
  const captures = new Set();
  surface.setPointerCapture = vi.fn((id) => captures.add(id));
  surface.hasPointerCapture = vi.fn((id) => captures.has(id));
  surface.releasePointerCapture = vi.fn((id) => captures.delete(id));
  const pointer = (type, pointerId) => {
    const event = new Event(type, { bubbles: true });
    Object.defineProperty(event, 'pointerId', { value: pointerId });
    fireEvent(surface, event);
  };
  return { dormancy, surface, pointer, captures };
};
const run = (dormancy, seconds) => {
  for (let t = 0; t < seconds; t += 1 / 60) dormancy.step(1 / 60);
};

it('keeps a two-pointer hold dormant after one pointer is released', () => {
  const { dormancy, surface, pointer } = setup();
  pointer('pointerdown', 1);
  pointer('pointerdown', 2);
  run(dormancy, 2);
  pointer('pointerup', 1);
  expect(surface).toHaveAttribute('aria-pressed', 'true');
  expect(dormancy.engaged).toBe(true);
  run(dormancy, 5);
  expect(dormancy.state.dormant).toBe(true);
  pointer('pointerup', 2);
  expect(surface).toHaveAttribute('aria-pressed', 'false');
  expect(dormancy.engaged).toBe(false);
  run(dormancy, 5);
  expect(dormancy.state.awake).toBe(true);
});

it.each(['pointercancel', 'lostpointercapture'])('releases only the owning pointer on %s', (event) => {
  const { dormancy, surface, pointer } = setup();
  pointer('pointerdown', 1);
  pointer('pointerdown', 2);
  pointer(event, 99); // An unrelated/duplicate end cannot cancel another hold.
  pointer(event, 1);
  expect(dormancy.engaged).toBe(true);
  expect(surface).toHaveAttribute('aria-pressed', 'true');
  pointer(event, 2);
  expect(dormancy.engaged).toBe(false);
  expect(surface).toHaveAttribute('aria-pressed', 'false');
});

it('clears every pointer and keyboard hold on blur and accepts a fresh interaction', () => {
  const { dormancy, surface, pointer, captures } = setup();
  pointer('pointerdown', 1);
  pointer('pointerdown', 2);
  fireEvent.keyDown(surface, { key: 'Enter' });
  fireEvent.blur(surface);
  expect(dormancy.engaged).toBe(false);
  expect(surface).toHaveAttribute('aria-pressed', 'false');
  expect(captures.size).toBe(0);
  pointer('lostpointercapture', 1);
  pointer('pointerup', 2);
  pointer('pointerdown', 3);
  expect(dormancy.engaged).toBe(true);
  pointer('pointercancel', 3);
  expect(dormancy.engaged).toBe(false);
});

it('ignores keyboard repeats and keeps keyboard and pointer ownership independent', () => {
  const { dormancy, surface, pointer } = setup();
  fireEvent.keyDown(surface, { key: ' ', repeat: false });
  fireEvent.keyDown(surface, { key: ' ', repeat: true });
  expect(dormancy.engaged).toBe(true);
  pointer('pointerdown', 1);
  pointer('pointerup', 1);
  expect(dormancy.engaged).toBe(true);
  pointer('pointerdown', 2);
  fireEvent.keyDown(surface, { key: ' ', repeat: false });
  expect(dormancy.engaged).toBe(true);
  pointer('pointerup', 2);
  expect(dormancy.engaged).toBe(false);
});

it.each(['window blur', 'document hidden'])('clears all holds and captures after %s without restarting an existing quiet period', (reason) => {
  const { dormancy, surface, pointer, captures } = setup();
  const release = vi.spyOn(dormancy, 'release');
  const losePage = () => {
    if (reason === 'window blur') fireEvent(window, new Event('blur'));
    else fireEvent(document, new Event('visibilitychange'));
  };
  const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
  try {
    pointer('pointerdown', 1);
    pointer('pointerdown', 2);
    fireEvent.keyDown(surface, { key: 'Enter' });
    run(dormancy, 2);
    losePage();
    expect(dormancy.engaged).toBe(false);
    expect(surface).toHaveAttribute('aria-pressed', 'false');
    expect(captures.size).toBe(0);
    expect(release).toHaveBeenCalledOnce();

    // Repeated lifecycle/element events cannot restart the 1.2s quiet period.
    run(dormancy, 0.9);
    losePage();
    fireEvent.blur(surface);
    pointer('lostpointercapture', 1);
    pointer('pointerup', 2);
    expect(release).toHaveBeenCalledOnce();
    run(dormancy, 0.6);
    expect(dormancy.state.vitality).toBeGreaterThan(0);
    pointer('pointerdown', 3);
    pointer('pointerup', 3);
    expect(dormancy.engaged).toBe(false);
  } finally {
    visibility.mockRestore();
  }
});

it('keeps holds when the document remains visible and removes lifecycle listeners on unmount', () => {
  const dormancy = createDormancy();
  const release = vi.spyOn(dormancy, 'release');
  const { getByRole, unmount } = render(<Surface dormancy={dormancy} />);
  const surface = getByRole('button');
  fireEvent.keyDown(surface, { key: 'Enter' });
  const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  try {
    fireEvent(document, new Event('visibilitychange'));
    expect(dormancy.engaged).toBe(true);
    unmount();
    visibility.mockReturnValue('hidden');
    fireEvent(window, new Event('blur'));
    fireEvent(document, new Event('visibilitychange'));
    expect(release).not.toHaveBeenCalled();
  } finally {
    visibility.mockRestore();
  }
});
