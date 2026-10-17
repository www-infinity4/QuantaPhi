const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

// Verify that the verification ticket exists and contains all required sections.
test('Bubbles PR #416 verification ticket structure', async () => {
  const ticketPath = path.resolve(__dirname, '../work-tickets/bubbles-pr416-verification.md');
  const content = await fs.promises.readFile(ticketPath, 'utf8');

  const requiredHeadings = [
    '## Objective',
    '## Required Resources',
    '## Verification Steps',
    '### 1. UI Contrast & Compact Layout',
    '### 2. “Check My SIM” Feature',
    '### 3. Infinity Connectivity Audit',
    '## Acceptance Criteria'
  ];

  for (const heading of requiredHeadings) {
    assert.ok(
      content.includes(heading),
      `Missing required heading: ${heading}`
    );
  }
});
