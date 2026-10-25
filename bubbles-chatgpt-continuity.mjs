// Deterministic continuity policy for a signed-in, owner-approved ChatGPT tab.
// A text reply is NOT a code/commit/deployment receipt. Never mark task complete here.
const pending=/\b(?:pending|queued|still (?:working|waiting)|not (?:finished|complete|yet verified)|unverified|awaiting (?:verification|results)|needs (?:testing|verification)|blocked|stuck|failed|unable to finish)\b/i;
const asksHuman=/\b(?:please (?:provide|send|share|upload|choose|confirm|sign in|approve)|could you (?:provide|send|share|upload|confirm)|can you (?:provide|send|share|confirm)|i need (?:you to|your|the (?:link|file|code|details|permission|approval))|which (?:file|account|option)|what (?:is|are) (?:the|your))\b/i;
const approvals=/\b(?:authorization required|owner approval required|sign[ -]?in required|access denied|two.factor|verification code|captcha|permission required)\b/i;
const normalize=value=>String(value||'').replace(/\s+/g,' ').trim();
export function snapshotKey(snapshot){
 // Ephemeral comparison key, not persisted to browser storage or Cloudflare.
 return JSON.stringify([snapshot?.conversationUrl,snapshot?.messageCount,snapshot?.latestRole,
  normalize(snapshot?.latestAssistantText).slice(-700),normalize(snapshot?.latestUserText).slice(-500)]);
}
export function chooseContinuation(snapshot,{sentKeys=new Set()}={}){
 if(!snapshot?.authenticatedConversation||!/^https:\/\/chatgpt\.com\/c\/[a-zA-Z0-9_-]{12,}\/?$/.test(snapshot?.conversationUrl||''))
  return {state:'blocked',reason:'conversation_not_verified'};
 if(snapshot.generating)return {state:'waiting',reason:'assistant_still_responding'};
 if(!snapshot.editorReady)return {state:'blocked',reason:'composer_not_available'};
 if(snapshot.draftPresent)return {state:'waiting',reason:'owner_draft_present'};
 if(snapshot.alreadyNudged||snapshot.recentNudgeCount>0)return {state:'waiting',reason:'recent_continuation_already_sent'};
 if(snapshot.latestRole==='user')return {state:'waiting',reason:'last_user_request_unanswered'};
 if(snapshot.latestRole!=='assistant')return {state:'blocked',reason:'assistant_message_not_found'};
 const message=normalize(snapshot.latestAssistantText);
 if(!message)return {state:'waiting',reason:'empty_assistant_message'};
 if(approvals.test(message)||asksHuman.test(message))return {state:'needs_details',reason:'owner_input_needed'};
 if(sentKeys.has(snapshotKey(snapshot)))return {state:'waiting',reason:'already_continued_in_this_session'};
 if(!pending.test(message))return {state:'review',reason:'no_unfinished_work_verified'};
 return {state:'ready',reason:'explicit_unfinished_work'};
}
export function classifyReply(reply,previous){
 if(!reply?.authenticatedConversation||reply.conversationUrl!==previous.conversationUrl)
  return {state:'unverified',reason:'different_conversation'};
 if(reply.latestRole!=='assistant'||reply.generating||
    !(Number(reply.messageCount)>=Number(previous.messageCount)+2))
  return {state:'unverified',reason:'new_answer_not_confirmed'};
 const answer=normalize(reply.latestAssistantText);
 if(!answer)return {state:'unverified',reason:'empty_reply'};
 if(approvals.test(answer)||asksHuman.test(answer))return {state:'needs_details',reason:'owner_input_needed',excerpt:answer.slice(-240)};
 if(pending.test(answer))return {state:'awaiting_evidence',reason:'work_not_verified',excerpt:answer.slice(-240)};
 return {state:'answered_unverified',reason:'assistant_replied_no_external_receipt',excerpt:answer.slice(-240)};
}
