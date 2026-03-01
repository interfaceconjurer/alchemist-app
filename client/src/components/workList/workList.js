/**
 * Work list data source. Load from an API or CMS later.
 * Structure: sections with label, tagline, and items.
 */
export const workSections = [
  {
    id: "trenches",
    label: "\u26CF\uFE0F In the trenches",
    tagline: "How I think, work, and ship day to day.",
    items: [
      {
        id: "t1",
        title: "Placeholder Project Alpha",
        description: "Design & development — day to day.",
        date: "January 15, 2024",
        tags: ["React", "TypeScript", "Figma"],
        content: {
          context: "A greenfield product build from zero to launch. The team needed a designer who could also ship production code, bridging the gap between design intent and implementation detail.",
          goals: [
            "Deliver a fully responsive web app in 12 weeks",
            "Establish a component library that scales across features",
            "Reduce design-to-dev handoff friction through shared tooling",
          ],
          artifacts: [
            { src: "/images/placeholder.png", alt: "Component library overview", label: "Component Library", description: "The component library grew to 40+ primitives, each with documented props and usage examples. Every component was tested in isolation and composed into page-level layouts." },
            { src: "/images/placeholder.png", alt: "Design token system", label: "Token System", description: "A shared token system ensured visual consistency between Figma and code. Colors, spacing, and typography all derived from a single source of truth." },
            { src: "/images/placeholder.png", alt: "Storybook documentation", label: "Living Documentation", description: "Storybook served as the single reference for all component states, edge cases, and accessibility annotations." },
            { src: "/images/placeholder.png", alt: "CI/CD pipeline diagram", label: "Automated Pipeline", description: "Visual regression tests ran on every PR, catching unintended style changes before they reached production." },
          ],
          outcome: [
            { src: "/images/placeholder.png", alt: "Final product screenshot", caption: "Launched product — landing page" },
            { src: "/images/placeholder.png", alt: "Mobile responsive view", caption: "Responsive mobile layout" },
          ],
          whatsNext: "The component library is now being adopted by two other teams. Next step is extracting it into a standalone package with versioned releases.",
        },
      },
      {
        id: "t2",
        title: "Placeholder Project Beta",
        description: "UX research and process in practice.",
        date: "March 8, 2023",
        tags: ["UX Research", "Figma", "User Testing"],
        content: {
          context: "An existing product was losing users at a key conversion step. The team needed to understand why and redesign the flow based on real user behavior.",
          goals: [
            "Identify the top 3 usability issues through moderated testing",
            "Redesign the checkout flow to reduce drop-off by 20%",
            "Validate the new design with a second round of testing",
          ],
          artifacts: [
            { src: "/images/placeholder.png", alt: "Affinity map from research sessions", label: "Affinity Mapping", description: "Affinity mapping surfaced three recurring themes across 12 user interviews. Each cluster represented a distinct pain point in the existing flow." },
            { src: "/images/placeholder.png", alt: "User journey map", label: "Journey Map", description: "A detailed journey map traced the emotional arc of users through the checkout process, highlighting moments of confusion and abandonment." },
            { src: "/images/placeholder.png", alt: "Prototype iteration", label: "Prototype Iterations", description: "Three rounds of lo-fi prototyping narrowed the solution space before committing to high-fidelity designs." },
          ],
          outcome: [
            { src: "/images/placeholder.png", alt: "Before and after flow comparison", caption: "Checkout flow — before vs. after" },
          ],
          whatsNext: "Monitoring conversion metrics post-launch. Planning a follow-up study to evaluate the impact of the redesigned onboarding sequence.",
        },
      },
      { id: "t3", title: "Placeholder Project Gamma", description: "Front-end architecture and component systems.", date: "September 20, 2023", tags: ["React", "Architecture", "Design Systems"] },
      { id: "t4", title: "Placeholder Project Delta", description: "Cross-functional collaboration and delivery.", date: "November 5, 2022", tags: ["Collaboration", "Agile", "Product"] },
      { id: "t5", title: "Placeholder Project Epsilon", description: "Performance optimization and tooling.", date: "July 12, 2024", tags: ["Performance", "Vite", "Lighthouse"] },
    ],
  },
  {
    id: "direction",
    label: "\uD83D\uDD2E Direction",
    tagline: "Where I'm aiming and what I'm building toward.",
    items: [
      {
        id: "d1",
        title: "Placeholder Project Zeta",
        description: "Vision and strategy — case study.",
        date: "June 22, 2024",
        tags: ["Strategy", "Product Vision", "Roadmap"],
        content: {
          context: "Tasked with defining the product direction for the next 18 months. This meant synthesizing business goals, user needs, and technical constraints into a coherent strategy.",
          goals: [
            "Create a product vision document aligned with company OKRs",
            "Define a phased roadmap with clear milestones",
            "Secure stakeholder buy-in across engineering, design, and business",
          ],
          artifacts: [
            { src: "/images/placeholder.png", alt: "Roadmap timeline", label: "Phased Roadmap", description: "The roadmap broke 18 months into three phases, each with defined outcomes and success metrics." },
            { src: "/images/placeholder.png", alt: "Stakeholder alignment matrix", label: "Alignment Matrix", description: "A stakeholder map tracked buy-in across 8 teams, surfacing blockers early and keeping momentum through monthly check-ins." },
          ],
          outcome: [
            { src: "/images/placeholder.png", alt: "Strategy presentation", caption: "Strategy deck — executive summary" },
          ],
          whatsNext: "Phase 1 is complete. Preparing the retrospective and adjusting Phase 2 scope based on learnings.",
        },
      },
      { id: "d2", title: "Placeholder Project Eta", description: "North star work and roadmap.", date: "October 3, 2023", tags: ["North Star", "Metrics", "Vision"] },
      { id: "d3", title: "Placeholder Project Theta", description: "Design system evolution and scale.", date: "April 18, 2024", tags: ["Design Systems", "Tokens", "Scale"] },
      { id: "d4", title: "Placeholder Project Iota", description: "Product thinking and user advocacy.", date: "December 1, 2022", tags: ["Product Thinking", "User Advocacy"] },
      { id: "d5", title: "Placeholder Project Kappa", description: "Leadership and mentorship in practice.", date: "February 28, 2025", tags: ["Leadership", "Mentorship", "Culture"] },
    ],
  },
  {
    id: "sidequests",
    label: "\uD83C\uDFB2 Side quests",
    tagline: "Tinkering, learning, and following curiosity.",
    items: [
      { id: "s1", title: "Placeholder Project Lambda", description: "Experiments and prototypes.", date: "February 12, 2025", tags: ["Prototyping", "R&D", "React"] },
      { id: "s2", title: "Placeholder Project Mu", description: "Play and exploration.", date: "August 19, 2024", tags: ["Creative Coding", "Canvas", "WebGL"] },
      { id: "s3", title: "Placeholder Project Nu", description: "Creative coding and generative art.", date: "May 7, 2023", tags: ["Generative Art", "p5.js", "GLSL"] },
      { id: "s4", title: "Placeholder Project Xi", description: "Open source contributions and tooling.", date: "January 30, 2024", tags: ["Open Source", "CLI", "Node.js"] },
      { id: "s5", title: "Placeholder Project Omicron", description: "Hardware tinkering and IoT builds.", date: "October 14, 2022", tags: ["IoT", "Arduino", "Raspberry Pi"] },
    ],
  },
];

export function getSectionForItem(itemId) {
  for (const section of workSections) {
    if (section.items.some((item) => item.id === itemId)) {
      return section.label;
    }
  }
  return null;
}
