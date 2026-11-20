import {createHash} from 'node:crypto';
/** Parse explicitly selected provider exports into PRIVATE staging rows.
 * No fetch, browser cookies, account token, implicit persistence or remote upload.
 * Provider export layouts vary; unrecognized records must not be invented.
 */
const MAX_BYTES=5_000_000, MAX_RECORDS=3000, MAX_TEXT=6000;
const string=(x,n)=>typeof x==='string'?x.trim().slice(0,n):'';
export function parseHistoryExport(raw,{provider,accountId}={}){
 if(!['chatgpt','gemini'].includes(provider))throw Error('history_provider_invalid');
 if(!/^[a-z0-9][a-z0-9_-]{2,78}$/i.test(accountId||''))throw Error('history_account_scope_required');
 if(typeof raw!=='string'||Buffer.byteLength(raw,'utf8')>MAX_BYTES)throw Error('history_export_size_invalid');
 let source;try{source=JSON.parse(raw)}catch{throw Error('history_export_json_invalid')}
 if(!Array.isArray(source))throw Error('history_export_format_invalid');
 const records=[],seen=new Set();
 function add(conversationId,author,text,date){
  if(records.length>=MAX_RECORDS)return;
  const body=string(text,MAX_TEXT);if(!body||!['user','assistant','model'].includes(author))return;
  const time=date==null?null:Number.isFinite(Date.parse(String(date)))?new Date(date).toISOString():null;
  const id=createHash('sha256').update(JSON.stringify([provider,accountId,conversationId,author,body,time])).digest('hex');
  if(seen.has(id))return;seen.add(id);
  records.push(Object.freeze({id,provider,accountId,conversationId:string(String(conversationId),120),role:author==='model'?'assistant':author,text:body,at:time,untrustedImportedText:true}));
 }
 if(provider==='chatgpt'){
  for(const c of source.slice(0,MAX_RECORDS)){
   const nodes=c?.mapping&&typeof c.mapping==='object'&&!Array.isArray(c.mapping)?Object.values(c.mapping):[];
   for(const node of nodes.slice(0,MAX_RECORDS-records.length)){
    const m=node?.message;
    const parts=m?.content?.parts;
    if(!Array.isArray(parts)||!['user','assistant'].includes(m?.author?.role))continue;
    const text=parts.filter(x=>typeof x==='string').join('\n');
    const created=Number(m?.create_time);const date=Number.isFinite(created)&&created>0?new Date(created*1000).toISOString():null;
    add(String(c.id||c.title||'conversation'),m.author.role,text,date);
   }
   if(records.length>=MAX_RECORDS)break;
  }
 }else{
  // Takeout activity is not equivalent to a complete Gemini conversation export.
  for(const c of source.slice(0,MAX_RECORDS)){
   const detail=Array.isArray(c?.details)?c.details.find(d=>typeof d?.value==='string'&&d.value.trim()):null;
   const text=string(detail?.value||'',MAX_TEXT);
   if(!text)continue;
   add(String(c.id||c.title||'activity'),'model',text,c.time||null);
  }
 }
 return Object.freeze({provider,accountId,records,imported:false,persisted:false,source:'owner_selected_export',requiresPrivateStorage:true});
}
