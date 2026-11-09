import React, { useState, useEffect, useRef, useMemo, useCallback, useId } from "react";
import { workSections } from "../workList/workList";
import { useTheme } from "../../contexts/ThemeContext";
import "./CommandPalette.css";

const ACTIONS = [
  { id: "action:toggle-theme", label: "Toggle Dark Mode", type: "action" },
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
        date: item.date,
        tags: item.tags || [],
        sectionLabel: section.label,
        type: "item",
        raw: item,
      });
    }
  }
  items.sort((a, b) => new Date(b.date) - new Date(a.date));
  return items;
}

function CommandPalette({ isOpen, onClose, onSelectItem, onAction, openTabIds }) {
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef(null);
  const listId = useId();
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

  // Keep keyboard focus in the modal and return it to the prior control.
  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement;
    setQuery("");
    setHighlightIndex(0);
    inputRef.current?.focus({ preventScroll: true });
    return () => {
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, [isOpen]);

  // Reset highlight when filtered list changes
  useEffect(() => {
    setHighlightIndex(0);
  }, [filtered.length]);

  // Scroll highlighted item into view
  useEffect(() => {
    const el = itemRefs.current[highlightIndex];
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [highlightIndex, filtered.length, isOpen]);

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
      if (e.key === "Tab") {
        // The combobox is the dialog's only tab stop; options use arrow keys.
        e.preventDefault();
        inputRef.current?.focus({ preventScroll: true });
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!filtered.length) return;
        setHighlightIndex((i) => (i + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (!filtered.length) return;
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
      <div className="command-palette" role="dialog" aria-modal="true" aria-label="Search work and actions" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="command-palette-input"
          type="text"
          role="combobox"
          aria-label="Search work items and actions"
          aria-autocomplete="list"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={filtered[highlightIndex] ? `${listId}-option-${highlightIndex}` : undefined}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search work items and actions..."
          spellCheck={false}
          autoComplete="off"
        />
        <div className="command-palette-list" ref={listRef} id={listId} role="listbox" aria-label="Search results">
          {filtered.length === 0 && (
            <div className="command-palette-empty">No results found</div>
          )}
          {filtered.map((entry, i) => {
            const isHighlighted = i === highlightIndex;
            const isAction = entry.type === "action";

            return (
              <div
                key={entry.id}
                id={`${listId}-option-${i}`}
                role="option"
                aria-selected={isHighlighted}
                ref={(el) => (itemRefs.current[i] = el)}
                className={`command-palette-item ${isHighlighted ? "command-palette-item--highlighted" : ""} ${isAction ? "command-palette-item--action" : ""}`}
                onClick={() => select(entry)}
                onMouseEnter={() => setHighlightIndex(i)}
              >
                <div className="command-palette-item-left">
                  {isAction && <span className="command-palette-action-prefix" aria-hidden="true">&gt;</span>}
                  <span className="command-palette-item-label">{entry.label}</span>
                  {!isAction && (
                    <span className="command-palette-item-section">{entry.sectionLabel}</span>
                  )}
                </div>
                {isAction && entry.hint && (
                  <kbd className="command-palette-item-hint">{entry.hint}</kbd>
                )}
                {!isAction && entry.date && (
                  <span className="command-palette-item-date">{entry.date}</span>
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
