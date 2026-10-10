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
 // The first adapter handles brain-interface repairs. Other jobs retain their original scope.
 return job.repository===REPO && /clear\s+(?:text|input)|(?:brain|robot).*(?:input|button|readab|message|display)/i.test(job.instructions||'') && !(job.dependencies||[]).length;
}

