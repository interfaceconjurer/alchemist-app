import {
  LEFT_PANEL_MIN_WIDTH,
  getLeftPanelMaxWidth
} from '../utils/stateHelpers';

// Factory function to create resize manager with component instance binding
export function createResizeManager(component) {
  const handleResizeStart = (e) => {
    e.preventDefault();
    component.isResizing = true;
    component.startX = e.clientX;
    component.startWidth = component.state.leftPanelWidth;
  };

  const handleResizeMove = (e) => {
    if (!component.isResizing) return;

    const diff = e.clientX - component.startX;
    const newWidth = component.startWidth + diff;
    const clampedWidth = Math.min(Math.max(newWidth, LEFT_PANEL_MIN_WIDTH), getLeftPanelMaxWidth());

    component.setState({ leftPanelWidth: clampedWidth });
  };

  const handleResizeEnd = () => {
    component.isResizing = false;
  };

  const handleWindowResize = () => {
    component.setState((state) => {
      const maxWidth = getLeftPanelMaxWidth();
      if (state.leftPanelWidth > maxWidth) {
        return { leftPanelWidth: maxWidth };
      }
      return null;
    });
  };

  const handleMainClassState = (config) => {
    component.setState({ mainClass: config });
  };

  // Return the public API
  return {
    handleResizeStart,
    handleResizeMove,
    handleResizeEnd,
    handleWindowResize,
    handleMainClassState
  };
}