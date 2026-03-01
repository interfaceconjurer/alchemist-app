import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { workSections } from "../workList/workList";
import { useTheme } from "../../contexts/ThemeContext";
import "./CommandPalette.css";

const ACTIONS = [
  { id: "action:toggle-theme", label: "Toggle Dark Mode", type: "action" },
  { id: "action:close-tab", label: "Close Active Tab", hint: "\u2303Q", type: "action" },
  { id: "action:close-all", label: "Close All Tabs", type: "action" },
];

function buildItemList() {
  const items = [];
  for (const section of workSections) {
    for (const item of section.items) {
      items.push({
        id: item.id,
        label: item.title,
        description: item.description,
        tags: item.tags || [],
        sectionLabel: section.label,
        type: "item",
        raw: item,
      });
    }
  }
  return items;
}

function CommandPalette({ isOpen, onClose, onSelectItem, onAction, openTabIds }) {
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const itemRefs = useRef([]);
  const { toggleTheme } = useTheme();

  const allWorkItems = useMemo(() => buildItemList(), []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [...ACTIONS, ...allWorkItems];

    const match = (entry) => {
      if (entry.type === "action") {
        return entry.label.toLowerCase().includes(q);
      }
      return (
        entry.label.toLowerCase().includes(q) ||
        entry.description.toLowerCase().includes(q) ||
        entry.sectionLabel.toLowerCase().includes(q) ||
        entry.tags.some((t) => t.toLowerCase().includes(q))
      );
    };

    return [...ACTIONS, ...allWorkItems].filter(match);
  }, [query, allWorkItems]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setHighlightIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  // Reset highlight when filtered list changes
  useEffect(() => {
    setHighlightIndex(0);
  }, [filtered.length]);

  // Scroll highlighted item into view
  useEffect(() => {
    const el = itemRefs.current[highlightIndex];
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [highlightIndex]);

  const select = useCallback(
    (entry) => {
      if (entry.type === "action") {
        if (entry.id === "action:toggle-theme") {
          toggleTheme();
        } else {
          onAction(entry.id);
        }
      } else {
        onSelectItem(entry.raw);
      }
      onClose();
    },
    [onAction, onSelectItem, onClose, toggleTheme],
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIndex((i) => (i + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIndex((i) => (i - 1 + filtered.length) % filtered.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[highlightIndex]) select(filtered[highlightIndex]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [filtered, highlightIndex, select, onClose],
  );

  if (!isOpen) return null;

  return (
    <div className="command-palette-overlay" onClick={onClose}>
      <div className="command-palette" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="command-palette-input"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search work items and actions..."
          spellCheck={false}
          autoComplete="off"
        />
        <div className="command-palette-list" ref={listRef}>
          {filtered.length === 0 && (
            <div className="command-palette-empty">No results found</div>
          )}
          {filtered.map((entry, i) => {
            const isHighlighted = i === highlightIndex;
            const isAction = entry.type === "action";

            return (
              <div
                key={entry.id}
                ref={(el) => (itemRefs.current[i] = el)}
                className={`command-palette-item ${isHighlighted ? "command-palette-item--highlighted" : ""} ${isAction ? "command-palette-item--action" : ""}`}
                onClick={() => select(entry)}
                onMouseEnter={() => setHighlightIndex(i)}
              >
                <div className="command-palette-item-left">
                  {isAction && <span className="command-palette-action-prefix">&gt;</span>}
                  <span className="command-palette-item-label">{entry.label}</span>
                  {!isAction && (
                    <span className="command-palette-item-section">{entry.sectionLabel}</span>
                  )}
                </div>
                {isAction && entry.hint && (
                  <kbd className="command-palette-item-hint">{entry.hint}</kbd>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;
