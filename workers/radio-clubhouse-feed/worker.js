const EDGE_VERSION='radio-clubhouse-feed-v1';
// Radio Clubhouse: direct public forum #2, ordinary discussions only.
// The last-resort archive is a cited selection of actual forum threads,
// never a substitute falsely presented as real-time information.
const CLUB_BASE='https://antiqueradios.com/forums/';
const CLUB_FORUM_URL=CLUB_BASE+'viewforum.php?f=2';
const CLUB_LIMIT=8;
const CLUB_ARCHIVE=[
 {id:'448450',title:'Wireless Backup Camera Recommendations/Opinions',author:'WoodchuckTN',publishedAt:'2025-06-05',snippet:'Members discuss experiences and options for a wireless backup camera on an older vehicle.'},
 {id:'448192',title:'Anyone on the Infiniti Q50 forum?',author:'xrhonda91',publishedAt:'2025-05-25',snippet:'A member asks for help reconnecting with another radio enthusiast through a car forum.'},
 {id:'447666',title:"Netflix Vietnam Doc. Let's Hear Your Stories",author:'Ahop65',publishedAt:'2025-05-06',snippet:'A discussion invites veterans to share their memories and radio-related experiences.'},
 {id:'447658',title:'CRC QD Electronic Cleaner vs. CRC QD Contact Cleaner?',author:'DWSmith',publishedAt:'2025-05-05',snippet:'A member asks about the difference between two electronic contact-cleaning products.'},
 {id:'447344',title:'Lightning Strike History',author:'Macrohenry',publishedAt:'2025-04-23',snippet:'A discussion about locating maps with historical lightning strike information.'},
 {id:'447116',title:'The untold story of Heathkit',author:'Dalton',publishedAt:'2025-04-15',snippet:'Members exchange perspectives on a video about the history of Heathkit.'},
 {id:'447115',title:'Contact cleaner recommendation?',author:'DWSmith',publishedAt:'2025-04-15',snippet:'A member requests advice about cleaning contacts on radios and test equipment.'},
 {id:'445985',title:'The Martin Family mystery, solved?',author:'Eric H',publishedAt:'2025-03-07',snippet:'Members discuss news about a longstanding disappearance in Oregon.'}
].map(t=>({...t,url:CLUB_BASE+'viewtopic.php?t='+t.id,updated:null,archived:true}));
const CLUB_EXCLUDED_IDS=new Set(['392271']); // Known pinned shipping megathread, not a new story.
function clubText(value){
 return String(value||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1')
  .replace(/<[^>]*>/g,' ').replace(/&nbsp;/gi,' ')
  .replace(/&(?:amp|#38);/gi,'&').replace(/&(?:quot|#34);/gi,'"')
  .replace(/&#(?:39|x27);/gi,"'").replace(/&(?:lt|#60);/gi,'<')
  .replace(/&(?:gt|#62);/gi,'>')
  .replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Math.min(Number(n),0x10ffff)))
  .replace(/\s+/g,' ').trim();
}
function clubAttr(attributes,name){
 const re=new RegExp('(?:^|\\s)'+name+'\\s*=\\s*(?:"([^"]*)"|\\x27([^\\x27]*)\\x27)','i');
 const m=String(attributes).match(re);return m?(m[1]??m[2]??''):'';
}
function clubTopic(href){
 try{
  const u=new URL(String(href).replace(/&amp;/gi,'&'),CLUB_BASE);
  if(u.protocol!=='https:'||u.hostname!=='antiqueradios.com'||!u.pathname.endsWith('/viewtopic.php'))return null;
  const id=u.searchParams.get('t');
  if(!/^\d{1,12}$/.test(id||'')||CLUB_EXCLUDED_IDS.has(id))return null;
  return {id,url:CLUB_BASE+'viewtopic.php?t='+id};
 }catch{return null}
}
function clubDate(raw){
 const ms=Date.parse(String(raw||''));
 return Number.isFinite(ms)&&ms>946684800000&&ms<Date.now()+86400000?new Date(ms).toISOString():null;
}
function clubAdministrative(title,extra=''){
 const name=String(title||'').toLowerCase().trim();
 return /^(?:announcement|sticky|read first|read before posting|forum rules|posting rules|important notice|rules and guidelines)(?:\b|:)/i.test(name)||
 /(?:topic_announce|topic_sticky|topic_global|icon_(?:announce|sticky)|\b(?:announcement|sticky|global-announce)\b)/i.test(extra);
}
function clubParseAtom(xml){
 const topics=new Map();
 for(const match of xml.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi)){
  const entry=match[1];
  const links=[...entry.matchAll(/<link\b([^>]*)\/?>/gi)];
  const topic=links.map(x=>clubTopic(clubAttr(x[1],'href'))).find(Boolean);
  if(!topic||topics.has(topic.id))continue;
  const title=clubText((entry.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)||[])[1]).slice(0,180);
  const category=entry.match(/<category\b[^>]*>/i)?.[0]||'';
  if(!title||clubAdministrative(title,category))continue;
  const updated=clubDate((entry.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i)||[])[1]||
                         (entry.match(/<published[^>]*>([\s\S]*?)<\/published>/i)||[])[1]);
  const author=clubText((entry.match(/<author\b[^>]*>[\s\S]*?<name\b[^>]*>([\s\S]*?)<\/name>/i)||[])[1]).slice(0,70);
  const snippet=clubText((entry.match(/<summary\b[^>]*>([\s\S]*?)<\/summary>/i)||[])[1]||
                         (entry.match(/<content\b[^>]*>([\s\S]*?)<\/content>/i)||[])[1]).slice(0,340);
  topics.set(topic.id,{...topic,title,author,snippet,updated});
 }
 return [...topics.values()].sort((a,b)=>(Date.parse(b.updated||0)||0)-(Date.parse(a.updated||0)||0)).slice(0,CLUB_LIMIT);
}
function clubParseHtml(html){
 const topics=new Map();
 // Interpret only phpBB topic-list links. Inspect enclosing topic-row CSS
 // rather than using a broad title/keyword scrape of the page.
 for(const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)){
  if(!/\btopictitle\b/i.test(clubAttr(match[1],'class')))continue;
  const topic=clubTopic(clubAttr(match[1],'href'));
  if(!topic||topics.has(topic.id))continue;
  const title=clubText(match[2]).slice(0,180);
  const prefix=html.slice(Math.max(0,match.index-4500),match.index);
  const rowStarts=['<li','<tr','<article','<dl'].map(tag=>prefix.toLowerCase().lastIndexOf(tag));
  const rowStart=Math.max(...rowStarts);
  const rowPrefix=rowStart>=0?prefix.slice(rowStart):'';
  const openingTags=(rowPrefix.match(/<(?:li|tr|article|dl|dt|div|span|img)\b[^>]*>/gi)||[]).slice(0,32).join(' ');
  if(!title||clubAdministrative(title,openingTags))continue;
  topics.set(topic.id,{...topic,title,updated:null,author:'',snippet:''});
  if(topics.size>=CLUB_LIMIT)break;
 }
 return [...topics.values()];
}
async function clubFetch(url,accept){
 const response=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(9000),headers:{
  'Accept':accept,'User-Agent':'QuantaPhi-RadioClubhouse/1.0 (+https://quantaphi.org)'
 }});
 if(!response.ok)throw Error('forum_http_'+response.status);
 const content=await response.text();
 if(content.length>2_000_000)throw Error('forum_response_too_large');
 return content;
}
async function radioClubhouseFeed(request){
 if(request.method!=='GET')return Response.json({ok:false,error:'method_not_allowed'},
  {status:405,headers:{Allow:'GET','Cache-Control':'no-store'}});
 const headers={'Cache-Control':'public, max-age=0, s-maxage=300','Access-Control-Allow-Origin':'*',
  'X-Content-Type-Options':'nosniff','x-quantaphi-edge':EDGE_VERSION};
 let topics=[],feedType='';
 // Use the exact Radio Clubhouse page 1 first, NOT the index or pinned
 // announcement page. RSS is a secondary publicly exposed route.
 try{
  const html=await clubFetch(CLUB_FORUM_URL,'text/html');
  if(!/radio\s+clubhouse/i.test(clubText(html.slice(0,30000))))throw Error('wrong_board');
  topics=clubParseHtml(html);
  if(topics.length)feedType='forum';
 }catch{}
 if(!topics.length){
  for(const feedPath of ['feed.php?f=2','feed.php?mode=topics&f=2']){
   try{
    const xml=await clubFetch(CLUB_BASE+feedPath,'application/atom+xml, application/xml');
    topics=clubParseAtom(xml);
    if(topics.length){feedType='atom';break}
   }catch{}
  }
 }
 const live=topics.length>0;
 return Response.json({
  ok:true,source:'Antique Radio Forums · Radio Clubhouse',sourceUrl:CLUB_FORUM_URL,
  checkedAt:new Date().toISOString(),feedType:live?feedType:'archive',
  archived:!live,topics:live?topics:CLUB_ARCHIVE
 },{headers:{...headers,...(!live?{'Cache-Control':'public, max-age=0, s-maxage=600'}:{})}});
}

export default {
 async fetch(request){
  const url=new URL(request.url);
  if(url.pathname!=='/api/radio-clubhouse')return Response.json({ok:false,error:'not_found'},{status:404,headers:{'Access-Control-Allow-Origin':'*'}});
  return radioClubhouseFeed(request);
 }
};
