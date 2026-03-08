#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const http = require('http');

const STATE_DIR = path.resolve(__dirname, '..', 'data');
const STATE_FILE = path.join(STATE_DIR, 'workspace-state.json');
const PORT = process.env.PORT || 5001;

const emptyState = JSON.stringify({ openTabIds: [], activeTabId: null, leftPanelWidth: 380 }, null, 2);

// Write empty state directly to the file (creates data/ if needed)
try {
  if (!fs.existsSync(STATE_DIR)) {
    fs.mkdirSync(STATE_DIR, { recursive: true });
  }
  fs.writeFileSync(STATE_FILE, emptyState, 'utf-8');
  console.log('State file reset to empty.');
} catch (err) {
  console.error('Failed to write state file:', err.message);
}

// Also PUT to the running server so in-memory state is consistent
const req = http.request(
  { hostname: 'localhost', port: PORT, path: '/api/workspace-state', method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(emptyState) },
    timeout: 2000 },
  (res) => {
    if (res.statusCode === 200) {
      console.log('Server API reset to empty state.');
    }
    console.log('\nDone. Close the browser tab and reopen (or hard-refresh) to see the reset.');
    console.log('(A normal refresh triggers beforeunload which writes the old state back.)');
  },
);

req.on('error', () => {
  console.log('Server not running — file was still reset.');
  console.log('\nDone. Start the server and open the app to see the reset.');
});

req.write(emptyState);
req.end();
