import { DOUBLE_CLICK_DELAY } from '../utils/stateHelpers';

// Factory function to create keyboard shortcuts manager with component instance binding
export function createKeyboardShortcutsManager(component) {
  const handleWorkItemClick = (item) => {
    if (component._clickTimer && component._clickedItemId !== item.id) {
      clearTimeout(component._clickTimer);
      component._clickTimer = null;
    }
    if (component._clickTimer && component._clickedItemId === item.id) {
      return;
    }
    component._clickedItemId = item.id;
    component._clickTimer = setTimeout(() => {
      component._clickTimer = null;
      component._clickedItemId = null;
      component.openWorkItemAsPreview(item);
    }, DOUBLE_CLICK_DELAY);
  };

  const handleWorkItemDoubleClick = (item) => {
    if (component._clickTimer) {
      clearTimeout(component._clickTimer);
      component._clickTimer = null;
      component._clickedItemId = null;
    }
    component.openWorkItemAsPersistent(item);
  };

  const handleTabDoubleClick = (tabId) => {
    component.setState((state) => {
      // Handle split view - clear preview status for the specific pane
      if (state.splitView.enabled) {
        if (state.splitView.leftPanePreviewTabId === tabId) {
          return {
            splitView: {
              ...state.splitView,
              leftPanePreviewTabId: null
            }
          };
        }
        if (state.splitView.rightPanePreviewTabId === tabId) {
          return {
            splitView: {
              ...state.splitView,
              rightPanePreviewTabId: null
            }
          };
        }
        return null;
      }

      // Original single-pane logic
      if (state.previewTabId === tabId) {
        return { previewTabId: null };
      }
      return null;
    });
  };

  const toggleCommandPalette = () => {
    component.setState((state) => ({ commandPaletteOpen: !state.commandPaletteOpen }));
  };

  const handlePaletteAction = (actionId) => {
    switch (actionId) {
      case "action:close-tab":
        component.closeActiveTab();
        break;
      case "action:close-all":
        component.closeAllTabs();
        break;
      default:
        break;
    }
  };

  const handleGlobalKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      toggleCommandPalette();
      return;
    }
    if (component.state.commandPaletteOpen) return;
    if (e.ctrlKey && e.key === "q") {
      e.preventDefault();
      component.closeActiveTab();
      return;
    }
  };

  // Return the public API
  return {
    handleWorkItemClick,
    handleWorkItemDoubleClick,
    handleTabDoubleClick,
    toggleCommandPalette,
    handlePaletteAction,
    handleGlobalKeyDown
  };
}