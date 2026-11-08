import React, { Component, createContext, useContext } from 'react';

const GraphicsFailureContext = createContext(() => {});
export const useGraphicsFailure = () => useContext(GraphicsFailureContext);

export function StaticSymbol({ reason = 'unavailable' }) {
  return (
    <div className="symbol-fallback" data-symbol-fallback={reason} role="img" aria-label="Crystal symbol">
      <svg viewBox="0 0 240 240" aria-hidden="true" focusable="false">
        <path d="M120 34 205 158 120 205 35 158Z" />
        <path d="m120 34 0 171M35 158l85-51 85 51M120 107l0-73" />
        <path className="symbol-fallback-base" d="m35 158 85 47 85-47-85-51Z" />
      </svg>
    </div>
  );
}

/** Contains both React errors and failures reported by the graphics runtime. */
export class GraphicsBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  reportFailure = () => { this.setState({ failed: true }); };
  render() {
    if (this.state.failed) return <StaticSymbol />;
    return (
      <GraphicsFailureContext.Provider value={this.reportFailure}>
        {this.props.children}
      </GraphicsFailureContext.Provider>
    );
  }
}
