import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeContext';

function ThemeButton({ observe }) {
  const context = useTheme();
  observe?.(context);
  return <button onClick={context.toggleTheme}>{context.theme}</button>;
}

afterEach(() => vi.unstubAllGlobals());

describe('theme resilience', () => {
  it('renders and toggles when browser storage is denied', () => {
    vi.stubGlobal('localStorage', { getItem() { throw new DOMException('blocked', 'SecurityError'); }, setItem() { throw new DOMException('blocked', 'SecurityError'); } });
    render(<ThemeProvider><ThemeButton /></ThemeProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'light' }));
    expect(screen.getByRole('button', { name: 'dark' })).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('ignores invalid stored theme values', () => {
    vi.stubGlobal('localStorage', { getItem: () => 'not-a-theme', setItem: vi.fn() });
    render(<ThemeProvider><ThemeButton /></ThemeProvider>);
    expect(screen.getByRole('button', { name: 'light' })).toBeInTheDocument();
  });

  it('preserves context identity when a parent rerenders without a theme change', () => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() });
    const observe = vi.fn();
    const { rerender } = render(<ThemeProvider><ThemeButton observe={observe} /></ThemeProvider>);
    const first = observe.mock.calls.at(-1)[0];
    rerender(<ThemeProvider><ThemeButton observe={observe} /></ThemeProvider>);
    expect(observe.mock.calls.at(-1)[0]).toBe(first);
  });
});
