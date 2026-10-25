/* Owner-partitioned rolling backlog scan.
 * Every clock/runner wake checks a bounded slice but progresses through ALL
 * saved jobs instead of rereading the same first 100 forever.
 * This is DISCOVERY, not approval, a job lease, a ChatGPT session or success.
 */
const OWNER=/^[a-f0-9]{64}$/;
const PREFIX='owner-ticket-cursor:';
const SUFFIX=/^[a-z][a-z0-9-]{2,50}$/;

export async function nextOwnerJobPage(db,storage,ownerHash,purpose,{limit=100}={}){
 if(!OWNER.test(ownerHash||'')||!SUFFIX.test(purpose||''))throw Error('invalid_owner_job_cursor_scope');
 if(!db?.prepare||!storage?.get||!storage?.put)throw Error('owner_job_storage_unavailable');
 const size=Number.isInteger(limit)?Math.max(1,Math.min(100,limit)):100;
 const key=PREFIX+purpose;
 const saved=await storage.get(key);
 const cursor=saved&&Number.isSafeInteger(saved.createdAt)&&saved.createdAt>=0
   &&typeof saved.id==='string'&&saved.id.length>0&&saved.id.length<=90
   ?saved:null;
 const common="SELECT id,status,context_json,request,created_at FROM work_tickets WHERE owner_hash=? AND status IN ('ready','working','blocked') AND json_extract(context_json,'$.kind')='robot-directions' ";
 const after=await db.prepare(common+
   'AND (created_at>? OR (created_at=? AND id>?)) ORDER BY created_at ASC,id ASC LIMIT ?')
   .bind(ownerHash,cursor?.createdAt??-1,cursor?.createdAt??-1,cursor?.id??'',size).all();
 const rows=[...(after.results||[])];
 let wrapped=false;
 if(cursor&&rows.length<size){
   wrapped=true;
   // This second, disjoint page always precedes the previous cursor. Never
   // select an arbitrary unscoped owner or revisit the same item in one wake.
   const before=await db.prepare(common+
     'AND (created_at<? OR (created_at=? AND id<=?)) ORDER BY created_at ASC,id ASC LIMIT ?')
     .bind(ownerHash,cursor.createdAt,cursor.createdAt,cursor.id,size-rows.length).all();
   rows.push(...(before.results||[]));
 }
 if(rows.length){
   const last=rows.at(-1);
   const createdAt=Number(last.created_at);
   if(!Number.isSafeInteger(createdAt)||createdAt<0||typeof last.id!=='string'||!last.id)
     throw Error('invalid_owner_job_page_row');
   await storage.put(key,{createdAt,id:last.id});
 }else if(cursor){
   await storage.put(key,{createdAt:0,id:''});
 }
 return {rows,wrapped,scanned:rows.length,scope:'owner_jobs_only',limit:size};
}
