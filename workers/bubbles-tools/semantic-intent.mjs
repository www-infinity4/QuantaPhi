/* Grammar Phi: one bounded semantic decision over REAL registered capabilities.
 * The LLM is a planner, not an executor. It cannot authorize a tap or write.
 * Unknown/ambiguous requests fall back to ordinary conversation.
 */
const kinds=new Set(['none','open_card','play_card','phone_read']);
export function validateSemanticDecision(raw,cards){
 let value=String(raw||'').trim().replace(/^\`\`\`(?:json)?\s*/i,'').replace(/\s*\`\`\`$/,'');
 const open=value.indexOf('{'),close=value.lastIndexOf('}');
 if(open<0||close<open||close-open>1400)return {kind:'none'};
 let obj;try{obj=JSON.parse(value.slice(open,close+1))}catch{return {kind:'none'}}
 if(!obj||typeof obj!=='object'||!kinds.has(obj.kind)||obj.kind==='none')return {kind:'none'};
 if(!Number.isFinite(obj.confidence)||obj.confidence<.8||obj.confidence>1)return {kind:'none'};
 if(obj.kind==='phone_read')return {kind:'phone_read',confidence:obj.confidence};
 const card=cards.find(c=>c.id===obj.cardId);
 if(!card)return {kind:'none'};
 return {kind:obj.kind,cardId:card.id,confidence:obj.confidence};
}
export async function semanticDecision(body,runModel){
 const question=String(body?.request||'').trim().slice(0,1000);
 const cards=(Array.isArray(body?.cards)?body.cards:[]).slice(0,35).filter(c=>
  c&&typeof c.id==='string'&&/^[a-z0-9-]{1,50}$/.test(c.id)
  &&typeof c.title==='string'&&c.title.length<90)
  .map(c=>({id:c.id,title:c.title,aliases:(Array.isArray(c.aliases)?c.aliases:[]).filter(x=>typeof x==='string').slice(0,8).map(x=>x.slice(0,65))}));
 if(!question||!cards.length)return {kind:'none'};
 const active=String(body?.activeCard||'').slice(0,50);
 const messages=[
  {role:'system',content:'You are the Bubbles semantic intent compiler, not a chatbot. Consider the owner\'s entire current sentence and listed REAL capabilities, including its implied purpose. Respond with only JSON: {"kind":"open_card|play_card|phone_read|none","cardId":"registered-id-if-card","confidence":0.0}. Use open_card for requests to show/use a specific existing application or listening interface. Use play_card when user clearly asks to listen/play an existing registered audio/radio card. Use phone_read only when the user explicitly wants Bubbles to inspect the physical Android screen. Do not invent a card, control, permission, tool, result or site. Any GitHub write, account operation, screen recording, payment, confirmation, security-sensitive click, conversation directed to someone else, question about how something works, or ambiguous request must be none. "Fred\'s Space" means Fred Spaces; Media Star may include Fred. Choose confidence below 0.80 when uncertain. You never execute.'},
  {role:'user',content:JSON.stringify({utterance:question,currentOpenCard:active,registeredCards:cards})}
 ];
 const result=await runModel({messages,max_tokens:180,reasoning_effort:'medium',chat_template_kwargs:{enable_thinking:false}});
 const text=typeof result==='string'?result:result?.response||result?.choices?.[0]?.message?.content;
 return validateSemanticDecision(text,cards);
}
