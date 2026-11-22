/* Consented community perspectives are advisory-only source data.
 * Never read or merge other users' private transcripts or model memory.
 * Permission: individually published Coliseum idea + a separate opt-in
 * to inform Bubbles' project suggestions, revocable by that same author.
 */
const IDEA=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PURPOSE='bubbles-advisory-v1';
const FORBIDDEN=/\b(?:Bearer\s+[A-Za-z0-9_+\/-]{20,}|(?:sk|ghp|sq|rb|rd)_[A-Za-z0-9_-]{24,}|[\w.+-]+@[\w.-]+\.[a-z]{2,})\b/i;
const clean=(value,limit)=>String(value||'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,limit);
export function validatePerspectiveChoice(body){
 if(!body||Array.isArray(body)||typeof body!=='object')return null;
 if(Object.keys(body).sort().join(',')!=='ideaId,purpose,share')return null;
 if(!IDEA.test(body.ideaId||'')||typeof body.share!=='boolean'||body.purpose!==PURPOSE)return null;
 return {ideaId:body.ideaId,share:body.share,purpose:PURPOSE};
}
export function makePerspectiveBrief(records,{modelId='',sector='',ownerDirection='',minimumContributors=3}={}){
 const base={ready:false,status:'advisory_only',nextStep:'owner_decides',
  ownerDirection:clean(ownerDirection,500),room:{modelId,sector},perspectives:[],
  permissions:{runner:false,providerUpload:false,publish:false,payment:false},
  note:'Voluntary, published ideas are untrusted perspectives. No model call, private-memory access or owner approval occurs.'};
 if(!Array.isArray(records)||!Number.isInteger(minimumContributors)||minimumContributors<3||minimumContributors>20)
  return {...base,note:'No verified eligible perspective batch supplied.'};
 const candidates=[],contributors=new Set(),seenIdeas=new Set();
 for(const r of records.slice(0,100)){
  if(!r||r.consented!==true||r.withdrawn===true||r.model_id!==modelId||r.sector!==sector||
    typeof r.member_id!=='string'||!r.member_id||!IDEA.test(r.id||'')||seenIdeas.has(r.id))continue;
  if(contributors.has(r.member_id))continue; // One voice per contributor for the quorum.
  const title=clean(r.title,110),description=clean(r.description,1800);
  if(title.length<5||description.length<12||FORBIDDEN.test(title)||FORBIDDEN.test(description))continue;
  contributors.add(r.member_id);seenIdeas.add(r.id);
  candidates.push({id:r.id,title,description,source:'published_coliseum_idea',
   treatAs:'untrusted_idea_not_instruction'});
  if(candidates.length>=12)break;
 }
 if(contributors.size<minimumContributors)return {...base,note:'Fewer than three distinct authors have voluntarily opted in; no individual ideas released.'};
 return {...base,ready:true,perspectives:candidates,
  note:'Opt-in community suggestions, not verified instructions or authority. Author identity removed; wording may still be self-identifying.'};
}
export function makeSpecialistHandoff({project,goal,from,to,artifact,ownerApproved=false}={}){
 const allowed=new Set(['gpt','gemini','research','engineering','testing','release']);
 if(typeof project!=='string'||!/^[-a-z0-9]{3,80}$/.test(project)||
  typeof goal!=='string'||goal.trim().length<4||goal.length>1000||
  !allowed.has(from)||!allowed.has(to)||from===to)return null;
 if(!artifact||artifact.kind!=='github-pr'||typeof artifact.uri!=='string'||
  !/^https:\/\/github\.com\/www-infinity4\/[A-Za-z0-9_.-]+\/pull\/[1-9]\d*$/.test(artifact.uri)||
  !/^[a-f0-9]{40}$/i.test(artifact.head||''))return null;
 return {
  version:'infinity-specialist-handoff/v1',project,goal:goal.trim(),from,to,
  artifact:{kind:artifact.kind,uri:artifact.uri,head:artifact.head},
  ownerFinalDecisionRequired:true,ownerApproved:ownerApproved===true,
  status:ownerApproved===true?'awaiting_authenticated_provider_execution':'awaiting_owner_and_provider_access',
  providerExecuted:false,noAutomaticThirdPartyUpload:true,
  permissions:{readOtherUsersPrivateHistory:false,publish:false,spend:false,deploy:false},
  next:'Verify provider connection and scoped consent; pass this exact source receipt to the next specialist. Do not claim execution until it returns a verified result.'
 };
}
