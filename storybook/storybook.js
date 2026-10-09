(function(){
'use strict';
const COLLECT_API='https://quanta-phi-ledger.marvaseater.workers.dev/v1/quants/collects';
const CHAPTER_API='https://quanta-phi-ledger.marvaseater.workers.dev/v1/quants/storybook';
const NOTES_KEY='phi:oracleStorybook:notes:v1',CACHE_KEY='phi:oracleStorybook:explicitCollectCache:v1';
const UNSAFE=/\b(?:porn|pornography|xxx|hardcore|explicit\s+sex|adult\s+video|onlyfans|nude\s+leak|escort\s+service|sex\s+tape)\b/i;
const $=s=>document.querySelector(s);
const clean=(x,max=9000)=>String(x??'').replace(/\s+/g,' ').trim().slice(0,max);
const get=(k,f)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??f}catch{return f}};
const put=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){console.warn('Storybook device cache full',e)}};
const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e};
const wallet=()=>window.QuantaCloudConnection||window.StarQuestCloudLedger;
let cards=[],notes=get(NOTES_KEY,{}),cloudCards=get(CACHE_KEY,[]),syncing=false;
function timestamp(x){
 if(!x)return 0;
 const t=String(x).trim(),value=/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(t)?t.replace(' ','T')+'Z':t;
 return Date.parse(value)||0;
}
function safeUrl(value){
 try{const u=new URL(value);return u.protocol==='https:'&&!UNSAFE.test(u.host+u.pathname)?u.href:''}catch{return ''}
}
function normalize(x){
 if(!x||!x.key||!clean(x.title))return null;
 const item={key:clean(x.key,750),title:clean(x.title,340),body:clean(x.story||x.body||'',8500),
  sourceUrl:safeUrl(x.sourceUrl||x.url),image:safeUrl(x.media||''),type:clean(x.type,45),
  collectedAt:clean(x.collectedAt,85),created:timestamp(x.collectedAt)};
 if(UNSAFE.test([item.title,item.body,item.sourceUrl].join(' ')))return null;
 return item;
}
function collected(){
 // Do not mix automatically shared links, search-history Quants, News Phi articles
 // or the old 258-item mixed-feed cache into the personal book.
 const byKey=new Map();
 for(const source of [get('quantaPhiCollected',[]),cloudCards]){
  for(const row of (Array.isArray(source)?source:[])){
   const x=normalize(row);if(!x)continue;
   const previous=byKey.get(x.key);
   if(!previous)byKey.set(x.key,x);
   else byKey.set(x.key,{...previous,...x,
    body:x.body||previous.body,sourceUrl:x.sourceUrl||previous.sourceUrl,
    collectedAt:x.created&&(!previous.created||x.created<previous.created)?x.collectedAt:previous.collectedAt,
    created:x.created||previous.created});
  }
 }
 return [...byKey.values()].sort((a,b)=>b.created-a.created);
}
function status(msg){$('#syncState').textContent=msg}
function inScope(row,scope){
 if(scope==='all')return true;
 if(!row.created)return false;
 const now=Date.now();
 if(scope==='today')return new Date(row.created).toDateString()===new Date().toDateString();
 const days=scope==='week'?7:30;
 return row.created<=now+300000&&now-row.created<=days*86400000;
}
function visible(){
 const scope=$('#dateFilter').value,term=clean($('#bookSearch').value).toLowerCase(),chapter=$('#chapterFilter').value;
 const out=cards.filter(item=>inScope(item,scope)&&(!chapter||(notes[item.key]?.chapter||'Unsorted')===chapter)&&
  (!term||[item.title,item.body,notes[item.key]?.chapter,notes[item.key]?.note].some(t=>String(t||'').toLowerCase().includes(term))));
 const order=$('#sortSelect').value;
 if(order==='az')out.sort((a,b)=>a.title.localeCompare(b.title));
 else out.sort((a,b)=>b.created-a.created);
 if(order==='oldest')out.reverse();
 return out;
}
function refreshChapters(){
 const menu=$('#chapterFilter'),selected=menu.value;
 const names=[...new Set(cards.map(x=>notes[x.key]?.chapter||'Unsorted'))].sort();
 menu.replaceChildren(new Option('Every chapter',''));
 for(const name of names)menu.add(new Option(name,name));
 menu.value=names.includes(selected)?selected:'';
}
function openStory(item){
 const parent=$('#readerBody');parent.replaceChildren();
 parent.append(el('p','meta',(notes[item.key]?.chapter||'Unsorted')+' · '+(item.created?new Date(item.created).toLocaleDateString():'Saved')));
 parent.append(el('h2','',item.title));
 parent.append(el('p','',item.body||'The original collected card has no saved long-form story text yet.'));
 const myNote=notes[item.key]?.note;
 if(myNote)parent.append(el('p','', 'My note: '+myNote));
 if(item.sourceUrl){const a=el('a','', 'Open documented source ↗');a.href=item.sourceUrl;a.target='_blank';a.rel='noopener noreferrer';parent.append(a)}
 if(item.image){
  const show=el('button','btn','Show collected media');
  show.type='button';show.onclick=()=>{
    show.remove();const img=el('img');img.alt='Media from your collected card';img.loading='lazy';img.referrerPolicy='no-referrer';img.src=item.image;parent.append(img);
  };parent.append(show);
 }
 $('#reader').showModal();
}
async function update(item,patch){
 const old=notes[item.key]||{},value={...old,...patch,updatedAt:new Date().toISOString()};
 notes[item.key]=value;put(NOTES_KEY,notes);render();
 const bridge=wallet();
 if(!bridge?.authenticatedFetch){status('Chapter saved on this device. Cloud wallet is not connected.');return}
 try{
  const reply=await bridge.authenticatedFetch(CHAPTER_API,{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({key:item.key,chapter:value.chapter||'Unsorted',note:value.note||'',favorite:!!value.favorite})});
  if(!reply.ok)throw Error('Cloud chapter sync unavailable');
  status('Saved to your private cloud Storybook');
 }catch(e){status('Saved on this device. Cloud chapter sync pending.')}
}
function article(item){
 const card=el('article','story-card');const detail=notes[item.key]||{};
 card.append(el('div','meta',(detail.chapter||'Unsorted').toUpperCase()+' · '+(item.created?new Date(item.created).toLocaleDateString():'SAVED')));
 card.append(el('h3','',item.title));
 card.append(el('p','',(item.body||'Collected card with no stored description').slice(0,240)));
 const actions=el('div','buttons'),open=el('button','read','Read page'),favorite=el('button','',detail.favorite?'★ Favorite':'☆ Favorite');
 open.type='button';favorite.type='button';open.onclick=()=>openStory(item);
 favorite.onclick=()=>update(item,{favorite:!detail.favorite});actions.append(open,favorite);card.append(actions);
 const editor=el('div','chapter-editor'),chapter=el('input'),note=el('input'),save=el('button','','Save chapter + note');
 chapter.placeholder='Chapter (Mystery, Music, Origins…)';chapter.maxLength=90;chapter.value=detail.chapter||'';
 note.placeholder='Your note (optional)';note.maxLength=1200;note.value=detail.note||'';
 save.type='button';save.onclick=()=>update(item,{chapter:clean(chapter.value,90)||'Unsorted',note:clean(note.value,1200)});
 editor.append(chapter,note,save);card.append(editor);return card;
}
function render(){
 cards=collected();refreshChapters();
 const rows=visible(),container=$('#bookCards');container.replaceChildren();
 const date=$('#dateFilter').value;
 $('#bookCount').textContent=rows.length+' page'+(rows.length===1?'':'s')+(date==='all'?' · all dates':'');
 if(!rows.length){
  container.append(el('div','empty',cards.length?
   'No pages in this date range. Choose “Past 7 days” or “All saved dates” to find earlier collections.':
   'No intentional Collect records are available in this wallet yet. Collect a story in QuantaPhi and sync.'));
  return;
 }
 for(const item of rows)container.append(article(item));
}
async function sync(){
 if(syncing)return;syncing=true;$('#syncButton').disabled=true;status('Checking your cloud collection…');
 const bridge=wallet();
 if(!bridge?.authenticatedFetch){render();status('Showing saved device collections. Cloud wallet not connected.');syncing=false;$('#syncButton').disabled=false;return}
 try{
  const received=new Map();let offset=0,hasMore=true,pages=0;
  while(hasMore&&pages<30){
   const response=await bridge.authenticatedFetch(COLLECT_API+'?limit=200&offset='+offset,{cache:'no-store'});
   if(!response.ok)throw Error('Cloud collect request failed');
   const data=await response.json();
   const batch=Array.isArray(data.cards)?data.cards:[];
   for(const item of batch)if(item?.key)received.set(item.key,item);
   pages++;
   const next=Number(data.nextOffset);
   hasMore=data.hasMore===true&&data.nextOffset!==null&&Number.isInteger(next)&&next>offset&&batch.length>0;
   if(hasMore)offset=next;
   if(received.size>=6000)break;
  }
  cloudCards=[...received.values()];put(CACHE_KEY,cloudCards);
  const prefs=await bridge.authenticatedFetch(CHAPTER_API,{cache:'no-store'}).catch(()=>null);
  if(prefs?.ok){const data=await prefs.json();for(const x of data.cards||[])if(x.key)notes[x.key]={...notes[x.key],chapter:x.chapter||'Unsorted',note:x.note||'',favorite:!!x.favorite};put(NOTES_KEY,notes)}
  render();status('Cloud collection synced · '+received.size+' saved Collect records');
 }catch(e){render();status('Cloud sync unavailable. Kept saved device records.')}
 finally{syncing=false;$('#syncButton').disabled=false}
}
$('#syncButton').addEventListener('click',()=>void sync());
for(const name of ['dateFilter','chapterFilter','sortSelect'])$('#'+name).addEventListener('change',render);
$('#bookSearch').addEventListener('input',render);
$('#closeReader').addEventListener('click',()=>$('#reader').close());
$('#reader').addEventListener('click',e=>{if(e.target===$('#reader'))e.target.close()});
window.addEventListener('starquest:ledger-connected',()=>void sync(),{once:true});
render();void sync();
})();