import React from 'react';
import { render, act, screen, fireEvent } from '@testing-library/react';
import { afterEach, vi, expect } from 'vitest';
import App from './App';

vi.mock('./components/alchemySymbol/mediator', () => ({ default: () => <div aria-label="Alchemy symbol" /> }));
afterEach(() => vi.unstubAllGlobals());

it('renders without crashing', async () => {
  await act(async () => {
    render(<App />);
  });
});

it('keeps the shell and theme controls usable when storage is denied', async () => {
  vi.stubGlobal('localStorage', {
    getItem() { throw new DOMException('blocked', 'SecurityError'); },
    setItem() { throw new DOMException('blocked', 'SecurityError'); },
  });
  await act(async () => { render(<App />); });
  expect(screen.getByRole('heading', { name: 'Jordan L. Wright' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
  expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeVisible();
});

it('restores safely from structurally malformed workspace data', async () => {
  vi.stubGlobal('localStorage', {
    getItem: key => key === 'workspace-state' ? '{}' : null,
    setItem: vi.fn(),
  });
  await act(async () => { render(<App />); });
  expect(screen.getByRole('heading', { name: 'Jordan L. Wright' })).toBeVisible();
});
