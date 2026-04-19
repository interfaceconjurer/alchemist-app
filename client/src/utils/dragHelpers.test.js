import { describe, it, expect } from 'vitest';
import {
  calculateDistance, isDragThresholdMet, isOverStage,
  detectSinglePaneDropZone, detectSplitPaneDropZone, detectSidebarDropZone
} from './dragHelpers';

function makeRect(left, top, width, height) {
  return { left, top, width, height, right: left + width, bottom: top + height };
}

describe('dragHelpers', () => {
  describe('calculateDistance', () => {
    it('returns 0 for same point', () => {
      expect(calculateDistance(0, 0, 0, 0)).toBe(0);
    });
    it('returns correct distance', () => {
      expect(calculateDistance(0, 0, 3, 4)).toBe(5);
    });
  });

  describe('isDragThresholdMet', () => {
    it('returns false below both thresholds', () => {
      expect(isDragThresholdMet(2, 50)).toBe(false);
    });
    it('returns false when only distance met', () => {
      expect(isDragThresholdMet(10, 50)).toBe(false);
    });
    it('returns false when only time met', () => {
      expect(isDragThresholdMet(2, 200)).toBe(false);
    });
    it('returns true when both met', () => {
      expect(isDragThresholdMet(10, 200)).toBe(true);
    });
  });

  describe('isOverStage', () => {
    const rect = makeRect(100, 100, 400, 300);
    it('returns true for point inside', () => {
      expect(isOverStage(200, 200, rect)).toBe(true);
    });
    it('returns false for point outside', () => {
      expect(isOverStage(50, 200, rect)).toBe(false);
    });
  });

  describe('detectSinglePaneDropZone', () => {
    const rect = makeRect(100, 0, 400, 300);
    it('returns split-left for left half with 2+ tabs', () => {
      expect(detectSinglePaneDropZone(200, rect, 2)).toBe('split-left');
    });
    it('returns split-right for right half with 2+ tabs', () => {
      expect(detectSinglePaneDropZone(400, rect, 2)).toBe('split-right');
    });
    it('returns reorder with only 1 tab', () => {
      expect(detectSinglePaneDropZone(200, rect, 1)).toBe('reorder');
    });
  });

  describe('detectSplitPaneDropZone', () => {
    const rect = makeRect(100, 0, 400, 300);
    it('returns left when cursor is before splitter', () => {
      expect(detectSplitPaneDropZone(200, rect, 50)).toBe('left');
    });
    it('returns right when cursor is after splitter', () => {
      expect(detectSplitPaneDropZone(400, rect, 50)).toBe('right');
    });
  });

  describe('detectSidebarDropZone', () => {
    const rect = makeRect(100, 0, 400, 300);
    const noSplit = { enabled: false };
    const withSplit = { enabled: true, splitterPosition: 50 };

    it('returns add-tab when no tabs open', () => {
      expect(detectSidebarDropZone(300, rect, noSplit, 0)).toBe('add-tab');
    });
    it('returns split-left for left region with tabs', () => {
      expect(detectSidebarDropZone(120, rect, noSplit, 2)).toBe('split-left');
    });
    it('returns add-tab for center region with tabs', () => {
      expect(detectSidebarDropZone(300, rect, noSplit, 2)).toBe('add-tab');
    });
    it('returns split-right for right region with tabs', () => {
      expect(detectSidebarDropZone(470, rect, noSplit, 2)).toBe('split-right');
    });
    it('delegates to split pane detection when split enabled', () => {
      expect(detectSidebarDropZone(200, rect, withSplit, 2)).toBe('left');
      expect(detectSidebarDropZone(400, rect, withSplit, 2)).toBe('right');
    });
  });
});
