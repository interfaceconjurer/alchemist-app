import { useLayoutEffect, useRef } from 'react';
import { itemForPath, pathFor } from '../sketchRoutes';
import { updateSketchMetadata } from '../sketchMetadata';

function pushSketch(path) {
  history.pushState({ sketchPrevious: location.pathname }, '', path);
}

// Only step back to an adjacent entry created by this app. A long-lived tab
// can lose its oldest entries, even though their successors still have state.
function predecessor(path) {
  if (history.state?.sketchPrevious !== path && !(history.state?.fromHome && path === '/')) return null;
  const navigation = window.navigation;
  if (!navigation?.currentEntry) return { path };
  const entry = navigation.entries()[navigation.currentEntry.index - 1];
  if (!entry?.sameDocument || !entry.url || new URL(entry.url).pathname !== path) return null;
  return { path, key: entry.key };
}

function replacePath(path) {
  if (location.pathname !== path) history.replaceState(history.state, '', path);
}

export function useSketchUrl({ ready, activeTab, openIds, openItem, closeAll }) {
  const previous = useRef(null);
  const poppedBeforeRestore = useRef(false);
  const closing = useRef(null);

  function cancelClose() {
    const pending = closing.current;
    if (pending) {
      clearTimeout(pending.start);
      clearTimeout(pending.fallback);
      closing.current = null;
    }
    return pending;
  }

  useLayoutEffect(() => {
    function onPop() {
      const pending = cancelClose();
      if (!ready) { poppedBeforeRestore.current = true; return; }
      const item = itemForPath(location.pathname);
      const path = pathFor(item);
      replacePath(path);
      // A click received after traverseTo was issued belongs on the destination.
      if (pending && 'after' in pending && pending.path === path &&
          (!pending.key || window.navigation.currentEntry.key === pending.key)) {
        if (pending.after) {
          if (path !== pathFor(pending.after)) pushSketch(pathFor(pending.after));
          openItem(pending.after);
        } else {
          replacePath('/');
          closeAll();
        }
      } else if (item) openItem(item);
      else closeAll();
    }
    function onNavigate(event) {
      // A browser Back initiated in the same turn as a close owns the traversal.
      if (event.navigationType === 'traverse' && !closing.current?.issued) cancelClose();
    }
    window.addEventListener('popstate', onPop);
    window.navigation?.addEventListener('navigate', onNavigate);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.navigation?.removeEventListener('navigate', onNavigate);
      cancelClose();
    };
  }, [ready, openItem, closeAll]);

  useLayoutEffect(() => {
    if (!ready) return;
    const last = previous.current;
    previous.current = { id: activeTab?.id, openIds };
    if (last && last.id === activeTab?.id) return;
    updateSketchMetadata(document, activeTab);
    const path = pathFor(activeTab);

    if (!last) {
      const linked = itemForPath(location.pathname);
      if (linked) {
        replacePath(pathFor(linked));
        if (linked.id !== activeTab?.id) openItem(linked);
      } else if (linked === null || poppedBeforeRestore.current) {
        replacePath('/');
        closeAll();
      } else replacePath(path);
      return;
    }

    const pending = closing.current;
    if (pending) {
      if (pending.issued) { pending.after = activeTab; return; }
      if (pending.path === path) return;
      cancelClose();
      replacePath(path);
      return;
    }
    if (location.pathname === path) return;

    // Mobile replaces its sole tab when opening a *new* item. Closing an active
    // tab can only reveal home or an item that was already in the workspace.
    const closed = last.id && !openIds.includes(last.id) && (!activeTab || last.openIds.includes(activeTab.id));
    if (!closed) { pushSketch(path); return; }
    const target = predecessor(path);
    if (!target) { replacePath(path); return; }

    closing.current = target;
    const from = location.href;
    function fallback() {
      if (closing.current !== target) return;
      cancelClose();
      if (location.href === from) replacePath('after' in target ? pathFor(target.after) : path);
    }
    // Give a simultaneous native Back or another workspace action precedence.
    target.start = setTimeout(() => {
      if (location.href !== from) { cancelClose(); return; }
      target.issued = true;
      if (target.key) {
        window.navigation.traverseTo(target.key).committed.catch(fallback);
      } else {
        // Older engines cannot inspect retained history or report a no-op back.
        target.fallback = setTimeout(fallback, 500);
        history.back();
      }
    }, 0);
  }, [ready, activeTab, openIds, openItem, closeAll]);
}
