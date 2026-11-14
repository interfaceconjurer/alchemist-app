import React from 'react';
import { getSectionIconForItem } from '../workList/workList';

const TabBar = ({
  // While the active tab's loader plays, the bar is hidden; it fades in with the content.
  loading = false,
  revealing = false,
  tabs,
  paneId,
  activeTabId,
  previewTabId,
  isInactivePane,
  onTabClick,
  onTabDoubleClick,
  onTabMouseDown,
  onTabClose,
  onSelectTab
}) => {
  return (
    <div
      className={`stage-tabs${loading ? ' stage-tabs--loading' : ''}${revealing ? ' stage-tabs--revealing' : ''}`}
      role="tablist"
      aria-hidden={loading || undefined}
    >
      <div className="stage-tabs-list">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            role="tab"
            aria-selected={activeTabId === tab.id}
            data-tab-id={tab.id}
            className={[
              "stage-tab",
              activeTabId === tab.id ? "stage-tab--active" : "",
              previewTabId === tab.id ? "stage-tab--preview" : "",
              isInactivePane && activeTabId === tab.id ? "stage-tab--inactive-active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => {
              if (paneId) {
                onTabClick(tab.id, paneId);
              } else {
                onSelectTab(tab.id);
              }
            }}
            onDoubleClick={() => onTabDoubleClick(tab.id)}
            onMouseDown={(e) => onTabMouseDown(e, tab.id)}
          >
            <span className="stage-tab-icon" aria-hidden="true">{getSectionIconForItem(tab.id)}</span>
            <span className="stage-tab-title">{tab.title}</span>
            <button
              type="button"
              className="stage-tab-close"
              onClick={(e) => onTabClose(e, tab.id)}
              aria-label={`Close ${tab.title}`}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TabBar;
