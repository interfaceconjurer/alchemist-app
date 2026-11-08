import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { ThemeProvider } from '../../contexts/ThemeContext';
import SpaceBackground from './SpaceBackground';

vi.mock('./spaceField', () => ({
  // jsdom has no 2D canvas; the generator itself is covered in spaceField.test.js.
  renderLayer: () => ({ toBlob: (cb) => cb(new Blob(['x'], { type: 'image/png' })) }),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function withTheme(theme) {
  vi.stubGlobal('localStorage', { getItem: () => theme, setItem: vi.fn() });
}

describe('SpaceBackground', () => {
  it('renders the inverse (light) variant in light mode', () => {
    withTheme('light');
    const { container } = render(<ThemeProvider><SpaceBackground /></ThemeProvider>);
    expect(container.querySelector('.space')).toHaveClass('space--light');
  });

  it('generates its layers off the critical path in dark mode, as decorative content', async () => {
    withTheme('dark');
    const created = [];
    vi.stubGlobal('URL', { ...URL, createObjectURL: () => { const u = `blob:${created.length}`; created.push(u); return u; }, revokeObjectURL: vi.fn() });
    vi.stubGlobal('requestIdleCallback', (fn) => setTimeout(fn, 0));
    const { container } = render(<ThemeProvider><SpaceBackground /></ThemeProvider>);
    const space = container.querySelector('.space');
    expect(space).toHaveAttribute('aria-hidden', 'true');
    expect(space).not.toHaveClass('space--ready');
    await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
    expect(container.querySelector('.space')).toHaveClass('space--ready');
    expect(container.querySelectorAll('.space-layer')).toHaveLength(3);
    expect(created).toHaveLength(3);
  });

  it('revokes its blob URLs when unmounted', async () => {
    withTheme('dark');
    const revoke = vi.fn();
    let n = 0;
    vi.stubGlobal('URL', { ...URL, createObjectURL: () => `blob:${n++}`, revokeObjectURL: revoke });
    vi.stubGlobal('requestIdleCallback', (fn) => setTimeout(fn, 0));
    const { unmount } = render(<ThemeProvider><SpaceBackground /></ThemeProvider>);
    await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
    unmount();
    expect(revoke).toHaveBeenCalledTimes(3);
  });
});
