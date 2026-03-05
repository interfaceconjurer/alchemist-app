import React from 'react';

const DropZones = ({
  isDragging,
  dropZone,
  splitViewEnabled,
  openTabsCount,
  splitterPosition
}) => {
  if (!isDragging) return null;

  if (!splitViewEnabled && openTabsCount >= 2) {
    // Show single 50% drop zone based on mouse position
    if (dropZone === 'split-left') {
      return (
        <div
          className="stage-drop-zone stage-drop-zone--active"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '50%',
            height: '100%'
          }}
        >
          <span className="stage-drop-zone-label">Drop to split left</span>
        </div>
      );
    } else if (dropZone === 'split-right') {
      return (
        <div
          className="stage-drop-zone stage-drop-zone--active"
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            width: '50%',
            height: '100%'
          }}
        >
          <span className="stage-drop-zone-label">Drop to split right</span>
        </div>
      );
    }
  } else if (splitViewEnabled) {
    // Show only the drop zone where cursor is in split mode
    if (dropZone === 'left') {
      return (
        <div
          className="stage-drop-zone stage-drop-zone--active"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: `${splitterPosition}%`,
            height: '100%'
          }}
        >
          <span className="stage-drop-zone-label">Drop in left pane</span>
        </div>
      );
    } else if (dropZone === 'right') {
      return (
        <div
          className="stage-drop-zone stage-drop-zone--active"
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            width: `${100 - splitterPosition}%`,
            height: '100%'
          }}
        >
          <span className="stage-drop-zone-label">Drop in right pane</span>
        </div>
      );
    }
  }

  return null;
};

export default DropZones;