import snapshot from './data/creator-posts.mjs';

export const CREATOR_TOPICS=Object.freeze({
 business:'Business & finance',mindset:'Education · Personal growth',
 gratitude:'Education · Gratitude',relationships:'Education · Relationships'
});
const text=(value,max)=>typeof value==='string'&&value.trim().length>0&&value.length<=max&&!/[<>\u0000-\u001f]/.test(value);
const date=value=>typeof value==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(value)&&Number.isFinite(Date.parse(value));
export function validateCreatorPost(post){
 if(!post||post.creatorId!=='elena-cardone'||!/^\d{15,22}$/.test(post.postId||''))return false;
 if(!text(post.title,110)||!text(post.summary,300)||!Object.hasOwn(CREATOR_TOPICS,post.topic))return false;
 if(!date(post.publishedAt)||!date(post.checkedAt)||Date.parse(post.publishedAt)>Date.parse(post.checkedAt)||Date.parse(post.checkedAt)>Date.now()+300000)return false;
 // Exact URLs bind the author and ID; credentials, lookalike hosts, ports and
 // arbitrary queries cannot turn a source link into an unrelated destination.
 return post.sourceUrl==='https://x.com/ElenaCardone/status/'+post.postId;
}
function clean(post){
 if(!validateCreatorPost(post))throw new Error('Invalid reviewed creator post: '+String(post?.postId||'unknown').slice(0,22));
 return Object.freeze(Object.fromEntries(['creatorId','postId','sourceUrl','publishedAt','checkedAt','title','summary','topic'].map(k=>[k,post[k]])));
}
export function mergeCreatorPosts(existing,incoming){
 if(!Array.isArray(existing)||!Array.isArray(incoming))throw new Error('Invalid post collection');
 const byId=new Map();
 for(const record of [...existing,...incoming]){const p=clean(record);byId.set(p.postId,p);}
 return [...byId.values()].sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)||b.postId.localeCompare(a.postId));
}
export const CREATOR_DATABASE=Object.freeze({
 schemaVersion:1,creator:Object.freeze({...snapshot.creator}),
 coverage:Object.freeze({...snapshot.coverage,complete:false,totalAvailable:null}),
 posts:Object.freeze(mergeCreatorPosts([],snapshot.posts))
});
export function filterCreatorPosts({query='',topic='all'}={}){
 const q=String(query).trim().toLocaleLowerCase();
 return CREATOR_DATABASE.posts.filter(p=>(topic==='all'||p.topic===topic)&&
  (!q||[p.title,p.summary,p.topic,CREATOR_TOPICS[p.topic]].join(' ').toLocaleLowerCase().includes(q)));
}
export const findCreatorPost=id=>CREATOR_DATABASE.posts.find(p=>p.postId===id)||null;
const creator=CREATOR_DATABASE.creator;
const shared={creatorId:creator.id,official:creator.profileUrl,image:creator.portraitUrl,
 secondUrl:creator.website,secondLabel:'Elena’s website',
 focus:'Discuss the original source with attribution. The summaries are independent editorial descriptions, not the creator’s words. Do not invent missing posts, media content, endorsement or full-history coverage.'};
export const CREATOR_SOURCES=Object.freeze([
 Object.freeze({...shared,id:creator.id,name:creator.name,kind:'Business & finance',
  feature:'Browse '+CREATOR_DATABASE.posts.length+' indexed public posts by topic',featureUrl:creator.profileUrl,
  details:'A source-linked post database with topic search and individual original X links. Coverage is partial; the complete account history has not been retrieved.'}),
 ...CREATOR_DATABASE.posts.map(p=>Object.freeze({...shared,id:creator.id+'-post-'+p.postId,postId:p.postId,
  name:creator.name+' · '+p.title,kind:CREATOR_TOPICS[p.topic],feature:p.title,
  featureUrl:p.sourceUrl,details:p.summary,topic:p.topic}))
]);
