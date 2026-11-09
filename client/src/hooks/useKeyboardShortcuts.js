import { useCallback, useRef, useEffect } from 'react';
import { DOUBLE_CLICK_DELAY } from '../utils/stateHelpers';

export function useKeyboardShortcuts(stateRef, dispatch, tabActions) {
  const clickTimerRef = useRef(null);
  const clickedItemIdRef = useRef(null);
  const { openWorkItemAsPreview, openWorkItemAsPersistent, closeAllTabs, closeActiveTab } = tabActions;
  const cleanup = useCallback(() => {
    if (clickTimerRef.current !== null) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = null;
    clickedItemIdRef.current = null;
  }, []);
  useEffect(() => cleanup, [cleanup]);

  const handleWorkItemClick = useCallback((item) => {
    if (clickTimerRef.current && clickedItemIdRef.current !== item.id) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    if (clickTimerRef.current && clickedItemIdRef.current === item.id) return;

    clickedItemIdRef.current = item.id;
    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null;
      clickedItemIdRef.current = null;
      openWorkItemAsPreview(item);
    }, DOUBLE_CLICK_DELAY);
  }, [openWorkItemAsPreview]);

  const handleWorkItemDoubleClick = useCallback((item) => {
    cleanup();
    openWorkItemAsPersistent(item);
  }, [cleanup, openWorkItemAsPersistent]);

  const handleTabDoubleClick = useCallback((tabId) => {
    dispatch({ type: 'TAB_DOUBLE_CLICK', tabId });
  }, [dispatch]);

  const toggleCommandPalette = useCallback(() => {
    dispatch({ type: 'TOGGLE_COMMAND_PALETTE' });
  }, [dispatch]);

  const handlePaletteAction = useCallback((actionId) => {
    if (actionId === 'action:close-all') closeAllTabs();
  }, [closeAllTabs]);

  const handleGlobalKeyDown = useCallback((e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      toggleCommandPalette();
      return;
    }
    if (stateRef.current.commandPaletteOpen) return;
    if (e.ctrlKey && e.key === 'q') {
      e.preventDefault();
      closeActiveTab();
    }
  }, [stateRef, toggleCommandPalette, closeActiveTab]);

  return { handleWorkItemClick, handleWorkItemDoubleClick, handleTabDoubleClick, toggleCommandPalette, handlePaletteAction, handleGlobalKeyDown, cleanup };
}
