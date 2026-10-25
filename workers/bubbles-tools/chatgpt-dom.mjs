// Bounded ChatGPT conversation inspection. Never reads cookies, tokens or hidden state.
// Only owner-approved Cloud Chrome on chatgpt.com/c/<conversation> can submit a continuation.
const prelude=String.raw`
 const valid=location.origin==='https://chatgpt.com'&&/^\\/c\\/[a-zA-Z0-9_-]{12,}\\/?$/.test(location.pathname);
 const messages=[...document.querySelectorAll('[data-message-author-role]')];
 const last=messages.at(-1);
 const role=last?.getAttribute('data-message-author-role')||'';
 const lastText=String(last?.innerText||'').trim();
 const generating=Boolean(document.querySelector('button[data-testid="stop-button"],button[aria-label="Stop generating"],button[aria-label="Stop response"]'));
 const editors=[...document.querySelectorAll('#prompt-textarea[contenteditable="true"],[data-testid="composer"] [contenteditable="true"]')].filter(e=>e.getClientRects().length);
 const editor=[...new Set(editors)][0];
`;
export const chatgptInspectExpression='(()=>{'+prelude+String.raw`
 const links=[...document.querySelectorAll('a[href]')].filter(a=>a.getClientRects().length)
  .map(a=>{try{const u=new URL(a.href);return u.origin===location.origin&&/^\\/c\\/[a-zA-Z0-9_-]{12,}\\/?$/.test(u.pathname)
    ?{url:u.origin+u.pathname,title:String(a.innerText||a.getAttribute('aria-label')||'Conversation').trim().slice(0,95)}:null}catch{return null}})
  .filter(Boolean);
 const unique=[...new Map(links.map(x=>[x.url,x])).values()].slice(0,60);
 const unfinished=role==='user'||(role==='assistant'&&/\\b(?:pending|queued|blocked|unverified|not (?:finished|complete|verified)|still (?:need|missing)|unable to|failed|cannot|need (?:more|you|the)|please (?:provide|send|share))\\b/i.test(lastText.slice(-1200)));
 return {ok:true,authenticatedConversation:valid,conversationUrl:valid?location.origin+location.pathname:'',
  title:String(document.title||'').slice(0,120),latestRole:role,generating,
  editorReady:!!editor,draftPresent:!!editor?.innerText?.trim(),alreadyNudged:role==='user'&&lastText.trim()==='*',
  latestAssistantText:role==='assistant'?lastText.slice(-700):'',
  needsAttention:valid&&!!editor&&!generating&&unfinished,conversations:unique};
})()`;
export const chatgptPrepareExpression='(()=>{'+prelude+String.raw`
 if(!valid)return {ok:false,error:'not_a_chatgpt_conversation'};
 if(generating)return {ok:false,error:'chatgpt_still_generating'};
 if(!last||!['user','assistant'].includes(role))return {ok:false,error:'conversation_not_loaded'};
 if(role==='user'&&lastText.trim()==='*')return {ok:false,error:'continuation_already_sent'};
 if(editors.length!==1||!editor)return {ok:false,error:'chatgpt_composer_not_found'};
 if(String(editor.innerText||'').trim())return {ok:false,error:'owner_draft_present'};
 editor.focus();
 return {ok:true,ready:true};
})()`;
export const chatgptSendExpression='(()=>{'+prelude+String.raw`
 if(!valid||!editor||document.activeElement!==editor&&!editor.contains(document.activeElement))return {ok:false,error:'composer_not_focused'};
 const buttons=[...document.querySelectorAll('button[data-testid="send-button"],button[aria-label="Send prompt"],button[aria-label="Send message"]')]
  .filter(e=>e.getClientRects().length&&!e.disabled&&e.getAttribute('aria-disabled')!=='true');
 if(buttons.length!==1)return {ok:false,error:'send_button_not_unique'};
 buttons[0].click();
 return {ok:true,sendDispatched:true};
})()`;
