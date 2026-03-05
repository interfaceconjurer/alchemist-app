import {
  isTabInPane,
  isPreviewTab,
  getPaneTabCount
} from '../utils/tabHelpers';
import {
  getPaneKeys,
  getActivePaneId,
  shouldCloseSplit
} from '../utils/splitViewHelpers';

// Factory function to create tab manager with component instance binding
export function createTabManager(component) {
  // Helper method to scroll a tab into view
  const scrollTabIntoView = (tabId) => {
    // Use requestAnimationFrame to ensure DOM is updated before scrolling
    requestAnimationFrame(() => {
      const tabElement = document.querySelector(`[data-tab-id="${tabId}"]`);

      if (tabElement) {
        // Find the parent tab container (stage-tabs-list)
        const tabContainer = tabElement.closest('.stage-tabs-list');

        if (tabContainer) {
          const containerRect = tabContainer.getBoundingClientRect();
          const tabRect = tabElement.getBoundingClientRect();

          // Check if tab is not fully visible
          if (tabRect.left < containerRect.left || tabRect.right > containerRect.right) {
            // Scroll the tab into view with smooth animation
            tabElement.scrollIntoView({
              behavior: 'smooth',
              block: 'nearest',
              inline: 'center'
            });
          }
        }
      }
    });
  };

  const openWorkItemAsPreview = (item) => {
    component.setState((state) => {
      // Handle split view mode with per-pane preview tabs
      if (state.splitView.enabled) {
        const activePaneId = getActivePaneId(state.splitView);
        const { tabsKey: paneTabsKey, activeKey: paneActiveKey, previewKey: panePreviewKey } = getPaneKeys(activePaneId);
        const currentPanePreviewId = state.splitView[panePreviewKey];

        // Check if item is already open as persistent in any pane
        const isInLeftPane = isTabInPane(item.id, 'left', state.splitView);
        const isInRightPane = isTabInPane(item.id, 'right', state.splitView);
        const isLeftPreview = state.splitView.leftPanePreviewTabId === item.id;
        const isRightPreview = state.splitView.rightPanePreviewTabId === item.id;

        // If already open as persistent (not preview), just activate it
        if ((isInLeftPane && !isLeftPreview) || (isInRightPane && !isRightPreview)) {
          const targetPane = isInLeftPane ? 'left' : 'right';
          return {
            activeTabId: item.id,
            splitView: {
              ...state.splitView,
              activePaneId: targetPane,
              [targetPane === 'left' ? 'leftActiveTabId' : 'rightActiveTabId']: item.id
            }
          };
        }

        // If already a preview tab somewhere, just activate it
        if (isLeftPreview || isRightPreview) {
          const targetPane = isLeftPreview ? 'left' : 'right';
          return {
            activeTabId: item.id,
            splitView: {
              ...state.splitView,
              activePaneId: targetPane,
              [targetPane === 'left' ? 'leftActiveTabId' : 'rightActiveTabId']: item.id
            }
          };
        }

        // Replace existing preview tab in the active pane if it exists
        if (currentPanePreviewId !== null) {
          const openTabs = state.openTabs.map((tab) =>
            tab.id === currentPanePreviewId ? { ...item } : tab
          );
          const animatedTabs = new Set(state.animatedTabs);
          animatedTabs.delete(currentPanePreviewId);
          const fadingTabs = new Set(state.fadingTabs);
          fadingTabs.delete(currentPanePreviewId);

          // Update the active pane's tab IDs
          const newPaneTabIds = state.splitView[paneTabsKey].map(id =>
            id === currentPanePreviewId ? item.id : id
          );

          return {
            openTabs,
            activeTabId: item.id,
            animatedTabs,
            fadingTabs,
            splitView: {
              ...state.splitView,
              [paneTabsKey]: newPaneTabIds,
              [paneActiveKey]: item.id,
              [panePreviewKey]: item.id
            }
          };
        }

        // No preview tab in active pane — append new one
        return {
          openTabs: [...state.openTabs, { ...item }],
          activeTabId: item.id,
          splitView: {
            ...state.splitView,
            [paneTabsKey]: [...state.splitView[paneTabsKey], item.id],
            [paneActiveKey]: item.id,
            [panePreviewKey]: item.id
          }
        };
      }

      // Original non-split logic (unchanged)
      // Already open as persistent tab — just activate
      if (state.openTabs.some((tab) => tab.id === item.id && tab.id !== state.previewTabId)) {
        return { activeTabId: item.id };
      }
      // Already the preview tab — just activate
      if (state.previewTabId === item.id) {
        return { activeTabId: item.id };
      }
      // Replace existing preview tab in-place
      if (state.previewTabId !== null) {
        const openTabs = state.openTabs.map((tab) => (tab.id === state.previewTabId ? { ...item } : tab));
        const animatedTabs = new Set(state.animatedTabs);
        animatedTabs.delete(state.previewTabId);
        const fadingTabs = new Set(state.fadingTabs);
        fadingTabs.delete(state.previewTabId);
        return { openTabs, activeTabId: item.id, previewTabId: item.id, animatedTabs, fadingTabs };
      }
      // No preview tab — append new one
      return {
        openTabs: [...state.openTabs, { ...item }],
        activeTabId: item.id,
        previewTabId: item.id,
      };
    }, () => {
      // Scroll the newly opened tab into view
      scrollTabIntoView(item.id);
    });
  };

  const openWorkItemAsPersistent = (item) => {
    component.setState((state) => {
      // Handle split view mode with per-pane preview tabs
      if (state.splitView.enabled) {
        const activePaneId = getActivePaneId(state.splitView);
        const { tabsKey: paneTabsKey, activeKey: paneActiveKey } = getPaneKeys(activePaneId);

        // Check if item exists in any pane
        const isInLeftPane = isTabInPane(item.id, 'left', state.splitView);
        const isInRightPane = isTabInPane(item.id, 'right', state.splitView);
        const isLeftPreview = state.splitView.leftPanePreviewTabId === item.id;
        const isRightPreview = state.splitView.rightPanePreviewTabId === item.id;

        // Promote preview tab to persistent if it's a preview
        if (isLeftPreview || isRightPreview) {
          const targetPane = isLeftPreview ? 'left' : 'right';
          const previewKey = targetPane === 'left' ? 'leftPanePreviewTabId' : 'rightPanePreviewTabId';

          return {
            activeTabId: item.id,
            splitView: {
              ...state.splitView,
              activePaneId: targetPane,
              [targetPane === 'left' ? 'leftActiveTabId' : 'rightActiveTabId']: item.id,
              [previewKey]: null  // Clear the preview status
            }
          };
        }

        // Already open as persistent — just activate
        if (isInLeftPane || isInRightPane) {
          const targetPane = isInLeftPane ? 'left' : 'right';
          return {
            activeTabId: item.id,
            splitView: {
              ...state.splitView,
              activePaneId: targetPane,
              [targetPane === 'left' ? 'leftActiveTabId' : 'rightActiveTabId']: item.id
            }
          };
        }

        // Not open — append as persistent to active pane
        return {
          openTabs: [...state.openTabs, { ...item }],
          activeTabId: item.id,
          splitView: {
            ...state.splitView,
            [paneTabsKey]: [...state.splitView[paneTabsKey], item.id],
            [paneActiveKey]: item.id
            // Note: NOT setting the preview key, so it's persistent
          }
        };
      }

      // Original non-split logic (unchanged)
      // Promote current preview tab
      if (state.previewTabId === item.id) {
        return { activeTabId: item.id, previewTabId: null };
      }
      // Already open as persistent — just activate
      if (state.openTabs.some((tab) => tab.id === item.id)) {
        return { activeTabId: item.id };
      }
      // Not open — append as persistent
      return {
        openTabs: [...state.openTabs, { ...item }],
        activeTabId: item.id,
      };
    }, () => {
      // Scroll the newly opened tab into view
      scrollTabIntoView(item.id);
    });
  };

  // CommandPalette and programmatic use — always persistent
  const openWorkItem = (item) => {
    openWorkItemAsPersistent(item);
  };

  const closeTab = (e, tabId) => {
    e.stopPropagation();
    component.setState((state) => {
      const openTabs = state.openTabs.filter((tab) => tab.id !== tabId);
      const wasActive = state.activeTabId === tabId;

      // Handle split view
      if (state.splitView.enabled) {
        const newLeftTabs = state.splitView.leftPaneTabIds.filter(id => id !== tabId);
        const newRightTabs = state.splitView.rightPaneTabIds.filter(id => id !== tabId);

        // Check if we should close the split (one pane empty)
        if (shouldCloseSplit(newLeftTabs.length, newRightTabs.length)) {
          const allTabIds = [...newLeftTabs, ...newRightTabs];
          const newActiveTabId = wasActive && allTabIds.length > 0
            ? allTabIds[allTabIds.length - 1]
            : state.activeTabId === tabId ? null : state.activeTabId;

          const animatedTabs = new Set(state.animatedTabs);
          animatedTabs.delete(tabId);
          const fadingTabs = new Set(state.fadingTabs);
          fadingTabs.delete(tabId);

          // Determine which preview tab becomes the global preview when closing split
          // Prefer the preview tab from the remaining pane
          let globalPreviewTabId = null;
          if (newLeftTabs.length > 0 && state.splitView.leftPanePreviewTabId) {
            globalPreviewTabId = state.splitView.leftPanePreviewTabId;
          } else if (newRightTabs.length > 0 && state.splitView.rightPanePreviewTabId) {
            globalPreviewTabId = state.splitView.rightPanePreviewTabId;
          }

          return {
            openTabs,
            activeTabId: newActiveTabId,
            animatedTabs,
            fadingTabs,
            previewTabId: globalPreviewTabId,
            splitView: {
              enabled: false,
              leftPaneTabIds: [],
              rightPaneTabIds: [],
              leftActiveTabId: null,
              rightActiveTabId: null,
              leftPanePreviewTabId: null,
              rightPanePreviewTabId: null,
              activePaneId: 'left',
              splitterPosition: 50
            }
          };
        }

        // Still in split view - determine new active tab for affected pane
        const wasInLeft = state.splitView.leftPaneTabIds.includes(tabId);
        const wasInRight = state.splitView.rightPaneTabIds.includes(tabId);

        let newLeftActiveTabId = state.splitView.leftActiveTabId;
        let newRightActiveTabId = state.splitView.rightActiveTabId;
        let newLeftPreviewTabId = state.splitView.leftPanePreviewTabId;
        let newRightPreviewTabId = state.splitView.rightPanePreviewTabId;

        if (wasInLeft) {
          newLeftPreviewTabId = newLeftPreviewTabId === tabId ? null : newLeftPreviewTabId;
          if (state.splitView.leftActiveTabId === tabId) {
            newLeftActiveTabId = newLeftTabs.length > 0 ? newLeftTabs[newLeftTabs.length - 1] : null;
          }
        }

        if (wasInRight) {
          newRightPreviewTabId = newRightPreviewTabId === tabId ? null : newRightPreviewTabId;
          if (state.splitView.rightActiveTabId === tabId) {
            newRightActiveTabId = newRightTabs.length > 0 ? newRightTabs[newRightTabs.length - 1] : null;
          }
        }

        const animatedTabs = new Set(state.animatedTabs);
        animatedTabs.delete(tabId);
        const fadingTabs = new Set(state.fadingTabs);
        fadingTabs.delete(tabId);

        return {
          openTabs,
          activeTabId: wasActive
            ? (wasInLeft ? newLeftActiveTabId : newRightActiveTabId) || state.activeTabId
            : state.activeTabId,
          animatedTabs,
          fadingTabs,
          splitView: {
            ...state.splitView,
            leftPaneTabIds: newLeftTabs,
            rightPaneTabIds: newRightTabs,
            leftActiveTabId: newLeftActiveTabId,
            rightActiveTabId: newRightActiveTabId,
            leftPanePreviewTabId: newLeftPreviewTabId,
            rightPanePreviewTabId: newRightPreviewTabId
          }
        };
      }

      // Original single-pane logic
      const activeTabId = wasActive
        ? openTabs.length > 0
          ? openTabs[openTabs.length - 1].id
          : null
        : state.activeTabId;
      const animatedTabs = new Set(state.animatedTabs);
      animatedTabs.delete(tabId);
      const fadingTabs = new Set(state.fadingTabs);
      fadingTabs.delete(tabId);
      const previewTabId = state.previewTabId === tabId ? null : state.previewTabId;
      return { openTabs, activeTabId, animatedTabs, fadingTabs, previewTabId };
    });
  };

  const closeActiveTab = () => {
    component.setState((state) => {
      if (!state.activeTabId) return null;
      const openTabs = state.openTabs.filter((tab) => tab.id !== state.activeTabId);
      const activeTabId = openTabs.length > 0 ? openTabs[openTabs.length - 1].id : null;
      const animatedTabs = new Set(state.animatedTabs);
      animatedTabs.delete(state.activeTabId);
      const fadingTabs = new Set(state.fadingTabs);
      fadingTabs.delete(state.activeTabId);
      const previewTabId = state.previewTabId === state.activeTabId ? null : state.previewTabId;
      return { openTabs, activeTabId, animatedTabs, fadingTabs, previewTabId };
    });
  };

  const closeAllTabs = () => {
    component.setState({
      openTabs: [],
      activeTabId: null,
      animatedTabs: new Set(),
      fadingTabs: new Set(),
      previewTabId: null,
    });
  };

  const selectTab = (tabId) => {
    component.setState((state) => {
      // Handle split view - update pane-specific active tab
      if (state.splitView.enabled) {
        const inLeftPane = state.splitView.leftPaneTabIds.includes(tabId);
        const inRightPane = state.splitView.rightPaneTabIds.includes(tabId);

        if (inLeftPane) {
          return {
            activeTabId: tabId,
            splitView: {
              ...state.splitView,
              leftActiveTabId: tabId,
              activePaneId: 'left'
            }
          };
        } else if (inRightPane) {
          return {
            activeTabId: tabId,
            splitView: {
              ...state.splitView,
              rightActiveTabId: tabId,
              activePaneId: 'right'
            }
          };
        }
      }

      return { activeTabId: tabId };
    }, () => {
      // Scroll the selected tab into view
      scrollTabIntoView(tabId);
    });
  };

  const startTabFade = (tabId) => {
    component.setState((state) => {
      const fadingTabs = new Set(state.fadingTabs);
      fadingTabs.add(tabId);
      return { fadingTabs };
    });
  };

  const markAnimationComplete = (tabId) => {
    component.setState((state) => {
      const animatedTabs = new Set(state.animatedTabs);
      animatedTabs.add(tabId);
      const fadingTabs = new Set(state.fadingTabs);
      fadingTabs.delete(tabId);
      return { animatedTabs, fadingTabs };
    });
  };

  // Return the public API
  return {
    openWorkItemAsPreview,
    openWorkItemAsPersistent,
    openWorkItem,
    closeTab,
    closeActiveTab,
    closeAllTabs,
    selectTab,
    startTabFade,
    markAnimationComplete,
    scrollTabIntoView
  };
}