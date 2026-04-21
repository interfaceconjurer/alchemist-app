---
name: alchemy
description: >
  Transform a GitHub repo README into a portfolio piece for the alchemist-app.
  Use when the user types /alchemy followed by a GitHub repo URL.
  Also use when the user asks to "add a project to the portfolio", "turn this repo into a portfolio piece",
  or references adding work to the alchemist-app portfolio site.
---

# /alchemy — README to Portfolio

Transform a GitHub repository's README into a structured portfolio piece for the alchemist-app site.

## Portfolio site location

The alchemist-app lives at `/Users/j.wright/git-repos/alchemist-app`. Project data files go in `client/src/data/projects/<repo-name>.json`.

## How it works

### First pass — take your best shot

1. **Parse the GitHub URL** to extract `owner/repo`. Accept full URLs, shorthand `owner/repo`, or just a repo name (assume `interfaceconjurer` as the owner).

2. **Fetch the README** via `gh api repos/{owner}/{repo}/readme --jq '.content' | base64 -d`.

3. **Analyze the README** editorially. Don't dump — curate. Identify:
   - **The narrative**: What is this project? Why does it matter? Why did Jordan build it? → becomes `context`
   - **Goals**: What was he trying to achieve? → becomes `goals` (3-5 punchy bullets)
   - **Visual highlights**: Pick the 3-5 most impactful elements. Diagrams, screenshots, gallery images. → becomes `artifacts`
   - **Results/output**: Gallery, demo output, finished product shots → becomes `outcome`
   - **Forward-looking**: What's next, what could be built on this → becomes `whatsNext`
   - **Tech stack**: Extract from content, badges, language, tooling → becomes `tags`

4. **Ask the user** which section this belongs in:
   - `trenches` — "In the trenches" (day-to-day work, shipping, building)
   - `direction` — "Direction" (vision, strategy, north star work)
   - `sidequests` — "Side quests" (tinkering, experiments, curiosity-driven)

5. **Generate the project JSON** following the template at `.claude/skills/alchemy/template.json`. Read the template first — it defines the tone, structure, and level of detail expected. Write the result to `client/src/data/projects/<repo-name>.json`.

6. **Present what you created** — show the user the full JSON in a readable format so they can see what they got.

### Project JSON schema

**Reference template:** `.claude/skills/alchemy/template.json` — read this file before generating. It shows the expected structure, editorial tone, and artifact detail level.

```json
{
  "id": "<repo-name>",
  "section": "trenches|direction|sidequests",
  "title": "Human-readable project title",
  "description": "One-line description for the sidebar",
  "date": "Month Year or Year",
  "tags": ["Tech1", "Tech2"],
  "repo": "https://github.com/owner/repo",
  "content": {
    "context": "2-4 sentences. Editorial voice. What this project is and why it matters.",
    "goals": ["Goal 1", "Goal 2", "Goal 3"],
    "artifacts": [
      {
        "type": "image|diagram|code",
        "src": "https://raw.githubusercontent.com/owner/repo/main/path/to/image.png",
        "sources": { "light": "...Light.svg", "dark": "...Dark.svg" },
        "alt": "Descriptive alt text",
        "label": "Short label",
        "description": "What this artifact shows and why it matters"
      }
    ],
    "outcome": [
      {
        "src": "https://raw.githubusercontent.com/owner/repo/main/path/to/image.png",
        "alt": "Descriptive alt text",
        "caption": "What this shows"
      }
    ],
    "whatsNext": "1-2 sentences on what's next or how this could evolve."
  }
}
```

### Image URLs

Convert GitHub image references to raw.githubusercontent.com URLs:
- `docs/diagram.svg` → `https://raw.githubusercontent.com/{owner}/{repo}/main/docs/diagram.svg`
- Use `.svg` or `.png` — avoid `.webp` if an alternative exists (browser compat)

### Light/dark variant support

The portfolio site has a theme toggle (light/dark). When a README uses `<picture>` with `prefers-color-scheme` media queries or has paired light/dark image files (e.g., `Pipeline — Dark.svg` / `Pipeline — Light.svg`), include **both** variants using the `sources` field on the artifact:

```json
{
  "type": "diagram",
  "src": "https://raw.githubusercontent.com/.../Dark.svg",
  "sources": {
    "light": "https://raw.githubusercontent.com/.../Light.svg",
    "dark": "https://raw.githubusercontent.com/.../Dark.svg"
  }
}
```

- `sources` is optional. When present, the renderer picks the URL matching the current theme. When absent, it falls back to `src`.
- `src` should still be set to the dark variant as the default fallback.
- Look for `<picture><source media="(prefers-color-scheme: ...)">` patterns and paired filenames (Light/Dark, light/dark) in the README to detect variants.

### Artifact types

- `"image"` (default, can be omitted) — standard image with label and description, rendered in a 3-column grid
- `"diagram"` — full-width image, typically architectural/flow diagrams. Use for SVG diagrams, pipeline visualizations, and project logos/identity images that benefit from full-width display.
- `"code"` — styled code block. Uses `code` field instead of `src`. Use sparingly — only for the signature CLI interface or key API.

### Editorial guidelines

- **Context**: Write like a case study intro. What problem does this solve? Why did Jordan build it? Don't just restate the README's first paragraph — synthesize.
- **Goals**: Action-oriented. "Build a CLI that..." not "The CLI does..."
- **Artifacts**: Quality over quantity. 3-5 max. Pick the ones that tell the story visually. Write descriptions that ground the reader before they see the visual.
- **Outcome**: The gallery — what the finished thing looks like or produces.
- **What's Next**: Forward-looking but grounded. Not aspirational fluff.
- **Description**: One line for the sidebar. Punchy. Think subtitle, not abstract.
- **Tags**: 3-6 tech/domain tags. Capitalized properly.

## Follow-up riffing

After the first pass, the user may want to refine. When they give feedback:

1. Read the existing JSON file back from disk
2. Apply the requested changes
3. Write the updated file
4. Show what changed

Handle natural language directives like:
- "make the context shorter"
- "swap the first artifact for the pipeline diagram"
- "add a code artifact showing the CLI usage"
- "the outcome should focus on the gallery images"
- "change the section to side quests"
- "rewrite the goals to be more specific"

The file is the state. No need to track anything in memory — just read, modify, write, show.

## Cleanup

If the user says "remove this project" or "delete <project>", delete the JSON file from `client/src/data/projects/`.
