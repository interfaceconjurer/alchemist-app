import React from 'react';

const DropZones = ({
  isDragging,
  dropZone,
  splitViewEnabled,
  openTabsCount,
  splitterPosition,
  dragSource
}) => {
  if (!isDragging) return null;

  const isSidebar = dragSource === 'sidebar';

  if (splitViewEnabled) {
    if (dropZone === 'left') {
      return (
        <div className="stage-drop-zone stage-drop-zone--active"
          style={{ position: 'absolute', left: 0, top: 0, width: `${splitterPosition}%`, height: '100%' }}>
          <span className="stage-drop-zone-label">{isSidebar ? 'Open in left pane' : 'Drop in left pane'}</span>
        </div>
      );
    }
    if (dropZone === 'right') {
      return (
        <div className="stage-drop-zone stage-drop-zone--active"
          style={{ position: 'absolute', right: 0, top: 0, width: `${100 - splitterPosition}%`, height: '100%' }}>
          <span className="stage-drop-zone-label">{isSidebar ? 'Open in right pane' : 'Drop in right pane'}</span>
        </div>
      );
    }
    return null;
  }

  if (isSidebar && openTabsCount >= 1) {
    let left, width, label;
    if (dropZone === 'split-left') {
      left = '0%'; width = '50%'; label = 'Split left';
    } else if (dropZone === 'add-tab') {
      left = '0%'; width = '100%'; label = 'Open here';
    } else if (dropZone === 'split-right') {
      left = '50%'; width = '50%'; label = 'Split right';
    } else {
      return null;
    }
    return (
      <div className="stage-drop-zone stage-drop-zone--active stage-drop-zone--animated"
        style={{ position: 'absolute', left, top: 0, width, height: '100%' }}>
        <span className="stage-drop-zone-label">{label}</span>
      </div>
    );
  }

  if (isSidebar) {
    if (dropZone === 'add-tab') {
      return (
        <div className="stage-drop-zone stage-drop-zone--active"
          style={{ position: 'absolute', inset: 0 }}>
          <span className="stage-drop-zone-label">Open here</span>
        </div>
      );
    }
    return null;
  }

  if (!splitViewEnabled && openTabsCount >= 2) {
    if (dropZone === 'split-left') {
      return (
        <div className="stage-drop-zone stage-drop-zone--active"
          style={{ position: 'absolute', left: 0, top: 0, width: '50%', height: '100%' }}>
          <span className="stage-drop-zone-label">Drop to split left</span>
        </div>
      );
    }
    if (dropZone === 'split-right') {
      return (
        <div className="stage-drop-zone stage-drop-zone--active"
          style={{ position: 'absolute', right: 0, top: 0, width: '50%', height: '100%' }}>
          <span className="stage-drop-zone-label">Drop to split right</span>
        </div>
      );
    }
  }

  return null;
};

export default DropZones;
