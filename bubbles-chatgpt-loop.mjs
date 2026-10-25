import {chooseContinuation,classifyReply,snapshotKey,nextEightConversations} from './bubbles-chatgpt-continuity.mjs';

const waitFor=(ms,signal)=>new Promise(resolve=>{
 const done=()=>{clearTimeout(timer);signal.removeEventListener('abort',done);resolve();};
 const timer=setTimeout(done,ms);
 signal.addEventListener('abort',done,{once:true});
 if(signal.aborted)done();
});

// One owner-started loop, eight pinned recent chats, one request at a time.
// All checkpoints are ephemeral. Closing this page ends this controller.
export function createChatGPTLoop({listRecent,inspect,resume,beforeRound=async()=>{},
 onEvent=()=>{},wait=waitFor,now=Date.now,intervalMs=60000,cooldownMs=120000}){
 let active=null;
 const records=new Map();
 const emit=(run,type,extra={})=>onEvent({type,round:run.round,submitted:run.submitted,
  repliesObserved:run.repliesObserved,...extra});
 async function execute(run){
  try{
   const listed=await listRecent(run.signal);
   if(run.signal.aborted)return;
   // Pin before our own nudges reorder ChatGPT's sidebar. Do not drift into
   // older conversations or operate the same chat twice through duplicate links.
   const items=nextEightConversations(listed).conversations;
   if(!items.length)throw Error('chatgpt_history_not_available');
   emit(run,'selected',{count:items.length});
   while(!run.signal.aborted){
    await beforeRound(run.signal);
    if(run.signal.aborted)break;
    run.round++;
    for(const item of items){
     if(run.signal.aborted)break;
     let record=records.get(item.url)||{};
     try{
      const snapshot=await inspect(item,run.signal);
      if(run.signal.aborted)break;
      if(snapshot?.conversationUrl!==item.url)throw Error('conversation_changed');
      if(record.before){
       const reply=classifyReply(snapshot,record.before);
       if(reply.state==='unverified'){
        emit(run,'waiting',{title:item.title,reason:'awaiting_new_reply'});continue;
       }
       // Observe the completed assistant turn twice before another send.
       const key=snapshotKey(snapshot);
       if(record.replyKey!==key){record.replyKey=key;records.set(item.url,record);
        emit(run,'waiting',{title:item.title,reason:'confirming_completed_reply'});continue;}
       run.repliesObserved++;
       record.before=null;
       emit(run,'reply',{title:item.title,state:reply.state});
      }
      const decision=chooseContinuation(snapshot,{allowRevisit:true});
      if(decision.state!=='ready'){
       emit(run,decision.state,{title:item.title,reason:decision.reason});continue;
      }
      const key=snapshotKey(snapshot);
      const answer=String(snapshot.latestAssistantText||'').trim();
      if(snapshot.recentNudgeCount>0&&record.sentAt===undefined){
       record.sentAt=now();records.set(item.url,record);
      }
      if(key===record.attemptKey||answer===record.answerBefore){
       emit(run,'waiting',{title:item.title,reason:'unchanged_after_continuation'});continue;
      }
      if(record.sentAt!==undefined&&now()-record.sentAt<cooldownMs){
       emit(run,'waiting',{title:item.title,reason:'continuation_cooldown'});continue;
      }
      // Claim before I/O. A lost HTTP receipt must never cause a blind resend.
      record={...record,attemptKey:key,answerBefore:answer,sentAt:now(),before:snapshot,replyKey:null};
      records.set(item.url,record);
      const receipt=await resume(item,snapshot);
      if(receipt?.submissionVerified!==true){
       emit(run,'unverified',{title:item.title,reason:receipt?.error||'submission_not_observed'});continue;
      }
      run.submitted++;
      emit(run,'submitted',{title:item.title});
     }catch(error){
      // Transport/authentication errors end the loop. Never silently replace
      // a signed-in browser or continue sending after permission is revoked.
      throw Error(String(error?.message||error));
     }
    }
    if(!run.signal.aborted)await wait(intervalMs,run.signal);
   }
  }catch(error){if(!run.signal.aborted)emit(run,'blocked',{reason:String(error?.message||error)});}
  finally{if(active===run)active=null;emit(run,'stopped');}
 }
 return {
  get running(){return active!==null;},
  start(){
   if(active)return false;
   const controller=new AbortController();
   const run={signal:controller.signal,controller,round:0,submitted:0,repliesObserved:0};
   active=run;run.done=execute(run);return true;
  },
  stop(){if(active)active.controller.abort();},
  async settled(){if(active)await active.done;}
 };
}
