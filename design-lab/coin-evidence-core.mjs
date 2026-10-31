/* Power Chain coin evidence kit. Public-index leads and user-recorded checks;
 * this module does not inspect photographs, certify a variety or place orders. */
import { planChain, safeChainResult } from './power-chain-core.mjs';

export const COIN_REFERENCE_SOURCES = Object.freeze([
 'pcgs.com', 'ngccoin.com', 'vamworld.com', 'usmint.gov', 'numista.com', 'coinworld.com'
]);
export const COIN_CANDIDATE_SOURCES = Object.freeze([
 'ebay.com', 'ha.com', 'stacksbowers.com', 'liveauctioneers.com'
]);
const sources = Object.freeze([...COIN_REFERENCE_SOURCES, ...COIN_CANDIDATE_SOURCES]);
const clean = value => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';

function diagnosticList(input) {
 if (!Array.isArray(input) || input.length < 1 || input.length > 6)
  throw Error('Enter one to six diagnostic phrases from your reference.');
 const list = input.map(clean);
 if (list.some(value => value.length < 3 || value.length > 80))
  throw Error('Each diagnostic phrase must contain 3 to 80 characters.');
 if (new Set(list.map(value => value.toLowerCase())).size !== list.length)
  throw Error('Each diagnostic phrase must be distinct.');
 return Object.freeze(list);
}

function sourceUrl(value, allowed) {
 if (typeof value !== 'string') return null;
 try {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
  if (!allowed.some(domain => url.hostname === domain || url.hostname.endsWith('.' + domain))) return null;
  url.hash = '';
  return url.href;
 } catch { return null; }
}

/** A standard plan for runPowerChain; every diagnostic stays in the search text. */
export function planCoinResearch({ query, diagnostics, limit = 10 } = {}) {
 const subject = clean(query);
 if (subject.length < 3 || subject.length > 110)
  throw Error('Enter a coin target of 3 to 110 characters.');
 const criteria = diagnosticList(diagnostics);
 const search = subject + ' ' + criteria.join(' ');
 if (search.length > 110)
  throw Error('Keep the coin target and diagnostic phrases within 110 characters for this search.');
 if (!Number.isInteger(limit) || limit < 1 || limit > 10)
  throw Error('Choose a source limit from 1 to 10.');
 const plan = planChain({ query: search, lanes: ['collect'], limit });
 return Object.freeze({ ...plan, lanes: Object.freeze([...plan.lanes]), subject,
  diagnostics: criteria, recipe: 'coin-evidence-v1', authority: 'public-read',
  imagesInspected: 0, canOrder: false });
}

/** Search leads are grouped by source purpose, never promoted to attribution. */
export function groupCoinResults(receipt = {}) {
 const references = [], candidates = [], seen = new Set();
 for (const row of Array.isArray(receipt.results) ? receipt.results : []) {
  if (!sources.includes(row?.target)) continue;
  const result = safeChainResult(row.target, row);
  if (!result || seen.has(result.url)) continue;
  seen.add(result.url);
  const lead = Object.freeze({ ...result, kind: 'search-lead', diagnosticVerified: false,
   imageAssessment: 'not-inspected' });
  (COIN_REFERENCE_SOURCES.includes(result.target) ? references : candidates).push(lead);
 }
 const steps = new Map();
 for (const step of Array.isArray(receipt.steps) ? receipt.steps : []) {
  if (sources.includes(step?.target) && ['matched', 'empty', 'error', 'stopped'].includes(step.status))
   steps.set(step.target, step);
 }
 const planned = Number.isInteger(receipt.targets) && receipt.targets >= 0 ? Math.min(10, receipt.targets) : 0;
 const coverage = Object.freeze({ plannedSources: planned, checkedSources: steps.size,
  failedSources: [...steps.values()].filter(step => step.status === 'error').length,
  stopped: receipt.stopped === true, sourcesWithLeads: new Set([...references, ...candidates].map(row => row.target)).size,
  imagesInspected: 0, scope: 'returned-public-index-leads' });
 return Object.freeze({ references: Object.freeze(references), candidates: Object.freeze(candidates),
  coverage, assessmentMethod: 'not-assessed', certified: false, canOrder: false });
}

/** Record a person's feature checks with both specimen and reference context.
 * Missing views or missing proof stay unknown; this is never an AI image verdict. */
export function assessCoinEvidence({ diagnostics, observations = [], candidateUrl } = {}) {
 const criteria = diagnosticList(diagnostics);
 if (!Array.isArray(observations) || observations.length > criteria.length)
  throw Error('Provide at most one observation for each diagnostic.');
 const specimen = candidateUrl ? sourceUrl(candidateUrl, COIN_CANDIDATE_SOURCES) : null;
 if (candidateUrl && !specimen) throw Error('Use an approved HTTPS marketplace link for the candidate.');
 const byDiagnostic = new Map();
 for (const observation of observations) {
  const diagnostic = clean(observation?.diagnostic);
  if (!criteria.includes(diagnostic)) throw Error('Observation does not match a requested diagnostic.');
  if (byDiagnostic.has(diagnostic)) throw Error('Only one observation is allowed per diagnostic.');
  const state = observation.state;
  if (!['supported', 'contradicted', 'not_visible'].includes(state))
   throw Error('Choose supported, contradicted, or not_visible for each diagnostic.');
  const evidenceUrl = observation.evidenceUrl ? sourceUrl(observation.evidenceUrl, COIN_REFERENCE_SOURCES) : null;
  if (observation.evidenceUrl && !evidenceUrl)
   throw Error('Use an approved HTTPS reference link for diagnostic evidence.');
  const note = clean(observation.note).slice(0, 500);
  byDiagnostic.set(diagnostic, Object.freeze({ diagnostic,
   state: state === 'not_visible' || evidenceUrl ? state : 'not_visible', evidenceUrl,
   note, reason: state !== 'not_visible' && !evidenceUrl ? 'reference_evidence_required' : null }));
 }
 const checks = Object.freeze(criteria.map(diagnostic => byDiagnostic.get(diagnostic) ||
  Object.freeze({ diagnostic, state: 'not_visible', evidenceUrl: null, note: '', reason: 'observation_required' })));
 const supported = checks.filter(check => check.state === 'supported').length;
 const contradicted = checks.filter(check => check.state === 'contradicted').length;
 const blockingReasons = [];
 if (!specimen) blockingReasons.push('candidate_url_required');
 if (checks.some(check => check.state === 'not_visible')) blockingReasons.push('diagnostic_evidence_incomplete');
 const status = !specimen ? 'insufficient_evidence' : contradicted ? 'contradicted' :
  supported === criteria.length ? 'candidate' : 'insufficient_evidence';
 return Object.freeze({ status, candidateUrl: specimen, supported, contradicted,
  required: criteria.length, diagnostics: checks, blockingReasons: Object.freeze(blockingReasons),
  assessmentMethod: 'user-recorded', imagesInspected: 0, certified: false, canOrder: false,
  explanation: status === 'candidate' ? 'All required diagnostics were marked supported by the user with reference links; attribution is not certified.' :
   status === 'contradicted' ? 'A user-recorded diagnostic contradicts this candidate.' :
   'A candidate link and supported, source-linked observations are required for every diagnostic.' });
}
