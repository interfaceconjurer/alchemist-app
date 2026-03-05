import React from 'react';
import TerminalLoader from '../terminalLoader/TerminalLoader';
import WorkContent from '../workContent/WorkContent';

const TabContent = ({
  tabs,
  activeTabId,
  animatedTabs,
  fadingTabs,
  onStartTabFade,
  onMarkAnimationComplete
}) => {
  return tabs.map((tab) => {
    const isActive = tab.id === activeTabId;
    const isAnimated = animatedTabs.has(tab.id);
    const isFading = fadingTabs.has(tab.id);
    const contentVisible = isAnimated || isFading;

    // Only show content for the active tab
    if (!isActive) return null;

    return (
      <div
        key={tab.id}
        className="stage-content-wrapper"
        style={{ display: "flex" }}
        role="tabpanel"
        aria-hidden={false}
      >
        <div
          className={`stage-content ${contentVisible ? "stage-content--entering" : "stage-content--hidden"}`}
        >
          <div className="stage-content-inner">
            <h2 className="stage-content-title">{tab.title}</h2>
            <p className="stage-content-description">{tab.description}</p>
            <WorkContent content={tab.content} />
          </div>
        </div>
        {!isAnimated && (
          <TerminalLoader
            item={tab}
            onFadeStart={() => onStartTabFade(tab.id)}
            onComplete={() => onMarkAnimationComplete(tab.id)}
          />
        )}
      </div>
    );
  });
};

export default TabContent;