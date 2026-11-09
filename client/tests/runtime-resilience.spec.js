import { test, expect } from '@playwright/test';

async function expectUsableShell(page) {
  await expect(page.getByRole('heading', { name: 'Jordan L. Wright' })).toBeVisible();
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.locator('.command-palette')).toBeVisible();
  await expect(page.getByPlaceholder('Search work items and actions...')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('.command-palette')).not.toBeVisible();
}

async function trackWebGL(page) {
  await page.addInitScript(() => {
    // Force the supported WebGL2 fallback for deterministic instrumentation even
    // on machines where a hardware WebGPU adapter is available.
    Object.defineProperty(navigator, 'gpu', { value: undefined, configurable: true });
    window.__gpuResources = { createTexture: 0, deleteTexture: 0, createFramebuffer: 0, deleteFramebuffer: 0, draws: 0 };
    for (const name of ['createTexture', 'deleteTexture', 'createFramebuffer', 'deleteFramebuffer']) {
      const original = WebGL2RenderingContext.prototype[name];
      WebGL2RenderingContext.prototype[name] = function (...args) {
        window.__gpuResources[name]++;
        return original.apply(this, args);
      };
    }
    for (const name of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced']) {
      const original = WebGL2RenderingContext.prototype[name];
      WebGL2RenderingContext.prototype[name] = function (...args) {
        window.__gpuResources.draws++;
        return original.apply(this, args);
      };
    }
  });
}

async function outstandingResources(page) {
  return page.evaluate(() => ({
    textures: window.__gpuResources.createTexture - window.__gpuResources.deleteTexture,
    framebuffers: window.__gpuResources.createFramebuffer - window.__gpuResources.deleteFramebuffer,
  }));
}

async function trackSceneSubmissions(page) {
  await page.addInitScript(() => {
    window.__sceneSubmissions = 0;
    window.__sceneResources = null;
    window.__ALCHEMY_PROFILE__ = {
      frame() {}, visibility() {}, sequence() {},
      render() {
        window.__sceneSubmissions++;
        const previous = window.__sceneResources;
        const theme = document.documentElement.getAttribute('data-theme');
        window.__sceneResources = {
          theme,
          themeSubmissions: previous?.theme === theme ? previous.themeSubmissions + 1 : 1,
        };
      },
    };
  });
}

async function sceneResources(page, { theme, timeout = 5000 } = {}) {
  let sample;
  // Read the theme, full-scene readiness and resource counts together. Separate
  // browser round trips are expensive while CI is software-rendering the scene.
  await expect.poll(async () => {
    sample = await page.evaluate(() => ({
      ...window.__sceneResources,
      textures: window.__gpuResources.createTexture - window.__gpuResources.deleteTexture,
      framebuffers: window.__gpuResources.createFramebuffer - window.__gpuResources.deleteFramebuffer,
      initialized: (window.__sceneResources?.themeSubmissions ?? 0) >= 2,
      unavailable: !!document.querySelector('[data-symbol-fallback="unavailable"]'),
    }));
    return sample;
  }, { timeout }).toMatchObject({ initialized: true, unavailable: false, ...(theme ? { theme } : {}) });
  return sample;
}

async function waitForSceneSubmissions(page, previous = 0, timeout = 5000) {
  // PMREM generation also makes WebGL draw calls. Wait for the actual scene
  // and bloom pipeline to allocate its targets before comparing resources.
  await expect.poll(() => page.evaluate(() => window.__sceneSubmissions), { timeout }).toBeGreaterThanOrEqual(previous + 2);
  await expect(page.locator('[data-symbol-fallback="unavailable"]')).toHaveCount(0);
}

test('graphics initialization failure preserves navigation and a static symbol', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'gpu', { value: undefined, configurable: true });
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
      if (['webgl', 'webgl2', 'experimental-webgl'].includes(kind)) return null;
      return getContext.call(this, kind, ...args);
    };
  });
  await page.goto('/');
  await expect(page.locator('[data-symbol-fallback="unavailable"]')).toBeVisible();
  await expectUsableShell(page);
});

test('a failed graphics chunk preserves the shell', async ({ page }) => {
  await page.route(/\/assets\/(MorphingSolid|Polyhedron)-[^/]+\.js$/, route => route.abort());
  await page.goto('/');
  await expect(page.locator('[data-symbol-fallback="unavailable"]')).toBeVisible();
  await expectUsableShell(page);
});

test('reduced motion avoids mounting or downloading the GPU scene', async ({ page }) => {
  const graphicsRequests = [];
  page.on('request', request => {
    if (/\/assets\/(MorphingSolid|Polyhedron)-/.test(request.url())) graphicsRequests.push(request.url());
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('[data-symbol-fallback="reduced-motion"]')).toBeVisible();
  await expect(page.locator('.symbolContainer canvas')).toHaveCount(0);
  expect(graphicsRequests).toEqual([]);
  await expectUsableShell(page);
});

for (const [name, saved] of Object.entries({
  missingFields: {},
  nullState: null,
  wrongTypes: { openTabIds: 42, splitView: { enabled: true, leftPaneTabIds: 'broken' } },
})) {
  test(`malformed workspace storage recovers: ${name}`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(value => {
      localStorage.setItem('workspace-state', JSON.stringify(value));
      localStorage.setItem('theme', 'invalid-theme');
    }, saved);
    await page.goto('/');
    await expectUsableShell(page);
    await expect(page.locator('html')).toHaveAttribute('data-theme', /^(light|dark)$/);
    expect(errors).toEqual([]);
  });
}

test('denied storage keeps the page and theme toggle usable', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    for (const method of ['getItem', 'setItem']) {
      Storage.prototype[method] = () => { throw new DOMException('Storage denied', 'SecurityError'); };
    }
  });
  await page.goto('/');
  await expectUsableShell(page);
  const initialTheme = await page.locator('html').getAttribute('data-theme');
  await page.getByRole('button', { name: /Switch to .* mode/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', initialTheme === 'dark' ? 'light' : 'dark');
  expect(errors).toEqual([]);
});

test('theme changes do not grow outstanding GPU resources', async ({ page }, testInfo) => {
  await trackWebGL(page);
  await trackSceneSubmissions(page);
  // Isolate graph ownership at the quality floor; resolution adaptation is
  // tested separately and can legitimately replace backend render targets.
  await page.addInitScript(() => Object.defineProperty(window, 'devicePixelRatio', { value: 0.75 }));
  await page.goto('/');
  await expect(page.locator('.symbolContainer')).toHaveAttribute('data-render-state', 'active');
  const baseline = await sceneResources(page, { timeout: 30_000 });
  const samples = [baseline];
  let theme = baseline.theme;
  for (let i = 0; i < 6; i++) {
    await page.getByRole('button', { name: /Switch to .* mode/ }).click();
    theme = theme === 'dark' ? 'light' : 'dark';
    const after = await sceneResources(page, { theme });
    samples.push(after);
    // Allow small backend bookkeeping changes, but reject the former 13 leaked
    // textures and framebuffers per theme switch, including intermediate themes.
    expect(after.textures).toBeLessThanOrEqual(baseline.textures + 2);
    expect(after.framebuffers).toBeLessThanOrEqual(baseline.framebuffers + 2);
  }
  await testInfo.attach('theme-resources', { body: JSON.stringify(samples), contentType: 'application/json' });
  await expectUsableShell(page);
});

test('moving the symbol offscreen pauses draws and resumes the same canvas', async ({ page }) => {
  await trackWebGL(page);
  await page.goto('/');
  const symbol = page.locator('.symbolContainer');
  await expect(symbol).toHaveAttribute('data-render-state', 'active');
  await expect.poll(() => page.evaluate(() => window.__gpuResources.draws), { timeout: 30_000 }).toBeGreaterThan(20);
  await page.locator('.symbolContainer canvas').evaluate(canvas => { canvas.dataset.originalCanvas = 'true'; });
  await symbol.evaluate(element => { element.style.transform = 'translateY(-200vh)'; });
  await expect(symbol).toHaveAttribute('data-render-state', 'paused');
  // Let an already scheduled frame finish before measuring the idle interval.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const paused = await page.evaluate(() => window.__gpuResources.draws);
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => window.__gpuResources.draws)).toBe(paused);
  await symbol.evaluate(element => { element.style.transform = ''; });
  await expect(symbol).toHaveAttribute('data-render-state', 'active');
  await expect.poll(() => page.evaluate(() => window.__gpuResources.draws)).toBeGreaterThan(paused);
  await expect(page.locator('.symbolContainer canvas')).toHaveAttribute('data-original-canvas', 'true');
});


test('repeated canvas resizes release retired WebGL render targets', async ({ page }) => {
  await trackWebGL(page);
  await trackSceneSubmissions(page);
  await page.addInitScript(() => Object.defineProperty(window, 'devicePixelRatio', { value: 0.75 }));
  await page.goto('/');
  await waitForSceneSubmissions(page, 0, 30_000);
  const baseline = await outstandingResources(page);
  for (let i = 0; i < 6; i++) {
    const width = i % 2 ? 400 : 500;
    await page.setViewportSize({ width, height: 800 });
    await expect(page.locator('.symbolContainer canvas')).toHaveAttribute('width', String(width * 0.75));
    const previous = await page.evaluate(() => window.__sceneSubmissions);
    await waitForSceneSubmissions(page, previous);
  }
  const after = await outstandingResources(page);
  expect(after.textures).toBeLessThanOrEqual(baseline.textures + 2);
  expect(after.framebuffers).toBeLessThanOrEqual(baseline.framebuffers + 2);
});


test('a failed geometry asset preserves navigation and the static symbol', async ({ page }) => {
  await page.route(/\/assets\/morph-transitions-[^/]+\.bin$/, route => route.abort());
  await page.goto('/');
  await expect(page.locator('[data-symbol-fallback="unavailable"]')).toBeVisible();
  await expectUsableShell(page);
});

test('shader and geometry clocks stay frozen across an offscreen pause', async ({ page }) => {
  await trackWebGL(page);
  await page.addInitScript(() => {
    Object.defineProperty(window, 'devicePixelRatio', { value: 0.75 });
    window.__clockFrames = [];
    window.__ALCHEMY_PROFILE__ = {
      frame: frame => { if (window.__clockFrames.length < 1000) window.__clockFrames.push(frame); },
      render() {}, visibility() {}, sequence() {},
    };
  });
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => window.__clockFrames.at(-1)?.shaderTime ?? 0), { timeout: 30_000 }).toBeGreaterThan(0.1);
  const symbol = page.locator('.symbolContainer');
  await symbol.evaluate(element => { element.style.transform = 'translateY(-200vh)'; });
  await expect(symbol).toHaveAttribute('data-render-state', 'paused');
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const before = await page.evaluate(() => window.__clockFrames.at(-1));
  await page.waitForTimeout(300);
  const paused = await page.evaluate(() => window.__clockFrames.at(-1));
  expect(paused.shaderTime).toBe(before.shaderTime);
  expect(paused.simulationMs).toBe(before.simulationMs);
  await page.evaluate(() => { window.__clockFrames = []; });
  await symbol.evaluate(element => { element.style.transform = ''; });
  await expect.poll(() => page.evaluate(() => window.__clockFrames.length)).toBeGreaterThan(1);
  const resumed = await page.evaluate(() => window.__clockFrames[0]);
  expect(resumed.shaderTime).toBe(before.shaderTime);
  expect(resumed.simulationMs).toBe(before.simulationMs);
});


test('the default graphics backend animates without a renderer error', async ({ page, browserName }, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    window.__lastSceneFrame = null;
    window.__ALCHEMY_PROFILE__ = {
      frame: frame => { window.__lastSceneFrame = frame; },
      render() {}, visibility() {}, sequence() {},
    };
  });
  await page.goto('/');
  await expect(page.locator('.symbolContainer canvas')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__lastSceneFrame?.shaderTime ?? 0), { timeout: 30_000 }).toBeGreaterThan(0.1);
  const frame = await page.evaluate(() => window.__lastSceneFrame);
  expect(['webgpu', 'webgl2']).toContain(frame.backend);
  expect(frame.geometryMode).toBe('compiled');
  await expect(page.locator('[data-symbol-fallback="unavailable"]')).toHaveCount(0);
  expect(errors).toEqual([]);
  await testInfo.attach('render-backend', { body: JSON.stringify({ engine: browserName, backend: frame.backend, dpr: frame.dpr }), contentType: 'application/json' });
});
