export const TIMING = {
  READY_PAUSE: 300,
  FADE_DURATION: 300,
};

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Builds a flat sequence of lines, each with its own delay (ms from previous line).
 * Returns { lines: Array<{ spans: Span[], delay: number }> }
 */
export function buildTerminalOutput(item) {
  const projectName = item.title.toLowerCase().replace(/\s+/g, "-");
  const h = hashCode(item.id);
  const port = 5173 + (h % 10);
  const readyMs = 300 + (h % 600);
  const moduleCount = 40 + (h % 80);

  const command = { text: "$ npm run dev" };

  const outputLines = [
    // npm script echo (pause after command before output starts)
    { delay: 400, spans: [{ text: "", color: "white" }] },
    { delay: 40, spans: [{ text: `> ${projectName}@1.0.0 `, color: "dim" }, { text: "dev", color: "white" }] },
    { delay: 30, spans: [{ text: "> ", color: "dim" }, { text: "vite", color: "white" }] },

    // Vite startup (longer pause — "compiling")
    { delay: 320, spans: [{ text: "", color: "white" }] },
    { delay: 60, spans: [
      { text: "  VITE ", color: "green" },
      { text: "v6.3.5", color: "dim" },
      { text: "  ready in ", color: "dim" },
      { text: `${readyMs} ms`, color: "white" },
    ]},

    // Module count
    { delay: 180, spans: [{ text: "", color: "white" }] },
    { delay: 50, spans: [{ text: `  ${moduleCount} modules transformed.`, color: "dim" }] },

    // Local/Network URLs (the "ready" moment)
    { delay: 140, spans: [{ text: "", color: "white" }] },
    { delay: 60, spans: [
      { text: "  \u27A8  ", color: "green" },
      { text: "Local:   ", color: "bold" },
      { text: `http://localhost:${port}/`, color: "cyan" },
    ]},
    { delay: 40, spans: [
      { text: "  \u27A8  ", color: "dim" },
      { text: "Network: ", color: "dim" },
      { text: "use ", color: "dim" },
      { text: "--host", color: "white" },
      { text: " to expose", color: "dim" },
    ]},
  ];

  return { command, outputLines };
}
