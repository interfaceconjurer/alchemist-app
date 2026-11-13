// Temporary layout flags. Flip any of these back to true to restore the
// surface; the e2e suites read the same values to skip or adapt checks that
// depend on a hidden surface.

// Hide the stage so the left panel fills the window.
export const SHOW_STAGE = false;
// Hide the "My Work" list in the left panel.
export const SHOW_WORK_LIST = false;
// Hide the top action bar (search button + theme toggle). Theme follows the
// system color scheme; search stays available through Cmd/Ctrl+K.
export const SHOW_TOP_BAR = false;
