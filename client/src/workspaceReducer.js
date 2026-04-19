import { getDefaultSplitViewState, getDefaultDragThreshold } from './utils/stateHelpers';

function paneKeys(paneId) {
  return {
    tabsKey: paneId === 'left' ? 'leftPaneTabIds' : 'rightPaneTabIds',
    activeKey: paneId === 'left' ? 'leftActiveTabId' : 'rightActiveTabId',
    previewKey: paneId === 'left' ? 'leftPanePreviewTabId' : 'rightPanePreviewTabId'
  };
}

function findTabPane(tabId, splitView) {
  if (splitView.leftPaneTabIds.includes(tabId)) return 'left';
  if (splitView.rightPaneTabIds.includes(tabId)) return 'right';
  return null;
}

function cleanAnimationSets(state, tabId) {
  const animatedTabs = new Set(state.animatedTabs);
  animatedTabs.delete(tabId);
  const fadingTabs = new Set(state.fadingTabs);
  fadingTabs.delete(tabId);
  return { animatedTabs, fadingTabs };
}

function closeSplitIfEmpty(state, newLeftTabs, newRightTabs, closedTabId, wasActive) {
  let globalPreviewTabId = null;
  if (newLeftTabs.length > 0 && state.splitView.leftPanePreviewTabId)
    globalPreviewTabId = state.splitView.leftPanePreviewTabId;
  else if (newRightTabs.length > 0 && state.splitView.rightPanePreviewTabId)
    globalPreviewTabId = state.splitView.rightPanePreviewTabId;

  const allTabIds = [...newLeftTabs, ...newRightTabs];
  const newActiveTabId = wasActive && allTabIds.length > 0
    ? allTabIds[allTabIds.length - 1]
    : (state.activeTabId === closedTabId ? null : state.activeTabId);

  return {
    activeTabId: newActiveTabId,
    previewTabId: globalPreviewTabId,
    splitView: getDefaultSplitViewState()
  };
}

function openMobile(state, item) {
  return { ...state, openTabs: [{ ...item }], activeTabId: item.id, previewTabId: null, animatedTabs: new Set(), fadingTabs: new Set() };
}

function openPreview(state, item) {
  if (state.isMobile) return openMobile(state, item);
  if (state.splitView.enabled) {
    const activePaneId = state.splitView.activePaneId || 'left';
    const { tabsKey, activeKey, previewKey } = paneKeys(activePaneId);
    const currentPanePreviewId = state.splitView[previewKey];

    const pane = findTabPane(item.id, state.splitView);
    const isLeftPreview = state.splitView.leftPanePreviewTabId === item.id;
    const isRightPreview = state.splitView.rightPanePreviewTabId === item.id;

    if (pane && !isLeftPreview && !isRightPreview) {
      return { ...state, activeTabId: item.id, splitView: { ...state.splitView, activePaneId: pane, [paneKeys(pane).activeKey]: item.id } };
    }
    if (isLeftPreview || isRightPreview) {
      const targetPane = isLeftPreview ? 'left' : 'right';
      return { ...state, activeTabId: item.id, splitView: { ...state.splitView, activePaneId: targetPane, [paneKeys(targetPane).activeKey]: item.id } };
    }
    if (currentPanePreviewId !== null) {
      const openTabs = state.openTabs.map(tab => tab.id === currentPanePreviewId ? { ...item } : tab);
      const { animatedTabs, fadingTabs } = cleanAnimationSets(state, currentPanePreviewId);
      const newPaneTabIds = state.splitView[tabsKey].map(id => id === currentPanePreviewId ? item.id : id);
      return { ...state, openTabs, activeTabId: item.id, animatedTabs, fadingTabs, splitView: { ...state.splitView, [tabsKey]: newPaneTabIds, [activeKey]: item.id, [previewKey]: item.id } };
    }
    return { ...state, openTabs: [...state.openTabs, { ...item }], activeTabId: item.id, splitView: { ...state.splitView, [tabsKey]: [...state.splitView[tabsKey], item.id], [activeKey]: item.id, [previewKey]: item.id } };
  }

  if (state.openTabs.some(tab => tab.id === item.id && tab.id !== state.previewTabId)) return { ...state, activeTabId: item.id };
  if (state.previewTabId === item.id) return { ...state, activeTabId: item.id };
  if (state.previewTabId !== null) {
    const openTabs = state.openTabs.map(tab => tab.id === state.previewTabId ? { ...item } : tab);
    const { animatedTabs, fadingTabs } = cleanAnimationSets(state, state.previewTabId);
    return { ...state, openTabs, activeTabId: item.id, previewTabId: item.id, animatedTabs, fadingTabs };
  }
  return { ...state, openTabs: [...state.openTabs, { ...item }], activeTabId: item.id, previewTabId: item.id };
}

function openPersistent(state, item) {
  if (state.isMobile) return openMobile(state, item);
  if (state.splitView.enabled) {
    const activePaneId = state.splitView.activePaneId || 'left';
    const { tabsKey, activeKey } = paneKeys(activePaneId);
    const isLeftPreview = state.splitView.leftPanePreviewTabId === item.id;
    const isRightPreview = state.splitView.rightPanePreviewTabId === item.id;

    if (isLeftPreview || isRightPreview) {
      const targetPane = isLeftPreview ? 'left' : 'right';
      const pk = targetPane === 'left' ? 'leftPanePreviewTabId' : 'rightPanePreviewTabId';
      return { ...state, activeTabId: item.id, splitView: { ...state.splitView, activePaneId: targetPane, [paneKeys(targetPane).activeKey]: item.id, [pk]: null } };
    }
    const pane = findTabPane(item.id, state.splitView);
    if (pane) return { ...state, activeTabId: item.id, splitView: { ...state.splitView, activePaneId: pane, [paneKeys(pane).activeKey]: item.id } };
    return { ...state, openTabs: [...state.openTabs, { ...item }], activeTabId: item.id, splitView: { ...state.splitView, [tabsKey]: [...state.splitView[tabsKey], item.id], [activeKey]: item.id } };
  }

  if (state.previewTabId === item.id) return { ...state, activeTabId: item.id, previewTabId: null };
  if (state.openTabs.some(tab => tab.id === item.id)) return { ...state, activeTabId: item.id };
  return { ...state, openTabs: [...state.openTabs, { ...item }], activeTabId: item.id };
}

function closeTab(state, tabId) {
  const openTabs = state.openTabs.filter(tab => tab.id !== tabId);
  const wasActive = state.activeTabId === tabId;
  const { animatedTabs, fadingTabs } = cleanAnimationSets(state, tabId);

  if (state.splitView.enabled) {
    const newLeftTabs = state.splitView.leftPaneTabIds.filter(id => id !== tabId);
    const newRightTabs = state.splitView.rightPaneTabIds.filter(id => id !== tabId);

    if (newLeftTabs.length === 0 || newRightTabs.length === 0) {
      return { ...state, openTabs, animatedTabs, fadingTabs, ...closeSplitIfEmpty(state, newLeftTabs, newRightTabs, tabId, wasActive) };
    }

    const wasInLeft = state.splitView.leftPaneTabIds.includes(tabId);
    let newLeftActiveTabId = state.splitView.leftActiveTabId;
    let newRightActiveTabId = state.splitView.rightActiveTabId;
    const newLeftPreviewTabId = state.splitView.leftPanePreviewTabId === tabId ? null : state.splitView.leftPanePreviewTabId;
    const newRightPreviewTabId = state.splitView.rightPanePreviewTabId === tabId ? null : state.splitView.rightPanePreviewTabId;

    if (wasInLeft && state.splitView.leftActiveTabId === tabId)
      newLeftActiveTabId = newLeftTabs.length > 0 ? newLeftTabs[newLeftTabs.length - 1] : null;
    if (!wasInLeft && state.splitView.rightActiveTabId === tabId)
      newRightActiveTabId = newRightTabs.length > 0 ? newRightTabs[newRightTabs.length - 1] : null;

    return {
      ...state, openTabs, animatedTabs, fadingTabs,
      activeTabId: wasActive ? (wasInLeft ? newLeftActiveTabId : newRightActiveTabId) || state.activeTabId : state.activeTabId,
      splitView: { ...state.splitView, leftPaneTabIds: newLeftTabs, rightPaneTabIds: newRightTabs, leftActiveTabId: newLeftActiveTabId, rightActiveTabId: newRightActiveTabId, leftPanePreviewTabId: newLeftPreviewTabId, rightPanePreviewTabId: newRightPreviewTabId }
    };
  }

  const activeTabId = wasActive ? (openTabs.length > 0 ? openTabs[openTabs.length - 1].id : null) : state.activeTabId;
  const previewTabId = state.previewTabId === tabId ? null : state.previewTabId;
  return { ...state, openTabs, activeTabId, animatedTabs, fadingTabs, previewTabId };
}

function initiateSplit(state, dropZone, draggedTabId) {
  const remainingTabs = state.openTabs.filter(t => t.id !== draggedTabId);
  if (remainingTabs.length === 0) return state;

  const leftTabs = dropZone === 'split-left' ? [draggedTabId] : remainingTabs.map(t => t.id);
  const rightTabs = dropZone === 'split-right' ? [draggedTabId] : remainingTabs.map(t => t.id);

  let leftPanePreviewTabId = null, rightPanePreviewTabId = null;
  if (state.previewTabId && state.previewTabId !== draggedTabId) {
    if (leftTabs.includes(state.previewTabId)) leftPanePreviewTabId = state.previewTabId;
    else if (rightTabs.includes(state.previewTabId)) rightPanePreviewTabId = state.previewTabId;
  }

  return {
    ...state,
    splitView: {
      enabled: true, leftPaneTabIds: leftTabs, rightPaneTabIds: rightTabs,
      leftActiveTabId: leftTabs[0] || null, rightActiveTabId: rightTabs[0] || null,
      leftPanePreviewTabId, rightPanePreviewTabId,
      activePaneId: dropZone === 'split-left' ? 'left' : 'right',
      splitterPosition: 50
    },
    activeTabId: draggedTabId,
    previewTabId: null
  };
}

function moveTabToPane(state, targetPane, tabId) {
  const { leftPaneTabIds, rightPaneTabIds, leftPanePreviewTabId, rightPanePreviewTabId } = state.splitView;
  const newLeftTabs = leftPaneTabIds.filter(id => id !== tabId);
  const newRightTabs = rightPaneTabIds.filter(id => id !== tabId);
  let newLeftPreviewTabId = leftPanePreviewTabId === tabId ? null : leftPanePreviewTabId;
  let newRightPreviewTabId = rightPanePreviewTabId === tabId ? null : rightPanePreviewTabId;

  let newLeftActiveTabId = state.splitView.leftActiveTabId;
  let newRightActiveTabId = state.splitView.rightActiveTabId;

  if (targetPane === 'left') { newLeftTabs.push(tabId); newLeftActiveTabId = tabId; }
  else { newRightTabs.push(tabId); newRightActiveTabId = tabId; }

  if (newLeftTabs.length === 0 || newRightTabs.length === 0) {
    let globalPreviewTabId = null;
    if (targetPane === 'left' && newLeftPreviewTabId) globalPreviewTabId = newLeftPreviewTabId;
    else if (targetPane === 'right' && newRightPreviewTabId) globalPreviewTabId = newRightPreviewTabId;
    return { ...state, splitView: getDefaultSplitViewState(), activeTabId: tabId, previewTabId: globalPreviewTabId };
  }

  return {
    ...state,
    splitView: { ...state.splitView, leftPaneTabIds: newLeftTabs, rightPaneTabIds: newRightTabs, leftActiveTabId: newLeftActiveTabId, rightActiveTabId: newRightActiveTabId, leftPanePreviewTabId: newLeftPreviewTabId, rightPanePreviewTabId: newRightPreviewTabId, activePaneId: targetPane },
    activeTabId: tabId
  };
}

export function workspaceReducer(state, action) {
  switch (action.type) {
    case 'SET_MOBILE': {
      const newState = { ...state, isMobile: action.isMobile };
      if (action.isMobile) {
        if (newState.splitView.enabled) {
          newState.splitView = getDefaultSplitViewState();
        }
        if (newState.openTabs.length > 1 && newState.activeTabId) {
          const activeTab = newState.openTabs.find(t => t.id === newState.activeTabId);
          newState.openTabs = activeTab ? [activeTab] : [];
          newState.previewTabId = null;
        }
      }
      return newState;
    }

    case 'LOAD_PERSISTED':
      return { ...state, ...action.payload };

    case 'OPEN_PREVIEW':
      return openPreview(state, action.item);

    case 'OPEN_PERSISTENT':
      return openPersistent(state, action.item);

    case 'CLOSE_TAB':
      return closeTab(state, action.tabId);

    case 'CLOSE_ACTIVE_TAB':
      if (!state.activeTabId) return state;
      return closeTab(state, state.activeTabId);

    case 'CLOSE_ALL_TABS':
      return { ...state, openTabs: [], activeTabId: null, animatedTabs: new Set(), fadingTabs: new Set(), previewTabId: null, splitView: getDefaultSplitViewState() };

    case 'SELECT_TAB': {
      const { tabId } = action;
      if (state.splitView.enabled) {
        const pane = findTabPane(tabId, state.splitView);
        if (pane) {
          return { ...state, activeTabId: tabId, splitView: { ...state.splitView, [paneKeys(pane).activeKey]: tabId, activePaneId: pane } };
        }
      }
      return { ...state, activeTabId: tabId };
    }

    case 'TAB_DOUBLE_CLICK': {
      const { tabId } = action;
      if (state.splitView.enabled) {
        if (state.splitView.leftPanePreviewTabId === tabId) return { ...state, splitView: { ...state.splitView, leftPanePreviewTabId: null } };
        if (state.splitView.rightPanePreviewTabId === tabId) return { ...state, splitView: { ...state.splitView, rightPanePreviewTabId: null } };
        return state;
      }
      if (state.previewTabId === tabId) return { ...state, previewTabId: null };
      return state;
    }

    case 'START_TAB_FADE': {
      const fadingTabs = new Set(state.fadingTabs);
      fadingTabs.add(action.tabId);
      return { ...state, fadingTabs };
    }

    case 'MARK_ANIMATION_COMPLETE': {
      const animatedTabs = new Set(state.animatedTabs);
      animatedTabs.add(action.tabId);
      const fadingTabs = new Set(state.fadingTabs);
      fadingTabs.delete(action.tabId);
      return { ...state, animatedTabs, fadingTabs };
    }

    case 'INITIATE_SPLIT':
      return initiateSplit(state, action.dropZone, action.tabId);

    case 'SIDEBAR_DROP': {
      const { item, dropZone } = action;
      if (dropZone === 'add-tab' || !dropZone) {
        return openPersistent(state, item);
      }
      if (dropZone === 'left' || dropZone === 'right') {
        const added = openPersistent(state, item);
        return moveTabToPane(added, dropZone, item.id);
      }
      if (dropZone === 'split-left' || dropZone === 'split-right') {
        const added = openPersistent(state, item);
        return initiateSplit(added, dropZone, item.id);
      }
      return openPersistent(state, item);
    }

    case 'MOVE_TAB_TO_PANE':
      return moveTabToPane(state, action.targetPane, action.tabId);

    case 'FOCUS_PANE': {
      const { paneId } = action;
      if (state.splitView.activePaneId === paneId) return state;
      const activeKey = paneId === 'left' ? 'leftActiveTabId' : 'rightActiveTabId';
      return { ...state, splitView: { ...state.splitView, activePaneId: paneId }, activeTabId: state.splitView[activeKey] };
    }

    case 'PANE_TAB_CLICK': {
      const { tabId, paneId } = action;
      const paneActiveKey = paneId === 'left' ? 'leftActiveTabId' : 'rightActiveTabId';
      return { ...state, splitView: { ...state.splitView, activePaneId: paneId, [paneActiveKey]: tabId }, activeTabId: tabId };
    }

    case 'SET_SPLITTER_POSITION':
      return { ...state, splitView: { ...state.splitView, splitterPosition: action.position } };

    case 'SET_LEFT_PANEL_WIDTH':
      return { ...state, leftPanelWidth: action.width };

    case 'SET_DRAG_STATE':
      return { ...state, dragThreshold: { ...state.dragThreshold, ...action.payload }, ...(action.draggedTabId !== undefined ? { draggedTabId: action.draggedTabId } : {}) };

    case 'CLEAR_DRAG':
      return { ...state, dragThreshold: getDefaultDragThreshold(), draggedTabId: null, dropTargetIndex: null };

    case 'TOGGLE_COMMAND_PALETTE':
      return { ...state, commandPaletteOpen: !state.commandPaletteOpen };

    case 'CLOSE_COMMAND_PALETTE':
      return { ...state, commandPaletteOpen: false };

    default:
      return state;
  }
}
