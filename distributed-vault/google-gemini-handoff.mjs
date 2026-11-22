// Private user-controlled archive and Gemini handoff. No Google upload APIs,
// Gemini automation, third-party network writes, or cross-account aggregation.
// Browser and Node 22 WebCrypto, no npm dependencies.
const ARCHIVE='quantaphi-personal-archive/v1';
const SEALED='quantaphi-encrypted-backup/v1';
const SCOPE=/^[a-f0-9]{64}$/;
const HEX=/^[a-f0-9]{64}$/;
const MAX_RECORDS=10000,MAX_TEXT=6000,MAX_BYTES=24*1024*1024;
const encoder=new TextEncoder(),decoder=new TextDecoder();
const fail=message=>{throw new Error(message)};
const bytesToHex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
const sha=async content=>bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256',content)));
const b64=bytes=>{
 let value='';for(let i=0;i<bytes.length;i+=0x8000)value+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
 return btoa(value);
};
const unb64=text=>{
 if(typeof text!=='string'||text.length%4!==0||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(text))fail('invalid backup encoding');
 return Uint8Array.from(atob(text),c=>c.charCodeAt(0));
};
function normalize(records,ownerScope,kind){
 if(!Array.isArray(records)||records.length>MAX_RECORDS)fail('too many '+kind+' records to export safely');
 const byId=new Map();
 for(const record of records){
  if(!record||record.scope!==ownerScope)fail('account scope mismatch: export stopped');
  const id=typeof record.id==='string'?record.id:'';
  if(!/^[a-zA-Z0-9_-]{1,100}$/.test(id))fail('invalid '+kind+' record ID');
  const at=record.at;
  if(!Number.isSafeInteger(at)||at<946684800000||at>Date.now()+86400000)fail('invalid '+kind+' timestamp');
  const text=kind==='chat'?record.text:record.query;
  if(typeof text!=='string'||!text.trim())fail('invalid '+kind+' content');
  if(text.length>MAX_TEXT)fail('too long '+kind+' record; split/repair source first');
  const value=kind==='chat'?{id,role:record.role,text,at}:{id,query:text,at};
  if(kind==='chat'&&!['user','assistant'].includes(record.role))continue;
  const previous=byId.get(id);
  if(previous&&JSON.stringify(previous)!==JSON.stringify(value))fail('conflicting duplicate '+kind+' record');
  byId.set(id,value);
 }
 return [...byId.values()].sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id));
}
export async function buildUserArchive({ownerScope,consent,chats=[],searches=[]}={}){
 if(consent!==true)fail('explicit consent required for personal export');
 if(typeof ownerScope!=='string'||!SCOPE.test(ownerScope))fail('verified account required before export');
 const normalizedChats=normalize(chats,ownerScope,'chat');
 const normalizedSearches=normalize(searches,ownerScope,'search');
 const archive={
  format:ARCHIVE,accountBinding:await sha(encoder.encode('QuantaPhi-user-archive|'+ownerScope)),
  exportedAt:new Date().toISOString(),
  sourceScope:'verified-wallet-indexed-records',
  chats:normalizedChats,searches:normalizedSearches
 };
 if(encoder.encode(JSON.stringify(archive)).length>MAX_BYTES)fail('too many bytes for one safe archive; export smaller verified batches');
 return archive;
}
function validateArchive(archive){
 if(!archive||archive.format!==ARCHIVE||!HEX.test(archive.accountBinding||'')||
  !Array.isArray(archive.chats)||!Array.isArray(archive.searches)||archive.chats.length>MAX_RECORDS||
  archive.searches.length>MAX_RECORDS)fail('invalid personal archive');
 return archive;
}
async function derive(passphrase,salt){
 const base=await crypto.subtle.importKey('raw',encoder.encode(passphrase),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:250000,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
export async function sealUserArchive(archive,passphrase){
 validateArchive(archive);
 if(typeof passphrase!=='string'||passphrase.length<16)fail('passphrase must contain at least 16 characters');
 const payload=encoder.encode(JSON.stringify(archive));
 if(payload.byteLength>MAX_BYTES)fail('archive too large');
 const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
 const key=await derive(passphrase,salt);
 const encrypted=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,payload));
 return {format:SEALED,algorithm:'AES-256-GCM',kdf:'PBKDF2-HMAC-SHA256',
  iterations:250000,salt:b64(salt),iv:b64(iv),ciphertext:b64(encrypted),sha256:await sha(payload)};
}
export async function openUserArchive(sealed,passphrase){
 if(!sealed||sealed.format!==SEALED||sealed.algorithm!=='AES-256-GCM'||sealed.kdf!=='PBKDF2-HMAC-SHA256'||
    sealed.iterations!==250000||!HEX.test(sealed.sha256||''))fail('invalid encrypted backup format');
 const salt=unb64(sealed.salt),iv=unb64(sealed.iv),ciphertext=unb64(sealed.ciphertext);
 if(salt.length!==16||iv.length!==12||ciphertext.length<16||ciphertext.length>MAX_BYTES+16)fail('invalid encrypted backup bytes');
 if(typeof passphrase!=='string'||passphrase.length<1)fail('passphrase required');
 try{
  const key=await derive(passphrase,salt);
  const output=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv},key,ciphertext));
  if(await sha(output)!==sealed.sha256)fail('backup integrity mismatch');
  return validateArchive(JSON.parse(decoder.decode(output)));
 }catch{fail('backup decryption/integrity failed; wrong passphrase or corrupted file');}
}
export function toGeminiText(archive){
 const a=validateArchive(archive);
 const parts=['QuantaPhi / Bubbles user-selected conversation and search history',
  'This is a manual text handoff to Gemini, not a native Gemini history import or an automatic sync.',
  'Only records that were locally available and authorized for this account are included. Review before sharing.',
  '', 'Bubbles chats ('+a.chats.length+')'];
 for(const x of a.chats)parts.push(new Date(x.at).toISOString()+' '+x.role+': '+x.text);
 parts.push('','QuantaPhi searches ('+a.searches.length+')');
 for(const x of a.searches)parts.push(new Date(x.at).toISOString()+' search: '+x.query);
 const result=parts.join('\n');
 if(encoder.encode(result).length>MAX_BYTES)fail('Gemini text exceeds safe handoff size');
 return result+'\n';
}
/**
 * Read only searches belonging to the EXACT verified current wallet token.
 * The same token must validate against Bubbles' profile endpoint and the
 * per-wallet Quanta search journal. Never use unscoped local token histories.
 */
export async function readVerifiedWalletSearches({memory,connection,fetchImpl=fetch}={}){
 const scope=memory?.profileScope;
 if(memory?.cloudConnected!==true||!SCOPE.test(scope||''))fail('verified wallet required to export searches');
 if(typeof connection?.resolveDeviceToken!=='function')fail('wallet search connection unavailable');
 const token=await connection.resolveDeviceToken();
 if(typeof token!=='string'||!token)fail('wallet search token unavailable');
 const headers={Authorization:'Bearer '+token};
 const options={method:'GET',headers,cache:'no-store',credentials:'omit',redirect:'error',signal:AbortSignal.timeout(12000)};
 const verified=await fetchImpl('https://bubbles-memory.marvaseater.workers.dev/v1/profile',options);
 if(!verified?.ok)fail('verified wallet account check unavailable');
 const account=await verified.json();
 if(!account?.ok||account.profile!==scope)fail('account mismatch; refused to mix search history');
 const response=await fetchImpl('https://quanta-phi-ledger.marvaseater.workers.dev/v1/quants/history',options);
 if(!response?.ok)fail('search history unavailable, no partial export claimed');
 const body=await response.json();
 if(!body?.ok||!Array.isArray(body.searches))fail('search history response invalid');
 if(body.searches.length>=1000)fail('search archive limited to 1000 recent records; full export needs cursor support');
 return body.searches.map(row=>{
  const text=String(row?.query_text||'');
  return {scope,id:String(row?.search_id||''),query:text,at:Number(row?.created_at)};
 });
}
