const assert = require('node:assert/strict');
const { test } = require('node:test');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

// vgpu pins a vulnerable MCP dependency for its optional CLI. Keep the scoped
// patched override compatible with its actual handler, even though the website
// never imports or exposes that server.
test('patched MCP dependency remains compatible with vgpu HTTP tooling', async () => {
  const entry = pathToFileURL(path.join(__dirname, '../client/node_modules/vgpu/dist/cli/lib/mcp/http.js'));
  const { createVgpuMcpHttpHandler } = await import(entry.href);
  const handler = createVgpuMcpHttpHandler({
    version: 'compatibility-test',
    docs: { execute: () => ({ results: ['matched-document'] }) },
    examples: { execute: () => ({ examples: [] }) },
  });
  try {
    const response = await handler.fetch(new Request('https://tooling.example/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        'MCP-Protocol-Version': '2026-07-28',
        'Mcp-Method': 'tools/call',
        'Mcp-Name': 'docs',
      },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'tools/call',
        params: {
          name: 'docs', arguments: { operation: 'search', query: 'crystal' },
          _meta: {
            'io.modelcontextprotocol/protocolVersion': '2026-07-28',
            'io.modelcontextprotocol/clientCapabilities': {},
            'io.modelcontextprotocol/clientInfo': { name: 'compatibility-test', version: '1.0.0' },
          },
        },
      }),
    }));
    const body = await response.text();
    assert.equal(response.status, 200, body);
    assert.match(body, /matched-document/);
    assert.doesNotMatch(body, /ALREADY_CONNECTED|isError.*true/);
  } finally {
    await handler.close();
  }
});
