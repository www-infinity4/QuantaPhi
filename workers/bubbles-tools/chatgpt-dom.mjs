// Bounded ChatGPT conversation inspection. Never reads cookies, tokens or hidden state.
// Only owner-approved Cloud Chrome on chatgpt.com/c/<conversation> can submit a continuation.
const prelude=String.raw`
 const valid=location.origin==='https://chatgpt.com'&&/^\/c\/[a-zA-Z0-9_-]{12,}\/?$/.test(location.pathname);
 const messages=[...document.querySelectorAll('[data-message-author-role]')];
 const last=messages.at(-1);
 const role=last?.getAttribute('data-message-author-role')||'';
 const lastText=String(last?.innerText||'').trim();
 const latestUser=[...messages].reverse().find(e=>e.getAttribute('data-message-author-role')==='user');
 const generating=Boolean(document.querySelector('button[data-testid="stop-button"],button[aria-label="Stop generating"],button[aria-label="Stop response"]'));
 const editors=[...document.querySelectorAll('#prompt-textarea[contenteditable="true"],textarea#prompt-textarea,textarea#mobile-composer-prompt,[data-testid="composer"] [contenteditable="true"]')].filter(e=>e.getClientRects().length&&!e.disabled);
 const editor=[...new Set(editors)][0];
 const editorText=()=>typeof editor?.value==='string'?editor.value:String(editor?.innerText||'');
`;
export const chatgptInspectExpression='(()=>{'+prelude+String.raw`
 const sidebar=document.querySelector('#ds-sidebar,nav[aria-label="Chat history"],aside,[data-testid="history"]');
 const links=[...(sidebar?sidebar.querySelectorAll('a[href]'):[])].filter(a=>a.getClientRects().length)
  .map(a=>{try{const u=new URL(a.href);return u.origin===location.origin&&/^\/c\/[a-zA-Z0-9_-]{12,}\/?$/.test(u.pathname)
    ?{url:u.origin+u.pathname,title:String(a.innerText||a.getAttribute('aria-label')||'Conversation').trim().slice(0,95)}:null}catch{return null}})
  .filter(Boolean);
 const unique=[...new Map(links.map(x=>[x.url,x])).values()].slice(0,60);
 const unfinished=role==='user'||(role==='assistant'&&/\b(?:pending|queued|blocked|unverified|not (?:finished|complete|verified)|still (?:need|missing)|unable to|failed|cannot|need (?:more|you|the)|please (?:provide|send|share))\b/i.test(lastText.slice(-1200)));
 return {ok:true,authenticatedConversation:valid,conversationUrl:valid?location.origin+location.pathname:'',
  title:String(document.title||'').slice(0,120),latestRole:role,generating,messageCount:messages.length,
  recentNudgeCount:messages.slice(-4).filter(node=>node?.getAttribute('data-message-author-role')==='user'&&String(node.innerText||'').trim()==='*').length,
  editorReady:!!editor,draftPresent:!!editorText().trim(),alreadyNudged:role==='user'&&lastText.trim()==='*',
  latestAssistantText:role==='assistant'?lastText.slice(-700):'',latestUserText:String(latestUser?.innerText||'').trim().slice(-500),
  latestUserIndex:messages.indexOf(latestUser),
  needsAttention:valid&&!!editor&&!generating&&unfinished,conversations:unique};
})()`;
export const chatgptPrepareExpression='(()=>{'+prelude+String.raw`
 if(!valid)return {ok:false,error:'not_a_chatgpt_conversation'};
 if(generating)return {ok:false,error:'chatgpt_still_generating'};
 if(!last||!['user','assistant'].includes(role))return {ok:false,error:'conversation_not_loaded'};
 if(role==='user'&&lastText.trim()==='*')return {ok:false,error:'continuation_already_sent'};
 if(editors.length!==1||!editor)return {ok:false,error:'chatgpt_composer_not_found'};
 if(editorText().trim())return {ok:false,error:'owner_draft_present'};
 const claims=document.documentElement?.dataset;
 if(claims){
  if(Number(claims.bubblesContinuationUntil)>Date.now())return {ok:false,error:'continuation_inflight'};
  claims.bubblesContinuationUntil=String(Date.now()+30000);
 }
 if(typeof expectedClaim==='string'){
  if(!editor.dataset)return {ok:false,error:'composer_claim_unavailable'};
  editor.dataset.bubblesContinuationClaim=expectedClaim;
 }
 editor.focus();
 return {ok:true,ready:true};
})()`;
export const chatgptSendExpression='(()=>{'+prelude+String.raw`
 if(!valid||!editor||document.activeElement!==editor&&!editor.contains(document.activeElement))return {ok:false,error:'composer_not_focused'};
 if(typeof expectedClaim==='string'&&editor.dataset?.bubblesContinuationClaim!==expectedClaim)
  return {ok:false,error:'composer_claim_changed'};
 if(editorText().trim()!=='*')return {ok:false,error:'literal_star_only'};
 if(generating||role!=='assistant')return {ok:false,error:'conversation_changed_before_send'};
 const buttons=[...document.querySelectorAll('button[data-testid="send-button"],button[aria-label="Send prompt"],button[aria-label="Send message"]')]
  .filter(e=>e.getClientRects().length&&!e.disabled&&e.getAttribute('aria-disabled')!=='true');
 if(buttons.length!==1)return {ok:false,error:'send_button_not_unique'};
 buttons[0].click();
 return {ok:true,sendDispatched:true};
})()`;

// Each expression executes synchronously in the page. Recheck the exact
// conversation and turn at Prepare AND Send, rather than trusting an earlier
// asynchronous scan. A replaced editor cannot inherit another send's claim.
export function scopedChatGPTExpression(expression,{conversationUrl,messageCount,claim}){
 if(!Number.isSafeInteger(messageCount)||messageCount<1||typeof claim!=='string'||!claim)
  throw Error('invalid_chatgpt_send_scope');
 return '(()=>{const expectedUrl='+JSON.stringify(conversationUrl)+',expectedCount='+messageCount+
  ',expectedClaim='+JSON.stringify(claim)+';'+String.raw`
  if(location.origin+location.pathname!==expectedUrl||document.querySelectorAll('[data-message-author-role]').length!==expectedCount)
   return {ok:false,error:'conversation_changed_before_send'};
  return `+expression+';})()';
}
