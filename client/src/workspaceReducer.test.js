import { describe, it, expect } from 'vitest';
import { workspaceReducer } from './workspaceReducer';
import { getInitialState, getDefaultSplitViewState } from './utils/stateHelpers';

function makeItem(id, title) {
  return { id, title: title || `Item ${id}`, description: 'desc' };
}

function stateWithTabs(...ids) {
  let state = getInitialState();
  state.stateLoaded = true;
  for (const id of ids) {
    state = workspaceReducer(state, { type: 'OPEN_PERSISTENT', item: makeItem(id) });
  }
  return state;
}

function splitState(leftIds, rightIds) {
  const allIds = [...leftIds, ...rightIds];
  let state = stateWithTabs(...allIds);
  state = workspaceReducer(state, { type: 'INITIATE_SPLIT', dropZone: 'split-right', tabId: rightIds[0] });
  return state;
}

describe('workspaceReducer', () => {

  describe('OPEN_PREVIEW', () => {
    it('opens a new preview tab', () => {
      const state = workspaceReducer(getInitialState(), { type: 'OPEN_PREVIEW', item: makeItem('a') });
      expect(state.openTabs).toHaveLength(1);
      expect(state.activeTabId).toBe('a');
      expect(state.previewTabId).toBe('a');
    });

    it('replaces existing preview tab', () => {
      let state = workspaceReducer(getInitialState(), { type: 'OPEN_PREVIEW', item: makeItem('a') });
      state = workspaceReducer(state, { type: 'OPEN_PREVIEW', item: makeItem('b') });
      expect(state.openTabs).toHaveLength(1);
      expect(state.openTabs[0].id).toBe('b');
      expect(state.previewTabId).toBe('b');
    });

    it('activates existing persistent tab without adding', () => {
      let state = stateWithTabs('a', 'b');
      state = workspaceReducer(state, { type: 'OPEN_PREVIEW', item: makeItem('a') });
      expect(state.openTabs).toHaveLength(2);
      expect(state.activeTabId).toBe('a');
    });

    it('on mobile, replaces all tabs with single tab', () => {
      let state = stateWithTabs('a', 'b');
      state = workspaceReducer(state, { type: 'SET_MOBILE', isMobile: true });
      state = workspaceReducer(state, { type: 'OPEN_PREVIEW', item: makeItem('c') });
      expect(state.openTabs).toHaveLength(1);
      expect(state.openTabs[0].id).toBe('c');
    });
  });

  describe('OPEN_PERSISTENT', () => {
    it('opens a new persistent tab', () => {
      const state = workspaceReducer(getInitialState(), { type: 'OPEN_PERSISTENT', item: makeItem('a') });
      expect(state.openTabs).toHaveLength(1);
      expect(state.activeTabId).toBe('a');
      expect(state.previewTabId).toBeNull();
    });

    it('promotes preview to persistent', () => {
      let state = workspaceReducer(getInitialState(), { type: 'OPEN_PREVIEW', item: makeItem('a') });
      expect(state.previewTabId).toBe('a');
      state = workspaceReducer(state, { type: 'OPEN_PERSISTENT', item: makeItem('a') });
      expect(state.previewTabId).toBeNull();
      expect(state.activeTabId).toBe('a');
    });

    it('activates already-open persistent tab', () => {
      let state = stateWithTabs('a', 'b');
      state = workspaceReducer(state, { type: 'OPEN_PERSISTENT', item: makeItem('a') });
      expect(state.openTabs).toHaveLength(2);
      expect(state.activeTabId).toBe('a');
    });
  });

  describe('CLOSE_TAB', () => {
    it('closes a tab and activates the last remaining', () => {
      let state = stateWithTabs('a', 'b');
      state = workspaceReducer(state, { type: 'CLOSE_TAB', tabId: 'b' });
      expect(state.openTabs).toHaveLength(1);
      expect(state.activeTabId).toBe('a');
    });

    it('closes last tab and nulls activeTabId', () => {
      let state = stateWithTabs('a');
      state = workspaceReducer(state, { type: 'CLOSE_TAB', tabId: 'a' });
      expect(state.openTabs).toHaveLength(0);
      expect(state.activeTabId).toBeNull();
    });

    it('clears preview when closing the preview tab', () => {
      let state = workspaceReducer(getInitialState(), { type: 'OPEN_PREVIEW', item: makeItem('a') });
      state = workspaceReducer(state, { type: 'CLOSE_TAB', tabId: 'a' });
      expect(state.previewTabId).toBeNull();
    });

    it('collapses split when pane becomes empty', () => {
      let state = splitState(['a'], ['b']);
      state = workspaceReducer(state, { type: 'CLOSE_TAB', tabId: 'b' });
      expect(state.splitView.enabled).toBe(false);
      expect(state.openTabs).toHaveLength(1);
    });
  });

  describe('CLOSE_ACTIVE_TAB', () => {
    it('closes the active tab', () => {
      let state = stateWithTabs('a', 'b');
      state = workspaceReducer(state, { type: 'CLOSE_ACTIVE_TAB' });
      expect(state.openTabs).toHaveLength(1);
    });

    it('does nothing when no active tab', () => {
      const state = getInitialState();
      const next = workspaceReducer(state, { type: 'CLOSE_ACTIVE_TAB' });
      expect(next).toBe(state);
    });
  });

  describe('CLOSE_ALL_TABS', () => {
    it('clears everything', () => {
      let state = stateWithTabs('a', 'b', 'c');
      state = workspaceReducer(state, { type: 'CLOSE_ALL_TABS' });
      expect(state.openTabs).toHaveLength(0);
      expect(state.activeTabId).toBeNull();
      expect(state.splitView.enabled).toBe(false);
    });
  });

  describe('SELECT_TAB', () => {
    it('sets active tab', () => {
      let state = stateWithTabs('a', 'b');
      state = workspaceReducer(state, { type: 'SELECT_TAB', tabId: 'a' });
      expect(state.activeTabId).toBe('a');
    });

    it('focuses correct pane in split view', () => {
      let state = splitState(['a'], ['b']);
      state = workspaceReducer(state, { type: 'SELECT_TAB', tabId: 'a' });
      expect(state.splitView.activePaneId).toBe('left');
      expect(state.activeTabId).toBe('a');
    });
  });

  describe('TAB_DOUBLE_CLICK', () => {
    it('promotes preview to persistent', () => {
      let state = workspaceReducer(getInitialState(), { type: 'OPEN_PREVIEW', item: makeItem('a') });
      state = workspaceReducer(state, { type: 'TAB_DOUBLE_CLICK', tabId: 'a' });
      expect(state.previewTabId).toBeNull();
    });

    it('does nothing for non-preview tab', () => {
      let state = stateWithTabs('a');
      const next = workspaceReducer(state, { type: 'TAB_DOUBLE_CLICK', tabId: 'a' });
      expect(next).toBe(state);
    });
  });

  describe('INITIATE_SPLIT', () => {
    it('creates split with tab on the right', () => {
      let state = stateWithTabs('a', 'b');
      state = workspaceReducer(state, { type: 'INITIATE_SPLIT', dropZone: 'split-right', tabId: 'b' });
      expect(state.splitView.enabled).toBe(true);
      expect(state.splitView.rightPaneTabIds).toContain('b');
      expect(state.splitView.leftPaneTabIds).toContain('a');
    });

    it('creates split with tab on the left', () => {
      let state = stateWithTabs('a', 'b');
      state = workspaceReducer(state, { type: 'INITIATE_SPLIT', dropZone: 'split-left', tabId: 'a' });
      expect(state.splitView.enabled).toBe(true);
      expect(state.splitView.leftPaneTabIds).toContain('a');
      expect(state.splitView.rightPaneTabIds).toContain('b');
    });

    it('does not split with only one tab', () => {
      let state = stateWithTabs('a');
      const next = workspaceReducer(state, { type: 'INITIATE_SPLIT', dropZone: 'split-right', tabId: 'a' });
      expect(next.splitView.enabled).toBe(false);
    });
  });

  describe('MOVE_TAB_TO_PANE', () => {
    it('moves tab between panes', () => {
      let state = splitState(['a', 'c'], ['b']);
      state = workspaceReducer(state, { type: 'MOVE_TAB_TO_PANE', targetPane: 'right', tabId: 'c' });
      expect(state.splitView.rightPaneTabIds).toContain('c');
      expect(state.splitView.leftPaneTabIds).not.toContain('c');
    });

    it('collapses split when source pane becomes empty', () => {
      let state = splitState(['a'], ['b']);
      state = workspaceReducer(state, { type: 'MOVE_TAB_TO_PANE', targetPane: 'right', tabId: 'a' });
      expect(state.splitView.enabled).toBe(false);
      expect(state.openTabs).toHaveLength(2);
    });
  });

  describe('SIDEBAR_DROP', () => {
    it('add-tab opens as persistent', () => {
      let state = stateWithTabs('a');
      state = workspaceReducer(state, { type: 'SIDEBAR_DROP', item: makeItem('b'), dropZone: 'add-tab' });
      expect(state.openTabs).toHaveLength(2);
      expect(state.activeTabId).toBe('b');
    });

    it('split-left creates split with new item on left', () => {
      let state = stateWithTabs('a');
      state = workspaceReducer(state, { type: 'SIDEBAR_DROP', item: makeItem('b'), dropZone: 'split-left' });
      expect(state.splitView.enabled).toBe(true);
      expect(state.splitView.leftPaneTabIds).toContain('b');
    });

    it('split-right creates split with new item on right', () => {
      let state = stateWithTabs('a');
      state = workspaceReducer(state, { type: 'SIDEBAR_DROP', item: makeItem('b'), dropZone: 'split-right' });
      expect(state.splitView.enabled).toBe(true);
      expect(state.splitView.rightPaneTabIds).toContain('b');
    });

    it('left/right in split mode adds to pane', () => {
      let state = splitState(['a'], ['b']);
      state = workspaceReducer(state, { type: 'SIDEBAR_DROP', item: makeItem('c'), dropZone: 'left' });
      expect(state.splitView.leftPaneTabIds).toContain('c');
    });
  });

  describe('SET_MOBILE', () => {
    it('collapses split when entering mobile', () => {
      let state = splitState(['a'], ['b']);
      state = workspaceReducer(state, { type: 'SET_MOBILE', isMobile: true });
      expect(state.isMobile).toBe(true);
      expect(state.splitView.enabled).toBe(false);
    });

    it('keeps only active tab on mobile', () => {
      let state = stateWithTabs('a', 'b', 'c');
      state = workspaceReducer(state, { type: 'SET_MOBILE', isMobile: true });
      expect(state.openTabs).toHaveLength(1);
      expect(state.openTabs[0].id).toBe(state.activeTabId);
    });
  });

  describe('FOCUS_PANE', () => {
    it('switches active pane', () => {
      let state = splitState(['a'], ['b']);
      state = workspaceReducer(state, { type: 'FOCUS_PANE', paneId: 'right' });
      expect(state.splitView.activePaneId).toBe('right');
      expect(state.activeTabId).toBe('b');
    });

    it('does nothing when already focused', () => {
      let state = splitState(['a'], ['b']);
      state.splitView.activePaneId = 'left';
      const next = workspaceReducer(state, { type: 'FOCUS_PANE', paneId: 'left' });
      expect(next).toBe(state);
    });
  });

  describe('TOGGLE_COMMAND_PALETTE', () => {
    it('toggles open and closed', () => {
      let state = getInitialState();
      state = workspaceReducer(state, { type: 'TOGGLE_COMMAND_PALETTE' });
      expect(state.commandPaletteOpen).toBe(true);
      state = workspaceReducer(state, { type: 'TOGGLE_COMMAND_PALETTE' });
      expect(state.commandPaletteOpen).toBe(false);
    });
  });

  describe('animation actions', () => {
    it('START_TAB_FADE adds to fadingTabs', () => {
      let state = stateWithTabs('a');
      state = workspaceReducer(state, { type: 'START_TAB_FADE', tabId: 'a' });
      expect(state.fadingTabs.has('a')).toBe(true);
    });

    it('MARK_ANIMATION_COMPLETE moves from fading to animated', () => {
      let state = stateWithTabs('a');
      state.animatedTabs = new Set();
      state = workspaceReducer(state, { type: 'START_TAB_FADE', tabId: 'a' });
      state = workspaceReducer(state, { type: 'MARK_ANIMATION_COMPLETE', tabId: 'a' });
      expect(state.animatedTabs.has('a')).toBe(true);
      expect(state.fadingTabs.has('a')).toBe(false);
    });
  });
});
