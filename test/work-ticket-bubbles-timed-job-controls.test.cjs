const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

test('work‑ticket structure and Purple‑Pearl approval', async (t) => {
  const ticketPath = path.join(__dirname, '..', 'work-tickets', 'bubbles-timed-job-controls.md');
  const content = fs.readFileSync(ticketPath, 'utf8');

  // Required headings
  const requiredHeadings = [
    '## Description',
    '## Owner Request',
    '## Acceptance',
    '## Review',
  ];
  for (const heading of requiredHeadings) {
    assert.ok(
      content.includes(heading),
      `Missing required heading: ${heading}`
    );
  }

  // Purple‑Pearl approval marker
  const approvalMarker = '✅ Approved by Purple‑Pearl';
  assert.ok(
    content.includes(approvalMarker),
    'Missing Purple‑Pearl approval marker'
  );
});
