/* QuantaPhi · X Spaces Quick Card.
 * Separate from the authenticated Media Star two-stage roll and X Developer Connect.
 * The owner-supplied link is only an index entry, NEVER an audio-verified session.
 * No cross-site frames of x.com/i/spaces; generic Space URLs have no verified supported iframe playback.
 * X controls Spaces playback. This is not a paid X search or OAuth client.
 */
import {readIndexedSpaces, validSpaceLink} from './quanta-feed-spaces.mjs';
export {validSpaceLink};

export function normalizeSpaceEntry(source) {
  if (!source || !validSpaceLink(source.url)) return null;
  const input = new URL(source.url);
  const url = 'https://x.com' + input.pathname.replace(/\/$/, '');
  const handle = String(source.host || source.handle || '').replace(/^@/,'').trim();
  const host = /^[A-Za-z0-9_]{1,15}$/.test(handle) ? handle : 'unknown';
  const title = String(source.title || 'Original X Space').trim().slice(0,170) || 'Original X Space';
  return {url,title,host,state: source.status === 'replay marked verified'
    ? 'replay source-marked; audio not tested'
    : 'playback unverified'};
}
export function filterSpaceEntries(entries, search='') {
  const term=String(search||'').trim().toLocaleLowerCase().replace(/^@/,'');
  return (Array.isArray(entries)?entries:[]).filter(x=>
    x && (!term || (x.title+' '+x.host).toLocaleLowerCase().includes(term)));
}

const node=(tag,cls,txt)=>{
  const item=document.createElement(tag);
  if(cls)item.className=cls;
  if(txt!==undefined)item.textContent=txt;
  return item;
};
function append(parent,...children){parent.append(...children);return parent;}
function style(){
 if(document.getElementById('xSpacesQuickStyle'))return;
 const st=node('style');st.id='xSpacesQuickStyle';
 st.textContent=[
  '#xSpacesQuickCard{margin:15px auto;padding:16px;background:#fafaf9;color:#20313b;border:1px solid #cfd9dd;border-radius:20px;max-width:900px;font:inherit;box-shadow:0 9px 24px #22334412}',
  '#xSpacesQuickCard *{box-sizing:border-box}',
  '#xSpacesQuickCard h2{font-size:22px;line-height:1.25;letter-spacing:.01em;margin:0;color:#243642}',
  '#xSpacesQuickCard .xqs-sub{font-size:14px;line-height:1.55;color:#50626f;margin:8px 0}',
  '#xSpacesQuickCard .xqs-bar{display:flex;flex-wrap:wrap;gap:9px;align-items:center;margin:12px 0}',
  '#xSpacesQuickCard .xqs-input{flex:1 1 160px;min-width:0;border:1px solid #b2c5ce;background:white;color:#183443;border-radius:12px;padding:12px;font-size:16px;min-height:48px}',
  '#xSpacesQuickCard .xqs-button,#xSpacesQuickCard .xqs-a{display:inline-flex;align-items:center;justify-content:center;text-align:center;border:1px solid #a9bdc5;background:#fff;color:#213e50;border-radius:12px;padding:11px 14px;min-height:46px;font:750 14px/1.25 system-ui;text-decoration:none;cursor:pointer}',
  '#xSpacesQuickCard .xqs-primary{background:#233e4f;color:#fff;border-color:#233e4f}',
  '#xSpacesQuickCard .xqs-note{font-size:13px;line-height:1.5;color:#536673;margin:10px 0}',
  '#xSpacesQuickCard .xqs-status{font-size:14px;line-height:1.5;color:#264957;min-height:24px}',
  '#xSpacesQuickCard .xqs-card{display:flex;flex-direction:column;gap:8px;min-height:164px;background:#fff;border:1px solid #d1dce1;border-radius:15px;padding:15px;margin:12px 0 5px}',
  '#xSpacesQuickCard .xqs-card h3{font-size:18px;line-height:1.3;color:#233744;margin:0}',
  '#xSpacesQuickCard .xqs-card p{margin:0;color:#576a74;font-size:14px}',
  '#xSpacesQuickCard .xqs-card .xqs-a{align-self:flex-start}',
  '#xSpacesQuickCard .xqs-nav{display:flex;gap:9px;align-items:center;justify-content:space-between}',
  '#xSpacesQuickCard .xqs-counter{font-size:13px;line-height:1.4;color:#53616c;min-width:65px;text-align:center}',
  '#xSpacesQuickCard :is(button,a,input):focus-visible{outline:3px solid #8c52b7;outline-offset:3px}',
  '@media(max-width:380px){#xSpacesQuickCard{padding:12px}#xSpacesQuickCard h2{font-size:20px}}'
 ].join('\n');
 document.head.append(st);
}
export function mountXSpacesQuickCard(root){
 if(!root||typeof document==='undefined')return null;
 style();
 const section=node('section','xqs-shell');
 append(section,node('h2','', '𝕏 Spaces · Quick Listen'),
  node('p','xqs-sub','Find your own indexed conversations, filter by topic, or paste a real X Space link. No invented rooms.'));
 const first=node('div','xqs-bar');
 const search=node('input','xqs-input');search.type='search';search.placeholder='Search topic or @host';
 search.setAttribute('aria-label','Search indexed X Spaces by topic or host');
 const load=node('button','xqs-button','Load my indexed Spaces');load.type='button';
 append(first,search,load);
 const second=node('div','xqs-bar');
 const urlInput=node('input','xqs-input');urlInput.type='url';urlInput.placeholder='Paste https://x.com/i/spaces/…';
 urlInput.setAttribute('aria-label','X Space URL to add to this session');
 const addButton=node('button','xqs-button','Add this Space');addButton.type='button';
 append(second,urlInput,addButton);
 const status=node('p','xqs-status','Ready · select Load my indexed Spaces or add a source link.');
 status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const deck=node('div','xqs-deck');
 const nav=node('div','xqs-nav');
 const prev=node('button','xqs-button','‹ Previous X Space'),count=node('span','xqs-counter','0 of 0'),next=node('button','xqs-button','Next X Space ›');
 prev.type=next.type='button';
 append(nav,prev,count,next);
 const note=node('p','xqs-note',
  'X controls Spaces playback. Live audio and recordings cannot be assumed embeddable from a Space link. The official X player opens only when you press Listen; it may require X sign-in. This card never claims playback on QuantaPhi.');
 append(section,first,second,status,deck,nav,note);
 root.replaceChildren(section);
 // Session-only links: do not expose followed-account data across visitors or record user browsing.
 let fromIndex=[],sessionOnly=[],position=0,searchTerm='',pending=false;
 const distinct=()=>{
  const map=new Map();
  for(const item of [...sessionOnly,...fromIndex]) if(!map.has(item.url))map.set(item.url,item);
  return filterSpaceEntries([...map.values()],searchTerm);
 };
 function redraw(){
  const list=distinct();position=Math.min(position,Math.max(0,list.length-1));
  deck.replaceChildren();
  count.textContent=list.length?(position+1)+' of '+list.length:'0 of 0';
  prev.disabled=position===0;
  next.disabled=position>=list.length-1;
  if(!list.length){
    deck.append(node('p','xqs-note','No matching indexed Spaces. Search another topic or paste an authentic Space URL.'));
    return;
  }
  const chosen=list[position],card=node('article','xqs-card');
  const source=node('p','', '@'+chosen.host+' · '+chosen.state);
  const open=node('a','xqs-a xqs-primary','▶ Listen in official X player');
  open.href=chosen.url;open.target='_blank';open.rel='noopener noreferrer';
  open.setAttribute('aria-label','Open the official X Space player for '+chosen.title);
  append(card,node('h3','',chosen.title),source,open);
  deck.append(card);
 }
 search.addEventListener('input',()=>{searchTerm=search.value;position=0;redraw()});
 prev.addEventListener('click',()=>{if(position>0)position--;redraw()});
 next.addEventListener('click',()=>{if(position<distinct().length-1)position++;redraw()});
 addButton.addEventListener('click',()=>{
  const original=String(urlInput.value||'').trim();
  const entry=normalizeSpaceEntry({url:original,title:'User-supplied X Space'});
  if(!entry){status.textContent='That is not a valid X Space URL. Use https://x.com/i/spaces/SPACE_ID.';return}
  sessionOnly=[entry,...sessionOnly.filter(x=>x.url!==entry.url)];
  position=0;search.value='';searchTerm='';urlInput.value='';
  status.textContent='Source link added for this session. Its live status and playable audio are unverified.';
  redraw();
 });
 load.addEventListener('click',async()=>{
  if(pending)return;
  pending=true;load.disabled=true;status.textContent='Checking your wallet-authorized Media Star Spaces library…';
  try{
   const token=await window.QuantaCloudConnection?.resolveDeviceToken?.();
   const result=await readIndexedSpaces({token,maxHosts:5});
   fromIndex=result.episodes.map(normalizeSpaceEntry).filter(Boolean);
   position=0;
   status.textContent=fromIndex.length
    ?fromIndex.length+' indexed Spaces ready to browse · not verified live or playable.'
    :'No eligible indexed Spaces found. Paste a source link to browse it here.';
  }catch(e){
   fromIndex=[];
   status.textContent=String(e?.message||e)==='wallet_not_connected'
    ?'Sign into your own QuantaPhi wallet to load your followed library. Public X live search is not connected.'
    :'Media Star source unavailable; existing session links remain accessible.';
  }finally{pending=false;load.disabled=false;redraw()}
 });
 redraw();
 return section;
}
if(typeof document!=='undefined')
 mountXSpacesQuickCard(document.getElementById('xSpacesQuickCard'));
