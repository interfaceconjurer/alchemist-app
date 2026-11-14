# AGENTS.md

Jordan Wright's portfolio site (jordanwright.codes). It has a React 19 + Vite client with a WebGPU/Three.js "alchemy" crystal, served by a small hardened Express server. It deploys to Heroku.

## Layout

- `server.js`: Express server. Serves `client/dist` and sets the CSP/security headers, cache rules, and compression. Config comes from the `PUBLIC_ORIGIN` and `TRUST_PROXY` env vars.
- `test/`: server tests (`node --test`).
- `client/`: the Vite app (ESM, `"type": "module"`).
  - `src/data/projects/*.json`: portfolio work items. Each one is a JSON file that `components/workList/workList.js` loads with `import.meta.glob`.
  - `src/components/alchemySymbol/`: the crystal (React Three Fiber, vgpu WGSL shaders, morph tables, dormancy and render policy).
  - `src/components/space/`: the procedural backdrop, rendered in a module worker.
  - `src/featureFlags.js`: temporary layout flags (`SHOW_STAGE`, `SHOW_WORK_LIST`, `SHOW_TOP_BAR`). The e2e suites read the same values.
  - `public/work/<id>/`: self-contained embeddable artifacts such as slide decks. Only `/work/` may be framed, and only by this site.
  - `tests/`: Playwright specs. `scripts/`: bundle budget, profiling, and the Three patch.
  - `performance/`: retained profiling evidence. `performance-results/` is gitignored.
- `DEPLOYMENT.md`: the authoritative notes on delivery, security, performance gates, and compatibility. Read it before changing the server, graphics, or build.
- `.claude/skills/alchemy/`: the `/alchemy` skill that turns a GitHub README into a project JSON.

## Setup

Use Node 24 (`.nvmrc`, `>=24.15 <25`) and npm 11. Install both lockfiles:

```sh
npm ci
npm ci --prefix client --include=dev
```

## Commands

```sh
npm start                                  # serve built client/dist via Express
npm start --prefix client                  # Vite dev server on :5173
npm test                                   # server tests
npm test --prefix client -- --run          # Vitest unit tests (jsdom)
npm run test:profile --prefix client       # profiling statistics tests (no GPU)
npm run build --prefix client              # patch Three, check morph tables, vite build
npm run check:bundle --prefix client       # bundle-size budget
npm run test:e2e:compatibility --prefix client  # Playwright: Chromium, WebKit, Android/iPhone/iPad emulation
```

Playwright browsers: `npx --prefix client playwright install chromium webkit`.

CI (`.github/workflows/ci.yml`) runs npm audit (high), server and client tests, test:profile, a production build, and the bundle check on every pull request and `master` push. The e2e compatibility suite runs as five parallel jobs, one per browser or device. On pull requests it runs when code, styles, tests, the server, dependencies, the workflow, or `DEPLOYMENT.md` change, and it always runs on `master` and weekly. Before you call work done, run the relevant subset locally.

## Conventions

- Prettier config is in `.prettierrc`: 120 columns, 2 spaces, double quotes, semicolons, es5 trailing commas.
- Keep tests next to the code they cover (`*.test.js` / `*.test.jsx`).
- Commit messages are short, imperative, sentence case, with no prefix. For example: "Open artifacts in a full-screen viewer and show outcomes in a grid".
- The language is plain JavaScript/JSX. There is no TypeScript.

## Gotchas

- `three` is pinned to exactly `0.187.0`. `scripts/patch-three-webgl-disposal.mjs` patches it on postinstall and build, and it fails on any other version. Upgrading Three means revalidating, and removing the patch once upstream fixes the bug.
- Morph geometry tables are generated. After changing solids or morph equations, run `npm run generate:morph --prefix client` and review the output. Builds fail on stale tables (`check:morph`).
- The `vgpu` → `@modelcontextprotocol/server` override in `client/package.json` is deliberate. Don't drop it.
- New external hosts (images, fonts, embeds) must be added to the CSP in `server.js`. Images are currently allowed only from `raw.githubusercontent.com`.
- Production startup fails if `PUBLIC_ORIGIN` is missing or invalid. Never set `TRUST_PROXY=true`.
- Keep animation work off the main thread and within the performance gates described in `DEPLOYMENT.md`. Respect reduced motion.

## Adding a portfolio project

Add `client/src/data/projects/<id>.json`. Set `section` to `trenches`, `direction`, or `sidequests`. Follow the schema and editorial guidelines in `.claude/skills/alchemy/SKILL.md` and `template.json`. Artifact types are `image`, `diagram`, `code`, and `embed`.
