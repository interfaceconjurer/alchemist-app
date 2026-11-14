import React, { useReducer, useEffect, useRef, useMemo } from "react";
import "./App.css";
import Icon from "./components/icon/view";
import { icons } from "./components/iconList/iconList";
import { workSections, feedItems, getSectionForItem, getSectionIconForItem } from "./components/workList/workList";
import AlchemySymbol from "./components/alchemySymbol/mediator";
import { ThemeProvider } from "./contexts/ThemeContext";
import SpaceBackground from "./components/space/SpaceBackground";
import ThemeToggle from "./components/ThemeToggle/ThemeToggle";
import { loadState, createDebouncedSave } from "./workspacePersistence";
import { resolveWorkItemsByIds } from "./resolveWorkItems";
import StatusBar from "./components/statusBar/StatusBar";
import CommandPalette from "./components/commandPalette/CommandPalette";
import TabBar from "./components/app/TabBar";
import { tabIsLoading } from "./components/terminalLoader/TerminalLoader";
import TabContent, { TabLoader } from "./components/app/TabContent";
import DropZones from "./components/app/DropZones";
import { LEFT_PANEL_MIN_WIDTH, LEFT_PANEL_DEFAULT_WIDTH, getLeftPanelMaxWidth, getInitialState, normalizeSplitView } from "./utils/stateHelpers";
import { workspaceReducer } from "./workspaceReducer";
import { useTabManager } from "./hooks/useTabManager";
import { useDragDrop } from "./hooks/useDragDrop";
import { useSplitView } from "./hooks/useSplitView";
import { useResize } from "./hooks/useResize";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useIsMobile } from "./hooks/useIsMobile";
import { useSwipeBack } from "./hooks/useSwipeBack";
import { useStageReveal } from "./hooks/useStageReveal";
import { SHOW_STAGE, SHOW_WORK_LIST, SHOW_TOP_BAR } from "./featureFlags";

// While the stage flag is off, an opened stage splits the row 40 / 60 with the panel.
const PANEL_FRACTION = 0.4;
const panelWidthFor = (rowWidth) => rowWidth * PANEL_FRACTION;

function App() {
  const [state, dispatch] = useReducer(workspaceReducer, undefined, getInitialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  const stageRef = useRef(null);
  const leftPanelRef = useRef(null);
  const stageSectionRef = useRef(null);

  const tabActions = useTabManager(dispatch);
  const splitViewActions = useSplitView(stateRef, dispatch, stageRef);
  const splitViewActionsRef = useRef(splitViewActions);
  splitViewActionsRef.current = splitViewActions;
  const { handleTabMouseDown, handleWorkItemMouseDown } = useDragDrop(stateRef, dispatch, stageRef, splitViewActionsRef);
  const resize = useResize(stateRef, dispatch);
  const keyboard = useKeyboardShortcuts(stateRef, dispatch, tabActions);
  const isMobile = useIsMobile(dispatch);
  useSwipeBack(stageRef, isMobile, !!state.activeTabId, dispatch);

  const { debouncedSave, flush } = useMemo(() => createDebouncedSave(500), []);

  useEffect(() => {
    let cancelled = false;
    loadState().then((persisted) => {
      if (cancelled) return;
      const openTabs = resolveWorkItemsByIds(persisted.openTabIds);
      const validIds = new Set(openTabs.map((t) => t.id));
      const activeTabId = validIds.has(persisted.activeTabId)
        ? persisted.activeTabId
        : openTabs.length > 0 ? openTabs[openTabs.length - 1].id : null;
      const leftPanelWidth =
        typeof persisted.leftPanelWidth === "number"
          ? Math.min(Math.max(persisted.leftPanelWidth, LEFT_PANEL_MIN_WIDTH), getLeftPanelMaxWidth())
          : LEFT_PANEL_DEFAULT_WIDTH;
      const previewTabId = validIds.has(persisted.previewTabId) ? persisted.previewTabId : null;
      const animatedTabs = new Set(openTabs.map((t) => t.id));

      const splitView = normalizeSplitView(persisted.splitView, [...validIds]);
      const restoredActiveId = splitView.enabled
        ? splitView[splitView.activePaneId === 'left' ? 'leftActiveTabId' : 'rightActiveTabId']
        : activeTabId;

      dispatch({ type: 'LOAD_PERSISTED', payload: { openTabs, activeTabId: restoredActiveId, previewTabId, leftPanelWidth, stateLoaded: true, animatedTabs, splitView } });
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!state.stateLoaded) return;
    debouncedSave({
      openTabIds: state.openTabs.map((t) => t.id),
      activeTabId: state.activeTabId,
      previewTabId: state.previewTabId,
      leftPanelWidth: state.leftPanelWidth,
      splitView: state.splitView
    });
  }, [state.openTabs, state.activeTabId, state.previewTabId, state.leftPanelWidth, state.splitView, state.stateLoaded, debouncedSave]);

  const { handleResizeMove, handleResizeEnd, handleWindowResize } = resize;
  const { handleGlobalKeyDown } = keyboard;
  useEffect(() => {
    const onBeforeUnload = () => flush();
    document.addEventListener("mousemove", handleResizeMove);
    document.addEventListener("mouseup", handleResizeEnd);
    window.addEventListener("resize", handleWindowResize);
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("keydown", handleGlobalKeyDown);

    return () => {
      document.removeEventListener("mousemove", handleResizeMove);
      document.removeEventListener("mouseup", handleResizeEnd);
      window.removeEventListener("resize", handleWindowResize);
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("keydown", handleGlobalKeyDown);
      flush();
    };
  }, [handleResizeMove, handleResizeEnd, handleWindowResize, handleGlobalKeyDown, flush]);

  const renderTabs = (tabs, paneId = null) => {
    const isInactivePane = state.splitView.enabled && paneId && paneId !== state.splitView.activePaneId;
    let activeTabId = state.activeTabId;
    if (state.splitView.enabled && paneId) {
      activeTabId = paneId === 'left' ? state.splitView.leftActiveTabId : state.splitView.rightActiveTabId;
    }
    let previewTabId = state.previewTabId;
    if (state.splitView.enabled && paneId) {
      previewTabId = paneId === 'left' ? state.splitView.leftPanePreviewTabId : state.splitView.rightPanePreviewTabId;
    }
    const loading = tabIsLoading(activeTabId, state.animatedTabs);
    return (
      <TabBar
        loading={loading && !state.fadingTabs.has(activeTabId)} revealing={loading && state.fadingTabs.has(activeTabId)}
        tabs={tabs} paneId={paneId} activeTabId={activeTabId} previewTabId={previewTabId}
        isInactivePane={isInactivePane}
        onTabClick={(tabId, clickPaneId) => dispatch({ type: 'PANE_TAB_CLICK', tabId, paneId: clickPaneId })}
        onTabDoubleClick={keyboard.handleTabDoubleClick}
        onTabMouseDown={handleTabMouseDown}
        onTabClose={tabActions.closeTab}
        onSelectTab={tabActions.selectTab}
      />
    );
  };

  const renderTabContent = (tabs, paneId = null) => {
    let activeTabId = state.activeTabId;
    if (state.splitView.enabled && paneId) {
      activeTabId = paneId === 'left' ? state.splitView.leftActiveTabId : state.splitView.rightActiveTabId;
    }
    return (
      <>
        <TabContent tabs={tabs} activeTabId={activeTabId} animatedTabs={state.animatedTabs} fadingTabs={state.fadingTabs} />
        <TabLoader
          tab={tabs.find((t) => t.id === activeTabId)}
          animatedTabs={state.animatedTabs}
          waiting={!stageSettled}
          onStartTabFade={tabActions.startTabFade}
          onMarkAnimationComplete={tabActions.markAnimationComplete}
        />
      </>
    );
  };

  // While the stage flag is off, the stage still opens for an open work item,
  // and while a work item is being dragged so there is somewhere to drop it.
  const draggingWorkItem = state.dragThreshold.isDragging && state.dragThreshold.dragSource === 'sidebar';
  const stageVisible = SHOW_STAGE || !!state.activeTabId || draggingWorkItem;
  const { settled: stageSettled } = useStageReveal({ panelRef: leftPanelRef, stageRef: stageSectionRef, stageVisible, panelWidth: SHOW_STAGE ? state.leftPanelWidth : panelWidthFor, enabled: !isMobile && !SHOW_STAGE, ready: state.stateLoaded });

  const leftPaneTabs = useMemo(() => state.splitView.enabled ? state.openTabs.filter(t => state.splitView.leftPaneTabIds.includes(t.id)) : [], [state.openTabs, state.splitView.enabled, state.splitView.leftPaneTabIds]);
  const rightPaneTabs = useMemo(() => state.splitView.enabled ? state.openTabs.filter(t => state.splitView.rightPaneTabIds.includes(t.id)) : [], [state.openTabs, state.splitView.enabled, state.splitView.rightPaneTabIds]);

  return (
    <ThemeProvider>
      <SpaceBackground />
      <div className="App">
        <CommandPalette
          isOpen={state.commandPaletteOpen}
          onClose={() => dispatch({ type: 'CLOSE_COMMAND_PALETTE' })}
          onSelectItem={tabActions.openWorkItem}
          onAction={keyboard.handlePaletteAction}
        />
        {SHOW_TOP_BAR && (
        <div className="top-bar">
          {isMobile && state.activeTabId && (
            <button type="button" className="top-bar-back" onClick={() => dispatch({ type: 'CLOSE_ACTIVE_TAB' })} aria-label="Back to sidebar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}
          <button type="button" className="top-bar-search" onClick={keyboard.toggleCommandPalette} aria-label="Search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            Search Work Items
          </button>
          <ThemeToggle />
        </div>
        )}
        <main className={`main${stageVisible ? '' : ' main--stage-hidden'}`}>
          <section className="left-panel" ref={leftPanelRef} style={isMobile || !stageVisible ? undefined : { width: SHOW_STAGE ? state.leftPanelWidth : `${PANEL_FRACTION * 100}%` }}>
            {!isMobile && SHOW_STAGE && <div className="left-panel-resize-handle" onMouseDown={resize.handleResizeStart} aria-label="Resize left panel" />}
            <section className="left-panel-top">
              <header className="App-header">
                <AlchemySymbol />
                <h1 className="App-title">Jordan L. Wright</h1>
                <p className="App-intro">
                  AI Native Designer &amp; Engineer
                </p>
              </header>
              <nav className="nav">
                <a className="out-bound-link" target="_blank" rel="noopener noreferrer" href="https://www.linkedin.com/in/jordan-l-wright-91b17321">
                  <Icon title="Out-Bound Link" icon={icons.linkedin} assistiveText="Out-Bound Link" /><span>LinkedIn</span>
                </a>
                <a className="out-bound-link" target="_blank" rel="noopener noreferrer" href="https://github.com/interfaceconjurer/resume">
                  <Icon title="Out-Bound Link" icon={icons.resume} assistiveText="Out-Bound Link" /><span>Resume</span>
                </a>
                <a className="out-bound-link" target="_blank" rel="noopener noreferrer" href="https://github.com/interfaceconjurer">
                  <Icon title="Out-Bound Link" icon={icons.github} assistiveText="Out-Bound Link" /><span>GitHub</span>
                </a>
              </nav>
            </section>
            {feedItems.length > 0 && (
            <section className="work-feed" aria-labelledby="work-feed-title">
              <h2 className="work-feed-title" id="work-feed-title">Cross section of recent work and thoughts</h2>
              {feedItems.map((item) => (
                <button key={item.id} type="button"
                  data-work-item-id={item.id}
                  className={`work-item work-feed-item ${state.activeTabId === item.id ? "work-item--selected" : ""}`}
                  aria-pressed={state.activeTabId === item.id}
                  onClick={() => tabActions.openWorkItem(item)}
                  onMouseDown={(e) => !isMobile && e.button === 0 && handleWorkItemMouseDown(e, item)}
                >
                  <span className="work-feed-item-icon" aria-hidden="true">{getSectionIconForItem(item.id)}</span>
                  <span className="work-feed-item-body">
                    <span className="work-item-title">{item.title}</span>
                    <span className="work-item-meta">
                      {item.type && <span className="work-item-type">{item.type}</span>}
                      {item.date && <time className="work-item-date">{item.date}</time>}
                    </span>
                  </span>
                </button>
              ))}
            </section>
            )}
            {SHOW_WORK_LIST && (
            <section className="work-list">
              <h2 className="work-list-title">My Work</h2>
              {workSections.map((section) => (
                <div key={section.id} className="work-list-section">
                  <h3 className="work-list-section-title">{section.label}</h3>
                  <p className="work-list-section-tagline">{section.tagline}</p>
                  <div className="work-list-items">
                    {section.items.map((item) => (
                      <button key={item.id} type="button"
                        data-work-item-id={item.id}
                        className={`work-item ${state.activeTabId === item.id ? "work-item--selected" : ""}`}
                        onClick={() => keyboard.handleWorkItemClick(item)}
                        onDoubleClick={() => keyboard.handleWorkItemDoubleClick(item)}
                        onMouseDown={(e) => !isMobile && handleWorkItemMouseDown(e, item)}
                      >
                        <span className="work-item-title">{item.title}</span>
                        <span className="work-item-description">{item.description}</span>
                        <span className="work-item-date">{item.date}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </section>
            )}
          </section>
          <section ref={stageSectionRef} className={`stage${isMobile && !state.activeTabId ? ' stage--hidden' : ''}`}>
            <div className="stage-editor">
              <div className="stage-main" ref={stageRef} style={{ position: 'relative' }}>
                {isMobile && !SHOW_TOP_BAR && state.activeTabId && (
                  <button type="button" className="stage-back" onClick={() => dispatch({ type: 'CLOSE_ACTIVE_TAB' })} aria-label="Back">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                    Back
                  </button>
                )}
                {isMobile || !state.splitView.enabled ? (
                  <>
                    {!isMobile && renderTabs(state.openTabs)}
                    {state.openTabs.length > 0 ? renderTabContent(state.openTabs) : draggingWorkItem && state.dragThreshold.dropZone ? null : (
                      <div className="stage-empty">
                        <div className="stage-empty-content">
                          <div className="stage-empty-icon-wrap">
                            <svg className="stage-empty-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 122" width={80} height={80} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
                              <defs>
                                <clipPath id="stage-empty-beaker-clip"><path fill="black" d={icons.beaker} /></clipPath>
                                <linearGradient id="stage-empty-shimmer-grad" gradientUnits="objectBoundingBox" x1="1" y1="1" x2="0" y2="0">
                                  <stop offset="0" stopColor="transparent" /><stop offset="0.35" stopColor="transparent" />
                                  <stop offset="0.5" stopColor="rgba(120, 120, 120, 0.35)" />
                                  <stop offset="0.65" stopColor="transparent" /><stop offset="1" stopColor="transparent" />
                                </linearGradient>
                              </defs>
                              <path fill="currentColor" d={icons.beaker} />
                              <g clipPath="url(#stage-empty-beaker-clip)">
                                <rect className="stage-empty-icon-shimmer-rect" x={-282} y={0} width={500} height={200} fill="url(#stage-empty-shimmer-grad)" />
                              </g>
                            </svg>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="stage-split-container">
                    <div
                      className={`stage-pane stage-pane--left ${state.splitView.activePaneId === 'left' ? 'stage-pane--active' : 'stage-pane--inactive'}`}
                      style={{ width: `${state.splitView.splitterPosition}%` }}
                      onClick={() => dispatch({ type: 'FOCUS_PANE', paneId: 'left' })}
                    >
                      {renderTabs(leftPaneTabs, 'left')}
                      {renderTabContent(leftPaneTabs, 'left')}
                    </div>
                    <div className="stage-splitter" onMouseDown={splitViewActions.handleSplitterStart}>
                      <div className="stage-splitter-handle" />
                    </div>
                    <div
                      className={`stage-pane stage-pane--right ${state.splitView.activePaneId === 'right' ? 'stage-pane--active' : 'stage-pane--inactive'}`}
                      style={{ width: `${100 - state.splitView.splitterPosition}%` }}
                      onClick={() => dispatch({ type: 'FOCUS_PANE', paneId: 'right' })}
                    >
                      {renderTabs(rightPaneTabs, 'right')}
                      {renderTabContent(rightPaneTabs, 'right')}
                    </div>
                  </div>
                )}
                {!isMobile && (
                  <DropZones
                    isDragging={state.dragThreshold.isDragging && !!stageRef.current}
                    dropZone={state.dragThreshold.dropZone}
                    splitViewEnabled={state.splitView.enabled}
                    openTabsCount={state.openTabs.length}
                    splitterPosition={state.splitView.splitterPosition}
                    dragSource={state.dragThreshold.dragSource}
                  />
                )}
              </div>
              {!isMobile && state.activeTabId && (
                <StatusBar activeTab={state.openTabs.find((t) => t.id === state.activeTabId)} sectionLabel={getSectionForItem(state.activeTabId)} />
              )}
            </div>
          </section>
        </main>
      </div>
    </ThemeProvider>
  );
}

export default App;
