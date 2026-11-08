import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { useTabManager } from './useTabManager';
import { useResize } from './useResize';
import { useSplitView } from './useSplitView';

beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

function manualFrames() {
  const pending = new Map();
  let next = 0;
  vi.stubGlobal('requestAnimationFrame', vi.fn(fn => { pending.set(++next, fn); return next; }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn(id => pending.delete(id)));
  return () => { const callbacks = [...pending.values()]; pending.clear(); callbacks.forEach(fn => fn(0)); };
}

describe('interaction lifecycle', () => {
  it('preserves a pending work-item click and global listener identity across unrelated renders', () => {
    manualFrames();
    const dispatch = vi.fn();
    const stateRef = { current: { commandPaletteOpen: false } };
    const { result, rerender } = renderHook(() => useKeyboardShortcuts(stateRef, dispatch, useTabManager(dispatch)));
    const keyHandler = result.current.handleGlobalKeyDown;
    act(() => result.current.handleWorkItemClick({ id: 'a' }));
    rerender();
    expect(result.current.handleGlobalKeyDown).toBe(keyHandler);
    act(() => vi.advanceTimersByTime(300));
    expect(dispatch).toHaveBeenCalledWith({ type: 'OPEN_PREVIEW', item: { id: 'a' } });
  });

  it('allows the same item to be clicked again after cancellation and cancels pending clicks on unmount', () => {
    const preview = vi.fn();
    const actions = { openWorkItemAsPreview: preview, openWorkItemAsPersistent: vi.fn(), closeAllTabs: vi.fn(), closeActiveTab: vi.fn() };
    const stateRef = { current: {} };
    const { result, unmount } = renderHook(() => useKeyboardShortcuts(stateRef, vi.fn(), actions));
    act(() => { result.current.handleWorkItemClick({ id: 'a' }); result.current.cleanup(); result.current.handleWorkItemClick({ id: 'a' }); vi.advanceTimersByTime(300); });
    expect(preview).toHaveBeenCalledTimes(1);
    act(() => result.current.handleWorkItemClick({ id: 'b' }));
    unmount();
    act(() => vi.runAllTimers());
    expect(preview).toHaveBeenCalledTimes(1);
  });

  it('coalesces resize moves, flushes the final pointer sample, and cancels work on unmount', () => {
    const frame = manualFrames();
    const dispatch = vi.fn();
    const stateRef = { current: { leftPanelWidth: 380 } };
    const { result, unmount } = renderHook(() => useResize(stateRef, dispatch));
    act(() => {
      result.current.handleResizeStart({ preventDefault() {}, clientX: 0 });
      result.current.handleResizeMove({ clientX: 10 });
      result.current.handleResizeMove({ clientX: 20 });
    });
    expect(dispatch).not.toHaveBeenCalled();
    act(frame);
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'SET_LEFT_PANEL_WIDTH', width: 400 });
    act(() => { result.current.handleResizeMove({ clientX: 30 }); result.current.handleResizeEnd(); });
    expect(dispatch).toHaveBeenLastCalledWith({ type: 'SET_LEFT_PANEL_WIDTH', width: 410 });
    act(() => { result.current.handleResizeStart({ preventDefault() {}, clientX: 0 }); result.current.handleResizeMove({ clientX: 50 }); });
    unmount();
    act(frame);
    expect(dispatch).toHaveBeenCalledTimes(2);
  });

  it('batches splitter geometry reads and removes listeners on unmount', () => {
    const frame = manualFrames();
    const dispatch = vi.fn();
    const rect = vi.fn(() => ({ left: 100, width: 400 }));
    const stateRef = { current: { splitView: { splitterPosition: 50 } } };
    const { result, unmount } = renderHook(() => useSplitView(stateRef, dispatch, { current: { getBoundingClientRect: rect } }));
    act(() => {
      result.current.handleSplitterStart({ preventDefault() {} });
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 200 }));
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 240 }));
    });
    expect(rect).not.toHaveBeenCalled();
    act(frame);
    expect(rect).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'SET_SPLITTER_POSITION', position: 35 });
    act(() => document.dispatchEvent(new MouseEvent('mousemove', { clientX: 300 })));
    unmount();
    act(frame);
    act(() => document.dispatchEvent(new MouseEvent('mousemove', { clientX: 350 })));
    act(frame);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(document.body.style.cursor).toBe('');
  });
});
