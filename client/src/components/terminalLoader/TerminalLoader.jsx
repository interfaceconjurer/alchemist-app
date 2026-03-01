import React, { useState, useEffect, useRef, useCallback } from "react";
import { buildTerminalOutput, TIMING } from "./terminalTemplate";
import "./TerminalLoader.css";

function TerminalLoader({ item, onFadeStart, onComplete }) {
  const [visibleLines, setVisibleLines] = useState(0);
  const [phase, setPhase] = useState("streaming");
  const output = useRef(null);
  const bodyRef = useRef(null);

  if (!output.current || output.current._itemId !== item.id) {
    output.current = buildTerminalOutput(item);
    output.current._itemId = item.id;
  }

  const { command, outputLines } = output.current;
  const totalLines = outputLines.length;

  const stableOnFadeStart = useCallback(onFadeStart, []);
  const stableOnComplete = useCallback(onComplete, []);

  // Schedule line reveals with per-line delays
  useEffect(() => {
    if (phase !== "streaming") return;

    const timers = [];
    let elapsed = 0;

    for (let i = 0; i < totalLines; i++) {
      elapsed += outputLines[i].delay;
      const lineIndex = i + 1;
      timers.push(
        setTimeout(() => {
          setVisibleLines(lineIndex);
          if (lineIndex === totalLines) {
            setPhase("ready");
          }
        }, elapsed),
      );
    }

    return () => timers.forEach(clearTimeout);
  }, [phase, totalLines, outputLines]);

  // Auto-scroll to bottom when new lines appear
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [visibleLines]);

  // Ready pause → start fading
  useEffect(() => {
    if (phase !== "ready") return;
    const timer = setTimeout(() => {
      setPhase("fading");
      stableOnFadeStart();
    }, TIMING.READY_PAUSE);
    return () => clearTimeout(timer);
  }, [phase, stableOnFadeStart]);

  // Fade duration → complete
  useEffect(() => {
    if (phase !== "fading") return;
    const timer = setTimeout(() => {
      setPhase("done");
      stableOnComplete();
    }, TIMING.FADE_DURATION);
    return () => clearTimeout(timer);
  }, [phase, stableOnComplete]);

  const containerClass =
    "terminal-loader" + (phase === "fading" || phase === "done" ? " terminal-loader--fading" : "");

  const hasOutput = visibleLines > 0;

  return (
    <div className={containerClass}>
      <div className="terminal-window">
        <div className="terminal-command">
          <svg className="terminal-icon" aria-hidden="true" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="0.5" y="0.5" width="15" height="15" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M4 5L7 8L4 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="9" y1="11" x2="12" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span className="term-white">{command.text}</span>
        </div>
        {hasOutput && (
          <>
            <div className="terminal-divider" />
            <div className="terminal-body" ref={bodyRef}>
              {outputLines.slice(0, visibleLines).map((line, i) => (
                <div key={i} className="terminal-line">
                  {line.spans.map((span, si) => (
                    <span key={si} className={`term-${span.color}`}>
                      {span.text}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default TerminalLoader;
