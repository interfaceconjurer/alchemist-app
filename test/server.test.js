const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { gunzipSync, brotliDecompressSync } = require('node:zlib');
const { createApp } = require('../server');

let distDir;
const servers = [];
const geometry = Buffer.from('lossless-morph-coefficients '.repeat(3000));
const script = `export const content = "${'animation-content '.repeat(3000)}";`;

before(async () => {
  distDir = await fs.mkdtemp(path.join(os.tmpdir(), 'alchemist-server-test-'));
  await fs.mkdir(path.join(distDir, 'assets'));
  await Promise.all([
    fs.writeFile(path.join(distDir, 'index.html'), '<!doctype html><title>Portfolio shell</title>'),
    fs.writeFile(path.join(distDir, 'assets', 'scene-Ab12_cd9.js'), script),
    fs.writeFile(path.join(distDir, 'assets', 'morph-transitions-Ab12_cd9.bin'), geometry),
    fs.writeFile(path.join(distDir, 'manifest.json'), '{"name":"Portfolio"}'),
    fs.writeFile(path.join(distDir, 'logo-placeholder.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>'),
  ]);
});
after(async () => {
  await Promise.all(servers.map((server) => new Promise((resolve) => server.close(resolve))));
  await fs.rm(distDir, { recursive: true, force: true });
});

async function serve(env = {}) {
  const server = http.createServer(createApp({ env, distDir }));
  servers.push(server);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return (url, headers = {}) => new Promise((resolve, reject) => {
    const req = http.get({ host: '127.0.0.1', port: server.address().port, path: url, headers }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
  });
}

const production = {
  NODE_ENV: 'production',
  PUBLIC_ORIGIN: 'https://portfolio.example',
  TRUST_PROXY: 'loopback',
};

test('production requires a canonical HTTPS origin and rejects blanket proxy trust', () => {
  assert.throws(() => createApp({ env: { NODE_ENV: 'production' } }), /PUBLIC_ORIGIN/);
  for (const origin of ['http://portfolio.example', 'https://portfolio.example/work', 'https://user:pass@portfolio.example', 'https://portfolio.example?x=1']) {
    assert.throws(() => createApp({ env: { NODE_ENV: 'production', PUBLIC_ORIGIN: origin } }), /PUBLIC_ORIGIN/);
  }
  assert.throws(() => createApp({ env: { ...production, TRUST_PROXY: 'true' } }), /trusted proxy/);
});

test('security policy permits existing assets while forbidding external scripts and framing', async () => {
  const get = await serve();
  const response = await get('/');
  assert.equal(response.status, 200);
  const csp = response.headers['content-security-policy'];
  assert.match(csp, /script-src 'self'(?:;|$)/);
  assert.doesNotMatch(csp, /unsafe-eval/);
  assert.match(csp, /style-src[^;]+https:\/\/fonts.googleapis.com/);
  assert.match(csp, /font-src[^;]+https:\/\/fonts.gstatic.com/);
  assert.match(csp, /img-src[^;]+https:\/\/raw.githubusercontent.com/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.equal(response.headers['x-frame-options'], 'DENY');
  assert.equal(response.headers['x-content-type-options'], 'nosniff');
  assert.equal(response.headers['referrer-policy'], 'strict-origin-when-cross-origin');
  assert.equal(response.headers['cross-origin-opener-policy'], 'same-origin');
  assert.equal(response.headers['x-powered-by'], undefined);
  assert.equal(response.headers['strict-transport-security'], undefined);
});

test('trusted HTTPS requests work and receive HSTS without trusting forwarded hosts', async () => {
  const get = await serve(production);
  const response = await get('/', {
    Host: 'portfolio.example',
    'X-Forwarded-Proto': 'https',
    'X-Forwarded-Host': 'attacker.example',
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers['strict-transport-security'], 'max-age=31536000');
  assert.match(response.headers['content-security-policy'], /upgrade-insecure-requests/);
});

test('untrusted forwarded protocol cannot bypass HTTPS enforcement', async () => {
  const get = await serve({ ...production, TRUST_PROXY: 'false' });
  const response = await get('/work?tab=crystal', {
    Host: 'portfolio.example',
    'X-Forwarded-Proto': 'https',
  });
  assert.equal(response.status, 308);
  assert.equal(response.headers.location, 'https://portfolio.example/work?tab=crystal');
});

test('host poisoning redirects only to the configured canonical origin', async () => {
  const get = await serve(production);
  for (const requestPath of ['/work?tab=crystal', '//attacker.example/work']) {
    const response = await get(requestPath, {
      Host: 'attacker.example',
      'X-Forwarded-Host': 'portfolio.example',
      'X-Forwarded-Proto': 'https',
    });
    assert.equal(response.status, 308);
    assert.equal(new URL(response.headers.location).origin, 'https://portfolio.example');
    assert.equal(response.headers.location, `https://portfolio.example${requestPath}`);
  }
});

test('hashed assets are immutable while HTML and unversioned files revalidate', async () => {
  const get = await serve();
  const asset = await get('/assets/scene-Ab12_cd9.js');
  assert.equal(asset.status, 200);
  assert.equal(asset.headers['cache-control'], 'public, max-age=31536000, immutable');
  assert.match(asset.headers['content-type'], /javascript/);
  assert.equal(asset.body.toString(), script);
  const html = await get('/');
  assert.equal(html.headers['cache-control'], 'no-cache');
  const manifest = await get('/manifest.json');
  assert.equal(manifest.headers['cache-control'], 'public, max-age=0, must-revalidate');
  const publicImage = await get('/logo-placeholder.svg');
  assert.equal(publicImage.headers['cache-control'], 'public, max-age=0, must-revalidate');
  const cached = await get('/assets/scene-Ab12_cd9.js', { 'If-None-Match': asset.headers.etag });
  assert.equal(cached.status, 304);
  assert.equal(cached.body.length, 0);
});

test('nested navigation receives the shell but missing assets and non-HTML routes remain 404s', async () => {
  const get = await serve();
  const navigation = await get('/projects/crystal', { Accept: 'text/html' });
  assert.equal(navigation.status, 200);
  assert.match(navigation.body.toString(), /Portfolio shell/);
  for (const url of ['/assets/missing.js', '/missing.png', '/favicon.ico']) {
    const response = await get(url, { Accept: 'text/html' });
    assert.equal(response.status, 404);
    assert.doesNotMatch(response.body.toString(), /Portfolio shell/);
  }
  assert.equal((await get('/api/missing', { Accept: 'application/json' })).status, 404);
});

test('large static JavaScript negotiates real Brotli and gzip responses', async () => {
  const get = await serve();
  for (const [encoding, decode] of [['br', brotliDecompressSync], ['gzip', gunzipSync]]) {
    const response = await get('/assets/scene-Ab12_cd9.js', { 'Accept-Encoding': encoding });
    assert.equal(response.status, 200);
    assert.equal(response.headers['content-encoding'], encoding);
    assert.match(response.headers.vary, /Accept-Encoding/i);
    assert.equal(decode(response.body).toString(), script);
    assert.ok(response.body.length < Buffer.byteLength(script) / 2);
  }
});


test('lossless geometry assets negotiate compression without changing their bytes', async () => {
  const get = await serve();
  for (const [encoding, decode] of [['br', brotliDecompressSync], ['gzip', gunzipSync]]) {
    const response = await get('/assets/morph-transitions-Ab12_cd9.bin', { 'Accept-Encoding': encoding });
    assert.equal(response.status, 200);
    assert.equal(response.headers['content-encoding'], encoding);
    assert.equal(response.headers['cache-control'], 'public, max-age=31536000, immutable');
    assert.deepEqual(decode(response.body), geometry);
  }
});
