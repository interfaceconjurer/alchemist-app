import React from "react";
import "./WorkContent.css";

function WorkContent({ content }) {
  if (!content) {
    return <p className="stage-content-placeholder">Content for this work item will go here.</p>;
  }

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
              <div key={i} className="work-content-artifact">
                <div className="work-content-image-placeholder">
                  <img src={artifact.src} alt={artifact.alt} loading="lazy" />
                </div>
                <div className="work-content-artifact-copy">
                  {artifact.label && <h4 className="work-content-artifact-label">{artifact.label}</h4>}
                  {artifact.description && <p className="work-content-artifact-description">{artifact.description}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {content.outcome && content.outcome.length > 0 && (
        <section className="work-content-section">
          <h3 className="work-content-heading">Outcome</h3>
          <div className="work-content-outcome-row">
            {content.outcome.map((item, i) => (
              <figure key={i} className="work-content-outcome-item">
                <div className="work-content-image-placeholder">
                  <img src={item.src} alt={item.alt} loading="lazy" />
                </div>
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
    </div>
  );
}

export default WorkContent;
