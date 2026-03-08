import { getDefaultSplitViewState } from '../utils/stateHelpers';

// Factory function to create split view manager with component instance binding
export function createSplitViewManager(component) {
  // Split view management methods
  const initiateSplit = (dropZone, draggedTabId) => {
    component.setState(state => {
      const remainingTabs = state.openTabs.filter(t => t.id !== draggedTabId);

      if (remainingTabs.length === 0) {
        // Can't split with only one tab
        return null;
      }

      const draggedTab = state.openTabs.find(t => t.id === draggedTabId);
      if (!draggedTab) return null;

      const leftTabs = dropZone === 'split-left'
        ? [draggedTabId]
        : remainingTabs.map(t => t.id);
      const rightTabs = dropZone === 'split-right'
        ? [draggedTabId]
        : remainingTabs.map(t => t.id);

      // Set active tab for each pane
      const leftActiveTabId = leftTabs.length > 0 ? leftTabs[0] : null;
      const rightActiveTabId = rightTabs.length > 0 ? rightTabs[0] : null;

      // Handle preview tabs when splitting
      let leftPanePreviewTabId = null;
      let rightPanePreviewTabId = null;

      // If the dragged tab was a preview, it becomes persistent when moved
      const wasDraggedPreview = state.previewTabId === draggedTabId;

      // Distribute the preview tab (if any and not the dragged tab) to the appropriate pane
      if (state.previewTabId && !wasDraggedPreview) {
        if (leftTabs.includes(state.previewTabId)) {
          leftPanePreviewTabId = state.previewTabId;
        } else if (rightTabs.includes(state.previewTabId)) {
          rightPanePreviewTabId = state.previewTabId;
        }
      }

      return {
        splitView: {
          enabled: true,
          leftPaneTabIds: leftTabs,
          rightPaneTabIds: rightTabs,
          leftActiveTabId,
          rightActiveTabId,
          leftPanePreviewTabId,
          rightPanePreviewTabId,
          activePaneId: dropZone === 'split-left' ? 'left' : 'right',
          splitterPosition: 50
        },
        activeTabId: draggedTabId,
        previewTabId: null  // Clear global preview tab as we're now using per-pane previews
      };
    });
  };

  const moveTabToPane = (targetPane, tabId) => {
    component.setState(state => {
      const { leftPaneTabIds, rightPaneTabIds, leftActiveTabId, rightActiveTabId,
              leftPanePreviewTabId, rightPanePreviewTabId } = state.splitView;

      // Check if the tab being moved is a preview tab
      const wasLeftPreview = leftPanePreviewTabId === tabId;
      const wasRightPreview = rightPanePreviewTabId === tabId;

      // Remove tab from both panes
      const newLeftTabs = leftPaneTabIds.filter(id => id !== tabId);
      const newRightTabs = rightPaneTabIds.filter(id => id !== tabId);

      // Add tab to target pane and set as active in that pane
      let newLeftActiveTabId = leftActiveTabId;
      let newRightActiveTabId = rightActiveTabId;
      let newLeftPreviewTabId = leftPanePreviewTabId;
      let newRightPreviewTabId = rightPanePreviewTabId;

      if (targetPane === 'left') {
        newLeftTabs.push(tabId);
        newLeftActiveTabId = tabId;
        // Clear preview status if it was a preview (moving makes it persistent)
        if (wasLeftPreview || wasRightPreview) {
          newLeftPreviewTabId = newLeftPreviewTabId === tabId ? null : newLeftPreviewTabId;
          newRightPreviewTabId = newRightPreviewTabId === tabId ? null : newRightPreviewTabId;
        }
      } else {
        newRightTabs.push(tabId);
        newRightActiveTabId = tabId;
        // Clear preview status if it was a preview (moving makes it persistent)
        if (wasLeftPreview || wasRightPreview) {
          newLeftPreviewTabId = newLeftPreviewTabId === tabId ? null : newLeftPreviewTabId;
          newRightPreviewTabId = newRightPreviewTabId === tabId ? null : newRightPreviewTabId;
        }
      }

      // Check if we should close the split (one pane would be empty)
      if (newLeftTabs.length === 0 || newRightTabs.length === 0) {
        const allTabIds = [...newLeftTabs, ...newRightTabs];
        const newActiveTabId = allTabIds.length > 0 ? tabId : null;

        // Determine which preview tab becomes the global preview when closing split
        let globalPreviewTabId = null;
        if (targetPane === 'left' && newLeftPreviewTabId) {
          globalPreviewTabId = newLeftPreviewTabId;
        } else if (targetPane === 'right' && newRightPreviewTabId) {
          globalPreviewTabId = newRightPreviewTabId;
        }

        return {
          splitView: getDefaultSplitViewState(),
          activeTabId: newActiveTabId,
          previewTabId: globalPreviewTabId
        };
      }

      // Update split view with tab in new pane
      return {
        splitView: {
          ...state.splitView,
          leftPaneTabIds: newLeftTabs,
          rightPaneTabIds: newRightTabs,
          leftActiveTabId: newLeftActiveTabId,
          rightActiveTabId: newRightActiveTabId,
          leftPanePreviewTabId: newLeftPreviewTabId,
          rightPanePreviewTabId: newRightPreviewTabId,
          activePaneId: targetPane
        },
        activeTabId: tabId
      };
    });
  };

  const closeSplit = () => {
    component.setState(state => {
      if (!state.splitView.enabled) return null;

      // Merge all tabs from both panes
      const allTabIds = [...new Set([...state.splitView.leftPaneTabIds, ...state.splitView.rightPaneTabIds])];

      // Determine new active tab (prefer left pane's active tab)
      const newActiveTabId = state.splitView.leftActiveTabId ||
                            state.splitView.rightActiveTabId ||
                            (allTabIds.length > 0 ? allTabIds[0] : null);

      // Determine which preview tab becomes the global preview
      // Prefer left pane's preview, then right pane's preview
      let globalPreviewTabId = null;
      if (state.splitView.leftPanePreviewTabId) {
        globalPreviewTabId = state.splitView.leftPanePreviewTabId;
      } else if (state.splitView.rightPanePreviewTabId) {
        globalPreviewTabId = state.splitView.rightPanePreviewTabId;
      }

      return {
        splitView: getDefaultSplitViewState(),
        activeTabId: newActiveTabId,
        previewTabId: globalPreviewTabId
      };
    });
  };

  const closeSplitState = (state) => {
    // Merge all tabs from both panes
    const allTabIds = [...new Set([...state.splitView.leftPaneTabIds, ...state.splitView.rightPaneTabIds])];

    // Determine new active tab (prefer left pane's active tab)
    const newActiveTabId = state.splitView.leftActiveTabId ||
                          state.splitView.rightActiveTabId ||
                          (allTabIds.length > 0 ? allTabIds[0] : null);

    // Determine which preview tab becomes the global preview
    let globalPreviewTabId = null;
    if (state.splitView.leftPanePreviewTabId) {
      globalPreviewTabId = state.splitView.leftPanePreviewTabId;
    } else if (state.splitView.rightPanePreviewTabId) {
      globalPreviewTabId = state.splitView.rightPanePreviewTabId;
    }

    return {
      splitView: getDefaultSplitViewState(),
      activeTabId: newActiveTabId,
      previewTabId: globalPreviewTabId
    };
  };

  // Splitter resize handlers
  const handleSplitterStart = (e) => {
    e.preventDefault();
    component.isSplitterResizing = true;
    component.startX = e.clientX;

    // Add event listeners
    document.addEventListener('mousemove', handleSplitterMove);
    document.addEventListener('mouseup', handleSplitterEnd);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleSplitterMove = (e) => {
    if (!component.isSplitterResizing) return;

    const stageRect = component.stageRef.current?.getBoundingClientRect();
    if (!stageRect) return;

    const relativeX = e.clientX - stageRect.left;
    const percentage = (relativeX / stageRect.width) * 100;

    // Constrain between 20% and 80%
    const newPosition = Math.max(20, Math.min(80, percentage));

    component.setState(state => ({
      splitView: {
        ...state.splitView,
        splitterPosition: newPosition
      }
    }));
  };

  const handleSplitterEnd = () => {
    component.isSplitterResizing = false;
    document.removeEventListener('mousemove', handleSplitterMove);
    document.removeEventListener('mouseup', handleSplitterEnd);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  // Return the public API
  return {
    initiateSplit,
    moveTabToPane,
    closeSplit,
    closeSplitState,
    handleSplitterStart,
    handleSplitterMove,
    handleSplitterEnd
  };
}