import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import TabContent, { TabLoader } from './TabContent';

afterEach(() => vi.useRealTimers());
const tab = { id: 'a', title: 'Ready project', description: 'Ready description' };

it('shows content straight away for a tab that has already been revealed', () => {
  render(<TabContent tabs={[tab]} activeTabId="a" animatedTabs={new Set(['a'])} fadingTabs={new Set()} />);
  expect(screen.getByRole('heading', { name: 'Ready project' })).toBeVisible();
  expect(document.querySelector('.stage-content--hidden')).toBeNull();
  expect(document.querySelector('.terminal-loader')).toBeNull();
});

it('streams the dev-server text, holds for two cursor blinks, then reveals a newly opened tab', () => {
  vi.useFakeTimers();
  const onStartTabFade = vi.fn();
  const onMarkAnimationComplete = vi.fn();
  const Pane = ({ fading }) => (
    <>
      <TabContent tabs={[tab]} activeTabId="a" animatedTabs={new Set()} fadingTabs={fading} />
      <TabLoader tab={tab} animatedTabs={new Set()} onStartTabFade={onStartTabFade} onMarkAnimationComplete={onMarkAnimationComplete} />
    </>
  );
  const { rerender } = render(<Pane fading={new Set()} />);
  expect(document.querySelector('.terminal-loader')).not.toBeNull();
  expect(document.querySelector('.stage-content--hidden')).not.toBeNull();
  // Each phase schedules the next after a render, so advance in small steps.
  const advance = (ms) => { for (let t = 0; t < ms; t += 20) act(() => { vi.advanceTimersByTime(20); }); };
  // The text streams in with no cursor yet...
  advance(540);
  expect(document.querySelectorAll('.terminal-line').length).toBeGreaterThan(20);
  expect(document.querySelector('.terminal-cursor')).not.toBeNull(); // stream done: cursor appears
  expect(onStartTabFade).not.toHaveBeenCalled();
  // ...then holds while the cursor blinks twice (~1 s), then fades.
  advance(1080);
  expect(onStartTabFade).toHaveBeenCalledWith('a');
  rerender(<Pane fading={new Set(['a'])} />);
  expect(document.querySelector('.stage-content--entering')).not.toBeNull();
  advance(260);
  expect(onMarkAnimationComplete).toHaveBeenCalledWith('a');
});

it('skips the stream for reduced motion', () => {
  const media = vi.spyOn(window, 'matchMedia').mockImplementation((q) => ({ matches: q.includes('reduce'), addEventListener() {}, removeEventListener() {} }));
  try {
    render(<TabContent tabs={[tab]} activeTabId="a" animatedTabs={new Set()} fadingTabs={new Set()} />);
    expect(document.querySelector('.terminal-loader')).toBeNull();
    expect(document.querySelector('.stage-content--hidden')).toBeNull();
  } finally { media.mockRestore(); }
});

it('holds an empty terminal while the stage slides in, then streams once it has arrived', () => {
  vi.useFakeTimers();
  const advance = (ms) => { for (let t = 0; t < ms; t += 20) act(() => { vi.advanceTimersByTime(20); }); };
  const { rerender } = render(<TabLoader tab={tab} animatedTabs={new Set()} waiting />);
  expect(document.querySelector('.terminal-loader')).not.toBeNull();
  advance(800);
  expect(document.querySelectorAll('.terminal-line')).toHaveLength(0); // nothing streams while waiting
  rerender(<TabLoader tab={tab} animatedTabs={new Set()} waiting={false} />);
  advance(300);
  expect(document.querySelectorAll('.terminal-line').length).toBeGreaterThan(0);
});
