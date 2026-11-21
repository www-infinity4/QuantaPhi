/* Infinity Coliseum experience edition catalog and pure proposal rules.
 * Edition numbers are NOT OpenAI model IDs, and never imply future-model access.
 * Production votes, 1,000-member caps, AI answers, and billing must be server verified.
 */
export const MAX_MEMBERS_PER_MODEL = 1000;
export const MODEL_CARDS = Object.freeze([
 Object.freeze({id:'zeus',version:'6.2',name:'ZEUS',title:'God of Thunder',domain:'Discovery & first builds',tier:'free',price:0,icon:'⚡',ready:'prototype',description:'Bring an idea. Find its spark. Start your first build.'}),
 Object.freeze({id:'hermes',version:'6.6',name:'HERMES',title:'Messenger of the Gods',domain:'Research & rapid prototypes',tier:'free',price:0,icon:'🪽',ready:'concept',description:'Connect people, research, and working prototypes.'}),
 Object.freeze({id:'athena',version:'7.0',name:'ATHENA',title:'Goddess of Wisdom',domain:'Strategy & business development',tier:'coliseum',price:23,icon:'🛡️',ready:'concept',description:'Turn promising ideas into organized, reviewed ventures.'}),
 Object.freeze({id:'hephaestus',version:'7.3',name:'HEPHAESTUS',title:'Master of the Forge',domain:'Engineering & production',tier:'forge',price:100,icon:'🔨',ready:'concept',description:'Design, test, and refine complex inventions together.'})
]);
export const SECTORS=Object.freeze([
 'Technology','Gaming','Shopping','Business','Science','Media','Education','Art & Design','Community'
]);
const clean=(value,max)=>String(value??'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
export function verifyCapacity(activeCount){
 return Number.isInteger(activeCount)&&activeCount>=0&&activeCount<MAX_MEMBERS_PER_MODEL;
}
export function createProposal(input,now=Date.now(),id){
 if(!input||!SECTORS.includes(input.sector)||!MODEL_CARDS.some(x=>x.id===input.modelId))throw Error('invalid_sector_or_model');
 const title=clean(input.title,110),description=clean(input.description,1800);
 if(title.length<5||description.length<12)throw Error('idea_needs_title_and_description');
 if(!Number.isFinite(now)||now<0)throw Error('invalid_time');
 if(typeof id!=='string'||!/^[a-z0-9-]{8,70}$/.test(id))throw Error('invalid_proposal_id');
 return {id,modelId:input.modelId,sector:input.sector,title,description,createdAt:new Date(now).toISOString(),
  parentId:null,stage:'open',endorsements:0,concerns:0,people:[],messages:[],isDemoDraft:true};
}
export function castDeviceVote(idea,position,deviceVotes){
 if(!idea||!['support','question'].includes(position))throw Error('invalid_vote');
 if(deviceVotes?.[idea.id])return {idea,deviceVotes,alreadyVoted:true};
 const next={...idea,[position==='support'?'endorsements':'concerns']:(idea[position==='support'?'endorsements':'concerns']||0)+1};
 return {idea:next,deviceVotes:{...deviceVotes,[idea.id]:position},alreadyVoted:false};
}
export function forkProposal(source,id,now=Date.now()){
 if(!source||!id||source.id===id)throw Error('invalid_branch');
 const fork=createProposal({modelId:source.modelId,sector:source.sector,title:source.title+' — New Direction',
  description:source.description},now,id);
 return {...fork,parentId:source.id};
}
export function reviewIdeaSignals(idea){
 const total=Math.max(0,Number(idea?.endorsements)||0)+Math.max(0,Number(idea?.concerns)||0);
 const support=Math.max(0,Number(idea?.endorsements)||0);
 return {support,questions:Math.max(0,Number(idea?.concerns)||0),
  localSignal:total?Math.round(100*support/total):0,
  decision:'not-evaluated',note:'This is a private, device-only rehearsal. Public Joust outcomes require authenticated human votes and a verified server tally.'};
}
export function modelById(id){return MODEL_CARDS.find(m=>m.id===id)||null}
export function hasPaidAccess({tier,serverVerified=false,subscriptionStatus}={}){
 if(tier==='free')return true;
 if(!serverVerified||subscriptionStatus!=='ACTIVE')return false;
 return tier==='coliseum'||tier==='forge';
}
export function eligibility(model,pass){
 if(model.tier==='free')return 'preview';
 if(model.tier==='coliseum'&&pass==='coliseum')return 'requires-verified-checkout';
 if(model.tier==='forge'&&pass==='forge')return 'requires-verified-checkout';
 return 'not-active';
}
