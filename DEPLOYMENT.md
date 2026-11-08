# Production delivery

Use Node 24 LTS at version 24.15 or later (`nvm use`) and npm 11. CI installs both lockfiles with `npm ci`, runs functional/security checks, builds the production client, and runs the graphics resilience and bundle-growth gates. The deployment build also uses frozen installs and runs unit/server/bundle checks.

Before the next production release, set `PUBLIC_ORIGIN` to the canonical HTTPS origin, for example `https://portfolio.example.com`, without a path. Production startup intentionally fails when this is missing or invalid. Redirects always use this configured origin, including when a request supplies a hostile Host header.

Set `TRUST_PROXY` to the actual proxy addresses or CIDRs (comma separated). A fixed hop count such as `1` is supported only when every request follows that protected topology. For Heroku, use `TRUST_PROXY=1` only with the dyno reachable exclusively through the Heroku router; the router must overwrite forwarding headers. Do not expose the origin through a shorter path or set blanket `true`. By default, forwarded headers are not trusted. An HTTP origin behind TLS termination needs this setting to avoid repeated HTTPS redirects.

The Express server supplies CSP, anti-framing, MIME-sniffing, referrer, and production HSTS headers. Script sources are restricted to the same origin. Inline styles remain permitted for React and Three; Google Fonts styles/fonts and raw.githubusercontent.com portfolio images have explicit permissions. Keep these policies synchronized with any edge/CDN policy and future content hosts.

Serve the built `client/dist` artifact. Hashed assets use one-year immutable caching; HTML requires revalidation, and unversioned files must revalidate. Missing assets return 404 rather than the SPA shell. Express negotiates Brotli/gzip for compressible responses. Put a CDN in front for shared caching and scalable compression, and keep HTML and hashed-asset cache rules distinct.

The client dependency override selects patched MCP server 2.3.0 only under vgpu 0.6.0. The application uses vgpu's shader/browser exports and does not serve its MCP endpoints. A functional tooling test exercises vgpu's bundled handler against this override; remove the override after upstream adopts a patched release.

Performance gates catch regressions; headless software rendering does not certify hardware frame rates. Validate the intended device/browser matrix before claiming a zero-jank release.


Three 0.187.0 has a WebGL fallback defect that abandons framebuffer handles when render targets resize. The client pins that exact release and applies a guarded, idempotent postinstall/build compatibility fix to its source and exported bundles, using the public texture.renderTarget ownership. The script fails on unexpected versions or source so an upgrade requires explicit revalidation. CI verifies stable outstanding textures/framebuffers during repeated canvas resizes. Remove the compatibility patch when adopting an upstream release that fixes this path.


## Animation profiling

Run `npm run profile:animation --prefix client -- --enforce` on a machine with a visible browser and hardware WebGPU. The command builds production output, starts the real application server locally, and captures a complete six-transition cycle with theme, search, and orbit interactions. The default viewport is 1440 by 1000 with device scale factor 2, subject to the renderer's adaptive DPR ceiling. Completion is based on observed interior and endpoint samples for every transition, not an assumed wall-clock duration. The normal sequence takes about 49.95 seconds of simulation time.

The default 60 Hz gate requires warm-frame p95 at or below 18.33 ms, p99 at or below 33.33 ms, at most 1% estimated missed refreshes, and no warm main-thread tasks of 50 ms or more. It also requires complete coverage and verified non-software WebGPU metadata. `--hz 120` checks a stricter target; the application's adaptive quality policy currently prioritizes a 60 Hz floor. The report includes a separate assessment at the calibrated display cadence. One isolated scheduling stall does not lower quality, but sustained slow means or repeated slow tails do. Reduced motion and deliberate pauses are excluded from continuous animation work.

Reports and raw bounded samples are written under `client/performance-results/`, which is ignored by Git. `--output` selects another report path; `--no-build` profiles an already-built artifact. `--headless` is useful for software diagnostics and will never satisfy the hardware release gate. CPU scene-update and render-submission timings are not GPU execution time, requestAnimationFrame cadence does not prove screen presentation, and synthetic EventTiming entries are not field INP.

The reference and optimized Apple M3 Max captures plus the paired CPU benchmark are retained in `client/performance/`. They establish results for this Mac and viewport only. Before a wider zero-jank release claim, run the same workflow on the supported desktop/browser set and validate actual Android Chrome and iOS Safari devices; desktop mobile-size viewports do not replace mobile hardware testing.

## Compiled morph geometry

The fixed transition sequence uses lossless Float64 coefficient tables generated ahead of rendering. The binary is fetched once through the existing lazy graphics boundary, decoded into bounded typed tables, compressed by the server, and included in runtime payload limits alongside JavaScript. Scene and shader effects share a pausable simulation clock so hidden time does not skip their animation phases.

When changing solids or morph equations, run `npm run generate:morph --prefix client`, review the generated artifact, then run client tests. `npm run check:morph --prefix client` and every production build reject stale tables. `npm run bench:morph --prefix client` compares reference and compiled geometry costs across all six transitions; equivalence tests cover continuous positions, topology, and winding. `npm run test:profile --prefix client` verifies the statistics and evidence qualification rules without needing a GPU.
