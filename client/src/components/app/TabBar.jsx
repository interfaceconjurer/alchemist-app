import React from 'react';

const TabBar = ({
  tabs,
  paneId,
  activeTabId,
  previewTabId,
  isInactivePane,
  dropTargetIndex,
  draggedTabId,
  tabListRef,
  onTabClick,
  onTabDoubleClick,
  onTabMouseDown,
  onTabClose,
  onSelectTab
}) => {
  return (
    <div className="stage-tabs" role="tablist">
      <div className="stage-tabs-list" ref={paneId === null ? tabListRef : null}>
        {tabs.map((tab, index) => (
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
              dropTargetIndex === index && draggedTabId !== tab.id
                ? "stage-tab--drop-before"
                : "",
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
            <img src="/favicon.ico" alt="" className="stage-tab-icon" width={16} height={16} />
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