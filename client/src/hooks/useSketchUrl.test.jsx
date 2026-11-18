import React, { useCallback, useState } from 'react';
import { act, render } from '@testing-library/react';
import { useSketchUrl } from './useSketchUrl';
import { pathFor } from '../sketchRoutes';
import { workSections } from '../components/workList/workList';

const [a, b] = workSections.flatMap((section) => section.items);

// A stand-in workspace: the open tabs and which is active, like the app's reducer.
let api;
function Workspace({ initial = [], ready = true }) {
  const [tabs, setTabs] = useState(initial);
  const [activeId, setActiveId] = useState(initial.at(-1)?.id ?? null);
  const openItem = useCallback((item) => { setTabs((t) => (t.some((x) => x.id === item.id) ? t : [...t, item])); setActiveId(item.id); }, []);
  const closeAll = useCallback(() => { setTabs([]); setActiveId(null); }, []);
  const close = (id) => { const rest = tabs.filter((t) => t.id !== id); setTabs(rest); setActiveId(rest.at(-1)?.id ?? null); };
  api = { openItem, close, tabs, activeId };
  useSketchUrl({ ready, activeTab: tabs.find((t) => t.id === activeId) ?? null, openIds: tabs.map((t) => t.id), openItem, closeAll });
  return null;
}
const at = () => window.location.pathname;
// History traversal is asynchronous: wait for the popstate it fires.
const popped = () => new Promise((r) => window.addEventListener('popstate', () => setTimeout(r, 0), { once: true }));
/** Wait (briefly) until the address reaches `path`. */
const settlesAt = async (path) => {
  for (let i = 0; i < 50 && at() !== path; i++) await new Promise((r) => setTimeout(r, 5));
};
const back = async () => { await act(async () => { const done = popped(); window.history.back(); await done; }); };
const forward = async () => { await act(async () => { const done = popped(); window.history.forward(); await done; }); };

beforeEach(() => window.history.replaceState(null, '', '/'));

it('puts the open item in the address, and back returns home and closes it', async () => {
  render(<Workspace />);
  expect(at()).toBe('/');
  act(() => api.openItem(a));
  expect(at()).toBe(pathFor(a));
  expect(document.title.startsWith(`${a.title} ·`)).toBe(true);
  act(() => api.openItem(b));
  expect(at()).toBe(pathFor(b));
  await back();
  expect(at()).toBe(pathFor(a));
  expect(api.activeId).toBe(a.id);
  await back();
  expect(at()).toBe('/');
  expect(api.activeId).toBeNull();
  await forward();
  expect(api.activeId).toBe(a.id);
});

it('opens the item a link points to', () => {
  window.history.replaceState(null, '', pathFor(b));
  render(<Workspace />);
  expect(api.activeId).toBe(b.id);
  expect(at()).toBe(pathFor(b));
});

it('sends an unknown sketch address home', () => {
  window.history.replaceState(null, '', '/sketch/no-such-thing');
  render(<Workspace />);
  expect(at()).toBe('/');
  expect(api.activeId).toBeNull();
});

it('shows a restored item in the address without adding a history entry', () => {
  const length = window.history.length;
  render(<Workspace initial={[a]} />);
  expect(at()).toBe(pathFor(a));
  expect(window.history.length).toBe(length);
});

it('waits for the saved workspace before touching the address', () => {
  window.history.replaceState(null, '', pathFor(a));
  const { rerender } = render(<Workspace ready={false} />);
  expect(api.activeId).toBeNull();
  rerender(<Workspace ready />);
  expect(api.activeId).toBe(a.id);
});

it('closing an item opened from home steps back to home instead of piling up entries', async () => {
  render(<Workspace />);
  act(() => api.openItem(a));
  const afterOpen = window.history.length;
  act(() => api.close(a.id));
  await act(async () => { await settlesAt('/'); });
  expect(at()).toBe('/');
  expect(api.activeId).toBeNull(); // the pop didn't reopen anything
  expect(window.history.length).toBe(afterOpen); // closing stepped back; it added no entry
});

it('closing one of several tabs moves the address to the next without a new entry', () => {
  render(<Workspace />);
  act(() => api.openItem(a));
  act(() => api.openItem(b));
  const length = window.history.length;
  act(() => api.close(b.id));
  expect(at()).toBe(pathFor(a));
  expect(window.history.length).toBe(length);
});
