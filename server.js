const express = require('express');
const path = require('path');
const fs = require('fs');
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

const isDev = process.env.NODE_ENV !== 'production';
const PORT = process.env.PORT || 5001;
const STATE_DIR = path.resolve(__dirname, 'data');
const STATE_FILE = path.join(STATE_DIR, 'workspace-state.json');

// Multi-process to utilize all CPU cores.
if (!isDev && cluster.isMaster) {
  console.error(`Node cluster master ${process.pid} is running`);

  // Fork workers.
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.error(`Node cluster worker ${worker.process.pid} exited: code ${code}, signal ${signal}`);
  });

} else {
  const app = express();

  if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
      if (req.header('x-forwarded-proto') !== 'https')
        res.redirect(`https://${req.header('host')}${req.url}`)
      else
        next()
    })
  }

  app.use(express.json());

  // Priority serve any static files (Vite outputs to dist/ by default).
  app.use(express.static(path.resolve(__dirname, './client/dist')));

  // Answer API requests.
  app.get('/api', function (req, res) {
    res.set('Content-Type', 'application/json');
    res.send('{"message":"Hello from the custom server!"}');
  });

  // Workspace state persistence
  app.get('/api/workspace-state', function (req, res) {
    try {
      if (fs.existsSync(STATE_FILE)) {
        const raw = fs.readFileSync(STATE_FILE, 'utf-8');
        res.json(JSON.parse(raw));
      } else {
        res.json({ openTabIds: [], activeTabId: null, leftPanelWidth: 380 });
      }
    } catch (err) {
      console.error('Failed to read workspace state:', err);
      res.status(500).json({ error: 'Failed to read state' });
    }
  });

  function writeWorkspaceState(req, res) {
    const { openTabIds, activeTabId, leftPanelWidth } = req.body;

    if (!Array.isArray(openTabIds)) {
      return res.status(400).json({ error: 'openTabIds must be an array' });
    }

    const state = {
      openTabIds,
      activeTabId: activeTabId ?? null,
      leftPanelWidth: typeof leftPanelWidth === 'number' ? leftPanelWidth : 280,
    };

    try {
      if (!fs.existsSync(STATE_DIR)) {
        fs.mkdirSync(STATE_DIR, { recursive: true });
      }
      const tmpFile = STATE_FILE + '.tmp';
      fs.writeFileSync(tmpFile, JSON.stringify(state, null, 2), 'utf-8');
      fs.renameSync(tmpFile, STATE_FILE);
      res.json({ ok: true });
    } catch (err) {
      console.error('Failed to write workspace state:', err);
      res.status(500).json({ error: 'Failed to write state' });
    }
  }

  app.put('/api/workspace-state', writeWorkspaceState);
  app.post('/api/workspace-state', writeWorkspaceState);

  // All remaining requests return the React app, so it can handle routing.
  // Express 5 / path-to-regexp requires a named wildcard; '*' is no longer valid.
  app.get('/{*splat}', function (request, response) {
    response.sendFile(path.resolve(__dirname, './client/dist', 'index.html'));
  });

  app.listen(PORT, function () {
    console.error(`Node ${isDev ? 'dev server' : 'cluster worker ' + process.pid}: listening on port ${PORT}`);
  });
}



