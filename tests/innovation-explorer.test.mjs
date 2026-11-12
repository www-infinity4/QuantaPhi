import test from 'node:test';
import assert from 'node:assert/strict';
import { innovations, filterInnovations } from '../innovation-explorer-core.mjs';
test('innovation cards have distinct names and verifiable source links', () => {
 assert.equal(new Set(innovations.map(x=>x.id)).size, innovations.length);
 for (const item of innovations) { assert.ok(item.title && item.summary && item.stage); assert.match(item.source, /^https:\/\//); assert.ok(!item.claims.includes('commercially available')); }
});
test('filter returns topic-specific innovations without modifying source', () => {
 assert.ok(filterInnovations('solar').some(x=>x.id==='solar-paint'));
 assert.ok(filterInnovations('hydrogen').some(x=>x.id==='photoelectrochemical-hydrogen'));
 assert.equal(filterInnovations('all').length, innovations.length);
 assert.equal(filterInnovations('nonexistent').length,0);
});
