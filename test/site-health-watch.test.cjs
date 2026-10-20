// Node's built‑in test runner
const { test, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const { once } = require('node:events');

/**
 * Starts a tiny HTTP server that serves three pages:
 *   /            -> links to /page1.html, /page2.html, /missing.html
 *   /page1.html  -> simple HTML
 *   /page2.html  -> simple HTML
 *   /missing.html -> 404 (no handler)
 */
function startTestServer() {
  const server = http.createServer((req, res) => {
    if (req.url === '/' || req.url === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <html><body>
          <a href="/page1.html">Page 1</a>
          <a href="/page2.html">Page 2</a>
          <a href="/missing.html">Missing</a>
        </body></html>`);
    } else if (req.url === '/page1.html') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html><body>Page 1</body></html>');
    } else if (req.url === '/page2.html') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html><body>Page 2</body></html>');
    } else {
      // any other path -> 404
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });
}

test('site‑health watcher generates a report with broken‑link detection', async (t) => {
  const { server, port } = await startTestServer();
  const baseUrl = `http://127.0.0.1:${port}/`;

  // Dynamically import the ES module from a CommonJS test file
  const { run } = await import('../scripts/site-health-watch.mjs');

  const report = await run([baseUrl]);

  // Basic shape checks
  assert.ok(report.generatedAt);
  assert.ok(Array.isArray(report.pages));
  assert.ok(Array.isArray(report.links));

  // Expect exactly one page entry (the base URL we supplied)
  assert.strictEqual(report.pages.length, 1);
  const pageEntry = report.pages[0];
  assert.strictEqual(pageEntry.url, baseUrl);
  assert.strictEqual(pageEntry.status, 200);

  // Expect three links (page1, page2, missing)
  const hrefs = report.links.map((l) => l.href).sort();
  const expected = [
    `${baseUrl}page1.html`,
    `${baseUrl}page2.html`,
    `${baseUrl}missing.html`,
  ].sort();
  assert.deepStrictEqual(hrefs, expected);

  // Verify statuses
  const linkMap = {};
  for (const l of report.links) {
    linkMap[l.href] = l;
  }
  assert.strictEqual(linkMap[`${baseUrl}page1.html`].status, 200);
  assert.strictEqual(linkMap[`${baseUrl}page2.html`].status, 200);
  assert.strictEqual(linkMap[`${baseUrl}missing.html`].status, 404);
  assert.ok(linkMap[`${baseUrl}missing.html`].error);

  // Clean up server
  server.close();
  await once(server, 'close');
});
