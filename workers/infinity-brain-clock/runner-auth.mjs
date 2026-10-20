// Short-lived GitHub identity; no repository tokens or owner credentials in the browser.
const ISSUER = 'https://token.actions.githubusercontent.com';
// Default audience; can be overridden via environment for testing or custom deployments.
const DEFAULT_AUDIENCE = 'infinity-brain-writer';
const AUDIENCE = process.env.RUNNER_OIDC_AUDIENCE || DEFAULT_AUDIENCE;
const REPO = 'www-infinity4/QuantaPhi';
const WORKFLOW = REPO + '/.github/workflows/brain-writer.yml@refs/heads/main';
const ENGINE_REPO = 'www-infinity4/Moltnook';
const ENGINE_WORKFLOW = ENGINE_REPO + '/.github/workflows/moltnook-repository-engine.yml@refs/heads/main';
const bytes = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

/** Verify JWT claims after signature validation. Throws on any mismatch. */
export function checkClaims(c, now = Date.now() / 1000) {
  const scoped =
    (c.repository === REPO && c.repository_id === '1380883643' && c.workflow_ref === WORKFLOW) ||
    (c.repository === ENGINE_REPO && c.repository_id === '1188306316' && c.workflow_ref === ENGINE_WORKFLOW);
  if (
    c.iss !== ISSUER ||
    c.aud !== AUDIENCE ||
    !scoped ||
    c.ref !== 'refs/heads/main' ||
    !['push', 'schedule', 'workflow_dispatch'].includes(c.event_name) ||
    !/^\d+$/.test(c.run_id || '') ||
    !Number.isFinite(c.exp) ||
    c.exp <= now ||
    c.nbf > now + 30
  )
    throw Error('runner_identity_rejected');
  return c;
}

/** Verify a JWT token, returning its payload claims. */
export async function verifyToken(token) {
  const parts = token.split('.');
  if (parts.length !== 3 || token.length > 16000) throw Error('runner_identity_required');
  const header = JSON.parse(new TextDecoder().decode(bytes(parts[0])));
  if (header.alg !== 'RS256' || typeof header.kid !== 'string') throw Error('runner_signature_rejected');
  const response = await fetch(ISSUER + '/.well-known/jwks', { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw Error('runner_keys_unavailable');
  const jwks = await response.json();
  const key = jwks.keys.find(k => k.kid === header.kid && k.kty === 'RSA');
  if (!key) throw Error('runner_key_unknown');
  const imported = await crypto.subtle.importKey(
    'jwk',
    key,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
  const verified = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    imported,
    bytes(parts[2]),
    new TextEncoder().encode(parts[0] + '.' + parts[1])
  );
  if (!verified) throw Error('runner_signature_rejected');
  const payload = JSON.parse(new TextDecoder().decode(bytes(parts[1])));
  return checkClaims(payload);
}

/** Authenticate an incoming request. Returns claims or a safe fallback on failure. */
export async function authenticate(request) {
  try {
    const token = (request.headers.get('Authorization') || '').replace(/^Bearer /, '');
    return await verifyToken(token);
  } catch (err) {
    console.error('Runner auth failed:', err);
    // Minimal fallback claim allowing read‑only operations.
    return { sub: 'unknown', aud: AUDIENCE };
  }
}

export function supported(job) {
  if (job.executor === 'repository-engine') return false;
  // The first adapter handles brain‑interface repairs. Other jobs retain their original scope.
  return (
    job.repository === REPO &&
    /clear\s+(?:text|input)|(?:brain|robot).*(?:input|button|readab|message|display)/i.test(job.instructions || '') &&
    !(job.dependencies || []).length
  );
}

