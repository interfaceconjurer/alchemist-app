/**
 * Work list data source.
 * Projects are loaded from individual JSON files in data/projects/.
 * Section metadata is defined here; items come from the JSON files.
 */

const projectModules = import.meta.glob('../../data/projects/*.json', { eager: true });

const projects = Object.values(projectModules).map(m => m.default || m);

const SECTIONS = [
  { id: "trenches", icon: "\u26CF\uFE0F", name: "In the trenches", tagline: "How I think, work, and ship day to day." },
  { id: "direction", icon: "\uD83D\uDD2E", name: "Direction", tagline: "Where I'm aiming and what I'm building toward." },
  { id: "sidequests", icon: "\uD83C\uDFB2", name: "Side quests", tagline: "Tinkering, learning, and following curiosity." },
].map(section => ({ ...section, label: `${section.icon} ${section.name}` }));

export const workSections = SECTIONS.map(section => ({
  ...section,
  items: projects
    .filter(p => p.section === section.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date)),
})).filter(section => section.items.length > 0);

export function getSectionForItem(itemId) {
  for (const section of workSections) {
    if (section.items.some((item) => item.id === itemId)) {
      return section.label;
    }
  }
  return null;
}

/**
 * Items listed under the profile links, newest first. An item joins this feed
 * by declaring the kind of work it is (`type`, e.g. "Presentation").
 */
export const feedItems = workSections
  .flatMap(section => section.items)
  .filter(item => item.type)
  .sort((a, b) => new Date(b.date) - new Date(a.date));

/** The emoji of the section an item belongs to (used as its tab icon). */
export function getSectionIconForItem(itemId) {
  return workSections.find((section) => section.items.some((item) => item.id === itemId))?.icon ?? null;
}
