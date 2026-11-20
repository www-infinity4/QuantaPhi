/** Shared pure policies for the opt-in local-only QuantaPhi playground. */
export const MAX_TEXT = 8000;
export const DB_NAME = 'quantaphi-local-mirror-v1';
export const DB_STORE = 'notes';

export async function sha256(text) {
 const bytes = new TextEncoder().encode(text);
 const digest = await crypto.subtle.digest('SHA-256', bytes);
 return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
}
export function prepareRecord(input, timestamp = new Date().toISOString()) {
 const text = String(input ?? '').trim().replace(/\s+/g,' ');
 if (!text) throw new Error('Local text is empty');
 if (text.length > MAX_TEXT) throw new Error('Local text exceeds the 8000-character limit');
 if (!Number.isFinite(Date.parse(timestamp))) throw new Error('Invalid timestamp');
 const counts = Object.create(null);
 for (const word of text.toLowerCase().match(/[\p{L}\p{N}]+/gu) || []) {
   if (word.length > 32) continue;
   counts[word] = (counts[word] || 0) + 1;
 }
 const lexicalProfile = Object.fromEntries(Object.entries(counts)
   .sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0])).slice(0,12));
 return sha256(text).then(hash=>({id:hash,sha256:hash,timestamp,length:text.length,lexicalProfile,text}));
}
export function classifyObservedResource(value, origin) {
 try {
   const url=new URL(value);
   const base=new URL(origin);
   if (!['http:','https:'].includes(url.protocol)) return {domain:'',kind:'invalid'};
   if (url.origin===base.origin) return {domain:url.hostname,kind:'first-party'};
   // Heuristic only, not an asserted fingerprinting or maliciousness verdict.
   if (/(^|\.)(google-analytics|googletagmanager|doubleclick)\.com$/i.test(url.hostname)
    || /(^|\.)(facebook|segment|mixpanel)\.com$/i.test(url.hostname)) {
     return {domain:url.hostname,kind:'suspected-analytics'};
   }
   return {domain:url.hostname,kind:'third-party'};
 } catch { return {domain:'',kind:'invalid'}; }
}
export async function createAuditReceipt({sourceHash,count,time}) {
 const body={sourceHash,count,time,networkProof:'not-established',observedBytesSent:null,
  assurance:'Local content hash only; not signed or an outbound packet measurement'};
 return {...body,receiptHash:await sha256(JSON.stringify(body))};
}
