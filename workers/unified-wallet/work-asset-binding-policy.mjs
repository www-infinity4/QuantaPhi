// Read-only, redacted Cloudflare Worker binding preflight for the reviewed
// GIT wallet release. This never writes settings, secrets, or mints tokens.
// The identifiers below were read from the authenticated Worker settings and
// existing GIT D1 creation receipt; names/IDs are not API credentials.
export const EXPECTED_GIT_DB=Object.freeze({
 name:'GIT_DB',type:'d1',id:'8fdbe4a2-a1d1-48c6-a188-372f631cd187'
});
const REQUIRED_WALLET_BINDINGS=Object.freeze([
 Object.freeze({name:'BOT_WORK_SECRET',type:'secret_text'}),
 Object.freeze({name:'DB',type:'d1',id:'711b3e05-f318-4d30-9a67-4de2af92aa6d'}),
 Object.freeze({name:'IDENTITY_DB',type:'d1',id:'a1a973b2-a37c-4e1c-b68e-a73803238206'}),
 Object.freeze({name:'RECOVERY_ACCESS_AUD',type:'plain_text'}),
 Object.freeze({name:'RECOVERY_ACCESS_ISSUER',type:'plain_text'}),
 Object.freeze({name:'RECOVERY_OWNER_ACCOUNT_ID',type:'plain_text'}),
 Object.freeze({name:'RECOVERY_OWNER_EMAIL',type:'plain_text'})
]);
const validName=name=>typeof name==='string'&&/^[A-Z][A-Z0-9_]{1,80}$/.test(name);
function indexed(list,role,errors){
 const result=new Map();
 if(!Array.isArray(list)){errors.push(role+'_bindings_missing');return result}
 for(const x of list){
  if(!x||!validName(x.name)||typeof x.type!=='string'||!x.type){
   errors.push(role+'_invalid_binding');continue;
  }
  if(result.has(x.name)){errors.push(role+'_duplicate_'+x.name);continue}
  result.set(x.name,x);
 }
 return result;
}
function matches(actual,expected){
 return actual?.type===expected.type&&
  (expected.type!=='d1'||actual?.id===expected.id);
}
/**
 * Compares REDACTED before/after binding metadata, never secret values.
 * "safe" means binding inventory matches the release contract only:
 * it is NOT source review, user authorization, secret-value parity, mint
 * approval, or proof that a Cloudflare Worker was actually deployed.
 */
export function auditWalletWorkBindings(before,after){
 const errors=[],old=indexed(before,'before',errors),next=indexed(after,'after',errors);
 for(const required of REQUIRED_WALLET_BINDINGS){
  if(!matches(old.get(required.name),required))errors.push('baseline_'+required.name+'_missing_or_changed');
  if(!matches(next.get(required.name),required))errors.push('required_'+required.name+'_missing_or_changed');
 }
 for(const [name,was]of old){
  const now=next.get(name);
  if(!now){errors.push('dropped_'+name);continue}
  if(now.type!==was.type||(was.type==='d1'&&now.id!==was.id)){
   errors.push('changed_'+name);
  }
 }
 for(const [name]of next){
  if(!old.has(name)&&name!=='GIT_DB')errors.push('unreviewed_new_binding_'+name);
 }
 if(!matches(next.get('GIT_DB'),EXPECTED_GIT_DB))errors.push('git_db_missing_or_wrong_id');
 if(old.has('GIT_DB')&&!matches(old.get('GIT_DB'),EXPECTED_GIT_DB))errors.push('baseline_git_db_wrong_id');
 return {safe:errors.length===0,errors};
}
