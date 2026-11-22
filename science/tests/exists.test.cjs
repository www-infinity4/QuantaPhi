const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Helper to read a file relative to the test file
function readFile(relPath) {
  return fs.readFileSync(path.resolve(__dirname, '..', relPath), 'utf8');
}

// List of files that must exist
const requiredFiles = [
  'index.html',
  'style.css',
  path.join('graphs', 'graph1.svg'),
  path.join('graphs', 'graph2.svg'),
  path.join('tutorials', 'intro.md'),
  path.join('tutorials', 'advanced.md'),
];

describe('QuantaPhi Science Section Files', () => {
  it('should have all required files', () => {
    requiredFiles.forEach((file) => {
      const fullPath = path.resolve(__dirname, '..', file);
      const exists = fs.existsSync(fullPath);
      assert.ok(exists, `Missing required file: ${file}`);
    });
  });

  it('index.html should be valid HTML (basic check)', () => {
    const html = readFile('index.html');
    // Very simple sanity check: must contain <html> and </html>
    assert.ok(/<html[^>]*>/i.test(html), 'index.html missing opening <html> tag');
    assert.ok(/<\/html>/i.test(html), 'index.html missing closing </html> tag');
  });
});
