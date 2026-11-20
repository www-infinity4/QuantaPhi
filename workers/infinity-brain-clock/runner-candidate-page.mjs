/**
 * Read-only, owner-partitioned keyset scan for the signed Brain runner.
 * A first-page-only scan can bury older eligible work behind >100 blocked
 * tickets. Paged retrieval changes visibility, NOT eligibility, permission,
 * retry limits, leases, wallet balances, or the immutable work log.
 */
const ACTIVE="status IN ('ready','working','blocked')";
const KIND="json_extract(context_json,'$.kind')='robot-directions'";
const PAGE_SIZE=100,MAX_PAGES=4;
const safeTicketId=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(value);

export async function readRunnerQueue(db,{
 ownerHash,order='newest',requestedTicketId=''
}={}){
 if(!db||typeof db.prepare!=='function'||typeof ownerHash!=='string'||!ownerHash||
    !['newest','oldest'].includes(order))throw Error('runner_queue_scope_invalid');
 const descending=order==='newest';
 const sort=descending?'DESC':'ASC';
 const comparator=descending?'<':'>';
 const results=[];
 let after=null,scanLimited=false,pagesRead=0;
 for(let page=0;page<MAX_PAGES;page++){
  const cursor=after?' AND (created_at '+comparator+' ? OR (created_at = ? AND id '+comparator+' ?))':'';
  const sql='SELECT id,context_json,request,created_at,status FROM work_tickets WHERE owner_hash=? AND '+ACTIVE+' AND '+KIND+cursor+' ORDER BY created_at '+sort+', id '+sort+' LIMIT ?';
  const args=after?[ownerHash,after.created_at,after.created_at,after.id,PAGE_SIZE]:[ownerHash,PAGE_SIZE];
  const pageResult=await db.prepare(sql).bind(...args).all();
  const rows=pageResult?.results;
  if(!Array.isArray(rows)||rows.length>PAGE_SIZE)throw Error('runner_queue_page_invalid');
  pagesRead++;
  results.push(...rows);
  if(rows.length<PAGE_SIZE){scanLimited=false;break;}
  scanLimited=true;
  const last=rows.at(-1);
  if(!Number.isSafeInteger(last?.created_at)||!safeTicketId(last?.id))
   throw Error('runner_queue_cursor_invalid');
  after={created_at:last.created_at,id:last.id};
 }
 // An authenticated owner may select a ticket older than the bounded scan.
 // The same owner/status/kind query remains authoritative; it is NOT an
 // override of owner decisions, security holds or source-runner claim gates.
 if(safeTicketId(requestedTicketId)&&!results.some(x=>x.id===requestedTicketId)){
  const sql='SELECT id,context_json,request,created_at,status FROM work_tickets WHERE id=? AND owner_hash=? AND '+ACTIVE+' AND '+KIND;
  const exact=await db.prepare(sql).bind(requestedTicketId,ownerHash).first();
  if(exact)results.unshift(exact);
 }
 return {results,scanLimited,pagesRead};
}
