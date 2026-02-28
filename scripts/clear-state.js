#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const http = require('http');

const STATE_FILE = path.resolve(__dirname, '..', 'data', 'workspace-state.json');
const PORT = process.env.PORT || 5001;

// 1. Clear server-side file
let fileCleared = false;
try {
  if (fs.existsSync(STATE_FILE)) {
    fs.unlinkSync(STATE_FILE);
    console.log('Server state cleared:', STATE_FILE);
    fileCleared = true;
  } else {
    console.log('No server state file found.');
  }
} catch (err) {
  console.error('Failed to clear server state file:', err.message);
}

// 2. Reset via API so the server returns empty state on next load,
//    which causes the client to overwrite localStorage with the empty state.
const emptyState = JSON.stringify({ openTabIds: [], activeTabId: null, leftPanelWidth: 280 });

const req = http.request(
  { hostname: 'localhost', port: PORT, path: '/api/workspace-state', method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(emptyState) },
    timeout: 2000 },
  (res) => {
    if (res.statusCode === 200) {
      console.log('Server API reset to empty state.');
    } else {
      console.log(`Server API returned ${res.statusCode}. localStorage will be cleared on next page load.`);
    }
    printDone();
  },
);

req.on('error', () => {
  console.log('Server not running. Browser localStorage still has state.');
  console.log('  -> Reload the app with the server running, or clear manually:');
  console.log("     localStorage.removeItem('workspace-state')");
  printDone();
});

req.write(emptyState);
req.end();

function printDone() {
  console.log('\nDone. Refresh the browser to see the reset.');
}
