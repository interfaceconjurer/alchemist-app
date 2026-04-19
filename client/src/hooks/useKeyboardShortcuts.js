import { useCallback, useRef } from 'react';
import { DOUBLE_CLICK_DELAY } from '../utils/stateHelpers';

export function useKeyboardShortcuts(stateRef, dispatch, tabActions) {
  const clickTimerRef = useRef(null);
  const clickedItemIdRef = useRef(null);

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
      tabActions.openWorkItemAsPreview(item);
    }, DOUBLE_CLICK_DELAY);
  }, [tabActions]);

  const handleWorkItemDoubleClick = useCallback((item) => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      clickedItemIdRef.current = null;
    }
    tabActions.openWorkItemAsPersistent(item);
  }, [tabActions]);

  const handleTabDoubleClick = useCallback((tabId) => {
    const state = stateRef.current;
    if (state.splitView.enabled) {
      if (state.splitView.leftPanePreviewTabId === tabId) {
        dispatch({ splitView: { ...state.splitView, leftPanePreviewTabId: null } });
        return;
      }
      if (state.splitView.rightPanePreviewTabId === tabId) {
        dispatch({ splitView: { ...state.splitView, rightPanePreviewTabId: null } });
        return;
      }
      return;
    }
    if (state.previewTabId === tabId) {
      dispatch({ previewTabId: null });
    }
  }, [stateRef, dispatch]);

  const toggleCommandPalette = useCallback(() => {
    dispatch({ commandPaletteOpen: !stateRef.current.commandPaletteOpen });
  }, [stateRef, dispatch]);

  const handlePaletteAction = useCallback((actionId) => {
    if (actionId === 'action:close-all') {
      tabActions.closeAllTabs();
    }
  }, [tabActions]);

  const handleGlobalKeyDown = useCallback((e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      toggleCommandPalette();
      return;
    }
    if (stateRef.current.commandPaletteOpen) return;
    if (e.ctrlKey && e.key === 'q') {
      e.preventDefault();
      tabActions.closeActiveTab();
    }
  }, [stateRef, toggleCommandPalette, tabActions]);

  const cleanup = useCallback(() => {
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
  }, []);

  return {
    handleWorkItemClick,
    handleWorkItemDoubleClick,
    handleTabDoubleClick,
    toggleCommandPalette,
    handlePaletteAction,
    handleGlobalKeyDown,
    cleanup
  };
}
