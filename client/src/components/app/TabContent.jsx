import React from 'react';
import WorkContent from '../workContent/WorkContent';

// Portfolio content is already local: show it immediately, without a simulated load.
const TabContent = ({ tabs, activeTabId }) => {
  const tab = tabs.find(item => item.id === activeTabId);
  if (!tab) return null;
  return (
    <div key={tab.id} className="stage-content-wrapper" style={{ display: 'flex' }} role="tabpanel">
      <div className="stage-content">
        <div className="stage-content-inner">
          <h2 className="stage-content-title">{tab.title}</h2>
          {(tab.type || tab.date) && (
            <p className="stage-content-meta">
              {tab.type && <span>{tab.type}</span>}
              {tab.date && <time>{tab.date}</time>}
            </p>
          )}
          <p className="stage-content-description">{tab.description}</p>
          <WorkContent content={tab.content} />
        </div>
      </div>
    </div>
  );
};

export default React.memo(TabContent);
