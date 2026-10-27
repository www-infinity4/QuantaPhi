// RPC exceptions do not reliably carry custom error fields across Workers.
// Convert failures to a small, non-secret result inside the Durable Object,
// using the same boundary for direct and Android handoff completion.
const EXPECTED = /^(?:callback_invalid|callback_session_mismatch|state_invalid_or_used|state_expired|connection_cancelled|provider_not_configured|provider_response_invalid|provider_identity_invalid|provider_token_invalid|expiring_token_required|provider_response_too_large|vault_key_unavailable|vault_key_invalid|cloudflare_(?:exchange|refresh)_(?:[45]\d{2}|rejected)(?:_(?:invalid_client|invalid_grant|invalid_scope|invalid_request|unauthorized_client|unsupported_grant_type|server_error|temporarily_unavailable))?|cloudflare_identity_[45]\d{2})$/;
const DIAGNOSTIC = /^connection_complete_(?:state|exchange|seal|store|handoff_read|handoff_decrypt|handoff_store|receipt_seal|receipt_store|unknown)_(?:timeout|type|internal)_(?:token_redirect|login_redirect|external_redirect|other_redirect|receiver|context|redirect|headers|url|timeout|network|function|unknown)$/;

export const safeConnectionFailure = value => typeof value === 'string' &&
  (EXPECTED.test(value) || DIAGNOSTIC.test(value));

export function connectionFailureCode(error) {
  const message = String(error?.message || '');
  if(message==='too_many_requests')return message;
  if (safeConnectionFailure(message)) return message;
  const stages = ['state','exchange','seal','store','handoff_read','handoff_decrypt',
    'handoff_store','receipt_seal','receipt_store'];
  const stage = stages.includes(error?.connectionStage) ? error.connectionStage : 'unknown';
  const kind = error?.name === 'TimeoutError' ? 'timeout' : error?.name === 'TypeError' ? 'type' : 'internal';
  const point = /github_token_redirect_token/.test(message) ? 'token_redirect' :
    /github_token_redirect_login/.test(message) ? 'login_redirect' :
    /github_token_redirect_external/.test(message) ? 'external_redirect' :
    /github_token_redirect_other/.test(message) ? 'other_redirect' :
    /Illegal invocation|receiver/i.test(message) ? 'receiver' :
    /different request|request context|I\/O/i.test(message) ? 'context' :
    /redirect/i.test(message) ? 'redirect' : /header|ByteString|character/i.test(message) ? 'headers' :
    /URL|scheme/i.test(message) ? 'url' : /timeout|AbortSignal/i.test(message) ? 'timeout' :
    /fetch|network|connect/i.test(message) ? 'network' : /not a function/i.test(message) ? 'function' : 'unknown';
  return 'connection_complete_' + stage + '_' + kind + '_' + point;
}

export async function connectionResult(operation) {
  try { return await operation(); }
  catch (error) { return {connectionError:connectionFailureCode(error)}; }
}
