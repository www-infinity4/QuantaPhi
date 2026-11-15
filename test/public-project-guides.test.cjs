const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const test = require('node:test');

const guides = [
  { path: 'continuitybuilder', title: 'GPT Continuity Builder', bubbleId: 'continuity-builder-guide' },
  { path: 'avatarai', title: 'Avatar AI', bubbleId: 'avatar-ai-guide' },
];

test('the QuantaPhi gateway resolves both guide URLs and their directory forms to HTML', async (t) => {
  const { default: worker } = await import('../workers/quantaphi-site/worker.js');
  const upstreamUrls = [];
  t.mock.method(globalThis, 'fetch', async (request) => {
    upstreamUrls.push(new URL(request.url));
    return new Response(null, { headers: { 'Content-Type': 'text/plain' } });
  });

  for (const guide of guides) {
    for (const suffix of ['', '/', '/index.html']) {
      const url = 'https://quantaphi.org/' + guide.path + suffix;
      const result = await worker.fetch(new Request(url, { method: 'HEAD' }));
      const source = upstreamUrls.at(-1);
      assert.equal(result.status, 200, url);
      assert.match(result.headers.get('Content-Type'), /^text\/html\b/);
      assert.equal(source.hostname, 'raw.githubusercontent.com');
      assert.equal(source.pathname, '/www-infinity4/QuantaPhi/main/' + guide.path + '/index.html');
    }
  }
});

test('each public guide provides a complete prompt and the existing Bubbles embed', () => {
  for (const guide of guides) {
    const html = readFileSync(guide.path + '/index.html', 'utf8');
    const prompt = html.match(/<textarea[^>]*id="guide-prompt"[^>]*>([\s\S]+?)<\/textarea>/)?.[1] ?? '';
    assert.ok(html.includes('<title>' + guide.title + ' · QuantaPhi</title>'));
    assert.ok(html.includes('href="https://quantaphi.org/' + guide.path + '"'));
    assert.ok(html.includes('src="../bubbles-embed.js"'));
    assert.ok(html.includes('data-bubble-id="' + guide.bubbleId + '"'));
    assert.ok(html.includes('href="https://chatgpt.com/"'));
    assert.ok(html.includes('data-copy-prompt'));
    assert.ok(prompt.length > 600);
    assert.match(prompt, /checkpoint/i);
  }
});
