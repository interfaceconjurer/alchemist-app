import React, { Component, createContext, useContext } from 'react';

const GraphicsFailureContext = createContext(() => {});
export const useGraphicsFailure = () => useContext(GraphicsFailureContext);

/**
 * Glass outline of the crystal: the scene's pyramid at its reduced-motion resting
 * angle (REST_ROTATION in MorphingSolid, about 15° to the viewer's left of
 * edge-on), projected through the same camera. Coordinates are CSS px from
 * the centre of the 600 px-tall canvas. Back faces and edges are drawn first and
 * fainter, so the shape reads as transparent.
 */
export function StaticSymbol({ reason = 'unavailable' }) {
  return (
    <div className="symbol-fallback" data-symbol-fallback={reason} role="img" aria-label="Crystal symbol">
      <svg viewBox="-300 -300 600 600" aria-hidden="true" focusable="false">
        <g className="symbol-fallback-back">
          <path className="symbol-fallback-face" d="M34.6 34.4 189.4 87.9-68.5 149.4-158.9 60.5ZM34.6 34.4-158.9 60.5 0-91ZM189.4 87.9 34.6 34.4 0-91Z" />
          <path className="symbol-fallback-edge" d="M-158.9 60.5 34.6 34.4M0-91 34.6 34.4M34.6 34.4 189.4 87.9" />
        </g>
        <path className="symbol-fallback-face" d="M0-91-158.9 60.5-68.5 149.4Z" />
        <path className="symbol-fallback-face symbol-fallback-face--lit" d="M189.4 87.9 0-91-68.5 149.4Z" />
        <path className="symbol-fallback-edge" d="M0-91-158.9 60.5-68.5 149.4 189.4 87.9ZM0-91-68.5 149.4" />
      </svg>
    </div>
  );
}

/** Contains both React errors and failures reported by the graphics runtime. */
export class GraphicsBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  // Tell the slot the crystal won't arrive (it stops waiting and shows this outline).
  componentDidCatch() { this.props.onFailure?.(); }
  reportFailure = () => { this.setState({ failed: true }); this.props.onFailure?.(); };
  render() {
    if (this.state.failed) return <StaticSymbol />;
    return (
      <GraphicsFailureContext.Provider value={this.reportFailure}>
        {this.props.children}
      </GraphicsFailureContext.Provider>
    );
  }
}
