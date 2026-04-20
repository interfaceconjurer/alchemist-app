/**
 * Work list data source.
 * Projects are loaded from individual JSON files in data/projects/.
 * Section metadata is defined here; items come from the JSON files.
 */

const projectModules = import.meta.glob('../../data/projects/*.json', { eager: true });

const projects = Object.values(projectModules).map(m => m.default || m);

const SECTIONS = [
  { id: "trenches", label: "\u26CF\uFE0F In the trenches", tagline: "How I think, work, and ship day to day." },
  { id: "direction", label: "\uD83D\uDD2E Direction", tagline: "Where I'm aiming and what I'm building toward." },
  { id: "sidequests", label: "\uD83C\uDFB2 Side quests", tagline: "Tinkering, learning, and following curiosity." },
];

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
