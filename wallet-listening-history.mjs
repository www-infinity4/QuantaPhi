// Read-only signed Music Quant ledger projection. Listening records are a
// subset of Music Quants, not extra mints. No local counters or client minting.
const missing=()=>({available:false,total:null,listening:null});
const str=(value,max)=>typeof value==='string'?value.slice(0,max):'';
const safeUrl=value=>{try{const url=new URL(String(value||''));return url.protocol==='https:'?url.href.slice(0,900):'';}catch{return ''}};
export async function readListeningHistory(fetchPage,maxPages=40){
 if(typeof fetchPage!=='function'||!Number.isSafeInteger(maxPages)||maxPages<1||maxPages>40)return missing();
 let walletId=null,total=null,offset=0;
 const listening=[],seen=new Set();
 try{
  for(let i=0;i<maxPages;i++){
   const page=await fetchPage(offset);
   const n=Number(page?.balance);
   if(page?.ok!==true||typeof page.wallet_id!=='string'||!page.wallet_id||
      !Number.isSafeInteger(n)||n<0||n>500000||!Array.isArray(page.quants)||page.quants.length>500||
      typeof page.has_more!=='boolean')return missing();
   if(walletId!==null&&(page.wallet_id!==walletId||n!==total))return missing();
   if(walletId===null){walletId=page.wallet_id;total=n;}
   if(page.has_more&&!page.quants.length)return missing();
   for(const q of page.quants){
    if(!q||typeof q.id!=='string'||!/^mq_[a-zA-Z0-9_-]{1,100}$/.test(q.id)||seen.has(q.id))return missing();
    seen.add(q.id);
    if(q.kind==='listening'){
     const rawEvents=Array.isArray(q.context?.events)?q.context.events:[];
     listening.push({
      id:q.id,hash:/^[a-f0-9]{64}$/.test(q.hash||'')?q.hash:'',
      song:str(q.song,180),sourceUrl:safeUrl(q.sourceUrl),
      startedAt:str(q.startedAt,50),endedAt:str(q.endedAt,50),
      durationSec:Number.isFinite(+q.durationSec)?Math.max(0,Math.min(86400,+q.durationSec)):0,
      context:{events:rawEvents.slice(0,12).map(e=>({
       action:str(e?.action,40),topic:str(e?.topic,180),
       channel:str(e?.channel,100),program:str(e?.program,180),
       page:str(e?.page,180),at:str(e?.at,40)}))},
      cloudCreatedAt:str(q.cloudCreatedAt,50)
     });
    }
   }
   offset+=page.quants.length;
   if(offset>total)return missing();
   if(!page.has_more)return offset===total?{available:true,total,listening,walletId}:missing();
  }
 }catch{/* unavailable is not zero listening credits */}
 return missing();
}
