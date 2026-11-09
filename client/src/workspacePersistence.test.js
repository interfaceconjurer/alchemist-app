import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createDebouncedSave, loadState, normalizeWorkspaceState } from './workspacePersistence';

describe('workspace persistence boundary', () => {
  let storage;
  beforeEach(() => {
    const data = new Map();
    storage = { getItem: vi.fn(key => data.get(key) ?? null), setItem: vi.fn((key, value) => data.set(key, value)) };
    vi.stubGlobal('localStorage', storage);
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it.each(['{}', 'null', '[]', '{', '{"openTabIds":42,"splitView":{"enabled":true}}'])('recovers from malformed or incomplete records: %s', async (raw) => {
    storage.getItem.mockReturnValue(raw);
    await expect(loadState()).resolves.toMatchObject({ version: 1, openTabIds: [], activeTabId: null, splitView: { enabled: false } });
  });

  it('recovers when the browser denies storage reads and writes', async () => {
    storage.getItem.mockImplementation(() => { throw new DOMException('blocked', 'SecurityError'); });
    storage.setItem.mockImplementation(() => { throw new DOMException('full', 'QuotaExceededError'); });
    await expect(loadState()).resolves.toMatchObject({ openTabIds: [] });
    vi.useFakeTimers();
    const save = createDebouncedSave();
    expect(() => { save.debouncedSave({ openTabIds: ['a'] }); vi.runAllTimers(); save.flush(); }).not.toThrow();
  });

  it('migrates legacy records, bounds IDs and dimensions, and rejects unknown schemas', () => {
    const legacy = normalizeWorkspaceState({ openTabIds: ['a', 'a', {}, 'b', '<unsafe>'], activeTabId: 'missing', leftPanelWidth: Infinity });
    expect(legacy).toMatchObject({ version: 1, openTabIds: ['a', 'b'], activeTabId: 'b', leftPanelWidth: 380 });
    expect(normalizeWorkspaceState({ openTabIds: Array.from({ length: 150 }, (_, i) => `id-${i}`) }).openTabIds).toHaveLength(100);
    expect(normalizeWorkspaceState({ version: 99, openTabIds: ['a'] }).openTabIds).toEqual([]);
    expect(normalizeWorkspaceState({ leftPanelWidth: -10 }).leftPanelWidth).toBe(280);
    expect(normalizeWorkspaceState({ leftPanelWidth: 100000 }).leftPanelWidth).toBe(4096);
  });

  it('restores disjoint pane membership with active and preview IDs belonging to their own pane', () => {
    const restored = normalizeWorkspaceState({ openTabIds: ['a', 'b', 'c'], splitView: {
      enabled: true, leftPaneTabIds: ['a', 'a'], rightPaneTabIds: ['a', 'b', 'missing'],
      leftActiveTabId: 'b', rightActiveTabId: 'a', leftPanePreviewTabId: 'b', rightPanePreviewTabId: 'a',
      activePaneId: 'invalid', splitterPosition: 999,
    } });
    expect(restored.splitView).toMatchObject({ leftPaneTabIds: ['a', 'c'], rightPaneTabIds: ['b'], leftActiveTabId: 'a', rightActiveTabId: 'b', leftPanePreviewTabId: null, rightPanePreviewTabId: null, activePaneId: 'left', splitterPosition: 80 });
    expect(restored.activeTabId).toBe('a');
  });

  it('debounces the latest record and flushes it only once', () => {
    vi.useFakeTimers();
    const save = createDebouncedSave(100);
    save.debouncedSave({ openTabIds: ['a'] });
    save.debouncedSave({ openTabIds: ['b'] });
    save.flush();
    vi.runAllTimers();
    save.flush();
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(JSON.parse(storage.setItem.mock.calls[0][1])).toMatchObject({ version: 1, openTabIds: ['b'] });
  });
});
