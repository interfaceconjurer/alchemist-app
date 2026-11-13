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

it('keeps the shell usable and follows the system color scheme when storage is denied', async () => {
  vi.stubGlobal('localStorage', {
    getItem() { throw new DOMException('blocked', 'SecurityError'); },
    setItem() { throw new DOMException('blocked', 'SecurityError'); },
  });
  vi.stubGlobal('matchMedia', (query) => ({
    matches: query === '(prefers-color-scheme: dark)',
    addEventListener() {},
    removeEventListener() {},
  }));
  await act(async () => { render(<App />); });
  expect(screen.getByRole('heading', { name: 'Jordan L. Wright' })).toBeVisible();
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
});

it('restores safely from structurally malformed workspace data', async () => {
  vi.stubGlobal('localStorage', {
    getItem: key => key === 'workspace-state' ? '{}' : null,
    setItem: vi.fn(),
  });
  await act(async () => { render(<App />); });
  expect(screen.getByRole('heading', { name: 'Jordan L. Wright' })).toBeVisible();
});

it('lists typed work under the profile links and opens it in the stage', async () => {
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() });
  await act(async () => { render(<App />); });
  expect(document.querySelector('.main')).toHaveClass('main--stage-hidden');
  expect(screen.getByRole('region', { name: 'Cross section of recent work and thoughts' })).toBeInTheDocument();
  // Newest first: the Oct 2026 presentation above the Mar 2026 tool.
  const feed = [...document.querySelectorAll('.work-feed-item')].map((el) => el.dataset.workItemId);
  expect(feed).toEqual(['apollo-portfolio-review', 'fine-tunes']);
  const item = screen.getByRole('button', { name: /Portfolio review with Apollo/ });
  expect(item).toHaveTextContent('Presentation');
  expect(item).toHaveTextContent('Oct 21, 2026');
  await act(async () => { fireEvent.click(item); });
  expect(document.querySelector('.main')).not.toHaveClass('main--stage-hidden');
  expect(item).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('heading', { level: 2, name: 'Portfolio review with Apollo' })).toBeInTheDocument();
  expect(screen.getByTitle('Portfolio review with Apollo slide deck')).toHaveAttribute('src', '/work/apollo-portfolio-review/index.html');
});

it('opens the stage while a work item is dragged and closes it again if the drag is abandoned', async () => {
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() });
  await act(async () => { render(<App />); });
  const main = document.querySelector('.main');
  const item = screen.getByRole('button', { name: /Fine Tunes/ });
  expect(main).toHaveClass('main--stage-hidden');
  const now = Date.now();
  const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
  fireEvent.mouseDown(item, { button: 0, clientX: 100, clientY: 100 });
  clock.mockReturnValue(now + 200);
  await act(async () => { fireEvent.mouseMove(document, { clientX: 140, clientY: 110 }); });
  expect(main).not.toHaveClass('main--stage-hidden');
  // The empty stage shows only the beaker, with no frame or text.
  expect(document.querySelector('.stage-empty-content .stage-empty-icon')).not.toBeNull();
  expect(document.querySelector('.stage-empty').textContent.trim()).toBe('');
  // Embedded documents (the deck iframe) stop capturing the pointer during the drag.
  expect(document.body).toHaveClass('is-dragging');
  await act(async () => { fireEvent.mouseUp(document, { clientX: 140, clientY: 110 }); });
  expect(document.body).not.toHaveClass('is-dragging');
  expect(main).toHaveClass('main--stage-hidden');
  expect(document.querySelectorAll('.stage-tab')).toHaveLength(0);
});

it('does not swallow the next click after a work item is dropped on the stage', async () => {
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() });
  await act(async () => { render(<App />); });
  // Target the list items themselves (an earlier test's fading drag ghost is a clone).
  const feedItem = (id) => document.querySelector(`.work-feed [data-work-item-id="${id}"]`);
  await act(async () => { fireEvent.click(feedItem('fine-tunes')); });
  // Drag Apollo onto the stage and release there; browsers fire no click for that release.
  const stage = document.querySelector('.stage-main');
  vi.spyOn(stage, 'getBoundingClientRect').mockReturnValue({ left: 400, right: 1400, top: 0, bottom: 900, width: 1000, height: 900 });
  const now = Date.now();
  const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
  fireEvent.mouseDown(feedItem('apollo-portfolio-review'), { button: 0, clientX: 100, clientY: 100 });
  clock.mockReturnValue(now + 200);
  // First move starts the drag; the next picks a drop zone over the stage.
  await act(async () => { fireEvent.mouseMove(document, { clientX: 900, clientY: 400 }); });
  await act(async () => { fireEvent.mouseMove(document, { clientX: 1300, clientY: 400 }); });
  await act(async () => { fireEvent.mouseUp(document, { clientX: 1300, clientY: 400 }); });
  expect(document.querySelectorAll('.stage-tab')).toHaveLength(2);
  // Let the drop's task end, then close the first tab with one click.
  await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Close Fine Tunes' })); });
  expect([...document.querySelectorAll('.stage-tab-title')].map((t) => t.textContent)).toEqual(['Portfolio review with Apollo']);
});
