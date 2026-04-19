import { useCallback } from 'react';

function scrollTabIntoView(tabId) {
  requestAnimationFrame(() => {
    const tabElement = document.querySelector(`[data-tab-id="${tabId}"]`);
    if (!tabElement) return;
    const tabContainer = tabElement.closest('.stage-tabs-list');
    if (!tabContainer) return;
    const containerRect = tabContainer.getBoundingClientRect();
    const tabRect = tabElement.getBoundingClientRect();
    if (tabRect.left < containerRect.left || tabRect.right > containerRect.right) {
      tabElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  });
}

export function useTabManager(dispatch) {
  const openWorkItemAsPreview = useCallback((item) => {
    dispatch({ type: 'OPEN_PREVIEW', item });
    scrollTabIntoView(item.id);
  }, [dispatch]);

  const openWorkItemAsPersistent = useCallback((item) => {
    dispatch({ type: 'OPEN_PERSISTENT', item });
    scrollTabIntoView(item.id);
  }, [dispatch]);

  const closeTab = useCallback((e, tabId) => {
    e.stopPropagation();
    dispatch({ type: 'CLOSE_TAB', tabId });
  }, [dispatch]);

  const closeActiveTab = useCallback(() => {
    dispatch({ type: 'CLOSE_ACTIVE_TAB' });
  }, [dispatch]);

  const closeAllTabs = useCallback(() => {
    dispatch({ type: 'CLOSE_ALL_TABS' });
  }, [dispatch]);

  const selectTab = useCallback((tabId) => {
    dispatch({ type: 'SELECT_TAB', tabId });
    scrollTabIntoView(tabId);
  }, [dispatch]);

  const startTabFade = useCallback((tabId) => {
    dispatch({ type: 'START_TAB_FADE', tabId });
  }, [dispatch]);

  const markAnimationComplete = useCallback((tabId) => {
    dispatch({ type: 'MARK_ANIMATION_COMPLETE', tabId });
  }, [dispatch]);

  return {
    openWorkItemAsPreview,
    openWorkItemAsPersistent,
    openWorkItem: openWorkItemAsPersistent,
    closeTab,
    closeActiveTab,
    closeAllTabs,
    selectTab,
    startTabFade,
    markAnimationComplete
  };
}
