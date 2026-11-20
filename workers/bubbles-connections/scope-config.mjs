// Server configuration only. One revision across all three secrets prevents
// interrupted writes from combining two different permission inventories.
import {digest} from './vault.mjs';
const SCOPE=/^[a-zA-Z][\w.-]{1,100}$/;
const REVISION=/^css_[a-f0-9-]{36}$/;
const bytes=text=>new TextEncoder().encode(text).length;
const valid=scopes=>Array.isArray(scopes)&&scopes.length>0&&scopes.length<=1000&&
 scopes.every(scope=>typeof scope==='string'&&SCOPE.test(scope))&&
 new Set(scopes).size===scopes.length;

export function buildCloudflareScopeChunks(scopes,revision){
 if(!valid(scopes)||!REVISION.test(revision||''))throw Error('oauth_client_scopes_invalid');
 const size=Math.ceil(scopes.length/3);
 const chunks=[0,1,2].map(part=>JSON.stringify({schemaVersion:1,revision,part:part+1,
  total:scopes.length,scopes:scopes.slice(part*size,(part+1)*size)}));
 if(chunks.some(chunk=>bytes(chunk)>4800))throw Error('oauth_scope_chunk_exceeds_worker_secret_limit');
 return chunks;
}

function readConfig(env={}){
 const fallback=String(env.CLOUDFLARE_OAUTH_ALLOWED_SCOPES||'');
 const legacy={text:fallback,revision:null};
 const chunks=[1,2,3].map(i=>env['CLOUDFLARE_OAUTH_ALLOWED_SCOPES_PART_'+i]);
 if(!chunks.every(chunk=>typeof chunk==='string'&&chunk.trim()&&bytes(chunk)<=5120))return legacy;
 if(chunks.some(chunk=>chunk.trim().startsWith('{'))){
  try{
   const parts=chunks.map(chunk=>JSON.parse(chunk));
   const first=parts[0];
   if(!REVISION.test(first?.revision||'')||!Number.isSafeInteger(first?.total)||
    !parts.every((part,i)=>part?.schemaVersion===1&&part.part===i+1&&
     part.revision===first.revision&&part.total===first.total&&Array.isArray(part.scopes)))return legacy;
   const scopes=parts.flatMap(part=>part.scopes);
   return valid(scopes)&&scopes.length===first.total?{text:scopes.join(' '),revision:first.revision}:legacy;
  }catch{return legacy;}
 }
 // Compatibility with the previously deployed unversioned 386-scope format.
 // New registrations always use revision-fenced envelopes, never raw chunks.
 const scopes=chunks.join(' ').trim().split(/\s+/);
 return scopes.length===386&&valid(scopes)?{text:scopes.join(' '),revision:null}:legacy;
}

export const resolveCloudflareScopeConfig=env=>readConfig(env).text;
export async function cloudflareScopeSetDigest(scopes){
 if(!valid(scopes))throw Error('oauth_client_scopes_invalid');
 return digest(JSON.stringify([...scopes].sort()));
}
export async function cloudflareScopeConfigProof(env){
 const config=readConfig(env);
 const scopes=[...new Set(config.text.split(/[\s,]+/).filter(Boolean))];
 return {scopeSetDigest:valid(scopes)?await cloudflareScopeSetDigest(scopes):null,
  configurationRevision:config.revision};
}
