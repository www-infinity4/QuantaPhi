// Private, explicit Bubbles R2 archives. D1 remains authoritative for chat history.
// No public bucket URL, arbitrary R2 object key, or user-supplied wallet ID.
const TYPES=new Set(['application/json','text/plain','audio/webm','audio/ogg','audio/mpeg','audio/mp4',
 'video/webm','video/mp4','image/jpeg','image/png','application/pdf']);
const MAX_BYTES=16*1024*1024;
const ID=/^[A-Za-z0-9_-]{12,80}$/;
const ROUTE=/^\/v1\/archive\/([A-Za-z0-9_-]{12,80})$/;
const META_HEADERS={'cache-control':'private, no-store','x-content-type-options':'nosniff','vary':'Origin'};
export async function archivePrefix(owner){
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('bubbles-archive-v1:'+owner));
 return 'wallets/'+Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')+'/';
}
async function boundedBody(req){
 const declared=req.headers.get('content-length');
 if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)>MAX_BYTES))throw Error('too_large');
 if(!req.body)return new Uint8Array();
 const reader=req.body.getReader(),chunks=[];let total=0;
 try{
  while(true){
   const {done,value}=await reader.read();if(done)break;
   total+=value.byteLength;
   if(total>MAX_BYTES){await reader.cancel();throw Error('too_large')}
   chunks.push(value);
  }
 }finally{reader.releaseLock()}
 const combined=new Uint8Array(total);let offset=0;
 for(const chunk of chunks){combined.set(chunk,offset);offset+=chunk.byteLength}
 return combined;
}
function listCursor(u){
 const cursor=u.searchParams.get('cursor');
 if(cursor!==null&&(cursor.length>600||!/^[a-zA-Z0-9_+=/-]+$/.test(cursor)))return false;
 return cursor;
}
export async function handleArchive(req,env,owner,origin,reply){
 const u=new URL(req.url),m=ROUTE.exec(u.pathname);
 if(!env.ARCHIVE_BUCKET)return reply(origin,{ok:false,error:'archive_not_configured'},503);
 if(!m&&u.pathname!=='/v1/archive')return reply(origin,{ok:false,error:'not_found'},404);
 const prefix=await archivePrefix(owner);
 if(u.pathname==='/v1/archive'){
  if(req.method!=='GET')return reply(origin,{ok:false,error:'method_not_allowed'},405);
  const cursor=listCursor(u);
  if(cursor===false)return reply(origin,{ok:false,error:'invalid_cursor'},400);
  const params={prefix,limit:50,...(cursor?{cursor}:{})};
  const listed=await env.ARCHIVE_BUCKET.list(params);
  const items=(listed.objects||[]).filter(o=>o.key.startsWith(prefix)&&ID.test(o.key.slice(prefix.length)))
   .map(o=>({id:o.key.slice(prefix.length),bytes:o.size,uploadedAt:o.uploaded?.toISOString?.()||null,
    contentType:TYPES.has(o.httpMetadata?.contentType)?o.httpMetadata.contentType:'application/octet-stream'}));
  return reply(origin,{ok:true,items,cursor:listed.truncated?listed.cursor||null:null,hasMore:!!listed.truncated});
 }
 const id=m[1],key=prefix+id;
 if(req.method==='PUT'){
  const mime=(req.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
  if(!TYPES.has(mime))return reply(origin,{ok:false,error:'unsupported_content_type'},415);
  let bytes;
  try{bytes=await boundedBody(req)}catch(e){
   return reply(origin,{ok:false,error:e.message==='too_large'?'too_large':'upload_read_failed'},e.message==='too_large'?413:400);
  }
  if(!bytes.byteLength)return reply(origin,{ok:false,error:'empty_file'},400);
  // Conditional R2 write prevents an ID from replacing another saved object.
  const stored=await env.ARCHIVE_BUCKET.put(key,bytes,{onlyIf:{etagDoesNotMatch:'*'},
   httpMetadata:{contentType:mime,cacheControl:'private, no-store'},
   customMetadata:{source:'explicit-user-archive',version:'1'}});
  if(!stored)return reply(origin,{ok:false,error:'already_exists'},409);
  return reply(origin,{ok:true,id,bytes:bytes.byteLength,stored:true},201);
 }
 if(req.method==='GET'){
  const object=await env.ARCHIVE_BUCKET.get(key);
  if(!object||!object.body)return reply(origin,{ok:false,error:'not_found'},404);
  const mime=TYPES.has(object.httpMetadata?.contentType)?object.httpMetadata.contentType:'application/octet-stream';
  return new Response(object.body,{status:200,headers:{...META_HEADERS,'content-type':mime,
   'content-disposition':'attachment; filename="bubbles-archive-'+id+'"',
   'access-control-allow-origin':origin}});
 }
 if(req.method==='DELETE'){
  const existing=await env.ARCHIVE_BUCKET.head(key);
  if(!existing)return reply(origin,{ok:true,deleted:0});
  await env.ARCHIVE_BUCKET.delete(key);
  return reply(origin,{ok:true,deleted:1});
 }
 return reply(origin,{ok:false,error:'method_not_allowed'},405);
}
