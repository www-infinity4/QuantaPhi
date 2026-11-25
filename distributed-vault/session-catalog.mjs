// Local-only catalog of explicitly selected conversation records from a personal
// archive. No authentication, network access, discovery, file reads or writes.
import {sealUserArchive,openUserArchive} from './google-gemini-handoff.mjs';
const FORMAT='bubbles-session-catalog/v1', HEX=/^[a-f0-9]{64}$/;
const ID=/^[A-Za-z0-9_-]{1,100}$/, SOURCE=/^[A-Za-z0-9_-]{1,64}$/;
const ZERO='0'.repeat(64),MAX_SESSIONS=1000,MAX_RECORDS=10000;
const encoder=new TextEncoder();
const digest=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(JSON.stringify(value)))),b=>b.toString(16).padStart(2,'0')).join('');
function archiveRecords(archive){
 if(!archive||archive.format!=='quantaphi-personal-archive/v1'||!HEX.test(archive.accountBinding||'')||
    !Array.isArray(archive.chats)||archive.chats.length>MAX_RECORDS)throw Error('invalid archive binding or records');
 const rows=new Map();
 for(const r of archive.chats){
  if(!r||!ID.test(r.id||'')||!['user','assistant'].includes(r.role)||typeof r.text!=='string'||r.text.length>6000||!Number.isSafeInteger(r.at)||rows.has(r.id))throw Error('invalid or duplicate archive record');
  rows.set(r.id,{id:r.id,role:r.role,text:r.text,at:r.at});
 }
 return rows;
}
function selection(spec,rows){
 if(!spec||typeof spec.sessionId!=='string'||!ID.test(spec.sessionId))throw Error('invalid session ID');
 if(typeof spec.source!=='string'||!SOURCE.test(spec.source))throw Error('invalid logical source label');
 if(!Array.isArray(spec.recordIds)||!spec.recordIds.length||spec.recordIds.length>MAX_RECORDS)throw Error('invalid record selection');
 const ids=[...spec.recordIds];
 if(ids.some(id=>typeof id!=='string'||!rows.has(id))||new Set(ids).size!==ids.length)throw Error('missing or duplicate selected record');
 ids.sort();
 return {sessionId:spec.sessionId,source:spec.source,recordIds:ids};
}
async function entryFor(binding,spec,index,previous,rows){
 const selected=selection(spec,rows);
 const entry={label:(index+1).toString(36).toUpperCase(),...selected,previous,contentDigest:await digest(selected.recordIds.map(id=>rows.get(id)))};
 return {...entry,digest:await digest([FORMAT,binding,entry])};
}
export async function verifySessionCatalog(archive,expectedHead){
 const rows=archiveRecords(archive),catalog=archive.sessionCatalog;
 if(!catalog||catalog.format!==FORMAT||catalog.accountBinding!==archive.accountBinding)throw Error('catalog binding mismatch');
 if(!Array.isArray(catalog.entries)||catalog.entries.length>MAX_SESSIONS)throw Error('invalid catalog entries');
 let previous=ZERO;const sessions=new Set(),used=new Set();
 for(let i=0;i<catalog.entries.length;i++){
  const entry=catalog.entries[i];
  const computed=await entryFor(archive.accountBinding,entry,i,previous,rows);
  if(JSON.stringify(entry)!==JSON.stringify(computed)||sessions.has(entry.sessionId)||entry.recordIds.some(id=>used.has(id)))throw Error('catalog integrity mismatch');
  sessions.add(entry.sessionId);entry.recordIds.forEach(id=>used.add(id));previous=entry.digest;
 }
 if(expectedHead!==undefined&&(!HEX.test(expectedHead)||expectedHead!==previous))throw Error('catalog checkpoint mismatch');
 return previous;
}
export async function appendSession(archive,spec){
 if(spec?.consent!==true)throw Error('explicit consent required');
 const rows=archiveRecords(archive),selected=selection(spec,rows);
 const current=archive.sessionCatalog;
 const previous=current?await verifySessionCatalog(archive):ZERO;
 const entries=current?current.entries:[];
 const existing=entries.find(e=>e.sessionId===selected.sessionId);
 if(existing){
  if(existing.source!==selected.source||JSON.stringify(existing.recordIds)!==JSON.stringify(selected.recordIds))throw Error('session conflict');
  return structuredClone(archive);
 }
 if(entries.length>=MAX_SESSIONS)throw Error('catalog session limit reached');
 const used=new Set(entries.flatMap(e=>e.recordIds));
 if(selected.recordIds.some(id=>used.has(id)))throw Error('record already cataloged');
 const entry=await entryFor(archive.accountBinding,selected,entries.length,previous,rows);
 return {...structuredClone(archive),sessionCatalog:{format:FORMAT,accountBinding:archive.accountBinding,entries:[...structuredClone(entries),entry]}};
}
export async function sealSessionArchive(archive,passphrase){
 await verifySessionCatalog(archive);
 return sealUserArchive(archive,passphrase);
}
export async function openSessionArchive(sealed,passphrase,expectedHead){
 const archive=await openUserArchive(sealed,passphrase);
 await verifySessionCatalog(archive,expectedHead);
 return archive;
}
