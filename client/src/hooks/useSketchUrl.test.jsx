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

it('honors an unknown sketch even with restored tabs', () => {
  history.replaceState(null, '', '/sketch/missing');
  render(<Workspace initial={[a]} />);
  expect(at()).toBe('/');
  expect(api.activeId).toBeNull();
});

it('preserves a home pop received before restoration finishes', () => {
  history.replaceState(null, '', pathFor(b));
  const { rerender } = render(<Workspace initial={[a]} ready={false} />);
  act(() => {
    history.replaceState(null, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  rerender(<Workspace initial={[a]} ready />);
  expect(at()).toBe('/');
  expect(api.activeId).toBeNull();
});

it('replaces an alias on initial StrictMode mount without pushing a duplicate', () => {
  history.replaceState(null, '', pathFor(b).toUpperCase().replace('/SKETCH/', '/sketch/') + '/');
  const length = history.length;
  render(<React.StrictMode><Workspace /></React.StrictMode>);
  expect(at()).toBe(pathFor(b));
  expect(api.activeId).toBe(b.id);
  expect(history.length).toBe(length);
});

it('closes in place when the browser has evicted the predecessor, then handles Forward', () => {
  const navigation = Object.assign(new EventTarget(), { currentEntry: { index: 0 }, entries: () => [] });
  vi.stubGlobal('navigation', navigation);
  try {
    render(<Workspace />);
    act(() => api.openItem(a));
    act(() => api.close(a.id));
    expect(at()).toBe('/');
    act(() => {
      history.replaceState(null, '', pathFor(b));
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(api.activeId).toBe(b.id);
  } finally { vi.unstubAllGlobals(); }
});

it('recovers if a legacy browser has evicted the previous history entry', async () => {
  vi.useFakeTimers();
  const traversal = vi.spyOn(history, 'back').mockImplementation(() => {});
  try {
    render(<Workspace />);
    act(() => api.openItem(a));
    act(() => api.close(a.id));
    await act(async () => vi.advanceTimersByTimeAsync(1000));
    expect(at()).toBe('/');
    act(() => {
      history.replaceState(null, '', pathFor(b));
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(api.activeId).toBe(b.id);
  } finally { traversal.mockRestore(); vi.useRealTimers(); }
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

it('closing the second tab returns to the preceding first tab, then Back goes home', async () => {
  render(<Workspace />);
  act(() => api.openItem(a));
  act(() => api.openItem(b));
  const length = window.history.length;
  act(() => api.close(b.id));
  await act(async () => { await settlesAt(pathFor(a)); });
  expect(at()).toBe(pathFor(a));
  expect(window.history.length).toBe(length);
  await back();
  expect(at()).toBe('/');
  expect(api.activeId).toBeNull();
});
