import React, { Component } from "react";
import { Route, Routes } from "react-router-dom";
import "./App.css";
import Resume from "./resume/Jordan_L_Wright.pdf";
import Icon from "./components/icon/view";
import { icons } from "./components/iconList/iconList";
import { workSections } from "./components/workList/workList";
import AlchemySymbol from "./components/alchemySymbol/mediator";
import Modal from "./components/modal/mediator";
import PubSub from "./pubSub";
import { ThemeProvider } from "./contexts/ThemeContext";
import ThemeToggle from "./components/ThemeToggle/ThemeToggle";
import { loadState, createDebouncedSave } from "./workspacePersistence";
import { resolveWorkItemsByIds } from "./resolveWorkItems";

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
    };
    this.mainRef = React.createRef();
    this.isResizing = false;
    this.startX = 0;
    this.startWidth = 0;

    const { debouncedSave, flush } = createDebouncedSave(500);
    this._debouncedSave = debouncedSave;
    this._flushSave = flush;
  }

  openWorkItem = (item) => {
    const { id, title, description } = item;
    this.setState((state) => {
      const exists = state.openTabs.some((tab) => tab.id === id);
      const openTabs = exists
        ? state.openTabs
        : [...state.openTabs, { id, title, description }];
      return { openTabs, activeTabId: id };
    });
  };

  closeTab = (e, tabId) => {
    e.stopPropagation();
    this.setState((state) => {
      const openTabs = state.openTabs.filter((tab) => tab.id !== tabId);
      const wasActive = state.activeTabId === tabId;
      const activeTabId = wasActive
        ? (openTabs.length > 0 ? openTabs[openTabs.length - 1].id : null)
        : state.activeTabId;
      return { openTabs, activeTabId };
    });
  };

  selectTab = (tabId) => {
    this.setState({ activeTabId: tabId });
  };

  componentDidMount() {
    PubSub.addListener("toggleModal", this.handleMainClassState);
    document.addEventListener("mousemove", this.handleResizeMove);
    document.addEventListener("mouseup", this.handleResizeEnd);
    window.addEventListener("resize", this.handleWindowResize);
    window.addEventListener("beforeunload", this._handleBeforeUnload);

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

      this.setState({ openTabs, activeTabId, leftPanelWidth, stateLoaded: true });
    });
  }

  componentDidUpdate(prevProps, prevState) {
    if (!this.state.stateLoaded) return;

    const tabsChanged = prevState.openTabs !== this.state.openTabs;
    const activeChanged = prevState.activeTabId !== this.state.activeTabId;
    const widthChanged = prevState.leftPanelWidth !== this.state.leftPanelWidth;

    if (tabsChanged || activeChanged || widthChanged) {
      this._debouncedSave({
        openTabIds: this.state.openTabs.map((t) => t.id),
        activeTabId: this.state.activeTabId,
        leftPanelWidth: this.state.leftPanelWidth,
      });
    }
  }

  componentWillUnmount() {
    PubSub.removeListener("toggleModal", this.handleMainClassState);
    document.removeEventListener("mousemove", this.handleResizeMove);
    document.removeEventListener("mouseup", this.handleResizeEnd);
    window.removeEventListener("resize", this.handleWindowResize);
    window.removeEventListener("beforeunload", this._handleBeforeUnload);
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
                          onClick={() => this.openWorkItem(item)}
                        >
                          <span className="work-item-title">{item.title}</span>
                          <span className="work-item-description">{item.description}</span>
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
                    <div className="stage-tabs-list">
                      {this.state.openTabs.map((tab) => (
                        <div
                          key={tab.id}
                          role="tab"
                          aria-selected={this.state.activeTabId === tab.id}
                          className={`stage-tab ${this.state.activeTabId === tab.id ? "stage-tab--active" : ""}`}
                          onClick={() => this.selectTab(tab.id)}
                        >
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
                    <>
                      <div className="stage-content">
                      {this.state.activeTabId && (() => {
                        const active = this.state.openTabs.find((t) => t.id === this.state.activeTabId);
                        return active ? (
                          <div className="stage-content-inner">
                            <h2 className="stage-content-title">{active.title}</h2>
                            <p className="stage-content-description">{active.description}</p>
                            <p className="stage-content-placeholder">Content for this work item will go here.</p>
                          </div>
                        ) : null;
                      })()}
                      </div>
                    </>
                  ) : (
                    <div className="stage-empty">
                      <p className="stage-empty-message">Open a work item from My Work to view it here.</p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </main>
        </div>
      </ThemeProvider>
    );
  }
}

export default App;
