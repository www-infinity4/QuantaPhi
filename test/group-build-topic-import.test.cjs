// test/group-build-topic-import.test.cjs
// Node built‑in test runner (node --test) verifies that the proposal markdown
// contains all required sections. This is a lightweight, executable check
// that satisfies the acceptance criteria for TASK‑2.

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Resolve the proposal file relative to this test file
const proposalPath = path.resolve(__dirname, '..', 'docs', 'GROUP_BUILD_TOPIC_IMPORT_PROPOSAL.md');
const content = fs.readFileSync(proposalPath, 'utf8');

// List of headings that must appear in the proposal (exact strings)
const requiredHeadings = [
  '# Group Build Topic & Source Import Proposal',
  '## Purpose and scope',
  '## Definition of “opt‑in submitted context”',
  '## Step‑by‑step source ingestion workflow',
  '## Privacy safeguards',
  '## Attribution model',
  '## Concurrency handling',
  '## Error handling & retry semantics',
  '## Alignment with existing Group Build architecture',
  '## References'
];

for (const heading of requiredHeadings) {
  assert.ok(
    content.includes(heading),
    `Missing required heading in proposal: ${heading}`
  );
}

console.log('All required headings are present in GROUP_BUILD_TOPIC_IMPORT_PROPOSAL.md');
