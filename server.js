const express = require('express');
const compression = require('compression');
const path = require('node:path');
const { constants } = require('node:zlib');

const YEAR_SECONDS = 365 * 24 * 60 * 60;
const HASHED_ASSET = /-[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9]+$/;
const EMBEDDABLE_PREFIX = '/work/';

function getConfiguration(env) {
  const production = env.NODE_ENV === 'production';
  let publicOrigin = null;
  if (env.PUBLIC_ORIGIN) {
    const url = new URL(env.PUBLIC_ORIGIN);
    if (url.username || url.password || url.pathname !== '/' || url.search || url.hash ||
        !['http:', 'https:'].includes(url.protocol) || (production && url.protocol !== 'https:')) {
      throw new Error('PUBLIC_ORIGIN must be an HTTPS origin without a path or credentials in production.');
    }
    publicOrigin = url.origin;
  }
  if (production && !publicOrigin) {
    throw new Error('Set PUBLIC_ORIGIN to the canonical HTTPS origin before starting in production.');
  }

  let trustProxy = false;
  if (env.TRUST_PROXY && env.TRUST_PROXY !== 'false' && env.TRUST_PROXY !== '0') {
    if (/^[1-9]\d*$/.test(env.TRUST_PROXY)) {
      trustProxy = Number(env.TRUST_PROXY);
      if (!Number.isSafeInteger(trustProxy)) throw new Error('Invalid TRUST_PROXY hop count.');
    } else {
      if (env.TRUST_PROXY === 'true') throw new Error('Use trusted proxy addresses/CIDRs or a fixed protected hop count.');
      trustProxy = env.TRUST_PROXY.split(',').map((value) => value.trim());
      if (trustProxy.some((value) => !value)) throw new Error('Invalid TRUST_PROXY address list.');
    }
  }
  return { production, publicOrigin, trustProxy };
}

function securityHeaders(production) {
  const directives = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://raw.githubusercontent.com",
    "connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
    "manifest-src 'self'",
  ];
  if (production) directives.push('upgrade-insecure-requests');
  const policy = directives.join('; ');
  // Self-contained work artifacts (e.g. HTML slide decks) are embedded by the
  // portfolio itself; only this site may frame them. Everything else stays unframeable.
  const embeddablePolicy = policy.replace("frame-ancestors 'none'", "frame-ancestors 'self'");
  return (req, res, next) => {
    const embeddable = req.path.startsWith(EMBEDDABLE_PREFIX);
    res.set({
      'Content-Security-Policy': embeddable ? embeddablePolicy : policy,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': embeddable ? 'SAMEORIGIN' : 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    });
    if (production) res.set('Strict-Transport-Security', 'max-age=31536000');
    next();
  };
}

function setAssetCache(res, filePath) {
  const immutable = HASHED_ASSET.test(path.basename(filePath));
  res.setHeader('Cache-Control', immutable
    ? `public, max-age=${YEAR_SECONDS}, immutable`
    : 'public, max-age=0, must-revalidate');
}

function createApp({ env = process.env, distDir = path.join(__dirname, 'client/dist') } = {}) {
  const { production, publicOrigin, trustProxy } = getConfiguration(env);
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', trustProxy);
  app.use(securityHeaders(production));

  if (production) {
    const canonicalHost = new URL(publicOrigin).host;
    app.use((req, res, next) => {
      // Only Express's explicit trust policy may accept forwarded protocol headers.
      // Redirect destinations never depend on Host or X-Forwarded-Host.
      if (!req.secure || req.get('host')?.toLowerCase() !== canonicalHost) {
        if (!req.originalUrl.startsWith('/')) return res.sendStatus(400);
        return res.redirect(308, `${publicOrigin}${req.originalUrl}`);
      }
      next();
    });
  }

  app.use(compression({
    // Lossless coefficient tables are compressible despite octet-stream MIME.
    filter: (req, res) => /^\/assets\/morph-transitions-[\w-]+\.bin$/.test(req.path) || compression.filter(req, res),
    brotli: { params: { [constants.BROTLI_PARAM_QUALITY]: 4 } },
  }));
  app.use('/assets', express.static(path.join(distDir, 'assets'), {
    index: false, redirect: false, fallthrough: false, setHeaders: setAssetCache,
  }));
  app.use(express.static(distDir, {
    index: false, redirect: false,
    setHeaders: (res) => res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate'),
  }));
  app.get('/{*splat}', (req, res, next) => {
    // Missing chunks/images must be 404s, not a successful HTML response.
    if (path.extname(req.path) || !req.accepts('html')) return res.sendStatus(404);
    res.set('Cache-Control', 'no-cache');
    res.sendFile(path.join(distDir, 'index.html'), (error) => {
      if (error) next(error);
    });
  });
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status = error.status === 404 ? 404 : error.status === 400 ? 400 : 500;
    res.status(status).type('text').send(status === 404 ? 'Not Found' : status === 400 ? 'Bad Request' : 'Internal Server Error');
  });
  return app;
}

if (require.main === module) {
  const port = process.env.PORT || 5001;
  createApp().listen(port, () => console.log(`Server listening on port ${port}`));
}

module.exports = { createApp };
