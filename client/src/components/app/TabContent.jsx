import React from 'react';
import WorkContent from '../workContent/WorkContent';
import TerminalLoader, { tabIsLoading } from '../terminalLoader/TerminalLoader';

/**
 * The first time a tab opens, the stage plays a brief fake `npm run dev` stream
 * over this content (see TabLoader), then the content fades in. Tabs restored on
 * load, revisited tabs and reduced motion show their content straight away.
 */
const TabContent = ({ tabs, activeTabId, animatedTabs, fadingTabs }) => {
  const tab = tabs.find(item => item.id === activeTabId);
  if (!tab) return null;
  const loads = tabIsLoading(tab.id, animatedTabs);
  const revealing = loads && fadingTabs?.has(tab.id);
  const contentClass = loads ? (revealing ? 'stage-content stage-content--entering' : 'stage-content stage-content--hidden') : 'stage-content';
  return (
    <div key={tab.id} className="stage-content-wrapper" style={{ display: 'flex' }} role="tabpanel" aria-busy={loads && !revealing}>
      <div className={contentClass}>
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

/**
 * The loader for a tab's first open; rendered over the whole stage pane, tab bar
 * included. While the stage is still sliding into place (`waiting`), it shows only
 * an empty terminal and starts streaming once the stage has arrived.
 */
export function TabLoader({ tab, animatedTabs, waiting = false, onStartTabFade, onMarkAnimationComplete }) {
  if (!tab || !tabIsLoading(tab.id, animatedTabs)) return null;
  // The same instance waits and then streams, so nothing is re-created (and
  // redrawn) at the moment the stage settles.
  return (
    <TerminalLoader
      key={tab.id}
      item={tab}
      idle={waiting}
      onFadeStart={() => onStartTabFade?.(tab.id)}
      onComplete={() => onMarkAnimationComplete?.(tab.id)}
    />
  );
}
