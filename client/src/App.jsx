import React, { Component } from "react";
import { Route, Routes } from "react-router-dom";
import "./App.css";
import Resume from "./resume/Jordan_L_Wright.pdf";
import Icon from "./components/icon/view";
import { icons } from "./components/iconList/iconList";
import { workSections, getSectionForItem } from "./components/workList/workList";
import AlchemySymbol from "./components/alchemySymbol/mediator";
import Modal from "./components/modal/mediator";
import PubSub from "./pubSub";
import { ThemeProvider } from "./contexts/ThemeContext";
import ThemeToggle from "./components/ThemeToggle/ThemeToggle";
import { loadState, createDebouncedSave } from "./workspacePersistence";
import { resolveWorkItemsByIds } from "./resolveWorkItems";
import StatusBar from "./components/statusBar/StatusBar";
import CommandPalette from "./components/commandPalette/CommandPalette";

// Import app-specific components
import TabBar from "./components/app/TabBar";
import TabContent from "./components/app/TabContent";
import DropZones from "./components/app/DropZones";

// Import utility functions
import {
  LEFT_PANEL_MIN_WIDTH,
  LEFT_PANEL_DEFAULT_WIDTH,
  getLeftPanelMaxWidth,
  getInitialState
} from "./utils/stateHelpers";

// Import hooks
import { createTabManager } from "./hooks/useTabManager";
import { createDragDropManager } from "./hooks/useDragDrop";
import { createSplitViewManager } from "./hooks/useSplitView";
import { createResizeManager } from "./hooks/useResize";
import { createKeyboardShortcutsManager } from "./hooks/useKeyboardShortcuts";

class App extends Component {
  constructor() {
    super();
    this.state = getInitialState();
    this.mainRef = React.createRef();
    this.tabListRef = React.createRef();
    this.stageRef = React.createRef();
    this.isResizing = false;
    // Drag-related instance variables
    this.dragState = null;
    this.ghostElement = null;
    this.isSplitterResizing = false;
    this.startX = 0;
    this.startWidth = 0;
    this._clickTimer = null;
    this._clickedItemId = null;

    const { debouncedSave, flush } = createDebouncedSave(500);
    this._debouncedSave = debouncedSave;
    this._flushSave = flush;

    // Create tab manager and bind its methods
    const tabManager = createTabManager(this);
    this.openWorkItemAsPreview = tabManager.openWorkItemAsPreview;
    this.openWorkItemAsPersistent = tabManager.openWorkItemAsPersistent;
    this.openWorkItem = tabManager.openWorkItem;
    this.closeTab = tabManager.closeTab;
    this.closeActiveTab = tabManager.closeActiveTab;
    this.closeAllTabs = tabManager.closeAllTabs;
    this.selectTab = tabManager.selectTab;
    this.startTabFade = tabManager.startTabFade;
    this.markAnimationComplete = tabManager.markAnimationComplete;
    this.scrollTabIntoView = tabManager.scrollTabIntoView;

    // Create drag & drop manager and bind its methods
    const dragDropManager = createDragDropManager(this);
    this.handleTabMouseDown = dragDropManager.handleTabMouseDown;
    this.handleDragDetection = dragDropManager.handleDragDetection;
    this.initiateDrag = dragDropManager.initiateDrag;
    this.handleDragMove = dragDropManager.handleDragMove;
    this.detectDropZone = dragDropManager.detectDropZone;
    this.handleDragEnd = dragDropManager.handleDragEnd;
    this.handleDragCancel = dragDropManager.handleDragCancel;
    this.handleTabDragStart = dragDropManager.handleTabDragStart;
    this.handleTabDragOver = dragDropManager.handleTabDragOver;
    this.handleTabDragLeave = dragDropManager.handleTabDragLeave;
    this.handleTabDrop = dragDropManager.handleTabDrop;
    this.handleTabDragEnd = dragDropManager.handleTabDragEnd;

    // Create split view manager and bind its methods
    const splitViewManager = createSplitViewManager(this);
    this.initiateSplit = splitViewManager.initiateSplit;
    this.moveTabToPane = splitViewManager.moveTabToPane;
    this.closeSplit = splitViewManager.closeSplit;
    this.closeSplitState = splitViewManager.closeSplitState;
    this.handleSplitterStart = splitViewManager.handleSplitterStart;
    this.handleSplitterMove = splitViewManager.handleSplitterMove;
    this.handleSplitterEnd = splitViewManager.handleSplitterEnd;

    // Create resize manager and bind its methods
    const resizeManager = createResizeManager(this);
    this.handleResizeStart = resizeManager.handleResizeStart;
    this.handleResizeMove = resizeManager.handleResizeMove;
    this.handleResizeEnd = resizeManager.handleResizeEnd;
    this.handleWindowResize = resizeManager.handleWindowResize;
    this.handleMainClassState = resizeManager.handleMainClassState;

    // Create keyboard shortcuts manager and bind its methods
    const keyboardShortcutsManager = createKeyboardShortcutsManager(this);
    this.handleWorkItemClick = keyboardShortcutsManager.handleWorkItemClick;
    this.handleWorkItemDoubleClick = keyboardShortcutsManager.handleWorkItemDoubleClick;
    this.handleTabDoubleClick = keyboardShortcutsManager.handleTabDoubleClick;
    this.toggleCommandPalette = keyboardShortcutsManager.toggleCommandPalette;
    this.handlePaletteAction = keyboardShortcutsManager.handlePaletteAction;
    this.handleGlobalKeyDown = keyboardShortcutsManager.handleGlobalKeyDown;
  }

  componentDidMount() {
    PubSub.addListener("toggleModal", this.handleMainClassState);
    document.addEventListener("mousemove", this.handleResizeMove);
    document.addEventListener("mouseup", this.handleResizeEnd);
    window.addEventListener("resize", this.handleWindowResize);
    window.addEventListener("beforeunload", this._handleBeforeUnload);
    document.addEventListener("keydown", this.handleGlobalKeyDown);

    loadState().then((persisted) => {
      const openTabs = resolveWorkItemsByIds(persisted.openTabIds);
      const validIds = new Set(openTabs.map((t) => t.id));
      const activeTabId = validIds.has(persisted.activeTabId)
        ? persisted.activeTabId
        : openTabs.length > 0
          ? openTabs[openTabs.length - 1].id
          : null;
      const leftPanelWidth =
        typeof persisted.leftPanelWidth === "number"
          ? Math.min(Math.max(persisted.leftPanelWidth, LEFT_PANEL_MIN_WIDTH), getLeftPanelMaxWidth())
          : LEFT_PANEL_DEFAULT_WIDTH;

      const previewTabId = validIds.has(persisted.previewTabId) ? persisted.previewTabId : null;
      const animatedTabs = new Set(openTabs.map((t) => t.id));

      // Load split view state if present
      let splitView = {
        enabled: false,
        leftPaneTabIds: [],
        rightPaneTabIds: [],
        leftActiveTabId: null,
        rightActiveTabId: null,
        leftPanePreviewTabId: null,
        rightPanePreviewTabId: null,
        activePaneId: 'left',
        splitterPosition: 50
      };

      if (persisted.splitView && persisted.splitView.enabled) {
        // Validate split view tab IDs
        const leftPaneTabIds = (persisted.splitView.leftPaneTabIds || []).filter(id => validIds.has(id));
        const rightPaneTabIds = (persisted.splitView.rightPaneTabIds || []).filter(id => validIds.has(id));

        // Only enable split if both panes have tabs
        if (leftPaneTabIds.length > 0 && rightPaneTabIds.length > 0) {
          const leftActiveTabId = validIds.has(persisted.splitView.leftActiveTabId)
            ? persisted.splitView.leftActiveTabId
            : leftPaneTabIds[0];
          const rightActiveTabId = validIds.has(persisted.splitView.rightActiveTabId)
            ? persisted.splitView.rightActiveTabId
            : rightPaneTabIds[0];
          const leftPanePreviewTabId = validIds.has(persisted.splitView.leftPanePreviewTabId)
            ? persisted.splitView.leftPanePreviewTabId
            : null;
          const rightPanePreviewTabId = validIds.has(persisted.splitView.rightPanePreviewTabId)
            ? persisted.splitView.rightPanePreviewTabId
            : null;

          splitView = {
            enabled: true,
            leftPaneTabIds,
            rightPaneTabIds,
            leftActiveTabId,
            rightActiveTabId,
            leftPanePreviewTabId,
            rightPanePreviewTabId,
            activePaneId: persisted.splitView.activePaneId || 'left',
            splitterPosition: persisted.splitView.splitterPosition || 50
          };
        }
      }

      this.setState({ openTabs, activeTabId, previewTabId, leftPanelWidth, stateLoaded: true, animatedTabs, splitView });
    });
  }

  componentDidUpdate(prevProps, prevState) {
    if (!this.state.stateLoaded) return;

    const tabsChanged = prevState.openTabs !== this.state.openTabs;
    const activeChanged = prevState.activeTabId !== this.state.activeTabId;
    const widthChanged = prevState.leftPanelWidth !== this.state.leftPanelWidth;
    const previewChanged = prevState.previewTabId !== this.state.previewTabId;
    const splitViewChanged = JSON.stringify(prevState.splitView) !== JSON.stringify(this.state.splitView);

    if (tabsChanged || activeChanged || widthChanged || previewChanged || splitViewChanged) {
      this._debouncedSave({
        openTabIds: this.state.openTabs.map((t) => t.id),
        activeTabId: this.state.activeTabId,
        previewTabId: this.state.previewTabId,
        leftPanelWidth: this.state.leftPanelWidth,
        splitView: this.state.splitView
      });
    }
  }

  componentWillUnmount() {
    PubSub.removeListener("toggleModal", this.handleMainClassState);
    document.removeEventListener("mousemove", this.handleResizeMove);
    document.removeEventListener("mouseup", this.handleResizeEnd);
    window.removeEventListener("resize", this.handleWindowResize);
    window.removeEventListener("beforeunload", this._handleBeforeUnload);
    document.removeEventListener("keydown", this.handleGlobalKeyDown);
    if (this._clickTimer) clearTimeout(this._clickTimer);
  }

  _handleBeforeUnload = () => {
    this._flushSave();
  };

  // Helper methods for split view rendering
  renderTabs = (tabs, paneId = null) => {
    const isInactivePane = this.state.splitView.enabled &&
                          paneId &&
                          paneId !== this.state.splitView.activePaneId;

    // Determine which active tab to use
    let activeTabId = this.state.activeTabId;
    if (this.state.splitView.enabled && paneId) {
      activeTabId = paneId === 'left' ? this.state.splitView.leftActiveTabId : this.state.splitView.rightActiveTabId;
    }

    // Determine which preview tab ID to use
    let previewTabId = this.state.previewTabId;
    if (this.state.splitView.enabled && paneId) {
      previewTabId = paneId === 'left'
        ? this.state.splitView.leftPanePreviewTabId
        : this.state.splitView.rightPanePreviewTabId;
    }

    return (
      <TabBar
        tabs={tabs}
        paneId={paneId}
        activeTabId={activeTabId}
        previewTabId={previewTabId}
        isInactivePane={isInactivePane}
        dropTargetIndex={this.state.dropTargetIndex}
        draggedTabId={this.state.draggedTabId}
        tabListRef={this.tabListRef}
        onTabClick={(tabId, paneId) => {
          // Always update pane focus when clicking any tab in split view
          this.setState(state => {
            const paneActiveKey = paneId === 'left' ? 'leftActiveTabId' : 'rightActiveTabId';

            return {
              splitView: {
                ...state.splitView,
                activePaneId: paneId,
                [paneActiveKey]: tabId
              },
              activeTabId: tabId
            };
          });
        }}
        onTabDoubleClick={this.handleTabDoubleClick}
        onTabMouseDown={this.handleTabMouseDown}
        onTabClose={this.closeTab}
        onSelectTab={this.selectTab}
      />
    );
  };

  renderTabContent = (tabs, paneId = null) => {
    // Determine which active tab to use
    let activeTabId = this.state.activeTabId;
    if (this.state.splitView.enabled && paneId) {
      activeTabId = paneId === 'left' ? this.state.splitView.leftActiveTabId : this.state.splitView.rightActiveTabId;
    }

    return (
      <TabContent
        tabs={tabs}
        activeTabId={activeTabId}
        animatedTabs={this.state.animatedTabs}
        fadingTabs={this.state.fadingTabs}
        onStartTabFade={this.startTabFade}
        onMarkAnimationComplete={this.markAnimationComplete}
      />
    );
  };

  renderDropZones = () => {
    return (
      <DropZones
        isDragging={this.state.dragThreshold.isDragging && this.stageRef.current}
        dropZone={this.state.dragThreshold.dropZone}
        splitViewEnabled={this.state.splitView.enabled}
        openTabsCount={this.state.openTabs.length}
        splitterPosition={this.state.splitView.splitterPosition}
      />
    );
  };

  render() {
    return (
      <ThemeProvider>
        <div className="App">
          <CommandPalette
            isOpen={this.state.commandPaletteOpen}
            onClose={() => this.setState({ commandPaletteOpen: false })}
            onSelectItem={this.openWorkItem}
            onAction={this.handlePaletteAction}
            openTabIds={this.state.openTabs.map((t) => t.id)}
          />
          <Routes location={this.props.location}>
            <Route path="/workItem/:id" element={<Modal />} />
          </Routes>
          <div className="top-bar">
            <button type="button" className="top-bar-search" onClick={this.toggleCommandPalette} aria-label="Search">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              Search Work Items
            </button>
            <ThemeToggle />
          </div>
          <main ref={this.mainRef} className={this.state.mainClass}>
            <section className="left-panel" style={{ width: this.state.leftPanelWidth }}>
              <div
                className="left-panel-resize-handle"
                onMouseDown={this.handleResizeStart}
                aria-label="Resize left panel"
              />
              <section className="left-panel-top">
                <header className="App-header">
                  <AlchemySymbol />
                  <h1 className="App-title">Jordan L. Wright</h1>
                  <p className="App-intro">
                    Digit Alchemist |<span className="App-intro-subtitle"> Designer &amp; Engineer</span>
                  </p>
                </header>
                <nav className="nav">
                  <a
                    className="out-bound-link"
                    target="_blank"
                    rel="noopener noreferrer"
                    href="http://www.linkedin.com/in/jordan-l-wright-91b17321"
                  >
                    <Icon title="Out-Bound Link" icon={icons.linkedin} assistiveText="Out-Bound Link" />
                    <span>LinkedIn</span>
                  </a>
                  <a className="out-bound-link" target="_blank" rel="noopener noreferrer" href={Resume}>
                    <Icon title="Out-Bound Link" icon={icons.resume} assistiveText="Out-Bound Link" />
                    <span>Resume</span>
                  </a>
                  <a
                    className="out-bound-link"
                    target="_blank"
                    rel="noopener noreferrer"
                    href="https://github.com/interfaceconjurer"
                  >
                    <Icon title="Out-Bound Link" icon={icons.github} assistiveText="Out-Bound Link" />
                    <span>GitHub</span>
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
                        <button
                          key={item.id}
                          type="button"
                          className={`work-item ${this.state.activeTabId === item.id ? "work-item--selected" : ""}`}
                          onClick={() => this.handleWorkItemClick(item)}
                          onDoubleClick={() => this.handleWorkItemDoubleClick(item)}
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
            <section className="stage">
              <div className="stage-editor">
                <div className="stage-main" ref={this.stageRef} style={{ position: 'relative' }}>
                  {/* Conditional rendering for split view vs single view */}
                  {!this.state.splitView.enabled ? (
                    // Single pane view
                    <>
                      {this.renderTabs(this.state.openTabs)}
                      {this.state.openTabs.length > 0 ? (
                        this.renderTabContent(this.state.openTabs)
                      ) : (
                        <div className="stage-empty">
                          <div className="stage-empty-icon-wrap">
                            <svg
                              className="stage-empty-icon"
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 52 122"
                              width={144}
                              height={144}
                              preserveAspectRatio="xMidYMid meet"
                              aria-hidden="true"
                            >
                              <defs>
                                <clipPath id="stage-empty-beaker-clip">
                                  <path fill="black" d={icons.beaker} />
                                </clipPath>
                                <linearGradient
                                  id="stage-empty-shimmer-grad"
                                  gradientUnits="objectBoundingBox"
                                  x1="1"
                                  y1="1"
                                  x2="0"
                                  y2="0"
                                >
                                  <stop offset="0" stopColor="transparent" />
                                  <stop offset="0.35" stopColor="transparent" />
                                  <stop offset="0.5" stopColor="rgba(120, 120, 120, 0.35)" />
                                  <stop offset="0.65" stopColor="transparent" />
                                  <stop offset="1" stopColor="transparent" />
                                </linearGradient>
                              </defs>
                              <path fill="currentColor" d={icons.beaker} />
                              <g clipPath="url(#stage-empty-beaker-clip)">
                                <rect
                                  className="stage-empty-icon-shimmer-rect"
                                  x={-282}
                                  y={0}
                                  width={500}
                                  height={200}
                                  fill="url(#stage-empty-shimmer-grad)"
                                />
                              </g>
                            </svg>
                          </div>
                          <div className="stage-empty-content">
                            <p className="stage-empty-title">No open files</p>
                            <div className="stage-empty-hints">
                              <p className="stage-empty-hint">
                                <kbd className="stage-empty-kbd">{"\u2318"}K</kbd> to search
                              </p>
                              <p className="stage-empty-hint">or select from My Work in the sidebar</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    // Split pane view
                    <div className="stage-split-container">
                      <div
                        className={`stage-pane stage-pane--left ${
                          this.state.splitView.activePaneId === 'left' ? 'stage-pane--active' : 'stage-pane--inactive'
                        }`}
                        style={{ width: `${this.state.splitView.splitterPosition}%` }}
                        onClick={() => {
                          // Focus this pane when clicking anywhere in it
                          if (this.state.splitView.activePaneId !== 'left') {
                            this.setState(state => ({
                              splitView: {
                                ...state.splitView,
                                activePaneId: 'left'
                              },
                              // Update global active tab to this pane's active tab
                              activeTabId: state.splitView.leftActiveTabId
                            }));
                          }
                        }}
                      >
                        {(() => {
                          const leftPaneTabs = this.state.openTabs.filter(t =>
                            this.state.splitView.leftPaneTabIds.includes(t.id)
                          );
                          return (
                            <>
                              {this.renderTabs(leftPaneTabs, 'left')}
                              {this.renderTabContent(leftPaneTabs, 'left')}
                            </>
                          );
                        })()}
                      </div>

                      <div className="stage-splitter" onMouseDown={this.handleSplitterStart}>
                        <div className="stage-splitter-handle" />
                      </div>

                      <div
                        className={`stage-pane stage-pane--right ${
                          this.state.splitView.activePaneId === 'right' ? 'stage-pane--active' : 'stage-pane--inactive'
                        }`}
                        style={{ width: `${100 - this.state.splitView.splitterPosition}%` }}
                        onClick={() => {
                          // Focus this pane when clicking anywhere in it
                          if (this.state.splitView.activePaneId !== 'right') {
                            this.setState(state => ({
                              splitView: {
                                ...state.splitView,
                                activePaneId: 'right'
                              },
                              // Update global active tab to this pane's active tab
                              activeTabId: state.splitView.rightActiveTabId
                            }));
                          }
                        }}
                      >
                        {(() => {
                          const rightPaneTabs = this.state.openTabs.filter(t =>
                            this.state.splitView.rightPaneTabIds.includes(t.id)
                          );
                          return (
                            <>
                              {this.renderTabs(rightPaneTabs, 'right')}
                              {this.renderTabContent(rightPaneTabs, 'right')}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Drop zone overlays during drag */}
                  {this.renderDropZones()}
                </div>
                {this.state.activeTabId && (
                  <StatusBar
                    activeTab={this.state.openTabs.find((t) => t.id === this.state.activeTabId)}
                    sectionLabel={getSectionForItem(this.state.activeTabId)}
                  />
                )}
              </div>
            </section>
          </main>
        </div>
      </ThemeProvider>
    );
  }
}

export default App;
