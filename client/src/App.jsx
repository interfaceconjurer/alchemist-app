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
import TerminalLoader from "./components/terminalLoader/TerminalLoader";
import WorkContent from "./components/workContent/WorkContent";
import StatusBar from "./components/statusBar/StatusBar";
import CommandPalette from "./components/commandPalette/CommandPalette";

const LEFT_PANEL_MIN_WIDTH = 280;
const LEFT_PANEL_DEFAULT_WIDTH = 380;

const getLeftPanelMaxWidth = () => Math.floor(window.innerWidth / 2);

class App extends Component {
  constructor() {
    super();
    this.state = {
      mainClass: "main",
      leftPanelWidth: LEFT_PANEL_DEFAULT_WIDTH,
      openTabs: [],
      activeTabId: null,
      stateLoaded: false,
      animatedTabs: new Set(),
      fadingTabs: new Set(),
      commandPaletteOpen: false,
      draggedTabId: null,
      dropTargetIndex: null,
      previewTabId: null,
    };
    this.mainRef = React.createRef();
    this.tabListRef = React.createRef();
    this.isResizing = false;
    this.startX = 0;
    this.startWidth = 0;
    this._clickTimer = null;
    this._clickedItemId = null;

    const { debouncedSave, flush } = createDebouncedSave(500);
    this._debouncedSave = debouncedSave;
    this._flushSave = flush;
  }

  openWorkItemAsPreview = (item) => {
    this.setState((state) => {
      // Already open as persistent tab — just activate
      if (state.openTabs.some((tab) => tab.id === item.id && tab.id !== state.previewTabId)) {
        return { activeTabId: item.id };
      }
      // Already the preview tab — just activate
      if (state.previewTabId === item.id) {
        return { activeTabId: item.id };
      }
      // Replace existing preview tab in-place
      if (state.previewTabId !== null) {
        const openTabs = state.openTabs.map((tab) =>
          tab.id === state.previewTabId ? { ...item } : tab
        );
        const animatedTabs = new Set(state.animatedTabs);
        animatedTabs.delete(state.previewTabId);
        const fadingTabs = new Set(state.fadingTabs);
        fadingTabs.delete(state.previewTabId);
        return { openTabs, activeTabId: item.id, previewTabId: item.id, animatedTabs, fadingTabs };
      }
      // No preview tab — append new one
      return {
        openTabs: [...state.openTabs, { ...item }],
        activeTabId: item.id,
        previewTabId: item.id,
      };
    });
  };

  openWorkItemAsPersistent = (item) => {
    this.setState((state) => {
      // Promote current preview tab
      if (state.previewTabId === item.id) {
        return { activeTabId: item.id, previewTabId: null };
      }
      // Already open as persistent — just activate
      if (state.openTabs.some((tab) => tab.id === item.id)) {
        return { activeTabId: item.id };
      }
      // Not open — append as persistent
      return {
        openTabs: [...state.openTabs, { ...item }],
        activeTabId: item.id,
      };
    });
  };

  // CommandPalette and programmatic use — always persistent
  openWorkItem = (item) => {
    this.openWorkItemAsPersistent(item);
  };

  handleWorkItemClick = (item) => {
    if (this._clickTimer && this._clickedItemId !== item.id) {
      clearTimeout(this._clickTimer);
      this._clickTimer = null;
    }
    if (this._clickTimer && this._clickedItemId === item.id) {
      return;
    }
    this._clickedItemId = item.id;
    this._clickTimer = setTimeout(() => {
      this._clickTimer = null;
      this._clickedItemId = null;
      this.openWorkItemAsPreview(item);
    }, 250);
  };

  handleWorkItemDoubleClick = (item) => {
    if (this._clickTimer) {
      clearTimeout(this._clickTimer);
      this._clickTimer = null;
      this._clickedItemId = null;
    }
    this.openWorkItemAsPersistent(item);
  };

  handleTabDoubleClick = (tabId) => {
    this.setState((state) => {
      if (state.previewTabId === tabId) {
        return { previewTabId: null };
      }
      return null;
    });
  };

  closeTab = (e, tabId) => {
    e.stopPropagation();
    this.setState((state) => {
      const openTabs = state.openTabs.filter((tab) => tab.id !== tabId);
      const wasActive = state.activeTabId === tabId;
      const activeTabId = wasActive
        ? openTabs.length > 0
          ? openTabs[openTabs.length - 1].id
          : null
        : state.activeTabId;
      const animatedTabs = new Set(state.animatedTabs);
      animatedTabs.delete(tabId);
      const fadingTabs = new Set(state.fadingTabs);
      fadingTabs.delete(tabId);
      const previewTabId = state.previewTabId === tabId ? null : state.previewTabId;
      return { openTabs, activeTabId, animatedTabs, fadingTabs, previewTabId };
    });
  };

  startTabFade = (tabId) => {
    this.setState((state) => {
      const fadingTabs = new Set(state.fadingTabs);
      fadingTabs.add(tabId);
      return { fadingTabs };
    });
  };

  markAnimationComplete = (tabId) => {
    this.setState((state) => {
      const animatedTabs = new Set(state.animatedTabs);
      animatedTabs.add(tabId);
      const fadingTabs = new Set(state.fadingTabs);
      fadingTabs.delete(tabId);
      return { animatedTabs, fadingTabs };
    });
  };

  selectTab = (tabId) => {
    this.setState({ activeTabId: tabId });
  };

  toggleCommandPalette = () => {
    this.setState((state) => ({ commandPaletteOpen: !state.commandPaletteOpen }));
  };

  closeActiveTab = () => {
    this.setState((state) => {
      if (!state.activeTabId) return null;
      const openTabs = state.openTabs.filter((tab) => tab.id !== state.activeTabId);
      const activeTabId = openTabs.length > 0 ? openTabs[openTabs.length - 1].id : null;
      const animatedTabs = new Set(state.animatedTabs);
      animatedTabs.delete(state.activeTabId);
      const fadingTabs = new Set(state.fadingTabs);
      fadingTabs.delete(state.activeTabId);
      const previewTabId = state.previewTabId === state.activeTabId ? null : state.previewTabId;
      return { openTabs, activeTabId, animatedTabs, fadingTabs, previewTabId };
    });
  };

  closeAllTabs = () => {
    this.setState({
      openTabs: [],
      activeTabId: null,
      animatedTabs: new Set(),
      fadingTabs: new Set(),
      previewTabId: null,
    });
  };

  handlePaletteAction = (actionId) => {
    switch (actionId) {
      case "action:close-tab":
        this.closeActiveTab();
        break;
      case "action:close-all":
        this.closeAllTabs();
        break;
      default:
        break;
    }
  };

  handleGlobalKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      this.toggleCommandPalette();
      return;
    }
    if (this.state.commandPaletteOpen) return;
    if (e.ctrlKey && e.key === "q") {
      e.preventDefault();
      this.closeActiveTab();
      return;
    }
  };

  handleTabDragStart = (e, tabId) => {
    e.dataTransfer.effectAllowed = "move";
    this.setState({ draggedTabId: tabId });
  };

  handleTabDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    this.setState({ dropTargetIndex: index });
  };

  handleTabDragLeave = () => {
    this.setState({ dropTargetIndex: null });
  };

  handleTabDrop = () => {
    this.setState((state) => {
      const { draggedTabId, dropTargetIndex, openTabs } = state;
      if (draggedTabId == null || dropTargetIndex == null) return { draggedTabId: null, dropTargetIndex: null };

      const fromIndex = openTabs.findIndex((t) => t.id === draggedTabId);
      if (fromIndex === -1 || fromIndex === dropTargetIndex) return { draggedTabId: null, dropTargetIndex: null };

      const tabs = [...openTabs];
      const [moved] = tabs.splice(fromIndex, 1);
      tabs.splice(dropTargetIndex, 0, moved);
      return { openTabs: tabs, draggedTabId: null, dropTargetIndex: null };
    });
  };

  handleTabDragEnd = () => {
    this.setState({ draggedTabId: null, dropTargetIndex: null });
  };

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

      const animatedTabs = new Set(openTabs.map((t) => t.id));
      this.setState({ openTabs, activeTabId, leftPanelWidth, stateLoaded: true, animatedTabs });
    });
  }

  componentDidUpdate(prevProps, prevState) {
    if (!this.state.stateLoaded) return;

    const tabsChanged = prevState.openTabs !== this.state.openTabs;
    const activeChanged = prevState.activeTabId !== this.state.activeTabId;
    const widthChanged = prevState.leftPanelWidth !== this.state.leftPanelWidth;
    const previewChanged = prevState.previewTabId !== this.state.previewTabId;

    if (tabsChanged || activeChanged || widthChanged || previewChanged) {
      const persistentTabIds = this.state.openTabs
        .filter((t) => t.id !== this.state.previewTabId)
        .map((t) => t.id);
      const persistedActiveTabId =
        this.state.activeTabId === this.state.previewTabId
          ? persistentTabIds.length > 0
            ? persistentTabIds[persistentTabIds.length - 1]
            : null
          : this.state.activeTabId;
      this._debouncedSave({
        openTabIds: persistentTabIds,
        activeTabId: persistedActiveTabId,
        leftPanelWidth: this.state.leftPanelWidth,
      });
    }

    if ((tabsChanged || activeChanged) && this.state.activeTabId !== null) {
      this.scrollActiveTabIntoView();
    }
  }

  scrollActiveTabIntoView = () => {
    requestAnimationFrame(() => {
      if (!this.tabListRef.current) return;
      const tabEl = this.tabListRef.current.querySelector(
        `[data-tab-id="${this.state.activeTabId}"]`
      );
      if (tabEl) {
        tabEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
      }
    });
  };

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

  handleWindowResize = () => {
    this.setState((state) => ({
      leftPanelWidth: Math.min(state.leftPanelWidth, getLeftPanelMaxWidth()),
    }));
  };

  handleResizeStart = (e) => {
    e.preventDefault();
    this.isResizing = true;
    this.startX = e.clientX;
    this.startWidth = this.state.leftPanelWidth;
  };

  handleResizeMove = (e) => {
    if (!this.isResizing) return;
    const deltaX = e.clientX - this.startX;
    const maxWidth = getLeftPanelMaxWidth();
    const newWidth = Math.min(maxWidth, Math.max(LEFT_PANEL_MIN_WIDTH, this.startWidth + deltaX));
    this.setState({ leftPanelWidth: newWidth });
  };

  handleResizeEnd = () => {
    this.isResizing = false;
  };

  handleMainClassState = (config) => {
    const changeClass = () => {
      const actionClass = {
        SHOW_MODAL: {
          class: "main modalVisible",
        },
        HIDE_MODAL: {
          class: "main",
        },
      };
      this.setState((state) => {
        return { mainClass: actionClass[config.actionType].class };
      });
    };
    changeClass();
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
                <div className="stage-main">
                  <div className="stage-tabs" role="tablist">
                    <div className="stage-tabs-list" ref={this.tabListRef}>
                      {this.state.openTabs.map((tab, index) => (
                        <div
                          key={tab.id}
                          role="tab"
                          aria-selected={this.state.activeTabId === tab.id}
                          data-tab-id={tab.id}
                          className={[
                            "stage-tab",
                            this.state.activeTabId === tab.id ? "stage-tab--active" : "",
                            this.state.previewTabId === tab.id ? "stage-tab--preview" : "",
                            this.state.dropTargetIndex === index && this.state.draggedTabId !== tab.id ? "stage-tab--drop-before" : "",
                          ].filter(Boolean).join(" ")}
                          onClick={() => this.selectTab(tab.id)}
                          onDoubleClick={() => this.handleTabDoubleClick(tab.id)}
                          draggable
                          onDragStart={(e) => this.handleTabDragStart(e, tab.id)}
                          onDragOver={(e) => this.handleTabDragOver(e, index)}
                          onDragLeave={this.handleTabDragLeave}
                          onDrop={this.handleTabDrop}
                          onDragEnd={this.handleTabDragEnd}
                        >
                          <img
                            src="/favicon.ico"
                            alt=""
                            className="stage-tab-icon"
                            width={16}
                            height={16}
                          />
                          <span className="stage-tab-title">{tab.title}</span>
                          <button
                            type="button"
                            className="stage-tab-close"
                            onClick={(e) => this.closeTab(e, tab.id)}
                            aria-label={`Close ${tab.title}`}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="stage-tabs-end">
                      <ThemeToggle />
                    </div>
                  </div>
                  {this.state.openTabs.length > 0 ? (
                    this.state.openTabs.map((tab) => {
                      const isActive = tab.id === this.state.activeTabId;
                      const isAnimated = this.state.animatedTabs.has(tab.id);
                      const isFading = this.state.fadingTabs.has(tab.id);
                      const contentVisible = isAnimated || isFading;

                      return (
                        <div
                          key={tab.id}
                          className="stage-content-wrapper"
                          style={{ display: isActive ? "flex" : "none" }}
                          role="tabpanel"
                          aria-hidden={!isActive}
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
                              onFadeStart={() => this.startTabFade(tab.id)}
                              onComplete={() => this.markAnimationComplete(tab.id)}
                            />
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="stage-empty">
                      <div className="stage-empty-content">
                        <svg
                          className="stage-empty-icon"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 17 17"
                          width="48"
                          height="48"
                          aria-hidden="true"
                        >
                          <path fill="currentColor" d={icons.workItem} />
                        </svg>
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
