import {CREATOR_DATABASE,CREATOR_TOPICS,filterCreatorPosts,findCreatorPost} from './creator-post-catalog.mjs';

const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const link=(label,url)=>{const a=el('a','qcx-link',label+' ↗');a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;};
const button=(label,click)=>{const b=el('button','qcx-button',label);b.type='button';b.addEventListener('click',click);return b;};
let widgetPromise;
function loadXWidget(){
 if(window.twttr?.widgets?.createTweet)return Promise.resolve(window.twttr.widgets);
 if(widgetPromise)return widgetPromise;
 widgetPromise=new Promise((resolve,reject)=>{
  const script=el('script');script.dataset.creatorXWidget='true';
  const failed=()=>{clearTimeout(timer);script.remove();reject(new Error('X embed unavailable'));};
  const timer=setTimeout(failed,12000);
  const loaded=()=>{clearTimeout(timer);if(window.twttr?.widgets?.createTweet)resolve(window.twttr.widgets);else failed();};
  script.src='https://platform.twitter.com/widgets.js';script.async=true;
  script.addEventListener('load',loaded,{once:true});script.addEventListener('error',failed,{once:true});document.head.append(script);
 }).catch(error=>{widgetPromise=null;throw error;});
 return widgetPromise;
}
/* Generic, source-attributed single X post; use the same opted-in provider
 * widget as the reviewed creator database rather than copying X media. */
export function mountReviewedSingleXPost(root,card){
 if(!root||!card||!/^\\d{15,22}$/.test(card.xOriginalPostId||'')||
    !/^[A-Za-z0-9_]{1,15}$/.test(card.xOriginalHandle||'')||
    card.featureUrl!=='https://x.com/'+card.xOriginalHandle+'/status/'+card.xOriginalPostId||
    card.official!=='https://x.com/'+card.xOriginalHandle)return false;
 const panel=el('section','qcx-tool reviewed-x-post-card');
 panel.setAttribute('aria-label','Original X post from @'+card.xOriginalHandle);
 const heading=el('h3','','Original X post · '+card.name);
 const attribution=el('p','qcx-note','Source: @'+card.xOriginalHandle+' · independent summary, not a complete archive');
 const published=el('time','creator-post-date',new Date(card.publishedAt).toLocaleString());
 published.dateTime=card.publishedAt;
 const summary=el('p','creator-post-summary',card.details);
 const status=el('p','qcx-note','To view the original media, select Load original X post. X may require sign-in or restrict embeds.');
 status.setAttribute('role','status');
 const embed=el('div','creator-post-embed');
 const actions=el('div','qcx-controls');
 actions.append(link('Read original X post',card.featureUrl),link('Visit original X profile',card.official));
 const load=button('Load original X post',async()=>{
  load.disabled=true;load.textContent='Loading original…';
  try{
   const widget=await loadXWidget();
   const result=await widget.createTweet(card.xOriginalPostId,embed,{conversation:'none',dnt:true,theme:'light'});
   load.textContent=result?'Original loaded':'Retry original X post';load.disabled=Boolean(result);
   if(!result)status.textContent='X did not return an embed. The original source link is available.';
  }catch{
   load.disabled=false;load.textContent='Retry original X post';
   status.textContent='X embed unavailable. Open the original post on X instead.';
  }
 });
 actions.append(load);
 panel.append(heading,attribution,published,summary,actions,status,embed);
 root.append(panel);return true;
}

export function mountCreatorPostCard(root,card){
 if(card?.creatorId!==CREATOR_DATABASE.creator.id)return false;
 const creator=CREATOR_DATABASE.creator;
 const panel=el('section','qcx-tool creator-post-card');panel.setAttribute('aria-label',creator.name+' post database');
 const title=el('h3','',card.postId?'Original post · '+creator.name:creator.name+' · Post database');
 const coverage=el('p','creator-coverage',CREATOR_DATABASE.posts.length+' indexed posts · partial public snapshot');
 const checked=el('p','qcx-note','Sources checked '+new Date(CREATOR_DATABASE.coverage.checkedAt).toLocaleString()+'. The complete account history is not available here.');
 panel.append(title,coverage,checked);
 let query='',topic='all',selected=card.postId||CREATOR_DATABASE.posts[0]?.postId,revision=0;
 let search,topics,picker,previous,next;
 const controls=el('div','creator-post-controls');
 if(!card.postId){
  search=el('input','qcx-input');search.type='search';search.placeholder='Search indexed posts';search.setAttribute('aria-label','Search Elena Cardone indexed posts');
  search.maxLength=120;
  topics=el('select','qcx-input');topics.setAttribute('aria-label','Post topic');
  const all=el('option','','All topics');all.value='all';topics.append(all);
  for(const [value,label] of Object.entries(CREATOR_TOPICS)){const o=el('option','',label);o.value=value;topics.append(o);}
  picker=el('select','qcx-input');picker.setAttribute('aria-label','Choose indexed post');
  search.addEventListener('input',()=>{query=search.value;paint();});
  topics.addEventListener('change',()=>{topic=topics.value;paint();});
  picker.addEventListener('change',()=>{selected=picker.value;paint();});
  controls.append(search,topics,picker);panel.append(controls);
 }
 const status=el('p','creator-post-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const content=el('div','creator-post-content');panel.append(status,content);
 function rows(){return card.postId?[findCreatorPost(card.postId)].filter(Boolean):filterCreatorPosts({query,topic});}
 function step(delta){const list=rows(),i=list.findIndex(p=>p.postId===selected);selected=list[(i+delta+list.length)%list.length]?.postId;paint();}
 if(!card.postId){const nav=el('div','qcx-controls');previous=button('← Previous post',()=>step(-1));next=button('Next post →',()=>step(1));nav.append(previous,next);panel.append(nav);}
 function paint(){
  const list=rows();revision++;
  if(!list.some(p=>p.postId===selected))selected=list[0]?.postId;
  if(picker){picker.replaceChildren(...list.map(p=>{const o=el('option','',p.title);o.value=p.postId;return o;}));picker.value=selected||'';picker.disabled=!list.length;previous.disabled=next.disabled=list.length<2;}
  content.replaceChildren();
  const post=list.find(p=>p.postId===selected);
  if(!post){status.textContent='No indexed posts match. Try another topic or search.';return;}
  status.textContent=(list.findIndex(p=>p.postId===selected)+1)+' of '+list.length+' matching indexed posts';
  const date=el('time','creator-post-date',new Date(post.publishedAt).toLocaleString());date.dateTime=post.publishedAt;
  const heading=el('h4','creator-post-title',post.title);
  const summary=el('p','creator-post-summary',post.summary);
  const topicLine=el('p','creator-post-topic',CREATOR_TOPICS[post.topic]+' · @'+creator.handle);
  const actions=el('div','qcx-controls');actions.append(link('Read original X post',post.sourceUrl));
  const embed=el('div','creator-post-embed');
  const consent=el('p','qcx-note','Independent summary. Load the original to request an X embed; X may require sign-in or restrict playback.');
  const load=button('Load original X post',async()=>{
   const current=revision;load.disabled=true;load.textContent='Loading original…';
   try{const widgets=await loadXWidget();if(current!==revision)return;
    const result=await widgets.createTweet(post.postId,embed,{conversation:'none',dnt:true,theme:'light'});
    if(current!==revision)return;
    load.textContent=result?'Original loaded':'Retry original X post';load.disabled=Boolean(result);
    if(!result)consent.textContent='X did not return an embed. The original-post link remains available.';
   }catch{if(current!==revision)return;load.disabled=false;load.textContent='Retry original X post';consent.textContent='X embed unavailable. Read the post using its original source link.';}
  });
  actions.append(load);
  content.append(topicLine,heading,date,summary,actions,consent,embed);
 }
 const sources=el('div','qcx-controls');sources.append(link('X profile',creator.profileUrl),link('Elena’s website',creator.website),link('Official event photos','https://elenacardone.com/elena-cardone-event-gallery/'));
 if(card.postId){const all=el('a','qcx-link','Browse indexed posts');all.href='/source-quick-card.html?card='+creator.id;sources.append(all);}
 else{
  sources.append(button('Export indexed database',()=>{
   const blob=new Blob([JSON.stringify(CREATOR_DATABASE,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob);
   const a=el('a');a.href=url;a.download='elena-cardone-post-index.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }));
 }
 panel.append(sources);root.append(panel);paint();return true;
}
