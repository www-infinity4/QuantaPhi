/* Integra AI X reply gate. THIS MODULE DOES NOT POST.
 * X requires written approval before an AI auto-reply account publishes.
 * A watch list is not permission to contact the watched person.
 */
export function isQuestion(text){
 const s=String(text||'').trim().slice(0,2000);
 return /\?/.test(s)||/^(?:who|what|where|when|why|how|can|could|do|does|did|is|are|will|would|which)\b/i.test(s);
}
export function integraReplyDecision({
 post=null,watchedAccountIds=[],optedInAccountIds=[],optedOutAccountIds=[],
 answeredPostIds=[],xAiApproval=false,xApiConnected=false
}={}){
 const fail=reason=>({allowed:false,reason});
 if(!xAiApproval)return fail('x_written_ai_reply_approval_required');
 if(!xApiConnected)return fail('x_oauth_api_not_connected');
 const id=String(post?.id||''),author=String(post?.authorId||'');
 if(!/^\d{8,25}$/.test(id)||!/^\d{1,25}$/.test(author))return fail('invalid_post_identity');
 if(!post?.exists||post?.visibility!=='public')return fail('post_unavailable_or_nonpublic');
 if(post.isOwnPost||post.isRepost)return fail('not_user_question');
 if(answeredPostIds.map(String).includes(id))return fail('already_answered');
 if(optedOutAccountIds.map(String).includes(author))return fail('opted_out');
 if(!optedInAccountIds.map(String).includes(author))return fail('no_recipient_opt_in');
 const watched=watchedAccountIds.map(String).includes(author);
 const addressed=post.directedAtIntegra===true;
 if(!watched&&!addressed)return fail('not_asked_to_watch_or_addressed');
 if(!isQuestion(post.text))return fail('not_a_question');
 return {allowed:true,reason:'eligible_for_one_api_reply',postId:id,authorId:author};
}