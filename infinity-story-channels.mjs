import {READER_CHANNELS,channelById} from './infinity-story-channels-data.mjs';
/* Infinity story channels: six real, independent readers in the Oracle carousel.
 * Novelty is persistent across refreshes; original fiction and licensed source
 * discovery are not misrepresented as a magic unlimited generator.
 */
const SEEN='quanta:infinity-readers:seen:v1:',SAVED='quanta:infinity-readers:collected:v1';
const safeList=(key)=>{try{const x=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(x)?x:[]}catch{return []}};
const saveList=(key,x)=>{try{localStorage.setItem(key,JSON.stringify(x.slice(-1400)))}catch{}};
const node=(tag,cls,text)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=text;return x};
export const trustedStorySource=(value,host='')=>{try{const u=new URL(value);
 return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&(!host||u.hostname===host)?u.href:null
}catch{return null}};
export function nextUnseen(stories,seen){
 const viewed=new Set(seen);return stories.find(x=>x&&typeof x.id==='string'&&!viewed.has(x.id))||null;
}
export function wikipediaResults(data){
 const pages=Object.values(data?.query?.pages||{});
 return pages.filter(p=>p&&p.ns===0&&!p.missing&&p.pageid>0&&typeof p.extract==='string'&&p.extract.trim().length>160)
 .map(p=>{const url=trustedStorySource(p.fullurl,'en.wikipedia.org');if(!url)return null;
  const excerpt=p.extract.replace(/\s{3,}/g,'\n\n').trim().slice(0,2500);
  const paragraphs=excerpt.split(/\n{2,}/).map(x=>x.trim()).filter(x=>x.length>40).slice(0,8);
  if(!paragraphs.length)return null;
  return {id:'wp:'+p.pageid,title:p.title,body:paragraphs,source:url,
   kind:'wikipedia',license:'Excerpt © Wikipedia contributors · CC BY-SA · follow source for full article and edit history'};
 }).filter(Boolean);
}
export function gutenbergResults(data){
 if(!Array.isArray(data?.results))return [];
 return data.results.filter(x=>x?.copyright===false&&x.languages?.includes('en')&&Number.isInteger(x.id)&&x.title).map(book=>{
  const url='https://www.gutenberg.org/ebooks/'+book.id;
  const author=(book.authors||[]).map(x=>x.name).filter(Boolean).join(', ');
  const paragraphs=(book.summaries||[]).filter(x=>typeof x==='string'&&x.trim()).map(x=>x.slice(0,850));
  if(!paragraphs.length)paragraphs.push('Explore this public-domain book through its verified catalog record. The complete original text is available at the source link; this card does not substitute a shortened description for the full book.');
  return {id:'pg:'+book.id,title:book.title,body:paragraphs,source:url,kind:'catalog',
   author,license:'Project Gutenberg catalog · copyright status listed as public domain in the US · open full book at source'};
 });
}
async function json(url){
 const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),12000);
 try{const r=await fetch(url,{headers:{Accept:'application/json'},signal:abort.signal,credentials:'omit'});
  if(!r.ok)throw Error('Source returned '+r.status);return await r.json()
 }finally{clearTimeout(timer)}
}
const wikiUrl=(term,offset)=>'https://en.wikipedia.org/w/api.php?'+new URLSearchParams({
 action:'query',format:'json',formatversion:'2',origin:'*',
 generator:'search',gsrsearch:term,gsrlimit:'8',gsrnamespace:'0',gsroffset:String(offset),
 prop:'extracts|info',explaintext:'1',exintro:'1',inprop:'url'});
const gutenUrl=(term,page)=>'https://gutendex.com/books/?'+new URLSearchParams({search:term,page:String(page),languages:'en'});
async function pullNext(channel,state){
 // A bounded batch: no infinite retries, no empty pages used as fake stories.
 for(let round=0;round<5;round++){
  const topic=channel.terms[state.topic%channel.terms.length];
  if(channel.mode==='wiki'){
   const offset=state.offset;const data=await json(wikiUrl(topic,offset));
   const next=data?.continue?.gsroffset;
   if(Number.isInteger(next)&&next>offset&&next<=400)state.offset=next;
   else{state.topic++;state.offset=0}
   state.queue.push(...wikipediaResults(data));
  }else{
   const page=state.page;
   const data=await json(gutenUrl(topic,page));
   const next=trustedStorySource(data?.next||'','gutendex.com');
   if(next&&page<24)state.page=page+1;else{state.topic++;state.page=1}
   state.queue.push(...gutenbergResults(data));
  }
  if(nextUnseen(state.queue,state.seen))return nextUnseen(state.queue,state.seen);
 }
 return null;
}
export function mountInfinityReaders(doc=document){
 const bank=doc.getElementById('infinityStoryChannels');if(!bank||bank.dataset.mounted==='true')return;
 bank.dataset.mounted='true';
 const collected=new Set(safeList(SAVED));
 for(const channel of READER_CHANNELS){
  const reader=node('section','isr-card');reader.id=channel.mount;reader.dataset.readerChannel=channel.id;
  reader.setAttribute('aria-label',channel.title+' · Infinity story reader');
  reader.style.setProperty('--reader-dark',channel.color);
  reader.style.setProperty('--reader-accent',channel.accent);
  const hero=node('header','isr-hero');
  const heading=node('div','isr-hero-heading');
  const brand=node('small','isr-brand','INFINITY® · NEVER-ENDING STORY TRAILS');
  const title=node('h2','isr-title',channel.title);
  heading.append(brand,title,node('p','isr-sub',channel.subtitle));
  const emblem=node('span','isr-emblem',channel.icon);emblem.setAttribute('aria-hidden','true');hero.append(heading,emblem);
  const app=node('div','isr-app');
  const progress=node('div','isr-progress');
  const storyType=node('span','isr-tag','Original narrative');
  const count=node('span','isr-count','0 stories read');
  progress.append(storyType,count);
  const story=node('article','isr-story');
  const storyTitle=node('h3','isr-story-title','Choose your first story');
  const body=node('div','isr-story-body');
  const status=node('p','isr-status','Touch Next Story to begin an original story or discover another source.');status.setAttribute('role','status');
  const attribution=node('div','isr-source');
  const controls=node('div','isr-controls');
  const previous=node('button','isr-button isr-previous','‹ Previous');
  const next=node('button','isr-button isr-next','Next story ›');
  const library=node('button','isr-button isr-surprise','Surprise me ✦');
  previous.type=next.type=library.type='button';previous.disabled=true;
  const tools=node('div','isr-tools');
  const save=node('button','isr-tool','◇ Collect'),share=node('button','isr-tool','↗ Share');
  const build=node('a','isr-tool isr-build','+1 Build');build.href='/quick-card-builder.html';
  save.type=share.type='button';tools.append(save,share,build);
  controls.append(previous,next,library);
  story.append(storyTitle,body,attribution);
  app.append(progress,story,status,controls,tools);
  if(channel.disclaimer)app.append(node('p','isr-disclaimer',channel.disclaimer));
  const footer=node('p','isr-footer','New-to-you titles first · saved on this device · source books and articles open on their original sites. No tokens minted by reading.');
  app.append(footer);reader.append(hero,app);bank.append(reader);
  const state={seen:safeList(SEEN+channel.id),queue:[...channel.seeds],topic:0,offset:0,page:1,
   history:[],index:-1,working:false,loaded:false,selected:null};
  const show=item=>{
   if(!item)return;state.selected=item;
   storyTitle.textContent=item.title;
   storyType.textContent=item.kind==='original'?'Original fiction':
    item.kind==='catalog'?'Public-domain book discovery':
    item.kind==='wikipedia'?'CC BY-SA source excerpt':'Original history feature';
   count.textContent=state.seen.length+' read · '+(Math.max(0,state.queue.filter(x=>!state.seen.includes(x.id)).length))+' ready';
   body.replaceChildren(...item.body.map(paragraph=>node('p','',paragraph)));
   body.scrollTop=0;
   attribution.replaceChildren();
   const credit=node('small','isr-credit',item.license||'QuantaPhi story');
   attribution.append(credit);
   if(item.author)attribution.append(node('span','isr-author',item.author));
   if(item.source){const link=node('a','isr-source-link',item.kind==='catalog'?'Read complete public-domain book ↗':'Read complete source and attribution ↗');
    link.href=item.source;link.target='_blank';link.rel='noopener noreferrer';attribution.append(link)}
   status.textContent=item.kind==='catalog'?'Public-domain catalog entry; open the full story through the source link.':
    item.kind==='wikipedia'?'Licensed article excerpt; visit the credited source for the full record.':
    'Story ready. Swipe left or choose Next story for another.';
   save.textContent=collected.has(item.id)?'✓ Collected':'◇ Collect';
   previous.disabled=state.index<=0;
  };
  const remember=item=>{
   state.seen.push(item.id);state.seen=state.seen.slice(-1200);saveList(SEEN+channel.id,state.seen);
   state.history=state.history.slice(0,state.index+1);state.history.push(item);
   state.index=state.history.length-1;
   if(state.history.length>70){state.history.shift();state.index--}
  };
  async function advance(){
   if(state.working)return;
   state.working=true;next.disabled=library.disabled=true;status.textContent='Finding a story you have not read…';
   try{
    let item=nextUnseen(state.queue,state.seen);
    if(!item)item=await pullNext(channel,state);
    if(!item){status.textContent='No unseen source found in this batch. Touch Next again to search another archive page. Previously read stories are kept in your collection.';return}
    remember(item);show(item);
   }catch(error){status.textContent='The external story archive could not be reached. Touch Next to retry; previously read stories will not be repeated.'}
   finally{state.working=false;next.disabled=library.disabled=false}
  }
  next.addEventListener('click',advance);
  library.addEventListener('click',advance);
  previous.addEventListener('click',()=>{
   if(state.index<=0)return;state.index--;show(state.history[state.index]);status.textContent='Previous story from this reading session.'});
  save.addEventListener('click',()=>{
   if(!state.selected)return;
   collected.add(state.selected.id);saveList(SAVED,[...collected]);save.textContent='✓ Collected';
   status.textContent='Saved to your reading collection on this device; no Star Coins were minted.'});
  share.addEventListener('click',async()=>{
   const item=state.selected;
   const url=new URL('/q-share',location.origin);
   url.searchParams.set('kind','quick-card');url.searchParams.set('title',item?.title||channel.title);
   url.searchParams.set('text',channel.title+' · '+(item?.body?.[0]||channel.subtitle).slice(0,190));
   url.searchParams.set('dest',new URL('/?card='+encodeURIComponent(channel.mount),location.origin).href);
   try{
    if(navigator.share){await navigator.share({title:item?.title||channel.title,url:url.href});return}
    if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url.href);status.textContent='Reader share link copied.';return}
   }catch(e){if(e?.name==='AbortError')return}
   const link=node('a','isr-source-link','Open shareable reader link ↗');link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';
   attribution.append(link);status.textContent='Use the shareable reader link below.';
  });
  // A swipe advances exactly one story, separate from the outer Oracle arrows.
  let downX=0,downY=0;
  story.addEventListener('touchstart',e=>{downX=e.changedTouches[0]?.clientX||0;downY=e.changedTouches[0]?.clientY||0},{passive:true});
  story.addEventListener('touchend',e=>{const x=(e.changedTouches[0]?.clientX||0)-downX,y=(e.changedTouches[0]?.clientY||0)-downY;
   if(Math.abs(x)>85&&Math.abs(x)>Math.abs(y)*1.6){if(x<0)void advance();else previous.click()}},{passive:true});
  reader.addEventListener('oracle:activate',()=>{if(!state.loaded){state.loaded=true;void advance()}});
  // Direct opened standalone cards are also initialized when the reader is visible.
  if(new URL(location.href).searchParams.get('reader')===channel.id){state.loaded=true;void advance()}
 }
 // Late-created widgets are observed by Oracle's existing mutation listener.
 window.dispatchEvent(new Event('quantaphi:story-readers-ready'));
}
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>mountInfinityReaders(),{once:true});
 else mountInfinityReaders();
}
