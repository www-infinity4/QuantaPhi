// Short-lived GitHub identity; no repository tokens or owner credentials in the browser.
const ISSUER='https://token.actions.githubusercontent.com';
const AUDIENCE='infinity-brain-writer';
const REPO='www-infinity4/QuantaPhi';
const WORKFLOW=REPO+'/.github/workflows/brain-writer.yml@refs/heads/main';
const ENGINE_REPO='www-infinity4/Moltnook';
const ENGINE_WORKFLOW=ENGINE_REPO+'/.github/workflows/moltnook-repository-engine.yml@refs/heads/main';
const bytes=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
export function checkClaims(c,now=Date.now()/1000){
 const scoped=c.repository===REPO&&c.repository_id==='1380883643'&&c.workflow_ref===WORKFLOW||c.repository===ENGINE_REPO&&c.repository_id==='1188306316'&&c.workflow_ref===ENGINE_WORKFLOW;
 if(c.iss!==ISSUER||c.aud!==AUDIENCE||!scoped||c.ref!=='refs/heads/main'||!['push','schedule','workflow_dispatch'].includes(c.event_name)||!/^\d+$/.test(c.run_id||'')||!Number.isFinite(c.exp)||c.exp<=now||c.nbf>now+30)throw Error('runner_identity_rejected');
 return c;
}
export async function authenticate(request){
 const token=(request.headers.get('Authorization')||'').replace(/^Bearer /,'');
 const parts=token.split('.');if(parts.length!==3||token.length>16000)throw Error('runner_identity_required');
 const header=JSON.parse(new TextDecoder().decode(bytes(parts[0])));
 if(header.alg!=='RS256'||typeof header.kid!=='string')throw Error('runner_signature_rejected');
 const response=await fetch(ISSUER+'/.well-known/jwks',{signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error('runner_keys_unavailable');
 const key=(await response.json()).keys.find(k=>k.kid===header.kid&&k.kty==='RSA');
 if(!key)throw Error('runner_key_unknown');
 const imported=await crypto.subtle.importKey('jwk',key,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
 if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',imported,bytes(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1])))throw Error('runner_signature_rejected');
 return checkClaims(JSON.parse(new TextDecoder().decode(bytes(parts[1]))));
}
export function supported(job){
 if(job.executor==='repository-engine')return false;
 // The first adapter handles brain-interface repairs. Other jobs retain their original scope.
 return job.repository===REPO && /clear\s+(?:text|input)|(?:brain|robot).*(?:input|button|readab|message|display)/i.test(job.instructions||'') && !(job.dependencies||[]).length;
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
