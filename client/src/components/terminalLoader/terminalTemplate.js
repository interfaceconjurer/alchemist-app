export const TIMING = {
  READY_PAUSE: 500,
  FADE_DURATION: 250,
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
 * Returns { command, outputLines: Array<{ spans: Span[], delay: number }> }
 */
export function buildTerminalOutput(item) {
  const projectName = item.title.toLowerCase().replace(/\s+/g, "-");
  const h = hashCode(item.id);
  const port = 5173 + (h % 10);
  const readyMs = 300 + (h % 600);
  const moduleCount = 40 + (h % 80);

  const command = { text: "$ npm run dev" };

  const depCount = 180 + (h % 120);
  const chunkHash = (h * 7) % 1000;
  const warnCount = 1 + (h % 3);
  const eslintFiles = 12 + (h % 20);
  const eslintWarnings = 2 + (h % 5);

  const outputLines = [
    // npm script echo (pause after command before output starts)
    { delay: 400, spans: [{ text: "", color: "white" }] },
    {
      delay: 30,
      spans: [
        { text: `> ${projectName}@1.0.0 `, color: "dim" },
        { text: "dev", color: "white" },
      ],
    },
    {
      delay: 20,
      spans: [
        { text: "> ", color: "dim" },
        { text: "vite", color: "cyan" },
        { text: " --config ", color: "dim" },
        { text: "vite.config.js", color: "white" },
        { text: " --mode ", color: "dim" },
        { text: "development", color: "yellow" },
      ],
    },

    // Dependency pre-bundling
    { delay: 200, spans: [{ text: "", color: "white" }] },
    { delay: 35, spans: [{ text: "  Pre-bundling dependencies:", color: "dim" }] },
    {
      delay: 20,
      spans: [
        { text: "    react", color: "magenta" },
        { text: ", ", color: "dim" },
        { text: "react-dom", color: "magenta" },
        { text: ", ", color: "dim" },
        { text: "react-router-dom", color: "magenta" },
        { text: ", ", color: "dim" },
        { text: "@emotion/react", color: "magenta" },
      ],
    },
    {
      delay: 18,
      spans: [
        { text: "    @radix-ui/react-dialog", color: "magenta" },
        { text: ", ", color: "dim" },
        { text: "@radix-ui/react-tooltip", color: "magenta" },
      ],
    },
    {
      delay: 15,
      spans: [
        { text: "  (", color: "dim" },
        { text: `${depCount}`, color: "yellow" },
        { text: " dependencies detected, optimizing...)", color: "dim" },
      ],
    },

    // ESLint pass
    { delay: 140, spans: [{ text: "", color: "white" }] },
    {
      delay: 25,
      spans: [
        { text: "  eslint ", color: "magenta" },
        { text: `scanned ${eslintFiles} files`, color: "dim" },
        { text: " \u2014 ", color: "dim" },
        { text: `${eslintWarnings} warnings`, color: "yellow" },
        { text: ", ", color: "dim" },
        { text: "0 errors", color: "green" },
      ],
    },

    // Vite startup
    { delay: 180, spans: [{ text: "", color: "white" }] },
    {
      delay: 40,
      spans: [
        { text: "  VITE ", color: "green" },
        { text: "v6.3.5", color: "dim" },
        { text: "  ready in ", color: "dim" },
        { text: `${readyMs} ms`, color: "green" },
      ],
    },

    // Module transform log
    { delay: 100, spans: [{ text: "", color: "white" }] },
    {
      delay: 30,
      spans: [
        { text: `  ${moduleCount} modules`, color: "white" },
        { text: " transformed.", color: "dim" },
      ],
    },
    {
      delay: 20,
      spans: [
        { text: "  rendering chunks ", color: "dim" },
        { text: `(${chunkHash})`, color: "cyan" },
        { text: "...", color: "dim" },
      ],
    },
    { delay: 18, spans: [{ text: "  computing gzip size...", color: "dim" }] },

    // Warnings
    { delay: 60, spans: [{ text: "", color: "white" }] },
    {
      delay: 20,
      spans: [
        { text: "  (!) ", color: "yellow" },
        { text: `${warnCount} warning(s)`, color: "yellow" },
        { text: " \u2014 some chunks are larger than ", color: "dim" },
        { text: "500 kB", color: "white" },
      ],
    },

    // Build output table
    { delay: 80, spans: [{ text: "", color: "white" }] },
    {
      delay: 25,
      spans: [
        { text: "  dist/assets/", color: "dim" },
        { text: `index-${item.id}h3x.js`, color: "cyan" },
        { text: `    ${(42 + (h % 30)).toFixed(2)} kB`, color: "dim" },
        { text: " \u2502 gzip: ", color: "dim" },
        { text: `${(14 + (h % 10)).toFixed(2)} kB`, color: "white" },
      ],
    },
    {
      delay: 18,
      spans: [
        { text: "  dist/assets/", color: "dim" },
        { text: `index-${item.id}c5s.css`, color: "magenta" },
        { text: `   ${(8 + (h % 6)).toFixed(2)} kB`, color: "dim" },
        { text: " \u2502 gzip: ", color: "dim" },
        { text: `${(2 + (h % 3)).toFixed(2)} kB`, color: "white" },
      ],
    },
    {
      delay: 15,
      spans: [
        { text: "  dist/assets/", color: "dim" },
        { text: `vendor-${item.id}r9k.js`, color: "cyan" },
        { text: `  ${(128 + (h % 60)).toFixed(2)} kB`, color: "dim" },
        { text: " \u2502 gzip: ", color: "dim" },
        { text: `${(41 + (h % 15)).toFixed(2)} kB`, color: "red" },
      ],
    },
    {
      delay: 12,
      spans: [
        { text: "  dist/assets/", color: "dim" },
        { text: `worker-${item.id}a2m.js`, color: "cyan" },
        { text: `  ${(18 + (h % 12)).toFixed(2)} kB`, color: "dim" },
        { text: " \u2502 gzip: ", color: "dim" },
        { text: `${(6 + (h % 4)).toFixed(2)} kB`, color: "white" },
      ],
    },

    // Built successfully
    { delay: 70, spans: [{ text: "", color: "white" }] },
    {
      delay: 30,
      spans: [
        { text: "  \u2713 ", color: "green" },
        { text: "built in ", color: "dim" },
        { text: `${readyMs + 120} ms`, color: "green" },
      ],
    },

    // Local/Network URLs (the "ready" moment)
    { delay: 100, spans: [{ text: "", color: "white" }] },
    {
      delay: 40,
      spans: [
        { text: "  \u27A8  ", color: "green" },
        { text: "Local:   ", color: "bold" },
        { text: `http://localhost:${port}/`, color: "cyan" },
      ],
    },
    {
      delay: 30,
      spans: [
        { text: "  \u27A8  ", color: "green" },
        { text: "Network: ", color: "bold" },
        { text: `http://192.168.1.${42 + (h % 200)}:${port}/`, color: "cyan" },
      ],
    },
    {
      delay: 20,
      spans: [
        { text: "  \u27A8  ", color: "dim" },
        { text: "press ", color: "dim" },
        { text: "h + enter", color: "bold" },
        { text: " to show help", color: "dim" },
      ],
    },
  ];

  return { command, outputLines };
}
