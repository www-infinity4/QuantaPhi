// Server-only authorization contract for future per-user connector executors.
// Call with records loaded from trusted storage, never request-body grants.
const capabilities = {
  github: ['repository.read', 'repository.fork', 'repository.write'],
  cloudflare: ['account.read','projects.build','ledger.read','projects.full'],
  google: ['drive.read', 'drive.write', 'sheets.read', 'sheets.write', 'calendar.read', 'calendar.write'],
  ebay: ['listing.read', 'bid.place'],
  walmart: ['product.read', 'order.place'],
  ibm: ['project.read', 'project.write'],
  anthropic: ['model.invoke']
};
export const PROVIDERS = Object.freeze(Object.fromEntries(
  Object.entries(capabilities).map(([id, actions]) => [id, Object.freeze({
    id, actions: Object.freeze(actions), status: 'not_configured'
  })])
));

// This check never grants scopes, refreshes tokens, or submits an action.
export function authorizeConnection({userId, provider, action, connection, now = Date.now()}) {
  const deny = reason => ({ok: false, reason});
  if (!userId || typeof userId !== 'string') return deny('authentication_required');
  if (!Object.hasOwn(PROVIDERS, provider) || !PROVIDERS[provider].actions.includes(action)) return deny('unsupported_action');
  if (!connection || connection.userId !== userId || connection.provider !== provider) return deny('connection_required');
  if (connection.status !== 'connected' || !connection.providerSubject || !connection.credentialRef) return deny('connection_not_verified');
  if (!Number.isFinite(now) || !Number.isFinite(connection.expiresAt) || connection.expiresAt <= now) return deny('refresh_required');
  if (!Array.isArray(connection.grantedActions) || !connection.grantedActions.includes(action)) return deny('consent_required');
  return {ok: true, connectionId: connection.id, providerSubject: connection.providerSubject};
}
