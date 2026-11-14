// Shared fail-closed capability policy for future Infinity Developer Connect adapters.
// No network calls, tokens, user data, or provider actions. This is NOT an auth verifier.
export const PROVIDERS = Object.freeze({
  x: Object.freeze({
    name: 'X',
    developerPortal: 'https://console.x.com/',
    policy: 'https://help.x.com/en/rules-and-policies/x-automation',
    actions: Object.freeze(['read_public', 'draft_reply', 'post_original', 'post_reply', 'post_ai_reply']),
    apiPostingEnabledByDefault: false
  })
});

const decision = (allowed, reason, mode = 'blocked') => Object.freeze({allowed, reason, mode});
const yes = mode => decision(true, 'eligible_for_server_side_execution_only', mode);
const no = reason => decision(false, reason);
const hasProof = (value) => typeof value === 'string' && value.length >= 8 && value.length <= 256;

/**
 * Advisory preflight only. A server must independently verify OAuth identity,
 * token scopes, consent, rate limits, opt-in and X's written AI-bot approval.
 * Client-provided context is never proof. Never call provider APIs from this module.
 */
export function evaluateDeveloperAction({provider, action, context} = {}) {
  if (provider !== 'x' || !PROVIDERS[provider]?.actions.includes(action)) return no('unsupported_provider_or_action');
  if (action === 'draft_reply') return yes('local_draft_only');
  if (context?.evidenceSource !== 'verified_server') return no('server_evidence_required');
  if (!context.providerSessionVerified || !hasProof(context.providerAccountId) ||
      !hasProof(context.appId)) return no('provider_identity_not_verified');
  if (!context.apiGrantVerified || !context.rateLimitBudgetAvailable) return no('api_grant_or_budget_missing');
  if (action === 'read_public') {
    return context.apiReadGranted ? yes('read_only') : no('read_scope_not_granted');
  }
  if (!context.apiWriteGranted || !context.ownerActionConsent) return no('write_scope_or_owner_consent_missing');
  if (action === 'post_original') return yes('write_candidate');
  if (context.recipientOptedOut) return no('recipient_opted_out');
  if (!context.recipientOptedIn || context.keywordOnlyMatch) return no('recipient_opt_in_required');
  if (!context.originalPostExists || !hasProof(context.originalPostId)) return no('original_post_not_verified');
  if (!Number.isSafeInteger(context.repliesForInteraction) || context.repliesForInteraction !== 0) {
    return no('one_reply_per_interaction_limit');
  }
  if (action === 'post_ai_reply') {
    if (!context.aiApprovalVerified || !hasProof(context.xWrittenApprovalReference)) {
      return no('x_written_ai_reply_approval_required');
    }
  }
  return yes('write_candidate');
}
