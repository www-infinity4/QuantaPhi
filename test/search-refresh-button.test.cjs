const { test } = require('node:test');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

test('search refresh button is present in index.html', async () => {
  const indexPath = path.resolve(__dirname, '../index.html');
  const content = fs.readFileSync(indexPath, 'utf8');
  assert.match(content, /id="refreshSearch"/);
});
