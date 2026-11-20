const { test } = require('node:test');
const { readFileSync } = require('fs');
const path = require('path');

test('workflow has id-token permission', () => {
  const workflowPath = path.resolve(__dirname, '..', '.github', 'workflows', 'source-provenance.yml');
  const content = readFileSync(workflowPath, 'utf8');
  if (!content.includes('id-token: write')) {
    throw new Error('Missing id-token permission in workflow');
  }
});
