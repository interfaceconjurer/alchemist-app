import React from "react";
import "./StatusBar.css";

function StatusBar({ activeTab, sectionLabel }) {
  return (
    <div className="status-bar">
      <div className="status-bar-left">
        <span className="status-bar-breadcrumb">
          {sectionLabel && <span className="status-bar-section">{sectionLabel}</span>}
          {sectionLabel && <span className="status-bar-separator">/</span>}
          <span className="status-bar-title">{activeTab.title}</span>
        </span>
        {activeTab.date && <span className="status-bar-date">{activeTab.date}</span>}
      </div>
      {activeTab.tags && activeTab.tags.length > 0 && (
        <div className="status-bar-right">
          {activeTab.tags.map((tag) => (
            <span key={tag} className="status-bar-tag">{tag}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export default StatusBar;
