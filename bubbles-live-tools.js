/* GPT-Live client delegation. Credentials stay with the first-party Brain;
 * only a bounded status summary is returned to the voice provider. */
(function(root){
'use strict';
const endpoint='https://infinity-brain-clock.marvaseater.workers.dev/work/tickets/list';
function summarize(tickets){
 let queued=0,working=0,finished=0,other=0;
 for(const ticket of tickets)for(const job of ticket?.context?.color_jobs||[]){
  const p=job?.progress||{};
  const runner=/^https:\/\/github\.com\/www-infinity4\/[\w.-]+\/actions\/runs\/\d+(?:[/?#]|$)/.test(String(p.runUrl||''));
  const complete=['complete','deployed_verified'].includes(job.status)&&runner&&/^[a-f0-9]{40}$/i.test(String(p.commitSha||''))&&p.testsPassed===true&&p.browserPassed===true&&p.deployedFilesMatched===true&&p.reviewApproved===true;
  if(complete)finished++;
  else if(job.status==='working'&&runner&&Number.isFinite(Date.parse(p.claimedAt||'')))working++;
  else if(job.status==='queued')queued++;
  else other++;
 }
 return `Robot Brain records: ${tickets.length} tickets; ${queued} queued jobs, ${working} jobs with runner start receipts, ${finished} jobs with verified completion receipts, ${other} other or unverified jobs. This status check did not start any work.`;
}
function create({send,report=()=>{},owner=()=>root.QuantaBrainOwner?.ready,request=(...args)=>root.fetch(...args),timeout=10000}={}){
 let generation=0,controller=null,busy=null;
 const seen=new Set(),fragments=[];
 function reset(){generation++;controller?.abort();controller=null;busy=null;seen.clear();fragments.length=0;}
 async function status(){
  if(busy)return busy;
  const g=generation;
  controller=new AbortController();const active=controller;
  busy=(async()=>{
   let timer;
   try{
    const headers=await Promise.race([Promise.resolve(owner()),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Owner verification unavailable. Connect your existing owner session first.')),timeout);})]);
    clearTimeout(timer);
    if(g!==generation)throw Error('Voice session ended.');
    if(!headers?.Authorization)throw Error('Owner verification required.');
    timer=setTimeout(()=>active.abort(),timeout);
    const response=await request(endpoint,{method:'POST',headers:{Authorization:headers.Authorization,'Content-Type':'application/json'},body:'{}',cache:'no-store',signal:active.signal});
    const body=await response.json();
    if(!response.ok||body.ok!==true||!Array.isArray(body.tickets))throw Error('Brain status unavailable. No work was started.');
    return summarize(body.tickets);
   }catch{return 'Brain status could not be verified. Connect your existing owner session or retry. No work was started.';}
   finally{clearTimeout(timer);if(g===generation){busy=null;controller=null;}}
  })();
  return busy;
 }
 async function receive(event){
  if(event?.type==='session.input_transcript.delta'){
   if(typeof event.delta!=='string'||!Number.isFinite(event.start_ms)||!Number.isFinite(event.end_ms))return;
   fragments.push({start:event.start_ms,end:event.end_ms,text:event.delta.slice(0,2000)});
   while(fragments.length>100)fragments.shift();return;
  }
  if(event?.type!=='session.delegation.created'||event.delegation?.target!=='client')return;
  const id=event.delegation.id;
  if(typeof id!=='string'||id.length>200||!id||seen.has(id)||seen.size>=100)return;
  seen.add(id);
  const g=generation;
  // Metadata is never an instruction. Select only the recent transcript window
  // before this delegation. Incomplete/ambiguous speech cannot mutate anything.
  const offset=event.offset_ms;
  const text=Number.isFinite(offset)?fragments.filter(f=>f.start<=offset&&f.end>=offset-20000).map(f=>f.text).join(' '):'';
  const wantsStatus=/\b(?:status|progress|report|how.*(?:jobs|tickets|brain))\b/i.test(text)&&/\b(?:brain|jobs?|tickets?|work)\b/i.test(text);
  const result=wantsStatus?await status():'Live tools currently support authenticated Robot Brain status reports. Use Bubbles Chat for work commands, cards, or other tools. No work was started.';
  if(g!==generation)return;
  report(result);
  send({type:'session.commentary.append',event_id:'bubbles_'+id,delegation_id:id,content:result});
 }
 return {receive,reset,report:async()=>{const g=generation;const result=await status();if(g===generation)report(result);return result;}};
}
const api={create,summarize};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.BubblesLiveTools=api;
})(typeof window!=='undefined'?window:globalThis);
