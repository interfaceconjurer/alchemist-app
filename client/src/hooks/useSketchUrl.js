import { useEffect, useRef } from 'react';
import { itemForPath, pathFor } from '../sketchRoutes';

const BASE_TITLE = document.title;

/**
 * Keeps the address bar in step with the active work item: /sketch/<title> while
 * one is shown, / when none is. Showing an item adds a history entry, so the
 * browser's back and forward buttons (and a phone's back gesture) move between
 * items, and going back to / closes them. Closing an item that was opened from
 * home steps back to that home entry rather than adding another one, so Back
 * never lands on a page that looks the same; closing one tab of several moves
 * the address to the next tab in place, so Back doesn't reopen what was closed.
 *
 * On load the address wins: a link to an item opens it (alongside any restored
 * tabs on desktop). An unknown /sketch/ address goes home and becomes /. A plain
 * / with restored tabs takes the restored item's address without a new entry.
 *
 * `ready`: the saved workspace has been restored. `openIds`: the open tabs' ids.
 * `openItem(item)` and `closeAll()`: the app's own open and close actions.
 */
export function useSketchUrl({ ready, activeTab, openIds, openItem, closeAll }) {
  const synced = useRef(false);
  const ignoreNextPop = useRef(false);
  const lastActive = useRef(null);

  // The active item changed (or the workspace just loaded): update the address.
  useEffect(() => {
    if (!ready) return;
    document.title = activeTab ? `${activeTab.title} · ${BASE_TITLE}` : BASE_TITLE;
    const path = pathFor(activeTab);
    const closed = lastActive.current !== null && !openIds.includes(lastActive.current);
    lastActive.current = activeTab?.id ?? null;
    if (!synced.current) {
      synced.current = true;
      const linked = itemForPath(window.location.pathname);
      if (linked && linked.id !== activeTab?.id) { openItem(linked); return; } // next run records it
      if (window.location.pathname !== path) window.history.replaceState(null, '', path);
      return;
    }
    // Already there: back/forward moved the address first, or nothing changed.
    if (window.location.pathname === path) return;
    if (activeTab && closed) {
      window.history.replaceState(window.history.state, '', path);
    } else if (activeTab) {
      window.history.pushState({ fromHome: window.location.pathname === '/' }, '', path);
    } else if (window.history.state?.fromHome) {
      ignoreNextPop.current = true; // the app has already closed it
      window.history.back();
    } else {
      window.history.replaceState(null, '', path);
    }
  }, [ready, activeTab, openIds, openItem]);

  // Back and forward: show what the address now points to.
  useEffect(() => {
    const onPopState = () => {
      if (ignoreNextPop.current) { ignoreNextPop.current = false; return; }
      const item = itemForPath(window.location.pathname);
      if (item) { openItem(item); return; }
      if (item === null) window.history.replaceState(null, '', '/');
      closeAll();
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [openItem, closeAll]);
}
