import test from 'node:test';
import assert from 'node:assert/strict';
import { planCoinResearch, groupCoinResults, assessCoinEvidence } from '../design-lab/coin-evidence-core.mjs';

const diagnostics = ['date feature', 'mint mark position'];
const candidateUrl = 'https://www.ebay.com/itm/12345';
const supported = diagnostics.map(diagnostic => ({ diagnostic, state: 'supported', evidenceUrl: 'https://vamworld.com/reference#detail' }));

test('coin plan wires user diagnostics into bounded public research and stays immutable', () => {
 const plan = planCoinResearch({ query: '1881 Morgan dollar', diagnostics, limit: 6 });
 assert.equal(plan.query, '1881 Morgan dollar date feature mint mark position');
 assert.equal(plan.subject, '1881 Morgan dollar');
 assert.deepEqual(plan.diagnostics, diagnostics);
 assert.equal(plan.targets.length, 6);
 assert.equal(plan.authority, 'public-read');
 assert.equal(plan.imagesInspected, 0);
 assert.equal(plan.canOrder, false);
 assert.equal(Object.isFrozen(plan.diagnostics), true);
 assert.equal(Object.isFrozen(plan.lanes), true);
 assert.throws(() => plan.diagnostics.push('forged'), TypeError);
});

test('coin plan rejects absent, repeated, non-string and excessive diagnostics without truncating', () => {
 for (const invalid of [undefined, [], [''], [123], ['same', 'SAME'], Array(7).fill('feature')])
  assert.throws(() => planCoinResearch({ query: 'coin', diagnostics: invalid }));
 assert.throws(() => planCoinResearch({ query: 'A'.repeat(90), diagnostics: ['A'.repeat(30)] }), /110/);
 for (const limit of [0, -1, 11, 1.5, Infinity, '10'])
  assert.throws(() => planCoinResearch({ query: 'coin', diagnostics, limit }), /source limit/);
});

test('groups only safe original-domain search leads and deduplicates normalized URLs', () => {
 const results = [
  { target: 'pcgs.com', title: 'Reference lead', url: 'https://www.pcgs.com/reference#one', snippet: 'reference snippet' },
  { target: 'pcgs.com', title: 'Duplicate', url: 'https://www.pcgs.com/reference#two' },
  { target: 'ebay.com', title: 'Candidate lead', url: candidateUrl },
  { target: 'ebay.com', title: 'Wrong host', url: 'https://ebay.com.attacker.example/123' },
  { target: 'ebay.com', title: 'Credentials', url: 'https://secret@ebay.com/123' },
  { target: 'ebay.com', title: 'Port', url: 'https://ebay.com:444/123' },
  { target: 'ebay.com', title: 'Plain HTTP', url: 'http://ebay.com/123' },
  { target: 'wikipedia.org', title: 'Outside coin registry', url: 'https://wikipedia.org/test' }
 ];
 const grouped = groupCoinResults({ results, targets: 10, steps: [
  { target: 'pcgs.com', status: 'matched' }, { target: 'ebay.com', status: 'matched' },
  { target: 'pcgs.com', status: 'matched' }, { target: 'ha.com', status: 'error' },
  { target: 'evil.example', status: 'matched' }
 ] });
 assert.equal(grouped.references.length, 1);
 assert.equal(grouped.references[0].url, 'https://www.pcgs.com/reference');
 assert.equal(grouped.references[0].snippet, 'reference snippet');
 assert.equal(grouped.candidates.length, 1);
 assert.equal(grouped.candidates[0].kind, 'search-lead');
 assert.equal(grouped.candidates[0].diagnosticVerified, false);
 assert.deepEqual(grouped.coverage, { plannedSources: 10, checkedSources: 3, failedSources: 1,
  stopped: false, sourcesWithLeads: 2, imagesInspected: 0, scope: 'returned-public-index-leads' });
 assert.equal(grouped.assessmentMethod, 'not-assessed');
 assert.equal(grouped.certified, false);
});

test('complete user observations require a real candidate context and never certify attribution', () => {
 const assessment = assessCoinEvidence({ diagnostics, observations: supported, candidateUrl });
 assert.equal(assessment.status, 'candidate');
 assert.equal(assessment.candidateUrl, candidateUrl);
 assert.equal(assessment.supported, 2);
 assert.equal(assessment.required, 2);
 assert.equal(assessment.assessmentMethod, 'user-recorded');
 assert.equal(assessment.certified, false);
 assert.equal(assessment.canOrder, false);
 assert.equal(assessment.diagnostics[0].evidenceUrl, 'https://vamworld.com/reference');
 assert.equal(Object.isFrozen(assessment.diagnostics[0]), true);
 const missingCandidate = assessCoinEvidence({ diagnostics, observations: supported });
 assert.equal(missingCandidate.status, 'insufficient_evidence');
 assert.ok(missingCandidate.blockingReasons.includes('candidate_url_required'));
});

test('absent, invisible or unsupported proof remains unknown instead of becoming a match', () => {
 const missing = assessCoinEvidence({ diagnostics, candidateUrl });
 assert.equal(missing.status, 'insufficient_evidence');
 assert.equal(missing.supported, 0);
 assert.equal(missing.diagnostics[0].state, 'not_visible');
 const withoutProof = assessCoinEvidence({ diagnostics: ['date feature'], candidateUrl,
  observations: [{ diagnostic: 'date feature', state: 'supported' }] });
 assert.equal(withoutProof.status, 'insufficient_evidence');
 assert.equal(withoutProof.diagnostics[0].reason, 'reference_evidence_required');
 const invisible = assessCoinEvidence({ diagnostics, candidateUrl,
  observations: [supported[0], { diagnostic: diagnostics[1], state: 'not_visible' }] });
 assert.equal(invisible.status, 'insufficient_evidence');
});

test('a source-linked contradiction is retained rather than averaged away', () => {
 const result = assessCoinEvidence({ diagnostics, candidateUrl,
  observations: [supported[0], { ...supported[1], state: 'contradicted' }] });
 assert.equal(result.status, 'contradicted');
 assert.equal(result.supported, 1);
 assert.equal(result.contradicted, 1);
});

test('assessment rejects spoofed URLs, nonreference evidence, duplicated and unknown observations', () => {
 for (const evidenceUrl of ['javascript:alert(1)', 'http://pcgs.com/feature', 'https://pcgs.com.evil.example/x',
  'https://name:secret@pcgs.com/feature', 'https://pcgs.com:444/feature', candidateUrl])
  assert.throws(() => assessCoinEvidence({ diagnostics, candidateUrl,
   observations: [{ ...supported[0], evidenceUrl }] }), /reference link/);
 for (const badCandidate of ['https://ebay.com.evil.example/x', 'https://vamworld.com/reference', 'http://ebay.com/x'])
  assert.throws(() => assessCoinEvidence({ diagnostics, observations: supported, candidateUrl: badCandidate }), /marketplace link/);
 assert.throws(() => assessCoinEvidence({ diagnostics, candidateUrl,
  observations: [supported[0], supported[0]] }), /one observation/);
 assert.throws(() => assessCoinEvidence({ diagnostics, candidateUrl,
  observations: [{ ...supported[0], diagnostic: 'unknown feature' }] }), /does not match/);
 assert.throws(() => assessCoinEvidence({ diagnostics, candidateUrl,
  observations: [{ ...supported[0], state: 'probably' }] }), /Choose supported/);
});

test('a stopped run preserves the limited search coverage without implying image inspection', () => {
 const grouped = groupCoinResults({ results: [], targets: 10, stopped: true,
  steps: [{ target: 'ebay.com', status: 'stopped' }] });
 assert.equal(grouped.coverage.stopped, true);
 assert.equal(grouped.coverage.checkedSources, 1);
 assert.equal(grouped.coverage.imagesInspected, 0);
 assert.deepEqual(grouped.candidates, []);
 assert.deepEqual(groupCoinResults().references, []);
});
