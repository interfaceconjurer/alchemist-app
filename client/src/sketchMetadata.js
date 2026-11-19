import { pathFor } from './sketchPath.js';

// Used at build time for link previews and on client-side navigation.
export function updateSketchMetadata(doc, item) {
  const title = doc.querySelector('title') ?? doc.head.appendChild(doc.createElement('title'));
  title.dataset.home ??= title.textContent;
  doc.title = item ? `${item.title} · ${title.dataset.home}` : title.dataset.home;

  const description = doc.querySelector('meta[name="description"]');
  if (description) {
    description.dataset.home ??= description.content;
    description.content = item?.description ?? description.dataset.home;
    for (const meta of doc.querySelectorAll('meta[property="og:description"], meta[name="twitter:description"]')) {
      meta.content = description.content;
    }
  }
  // Preview titles keep the name, because iMessage, LinkedIn and X show only the title
  // and the domain: "PyTone · Jordan L. Wright", or the full home title. The tagline
  // is left off sketch previews so they don't wrap; the browser tab keeps it.
  const siteName = doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content');
  for (const meta of doc.querySelectorAll('meta[property="og:title"], meta[name="twitter:title"]')) {
    meta.dataset.home ??= meta.content;
    meta.content = item ? [item.title, siteName].filter(Boolean).join(' · ') : meta.dataset.home;
  }
  const canonical = doc.querySelector('link[rel="canonical"]');
  if (canonical) {
    canonical.href = new URL(pathFor(item), canonical.href).href;
    const ogUrl = doc.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.content = canonical.href;
  }
}
