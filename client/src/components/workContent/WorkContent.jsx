import React, { useCallback, useMemo, useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import ArtifactViewer from "./ArtifactViewer";
import "./WorkContent.css";

const isImage = (artifact) => !!artifact && (artifact.type || 'image') === 'image';
/** An image card with no image card beside it (its neighbours span the full row). */
const isSoloImage = (artifacts, i) => isImage(artifacts[i]) && !isImage(artifacts[i - 1]) && !isImage(artifacts[i + 1]);

const dimension = (value, fallback) => (Number.isFinite(value) && value > 0 ? value : fallback);

/** The text that accompanies an artifact, for its "open larger" label. */
const viewLabel = (item) => `View ${item.label || item.title || item.alt || "artifact"} larger`;

/**
 * Wraps an artifact's media in a button that opens it in the viewer, unless the
 * artifact opts out with `"viewable": false`. The media
 * itself is inert inside the button so a click always opens the viewer (an
 * embedded deck would otherwise swallow the click).
 */
function Viewable({ item, onOpen, className = "", style, children }) {
  // Not opened larger (e.g. an informational diagram): plain media, no button.
  if (!item) return <div className={className} style={style}>{children}</div>;
  return (
    <button type="button" className={`work-content-viewable ${className}`} style={style} onClick={onOpen} aria-label={viewLabel(item)}>
      {children}
      <span className="work-content-viewable-hint" aria-hidden="true">⤢</span>
    </button>
  );
}

function ArtifactRenderer({ artifact, viewerItem, onOpen, solo = false }) {
  const { theme } = useTheme();
  const type = artifact.type || 'image';
  const heading = (
    <>
      {artifact.label && <h4 className="work-content-artifact-label">{artifact.label}</h4>}
      {artifact.description && <p className="work-content-artifact-description">{artifact.description}</p>}
    </>
  );

  if (type === 'diagram') {
    const src = artifact.sources?.[theme] || artifact.src;
    const width = dimension(artifact.width, 16);
    const height = dimension(artifact.height, 10);
    return (
      <div className="work-content-artifact work-content-artifact--diagram">
        {heading}
        <Viewable item={viewerItem} onOpen={onOpen} className="work-content-image-placeholder" style={{ aspectRatio: `${width} / ${height}` }}>
          <img src={src} alt={artifact.alt} width={width} height={height} loading="lazy" decoding="async" />
        </Viewable>
      </div>
    );
  }

  if (type === 'embed') {
    const width = dimension(artifact.width, 16);
    const height = dimension(artifact.height, 9);
    return (
      <div className="work-content-artifact work-content-artifact--embed">
        {heading}
        <Viewable item={viewerItem} onOpen={onOpen} className="work-content-embed" style={{ aspectRatio: `${width} / ${height}` }}>
          <iframe src={artifact.src} title={artifact.title || artifact.label} loading="lazy" tabIndex={-1} aria-hidden="true" />
        </Viewable>
        {artifact.download && (
          <a className="work-content-download" href={artifact.download.href} download>
            {artifact.download.label || 'Download'}
          </a>
        )}
      </div>
    );
  }

  if (type === 'code') {
    return (
      <div className="work-content-artifact work-content-artifact--code">
        {heading}
        <pre className="work-content-code"><code>{artifact.code}</code></pre>
      </div>
    );
  }

  return (
    <div className={`work-content-artifact${solo ? ' work-content-artifact--solo' : ''}`}>
      <div className="work-content-artifact-copy">{heading}</div>
      <Viewable item={viewerItem} onOpen={onOpen} className="work-content-image-placeholder">
        <img src={artifact.src} alt={artifact.alt} loading="lazy" />
      </Viewable>
    </div>
  );
}

function WorkContent({ content }) {
  if (!content) {
    return <p className="stage-content-placeholder">Content for this work item will go here.</p>;
  }
  return <WorkContentBody content={content} />;
}

function WorkContentBody({ content }) {
  const { theme } = useTheme();
  const [viewing, setViewing] = useState(null);
  const close = useCallback(() => setViewing(null), []);

  // Every visual artifact and outcome image, in page order, so the viewer can
  // page through them. Code blocks stay inline.
  const { viewerItems, artifactIndex, outcomeIndex } = useMemo(() => {
    const items = [];
    const artifactIndex = new Map();
    const outcomeIndex = new Map();
    (content.artifacts ?? []).forEach((artifact, i) => {
      const type = artifact.type || 'image';
      if (type === 'code' || artifact.viewable === false) return;
      artifactIndex.set(i, items.length);
      items.push({
        kind: type === 'embed' ? 'embed' : 'image',
        src: type === 'diagram' ? artifact.sources?.[theme] || artifact.src : artifact.src,
        alt: artifact.alt, title: artifact.title, label: artifact.label, description: artifact.description,
        width: artifact.width, height: artifact.height,
      });
    });
    (content.outcome ?? []).forEach((item, i) => {
      outcomeIndex.set(i, items.length);
      items.push({ kind: 'image', src: item.src, alt: item.alt, label: item.caption });
    });
    return { viewerItems: items, artifactIndex, outcomeIndex };
  }, [content, theme]);

  return (
    <div className="work-content">
      {content.context && (
        <section className="work-content-section">
          <h3 className="work-content-heading">Context & Goals</h3>
          <p className="work-content-text">{content.context}</p>
          {content.goals && content.goals.length > 0 && (
            <ul className="work-content-goals">
              {content.goals.map((goal, i) => (
                <li key={i}>{goal}</li>
              ))}
            </ul>
          )}
        </section>
      )}

      {content.artifacts && content.artifacts.length > 0 && (
        <section className="work-content-section">
          <h3 className="work-content-heading">Artifacts</h3>
          <div className="work-content-artifacts">
            {content.artifacts.map((artifact, i) => (
              <ArtifactRenderer
                key={i}
                artifact={artifact}
                solo={isSoloImage(content.artifacts, i)}
                viewerItem={artifactIndex.has(i) ? viewerItems[artifactIndex.get(i)] : null}
                onOpen={() => setViewing(artifactIndex.get(i))}
              />
            ))}
          </div>
        </section>
      )}

      {content.outcome && content.outcome.length > 0 && (
        <section className="work-content-section">
          <h3 className="work-content-heading">Outcome</h3>
          <div className="work-content-outcome-grid">
            {content.outcome.map((item, i) => (
              <figure key={i} className="work-content-outcome-item">
                <Viewable item={viewerItems[outcomeIndex.get(i)]} onOpen={() => setViewing(outcomeIndex.get(i))} className="work-content-image-placeholder">
                  <img src={item.src} alt={item.alt} loading="lazy" />
                </Viewable>
                {item.caption && (
                  <figcaption className="work-content-caption">{item.caption}</figcaption>
                )}
              </figure>
            ))}
          </div>
        </section>
      )}

      {content.whatsNext && (
        <section className="work-content-section">
          <h3 className="work-content-heading">What's Next</h3>
          <p className="work-content-text">{content.whatsNext}</p>
        </section>
      )}

      <ArtifactViewer items={viewerItems} index={viewing} onIndexChange={setViewing} onClose={close} />
    </div>
  );
}

export default WorkContent;
