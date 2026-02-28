/**
 * Work list data source. Load from an API or CMS later.
 * Structure: sections with label, tagline, and items.
 */
export const workSections = [
  {
    id: "trenches",
    label: "In the trenches",
    tagline: "How I think, work, and ship day to day.",
    items: [
      { id: "t1", title: "Placeholder Project Alpha", description: "Design & development — day to day." },
      { id: "t2", title: "Placeholder Project Beta", description: "UX research and process in practice." },
    ],
  },
  {
    id: "direction",
    label: "Direction",
    tagline: "Where I'm aiming and what I'm building toward.",
    items: [
      { id: "d1", title: "Placeholder Project Gamma", description: "Vision and strategy — case study." },
      { id: "d2", title: "Placeholder Project Delta", description: "North star work and roadmap." },
    ],
  },
  {
    id: "sidequests",
    label: "Side quests",
    tagline: "Tinkering, learning, and following curiosity.",
    items: [
      { id: "s1", title: "Placeholder Project Epsilon", description: "Experiments and prototypes." },
      { id: "s2", title: "Placeholder Project Zeta", description: "Play and exploration." },
    ],
  },
];
