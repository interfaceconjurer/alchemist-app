import React, { useReducer, useEffect, useRef, useMemo } from "react";
import "./App.css";
import Resume from "./resume/Jordan_L_Wright.pdf";
import Icon from "./components/icon/view";
import { icons } from "./components/iconList/iconList";
import { workSections, getSectionForItem } from "./components/workList/workList";
import AlchemySymbol from "./components/alchemySymbol/mediator";
import { ThemeProvider } from "./contexts/ThemeContext";
import ThemeToggle from "./components/ThemeToggle/ThemeToggle";
import { loadState, createDebouncedSave } from "./workspacePersistence";
import { resolveWorkItemsByIds } from "./resolveWorkItems";
import StatusBar from "./components/statusBar/StatusBar";
import CommandPalette from "./components/commandPalette/CommandPalette";
import TabBar from "./components/app/TabBar";
import TabContent from "./components/app/TabContent";
import DropZones from "./components/app/DropZones";
import { LEFT_PANEL_MIN_WIDTH, LEFT_PANEL_DEFAULT_WIDTH, getLeftPanelMaxWidth, getInitialState } from "./utils/stateHelpers";
import { workspaceReducer } from "./workspaceReducer";
import { useTabManager } from "./hooks/useTabManager";
import { useDragDrop } from "./hooks/useDragDrop";
import { useSplitView } from "./hooks/useSplitView";
import { useResize } from "./hooks/useResize";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useIsMobile } from "./hooks/useIsMobile";
import { useSwipeBack } from "./hooks/useSwipeBack";

function App() {
  const [state, dispatch] = useReducer(workspaceReducer, undefined, getInitialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  const stageRef = useRef(null);
  const tabListRef = useRef(null);

  const tabActions = useTabManager(dispatch);
  const splitViewActions = useSplitView(stateRef, dispatch, stageRef);
  const splitViewActionsRef = useRef(splitViewActions);
  splitViewActionsRef.current = splitViewActions;
  const { handleTabMouseDown } = useDragDrop(stateRef, dispatch, stageRef, splitViewActionsRef);
  const resize = useResize(stateRef, dispatch);
  const keyboard = useKeyboardShortcuts(stateRef, dispatch, tabActions);
  const isMobile = useIsMobile(dispatch);
  useSwipeBack(stageRef, isMobile, !!state.activeTabId, dispatch);

  const { debouncedSave, flush } = useMemo(() => createDebouncedSave(500), []);

  useEffect(() => {
    loadState().then((persisted) => {
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

      let splitView = {
        enabled: false, leftPaneTabIds: [], rightPaneTabIds: [],
        leftActiveTabId: null, rightActiveTabId: null,
        leftPanePreviewTabId: null, rightPanePreviewTabId: null,
        activePaneId: 'left', splitterPosition: 50
      };

      if (persisted.splitView?.enabled) {
        const leftPaneTabIds = (persisted.splitView.leftPaneTabIds || []).filter(id => validIds.has(id));
        const rightPaneTabIds = (persisted.splitView.rightPaneTabIds || []).filter(id => validIds.has(id));
        if (leftPaneTabIds.length > 0 && rightPaneTabIds.length > 0) {
          splitView = {
            enabled: true, leftPaneTabIds, rightPaneTabIds,
            leftActiveTabId: validIds.has(persisted.splitView.leftActiveTabId) ? persisted.splitView.leftActiveTabId : leftPaneTabIds[0],
            rightActiveTabId: validIds.has(persisted.splitView.rightActiveTabId) ? persisted.splitView.rightActiveTabId : rightPaneTabIds[0],
            leftPanePreviewTabId: validIds.has(persisted.splitView.leftPanePreviewTabId) ? persisted.splitView.leftPanePreviewTabId : null,
            rightPanePreviewTabId: validIds.has(persisted.splitView.rightPanePreviewTabId) ? persisted.splitView.rightPanePreviewTabId : null,
            activePaneId: persisted.splitView.activePaneId || 'left',
            splitterPosition: persisted.splitView.splitterPosition || 50
          };
        }
      }

      dispatch({ type: 'LOAD_PERSISTED', payload: { openTabs, activeTabId, previewTabId, leftPanelWidth, stateLoaded: true, animatedTabs, splitView } });
    });
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

  useEffect(() => {
    const onBeforeUnload = () => flush();
    document.addEventListener("mousemove", resize.handleResizeMove);
    document.addEventListener("mouseup", resize.handleResizeEnd);
    window.addEventListener("resize", resize.handleWindowResize);
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("keydown", keyboard.handleGlobalKeyDown);

    return () => {
      document.removeEventListener("mousemove", resize.handleResizeMove);
      document.removeEventListener("mouseup", resize.handleResizeEnd);
      window.removeEventListener("resize", resize.handleWindowResize);
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("keydown", keyboard.handleGlobalKeyDown);
      keyboard.cleanup();
    };
  }, [resize, keyboard, flush]);

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
    return (
      <TabBar
        tabs={tabs} paneId={paneId} activeTabId={activeTabId} previewTabId={previewTabId}
        isInactivePane={isInactivePane} dropTargetIndex={state.dropTargetIndex} draggedTabId={state.draggedTabId} tabListRef={tabListRef}
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
      <TabContent
        tabs={tabs} activeTabId={activeTabId} animatedTabs={state.animatedTabs} fadingTabs={state.fadingTabs}
        onStartTabFade={tabActions.startTabFade} onMarkAnimationComplete={tabActions.markAnimationComplete}
      />
    );
  };

  const leftPaneTabs = state.splitView.enabled ? state.openTabs.filter(t => state.splitView.leftPaneTabIds.includes(t.id)) : [];
  const rightPaneTabs = state.splitView.enabled ? state.openTabs.filter(t => state.splitView.rightPaneTabIds.includes(t.id)) : [];

  return (
    <ThemeProvider>
      <div className="App">
        <CommandPalette
          isOpen={state.commandPaletteOpen}
          onClose={() => dispatch({ type: 'CLOSE_COMMAND_PALETTE' })}
          onSelectItem={tabActions.openWorkItem}
          onAction={keyboard.handlePaletteAction}
          openTabIds={state.openTabs.map((t) => t.id)}
        />
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
        <main className="main">
          <section className="left-panel" style={isMobile ? undefined : { width: state.leftPanelWidth }}>
            {!isMobile && <div className="left-panel-resize-handle" onMouseDown={resize.handleResizeStart} aria-label="Resize left panel" />}
            <section className="left-panel-top">
              <header className="App-header">
                <AlchemySymbol />
                <h1 className="App-title">Jordan L. Wright</h1>
                <p className="App-intro">
                  Digit Alchemist |<span className="App-intro-subtitle"> Designer &amp; Engineer</span>
                </p>
              </header>
              <nav className="nav">
                <a className="out-bound-link" target="_blank" rel="noopener noreferrer" href="http://www.linkedin.com/in/jordan-l-wright-91b17321">
                  <Icon title="Out-Bound Link" icon={icons.linkedin} assistiveText="Out-Bound Link" /><span>LinkedIn</span>
                </a>
                <a className="out-bound-link" target="_blank" rel="noopener noreferrer" href={Resume}>
                  <Icon title="Out-Bound Link" icon={icons.resume} assistiveText="Out-Bound Link" /><span>Resume</span>
                </a>
                <a className="out-bound-link" target="_blank" rel="noopener noreferrer" href="https://github.com/interfaceconjurer">
                  <Icon title="Out-Bound Link" icon={icons.github} assistiveText="Out-Bound Link" /><span>GitHub</span>
                </a>
              </nav>
            </section>
            <section className="work-list">
              <h2 className="work-list-title">My Work</h2>
              {workSections.map((section) => (
                <div key={section.id} className="work-list-section">
                  <h3 className="work-list-section-title">{section.label}</h3>
                  <p className="work-list-section-tagline">{section.tagline}</p>
                  <div className="work-list-items">
                    {section.items.map((item) => (
                      <button key={item.id} type="button"
                        className={`work-item ${state.activeTabId === item.id ? "work-item--selected" : ""}`}
                        onClick={() => keyboard.handleWorkItemClick(item)}
                        onDoubleClick={() => keyboard.handleWorkItemDoubleClick(item)}
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
          </section>
          <section className={`stage${isMobile && !state.activeTabId ? ' stage--hidden' : ''}`}>
            <div className="stage-editor">
              <div className="stage-main" ref={stageRef} style={{ position: 'relative' }}>
                {isMobile || !state.splitView.enabled ? (
                  <>
                    {!isMobile && renderTabs(state.openTabs)}
                    {state.openTabs.length > 0 ? renderTabContent(state.openTabs) : (
                      <div className="stage-empty">
                        <div className="stage-empty-icon-wrap">
                          <svg className="stage-empty-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 122" width={144} height={144} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
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
                        <div className="stage-empty-content">
                          <p className="stage-empty-title">No open files</p>
                          <div className="stage-empty-hints">
                            <p className="stage-empty-hint"><kbd className="stage-empty-kbd">{"\u2318"}K</kbd> to search</p>
                            <p className="stage-empty-hint">or select from My Work in the sidebar</p>
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
