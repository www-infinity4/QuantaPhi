import {browserAction} from '../bubbles-tools/browser-cdp.mjs';
import {chooseContinuation,nextEightConversations,snapshotKey,classifyReply,selectChatGPTSignInTab} from '../../bubbles-chatgpt-continuity.mjs';

const KEY='owner-chatgpt-continuation-v1',TICK=15000,COOLDOWN=120000;
const hash=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',
 new TextEncoder().encode(String(text||'')))),b=>b.toString(16).padStart(2,'0')).join('');
const summary=state=>({ok:true,running:state?.running===true,phase:state?.phase||'off',
 selected:state?.chats?.length||0,checked:state?.checked||0,submitted:state?.submitted||0,
 repliesObserved:state?.repliesObserved||0,expiresAt:state?.expiresAt||null,
 lastCheckedAt:state?.lastCheckedAt||null,error:state?.error||null,background:true});

// A narrow job started by an authenticated owner. It may submit only literal '*'
// in eight pinned chats until the original grants expire. It retains session/tab
// references and hashes, never bearer proofs, messages, passwords or cookies.
export class ContinuationSupervisor {
 constructor(storage,env,grants,{action=browserAction,now=Date.now}={}){
  this.storage=storage;this.env=env;this.grants=grants;this.action=action;this.now=now;
 }
 async status(){return summary(await this.storage.get(KEY));}
 async context(){
  const state=await this.storage.get(KEY);
  if(!state)return null;
  return {sessionId:state.sessionId,targetId:state.chats.length?state.historyTargetId:state.signInTargetId||state.historyTargetId};
 }
 async start({sessionId,targetId}){
  if(!/^[a-f0-9-]{36}$/i.test(sessionId||'')||typeof targetId!=='string'||!targetId||targetId.length>200)
   throw Error('invalid_continuation_session');
  const grant=await this.grants();
  if(!grant.enabled||!Number.isFinite(grant.expiresAt)||grant.expiresAt<=this.now())throw Error('existing_five_day_approval_required');
  if(!this.env.CHATGPT_LOGIN_EMAIL)throw Error('chatgpt_account_not_configured');
  const targets=await this.env.BROWSER.devtools.listTargets(sessionId);
  if(!targets.some(t=>t.type==='page'&&t.id===targetId))throw Error('browser_tab_not_found');
  const current=await this.storage.get(KEY);
  if(current?.running&&current.expiresAt>this.now()){
   if(current.sessionId!==sessionId)throw Error('continuation_already_running');
   // Retry cannot replace the eight chats or extend the original expiry.
   await this.storage.setAlarm(this.now()+TICK);return summary(current);
  }
  const state={id:crypto.randomUUID(),running:true,phase:'awaiting_signin',sessionId,
   historyTargetId:targetId,trustedAuthTargetIds:[],expiresAt:grant.expiresAt,cursor:0,chats:[],checked:0,
   submitted:0,repliesObserved:0,lastCheckedAt:null};
  await this.storage.transaction(async tx=>{await tx.put(KEY,state);await tx.setAlarm(this.now()+TICK);});
  return summary(state);
 }
 async stop(reason='stopped',expectedId){
  await this.storage.transaction(async tx=>{
   const state=await tx.get(KEY);if(!state||(expectedId&&state.id!==expectedId))return;
   await tx.put(KEY,{...state,running:false,phase:reason});await tx.deleteAlarm();
  });
  return this.status();
 }
 async allowed(id){
  const grant=await this.grants(),state=await this.storage.get(KEY);
  return state?.id===id&&state.running===true&&state.expiresAt>this.now()&&grant.enabled===true&&grant.expiresAt>this.now();
 }
 async save(state,delay=TICK){
  const grant=await this.grants();
  const saved=await this.storage.transaction(async tx=>{
   const current=await tx.get(KEY);
   if(current?.id!==state.id||!current.running)throw Error('continuation_stopped');
   if(!grant.enabled||grant.expiresAt<=this.now()||state.expiresAt<=this.now()){
    await tx.put(KEY,{...current,running:false,phase:'approval_expired'});await tx.deleteAlarm();
    return false;
   }
   await tx.put(KEY,state);
   if(delay!==null)await tx.setAlarm(Math.min(this.now()+delay,state.expiresAt));
   return true;
  });
  if(!saved)throw Error('existing_five_day_approval_required');
 }
 async fail(state,error){
  // Never expose provider errors that might contain session URLs or private text.
  await this.storage.transaction(async tx=>{
   const current=await tx.get(KEY);if(current?.id!==state.id||!current.running)return;
   await tx.put(KEY,{...current,running:false,phase:'blocked',error});await tx.deleteAlarm();
  });
 }
 async tick(){
  let state=await this.storage.get(KEY);
  if(!state?.running)return;
  if(!await this.allowed(state.id)){await this.stop('approval_expired',state.id);return;}
  // At-least-once alarm delivery must never replay an uncertain external send.
  if(state.phase==='sending'){await this.fail(state,'uncertain_send');return;}
  try{
   const act=async(action,extra={})=>{
    if(!await this.allowed(state.id))throw Error('continuation_stopped');
    const result=await this.action(this.env,{sessionId:state.sessionId,action,...extra});
    if(result?.ok===false){
     const safe=['different_chatgpt_account','chatgpt_account_not_configured','unexpected_signin_origin','ambiguous_google_account'];
     throw Error(safe.includes(result.error)?result.error:'browser_action_unconfirmed');
    }
    return result;
   };
   if(!state.chats.length){
    const tabs=await this.env.BROWSER.devtools.listTargets(state.sessionId);
    const trustedAuthTargetIds=state.trustedAuthTargetIds||[];
    const selectedTab=selectChatGPTSignInTab(tabs,state.signInTargetId||state.historyTargetId,{trustedAuthTargetIds});
    if(!selectedTab.targetId){
     state.phase='awaiting_signin';state.error=selectedTab.state;await this.save(state,60000);return;
    }
    if(selectedTab.state==='authentication_page'&&!trustedAuthTargetIds.includes(selectedTab.targetId))
     trustedAuthTargetIds.push(selectedTab.targetId);
    state.trustedAuthTargetIds=trustedAuthTargetIds;
    state.signInTargetId=selectedTab.targetId;
    const login=await act('chatgpt_signin',{targetId:state.signInTargetId});
    if(login.state!=='history_ready'||login.accountVerified!==true){
     state.phase=login.state==='progress'?'signing_in':'awaiting_signin';
     state.lastCheckedAt=this.now();await this.save(state,login.state==='progress'?TICK:60000);return;
    }
    state.historyTargetId=state.signInTargetId;delete state.error;
    const history=await act('chatgpt_scan',{targetId:state.historyTargetId});
    const selected=nextEightConversations(history.conversations).conversations;
    if(!selected.length){state.phase='awaiting_history';await this.save(state,60000);return;}
    const targets=await this.env.BROWSER.devtools.listTargets(state.sessionId);
    for(const item of selected){
     if(!await this.allowed(state.id))throw Error('continuation_stopped');
     const tab=targets.find(t=>t.type==='page'&&t.url===item.url)||
      await this.env.BROWSER.devtools.newTarget(state.sessionId,item.url);
     if(!tab?.id)throw Error('browser_tab_not_found');
     state.chats.push({url:item.url,targetId:tab.id});
    }
    state.phase='watching';await this.save(state);return;
   }
   const item=state.chats[state.cursor];
   const snapshot=await act('chatgpt_scan',{targetId:item.targetId});
   if(snapshot.conversationUrl!==item.url||!snapshot.authenticatedConversation)throw Error('conversation_changed');
   state.checked++;state.lastCheckedAt=this.now();state.phase='watching';
   const next=async()=>{state.cursor=(state.cursor+1)%state.chats.length;await this.save(state);};
   const key=await hash(snapshotKey(snapshot));
   if(item.beforeCount!==undefined){
    const reply=classifyReply(snapshot,{conversationUrl:item.url,messageCount:item.beforeCount});
    if(reply.state==='unverified'){await next();return;}
    if(item.replyHash!==key){item.replyHash=key;await next();return;}
    state.repliesObserved++;delete item.beforeCount;
   }
   const decision=chooseContinuation(snapshot,{allowRevisit:true});
   if(decision.state!=='ready'){await next();return;}
   const answerHash=await hash(snapshot.latestAssistantText);
   if(snapshot.recentNudgeCount>0&&item.sentAt===undefined)item.sentAt=this.now();
   if(item.attemptHash===key||item.answerBeforeHash===answerHash||
      (item.sentAt!==undefined&&this.now()-item.sentAt<COOLDOWN)){await next();return;}
   Object.assign(item,{attemptHash:key,answerBeforeHash:answerHash,sentAt:this.now(),beforeCount:snapshot.messageCount});
   delete item.replyHash;
   state.phase='sending';await this.save(state);
   const receipt=await act('chatgpt_resume',{targetId:item.targetId,text:'*',conversationUrl:item.url,
    messageCount:snapshot.messageCount,canSend:()=>this.allowed(state.id)});
   if(receipt.submissionVerified!==true){await this.fail(state,'uncertain_send');return;}
   state.submitted++;state.phase='watching';await next();
  }catch(error){
   const safe=['different_chatgpt_account','chatgpt_account_not_configured','unexpected_signin_origin','ambiguous_google_account'];
   await this.fail(state,error?.message==='continuation_stopped'?'approval_or_stop_changed':
    safe.includes(error?.message)?error.message:'browser_unavailable');
  }
 }
}
