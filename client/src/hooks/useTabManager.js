import { useCallback } from 'react';
import { getDefaultSplitViewState } from '../utils/stateHelpers';

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

function paneKeys(paneId) {
  return {
    tabsKey: paneId === 'left' ? 'leftPaneTabIds' : 'rightPaneTabIds',
    activeKey: paneId === 'left' ? 'leftActiveTabId' : 'rightActiveTabId',
    previewKey: paneId === 'left' ? 'leftPanePreviewTabId' : 'rightPanePreviewTabId'
  };
}

export function useTabManager(stateRef, dispatch) {
  const openWorkItemAsPreview = useCallback((item) => {
    const state = stateRef.current;

    if (state.splitView.enabled) {
      const activePaneId = state.splitView.activePaneId || 'left';
      const { tabsKey, activeKey, previewKey } = paneKeys(activePaneId);
      const currentPanePreviewId = state.splitView[previewKey];

      const isInLeft = state.splitView.leftPaneTabIds.includes(item.id);
      const isInRight = state.splitView.rightPaneTabIds.includes(item.id);
      const isLeftPreview = state.splitView.leftPanePreviewTabId === item.id;
      const isRightPreview = state.splitView.rightPanePreviewTabId === item.id;

      if ((isInLeft && !isLeftPreview) || (isInRight && !isRightPreview)) {
        const targetPane = isInLeft ? 'left' : 'right';
        dispatch({
          activeTabId: item.id,
          splitView: { ...state.splitView, activePaneId: targetPane, [paneKeys(targetPane).activeKey]: item.id }
        });
        return;
      }

      if (isLeftPreview || isRightPreview) {
        const targetPane = isLeftPreview ? 'left' : 'right';
        dispatch({
          activeTabId: item.id,
          splitView: { ...state.splitView, activePaneId: targetPane, [paneKeys(targetPane).activeKey]: item.id }
        });
        return;
      }

      if (currentPanePreviewId !== null) {
        const openTabs = state.openTabs.map((tab) => tab.id === currentPanePreviewId ? { ...item } : tab);
        const animatedTabs = new Set(state.animatedTabs);
        animatedTabs.delete(currentPanePreviewId);
        const fadingTabs = new Set(state.fadingTabs);
        fadingTabs.delete(currentPanePreviewId);
        const newPaneTabIds = state.splitView[tabsKey].map(id => id === currentPanePreviewId ? item.id : id);
        dispatch({
          openTabs, activeTabId: item.id, animatedTabs, fadingTabs,
          splitView: { ...state.splitView, [tabsKey]: newPaneTabIds, [activeKey]: item.id, [previewKey]: item.id }
        });
        scrollTabIntoView(item.id);
        return;
      }

      dispatch({
        openTabs: [...state.openTabs, { ...item }],
        activeTabId: item.id,
        splitView: { ...state.splitView, [tabsKey]: [...state.splitView[tabsKey], item.id], [activeKey]: item.id, [previewKey]: item.id }
      });
      scrollTabIntoView(item.id);
      return;
    }

    if (state.openTabs.some((tab) => tab.id === item.id && tab.id !== state.previewTabId)) {
      dispatch({ activeTabId: item.id });
      return;
    }
    if (state.previewTabId === item.id) {
      dispatch({ activeTabId: item.id });
      return;
    }
    if (state.previewTabId !== null) {
      const openTabs = state.openTabs.map((tab) => tab.id === state.previewTabId ? { ...item } : tab);
      const animatedTabs = new Set(state.animatedTabs);
      animatedTabs.delete(state.previewTabId);
      const fadingTabs = new Set(state.fadingTabs);
      fadingTabs.delete(state.previewTabId);
      dispatch({ openTabs, activeTabId: item.id, previewTabId: item.id, animatedTabs, fadingTabs });
      scrollTabIntoView(item.id);
      return;
    }
    dispatch({
      openTabs: [...state.openTabs, { ...item }],
      activeTabId: item.id,
      previewTabId: item.id
    });
    scrollTabIntoView(item.id);
  }, [stateRef, dispatch]);

  const openWorkItemAsPersistent = useCallback((item) => {
    const state = stateRef.current;

    if (state.splitView.enabled) {
      const activePaneId = state.splitView.activePaneId || 'left';
      const { tabsKey, activeKey } = paneKeys(activePaneId);

      const isInLeft = state.splitView.leftPaneTabIds.includes(item.id);
      const isInRight = state.splitView.rightPaneTabIds.includes(item.id);
      const isLeftPreview = state.splitView.leftPanePreviewTabId === item.id;
      const isRightPreview = state.splitView.rightPanePreviewTabId === item.id;

      if (isLeftPreview || isRightPreview) {
        const targetPane = isLeftPreview ? 'left' : 'right';
        const previewKey = targetPane === 'left' ? 'leftPanePreviewTabId' : 'rightPanePreviewTabId';
        dispatch({
          activeTabId: item.id,
          splitView: { ...state.splitView, activePaneId: targetPane, [paneKeys(targetPane).activeKey]: item.id, [previewKey]: null }
        });
        scrollTabIntoView(item.id);
        return;
      }

      if (isInLeft || isInRight) {
        const targetPane = isInLeft ? 'left' : 'right';
        dispatch({
          activeTabId: item.id,
          splitView: { ...state.splitView, activePaneId: targetPane, [paneKeys(targetPane).activeKey]: item.id }
        });
        scrollTabIntoView(item.id);
        return;
      }

      dispatch({
        openTabs: [...state.openTabs, { ...item }],
        activeTabId: item.id,
        splitView: { ...state.splitView, [tabsKey]: [...state.splitView[tabsKey], item.id], [activeKey]: item.id }
      });
      scrollTabIntoView(item.id);
      return;
    }

    if (state.previewTabId === item.id) {
      dispatch({ activeTabId: item.id, previewTabId: null });
      return;
    }
    if (state.openTabs.some((tab) => tab.id === item.id)) {
      dispatch({ activeTabId: item.id });
      scrollTabIntoView(item.id);
      return;
    }
    dispatch({ openTabs: [...state.openTabs, { ...item }], activeTabId: item.id });
    scrollTabIntoView(item.id);
  }, [stateRef, dispatch]);

  const closeTab = useCallback((e, tabId) => {
    e.stopPropagation();
    const state = stateRef.current;
    const openTabs = state.openTabs.filter((tab) => tab.id !== tabId);
    const wasActive = state.activeTabId === tabId;
    const animatedTabs = new Set(state.animatedTabs);
    animatedTabs.delete(tabId);
    const fadingTabs = new Set(state.fadingTabs);
    fadingTabs.delete(tabId);

    if (state.splitView.enabled) {
      const newLeftTabs = state.splitView.leftPaneTabIds.filter(id => id !== tabId);
      const newRightTabs = state.splitView.rightPaneTabIds.filter(id => id !== tabId);

      if (newLeftTabs.length === 0 || newRightTabs.length === 0) {
        let globalPreviewTabId = null;
        if (newLeftTabs.length > 0 && state.splitView.leftPanePreviewTabId) globalPreviewTabId = state.splitView.leftPanePreviewTabId;
        else if (newRightTabs.length > 0 && state.splitView.rightPanePreviewTabId) globalPreviewTabId = state.splitView.rightPanePreviewTabId;

        const allTabIds = [...newLeftTabs, ...newRightTabs];
        const newActiveTabId = wasActive && allTabIds.length > 0 ? allTabIds[allTabIds.length - 1] : (state.activeTabId === tabId ? null : state.activeTabId);
        dispatch({ openTabs, activeTabId: newActiveTabId, animatedTabs, fadingTabs, previewTabId: globalPreviewTabId, splitView: getDefaultSplitViewState() });
        return;
      }

      const wasInLeft = state.splitView.leftPaneTabIds.includes(tabId);
      let newLeftActiveTabId = state.splitView.leftActiveTabId;
      let newRightActiveTabId = state.splitView.rightActiveTabId;
      let newLeftPreviewTabId = state.splitView.leftPanePreviewTabId === tabId ? null : state.splitView.leftPanePreviewTabId;
      let newRightPreviewTabId = state.splitView.rightPanePreviewTabId === tabId ? null : state.splitView.rightPanePreviewTabId;

      if (wasInLeft && state.splitView.leftActiveTabId === tabId) {
        newLeftActiveTabId = newLeftTabs.length > 0 ? newLeftTabs[newLeftTabs.length - 1] : null;
      }
      if (!wasInLeft && state.splitView.rightActiveTabId === tabId) {
        newRightActiveTabId = newRightTabs.length > 0 ? newRightTabs[newRightTabs.length - 1] : null;
      }

      dispatch({
        openTabs, animatedTabs, fadingTabs,
        activeTabId: wasActive ? (wasInLeft ? newLeftActiveTabId : newRightActiveTabId) || state.activeTabId : state.activeTabId,
        splitView: {
          ...state.splitView,
          leftPaneTabIds: newLeftTabs, rightPaneTabIds: newRightTabs,
          leftActiveTabId: newLeftActiveTabId, rightActiveTabId: newRightActiveTabId,
          leftPanePreviewTabId: newLeftPreviewTabId, rightPanePreviewTabId: newRightPreviewTabId
        }
      });
      return;
    }

    const activeTabId = wasActive ? (openTabs.length > 0 ? openTabs[openTabs.length - 1].id : null) : state.activeTabId;
    const previewTabId = state.previewTabId === tabId ? null : state.previewTabId;
    dispatch({ openTabs, activeTabId, animatedTabs, fadingTabs, previewTabId });
  }, [stateRef, dispatch]);

  const closeActiveTab = useCallback(() => {
    const state = stateRef.current;
    if (!state.activeTabId) return;
    const openTabs = state.openTabs.filter((tab) => tab.id !== state.activeTabId);
    const activeTabId = openTabs.length > 0 ? openTabs[openTabs.length - 1].id : null;
    const animatedTabs = new Set(state.animatedTabs);
    animatedTabs.delete(state.activeTabId);
    const fadingTabs = new Set(state.fadingTabs);
    fadingTabs.delete(state.activeTabId);
    const previewTabId = state.previewTabId === state.activeTabId ? null : state.previewTabId;
    dispatch({ openTabs, activeTabId, animatedTabs, fadingTabs, previewTabId });
  }, [stateRef, dispatch]);

  const closeAllTabs = useCallback(() => {
    dispatch({
      openTabs: [], activeTabId: null, animatedTabs: new Set(), fadingTabs: new Set(),
      previewTabId: null, splitView: getDefaultSplitViewState()
    });
  }, [dispatch]);

  const selectTab = useCallback((tabId) => {
    const state = stateRef.current;
    if (state.splitView.enabled) {
      if (state.splitView.leftPaneTabIds.includes(tabId)) {
        dispatch({ activeTabId: tabId, splitView: { ...state.splitView, leftActiveTabId: tabId, activePaneId: 'left' } });
      } else if (state.splitView.rightPaneTabIds.includes(tabId)) {
        dispatch({ activeTabId: tabId, splitView: { ...state.splitView, rightActiveTabId: tabId, activePaneId: 'right' } });
      }
    } else {
      dispatch({ activeTabId: tabId });
    }
    scrollTabIntoView(tabId);
  }, [stateRef, dispatch]);

  const startTabFade = useCallback((tabId) => {
    const fadingTabs = new Set(stateRef.current.fadingTabs);
    fadingTabs.add(tabId);
    dispatch({ fadingTabs });
  }, [stateRef, dispatch]);

  const markAnimationComplete = useCallback((tabId) => {
    const animatedTabs = new Set(stateRef.current.animatedTabs);
    animatedTabs.add(tabId);
    const fadingTabs = new Set(stateRef.current.fadingTabs);
    fadingTabs.delete(tabId);
    dispatch({ animatedTabs, fadingTabs });
  }, [stateRef, dispatch]);

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
