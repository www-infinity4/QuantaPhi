// Short-lived GitHub identity; no repository tokens or owner credentials in the browser.
const ISSUER = 'https://token.actions.githubusercontent.com';
const AUDIENCE = 'infinity-brain-writer';
const REPO = 'www-infinity4/QuantaPhi';
const WORKFLOW = REPO + '/.github/workflows/brain-writer.yml@refs/heads/main';
const ENGINE_REPO = 'www-infinity4/Moltnook';
const ENGINE_WORKFLOW = ENGINE_REPO + '/.github/workflows/moltnook-repository-engine.yml@refs/heads/main';
const bytes = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

// A separate intake identity: never accepted by claim/build/GitHub endpoints.
export function checkOwnerBridgeClaims(c, now=Date.now()/1000) {
  if(c.iss!==ISSUER || c.aud!=='bubbles-owner-message-bridge' ||
    c.repository!==ENGINE_REPO || c.repository_id!=='1188306316' ||
    c.workflow_ref!==ENGINE_REPO+'/.github/workflows/bubbles-owner-message.yml@refs/heads/main' ||
    c.ref!=='refs/heads/main' || !['push','workflow_dispatch'].includes(c.event_name) ||
    !/^\d{1,24}$/.test(c.run_id||'') || !Number.isFinite(c.exp) || c.exp<=now ||
    !Number.isFinite(c.nbf) || c.nbf>now+30 || !Number.isFinite(c.iat) ||
    c.iat>now+30 || now-c.iat>600) throw Error('owner_bridge_identity_rejected');
  return c;
}
export async function authenticateOwnerBridge(request) {
  const auth=request.headers.get('Authorization')||'';
  if(!auth.startsWith('Bearer ') || auth.length>16000) throw Error('owner_bridge_identity_required');
  const parts=auth.slice(7).split('.');
  if(parts.length!==3) throw Error('owner_bridge_identity_required');
  const header=JSON.parse(new TextDecoder().decode(bytes(parts[0])));
  if(header.alg!=='RS256'||typeof header.kid!=='string') throw Error('owner_bridge_signature_rejected');
  const response=await fetch(ISSUER+'/.well-known/jwks',{signal:AbortSignal.timeout(10000)});
  if(!response.ok) throw Error('owner_bridge_keys_unavailable');
  const key=(await response.json()).keys?.find(k=>k.kid===header.kid&&k.kty==='RSA');
  if(!key) throw Error('owner_bridge_key_unknown');
  const imported=await crypto.subtle.importKey('jwk',key,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',imported,bytes(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1])))
    throw Error('owner_bridge_signature_rejected');
  return checkOwnerBridgeClaims(JSON.parse(new TextDecoder().decode(bytes(parts[1]))));
}

/**
 * Validate OIDC claim payload.
 * Throws `runner_identity_rejected` on any mismatch.
 * Adds console.error logging for debugging.
 */
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
  ) {
    console.error('checkClaims failed', { claim: c, now });
    throw Error('runner_identity_rejected');
  }
  return c;
}

/**
 * Authenticate an incoming request by verifying its JWT OIDC token.
 * Provides detailed logging for each failure point.
 */
export async function authenticate(request) {
  const token = (request.headers.get('Authorization') || '').replace(/^Bearer /, '');
  const parts = token.split('.');
  if (parts.length !== 3 || token.length > 16000) {
    console.error('Invalid token format');
    throw Error('runner_identity_required');
  }
  const header = JSON.parse(new TextDecoder().decode(bytes(parts[0])));
  if (header.alg !== 'RS256' || typeof header.kid !== 'string') {
    console.error('Invalid JWT header', header);
    throw Error('runner_signature_rejected');
  }
  const response = await fetch(ISSUER + '/.well-known/jwks', { signal: AbortSignal.timeout(10000) });
  if (!response.ok) {
    console.error('Failed to fetch JWKS', response.status);
    throw Error('runner_keys_unavailable');
  }
  const jwks = await response.json();
  const key = jwks.keys.find(k => k.kid === header.kid && k.kty === 'RSA');
  if (!key) {
    console.error('Key not found for kid', header.kid);
    throw Error('runner_key_unknown');
  }
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
  if (!verified) {
    console.error('Signature verification failed');
    throw Error('runner_signature_rejected');
  }
  const payload = JSON.parse(new TextDecoder().decode(bytes(parts[1])));
  return checkClaims(payload);
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

/**
 * Obtain a short‑lived OIDC token for the runner.
 * Uses the `GITHUB_TOKEN` environment variable for authentication.
 * Retries up to three times with exponential back‑off for transient failures.
 */
export async function getRunnerToken(){
 const envToken = process.env.GITHUB_TOKEN;
 if(!envToken){
   throw new Error('GITHUB_TOKEN_missing');
 }
 const url = 'https://api.github.com/actions/id-token';
 const maxAttempts = 3;
 const baseDelay = 500; // ms
 for(let attempt = 1; attempt <= maxAttempts; attempt++){
   try{
     const resp = await fetch(url, {
       method: 'GET',
       headers: {
         'Authorization': `Bearer ${envToken}`,
         'Accept': 'application/json'
       },
       signal: AbortSignal.timeout(10000)
     });
     if(!resp.ok){
       // Retry on server errors (5xx)
       if(resp.status >= 500 && attempt < maxAttempts){
         await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, attempt-1)));
         continue;
       }
       const txt = await resp.text();
       throw new Error(`oidc_token_request_failed: ${resp.status} ${txt}`);
     }
     const data = await resp.json();
     if(!data || typeof data.value !== 'string'){
       throw new Error('oidc_token_missing');
     }
     return data.value;
   }catch(e){
     // Network or abort errors – retry if attempts remain
     if(attempt >= maxAttempts) throw e;
     if(e.name === 'AbortError' || e.message.includes('network')){
       await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, attempt-1)));
       continue;
     }
     throw e;
   }
 }
 // Should never reach here
 throw new Error('oidc_token_unavailable');
}
