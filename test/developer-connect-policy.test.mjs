import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateDeveloperAction, PROVIDERS} from '../scripts/developer-connect-policy.mjs';

const base = {
  evidenceSource: 'verified_server', providerSessionVerified: true,
  providerAccountId: 'integra-account-verified', appId: '33593296',
  apiGrantVerified: true, apiReadGranted: true, apiWriteGranted: true,
  rateLimitBudgetAvailable: true, ownerActionConsent: true,
  recipientOptedIn: true, recipientOptedOut: false, keywordOnlyMatch: false,
  originalPostExists: true, originalPostId: '2116381204437963196',
  repliesForInteraction: 0, aiApprovalVerified: false
};
const check = (action, patch = {}) => evaluateDeveloperAction({provider: 'x', action, context: {...base, ...patch}});

test('registry explicitly defaults API posting off', () => {
  assert.equal(PROVIDERS.x.apiPostingEnabledByDefault, false);
  assert.ok(PROVIDERS.x.policy.includes('x-automation'));
});
test('unknown provider and action fail closed', () => {
  assert.equal(evaluateDeveloperAction({provider:'github', action:'post_ai_reply'}).allowed, false);
  assert.equal(evaluateDeveloperAction({provider:'x', action:'like'}).allowed, false);
});
test('drafts are local only and never imply posting', () => {
  assert.deepEqual(evaluateDeveloperAction({provider:'x',action:'draft_reply'}), {
    allowed:true, reason:'eligible_for_server_side_execution_only', mode:'local_draft_only'
  });
});
test('server evidence, verified provider account and app required', () => {
  assert.equal(check('read_public', {evidenceSource:'browser'}).reason, 'server_evidence_required');
  assert.equal(check('read_public', {providerSessionVerified:false}).allowed, false);
  assert.equal(check('read_public', {appId:''}).allowed, false);
});
test('read-only requires actual read grant and budget', () => {
  assert.equal(check('read_public').mode, 'read_only');
  assert.equal(check('read_public',{apiReadGranted:false}).reason, 'read_scope_not_granted');
  assert.equal(check('read_public',{rateLimitBudgetAvailable:false}).allowed, false);
});
test('write actions require separate owner consent and API write grant', () => {
  assert.equal(check('post_original',{ownerActionConsent:false}).allowed, false);
  assert.equal(check('post_original',{apiWriteGranted:false}).allowed, false);
  assert.equal(check('post_original').mode,'write_candidate');
});
test('mentions/replies require recipient opt-in, original post and one reply', () => {
  assert.equal(check('post_reply',{recipientOptedIn:false}).allowed,false);
  assert.equal(check('post_reply',{keywordOnlyMatch:true}).allowed,false);
  assert.equal(check('post_reply',{recipientOptedOut:true}).allowed,false);
  assert.equal(check('post_reply',{originalPostExists:false}).allowed,false);
  assert.equal(check('post_reply',{repliesForInteraction:1}).reason,'one_reply_per_interaction_limit');
  assert.equal(check('post_reply').mode,'write_candidate');
});
test('AI reply requires separate prior written X approval even when OAuth works', () => {
  assert.equal(check('post_ai_reply').reason,'x_written_ai_reply_approval_required');
  assert.equal(check('post_ai_reply',{xWrittenApprovalReference:'case-1234567890'}).allowed,false);
  assert.equal(check('post_ai_reply',{aiApprovalVerified:true}).allowed,false);
  assert.equal(check('post_ai_reply',{aiApprovalVerified:true,xWrittenApprovalReference:'case-1234567890'}).mode,'write_candidate');
});
test('untrusted browser-provided flags do not satisfy evidence source', () => {
  assert.equal(check('post_ai_reply',{evidenceSource:'client',aiApprovalVerified:true,xWrittenApprovalReference:'case-1234567890'}).allowed,false);
});
