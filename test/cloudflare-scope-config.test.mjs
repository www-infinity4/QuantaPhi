import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCloudflareScopeChunks,resolveCloudflareScopeConfig,cloudflareScopeSetDigest,cloudflareScopeConfigProof} from '../workers/bubbles-connections/scope-config.mjs';
const revision='css_11111111-1111-1111-1111-111111111111';
const other='css_22222222-2222-2222-2222-222222222222';
const names=[1,2,3].map(i=>'CLOUDFLARE_OAUTH_ALLOWED_SCOPES_PART_'+i);
const bindings=chunks=>Object.fromEntries(chunks.map((chunk,i)=>[names[i],chunk]));
const scopes=count=>Array.from({length:count},(_,i)=>'scope-'+i+'.read');
test('versioned chunks roundtrip exactly for small, 386 and 403 registrations',()=>{
 for(const count of [1,2,3,385,386,403]){
  const list=scopes(count),chunks=buildCloudflareScopeChunks(list,revision);
  assert.equal(chunks.length,3);
  assert.ok(chunks.every(chunk=>new TextEncoder().encode(chunk).length<=4800));
  assert.deepEqual(resolveCloudflareScopeConfig(bindings(chunks)).split(' '),list);
 }
});
test('missing, mixed, reordered or malformed revisions retain the legacy configuration',()=>{
 const chunks=buildCloudflareScopeChunks(scopes(403),revision);
 const second=buildCloudflareScopeChunks(scopes(403),other);
 const cases=[
  ['',chunks[1],chunks[2]],
  [chunks[0],second[1],chunks[2]],
  [chunks[1],chunks[0],chunks[2]],
  [chunks[0],'not json',chunks[2]],
  [chunks[0],' '.repeat(5200),chunks[2]],
  [JSON.stringify({...JSON.parse(chunks[0]),total:402}),chunks[1],chunks[2]],
  [JSON.stringify({...JSON.parse(chunks[0]),schemaVersion:2}),chunks[1],chunks[2]]
 ];
 for(const parts of cases)assert.equal(resolveCloudflareScopeConfig({
  ...bindings(parts),CLOUDFLARE_OAUTH_ALLOWED_SCOPES:'account.read'
 }),'account.read');
});
test('invalid scope content or totals fail closed even in otherwise complete envelopes',()=>{
 const chunks=buildCloudflareScopeChunks(scopes(403),revision);
 const invalid=[['duplicate',0],['invalid scope',0],[null,0]];
 for(const [value,index] of invalid){
  const parts=chunks.map(JSON.parse);
  parts[0].scopes[index]=value;
  if(value==='duplicate')parts[0].scopes[1]=value;
  assert.equal(resolveCloudflareScopeConfig(bindings(parts.map(x=>JSON.stringify(x)))), '');
 }
});
test('legacy 386 plain chunks remain compatible; variable totals require complete new envelopes',()=>{
 for(const count of [386,403]){
  const list=scopes(count),size=Math.ceil(count/3);
  const chunks=[0,1,2].map(i=>list.slice(i*size,(i+1)*size).join(' '));
  assert.equal(resolveCloudflareScopeConfig(bindings(chunks)),count===386?list.join(' '):'');
 }
});
test('builder refuses unbounded, invalid or oversized source inventories before any write',()=>{
 for(const list of [[],scopes(1001),['same','same'],['invalid scope'],
  Array.from({length:400},(_,i)=>'a'.repeat(95)+i)]){
  assert.throws(()=>buildCloudflareScopeChunks(list,revision));
 }
 assert.throws(()=>buildCloudflareScopeChunks(scopes(3),'untrusted-revision'));
});
test('scope-set proof is order-independent but distinguishes same-count permission changes',async()=>{
 const list=scopes(403),chunks=buildCloudflareScopeChunks(list,revision);
 const proof=await cloudflareScopeConfigProof(bindings(chunks));
 assert.equal(proof.scopeSetDigest,await cloudflareScopeSetDigest([...list].reverse()));
 assert.notEqual(proof.scopeSetDigest,await cloudflareScopeSetDigest(list.map(scope=>'other-'+scope)));
 assert.equal(proof.configurationRevision,revision);
 const legacy=await cloudflareScopeConfigProof({CLOUDFLARE_OAUTH_ALLOWED_SCOPES:list.join(' ')});
 assert.equal(legacy.scopeSetDigest,proof.scopeSetDigest);
 assert.equal(legacy.configurationRevision,null);
});
