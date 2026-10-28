/* QuantaPhi shareable cards: unlisted instant links, moderated homepage discovery.
 * No provider login, scraped content, payment or source-site code execution. */
const origin='https://quantaphi.org';
const json=(v,status=200,extra={})=>Response.json(v,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra}});
const text=(v,n)=>String(v??'').trim().slice(0,n);
const isSlug=s=>/^[a-z0-9][a-z0-9-]{4,90}$/.test(s||'');
const htmlEscape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function safeUrl(raw){
 try{const u=new URL(String(raw)); if(u.protocol!=='https:'||u.username||u.password||u.href.length>900)return '';
 const h=u.hostname.toLowerCase();if(!h.includes('.')||/^(localhost|0\.|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|::1)/.test(h)||h.endsWith('.local'))return '';
 u.hash='';return u.href;}catch{return ''}
}
export function youtubeId(url){try{const u=new URL(url);const h=u.hostname.toLowerCase();const id=h==='youtu.be'?u.pathname.slice(1):(['youtube.com','www.youtube.com','m.youtube.com'].includes(h)?u.searchParams.get('v')||((u.pathname.startsWith('/shorts/')||u.pathname.startsWith('/embed/'))?u.pathname.split('/')[2]:''):'');return /^[A-Za-z0-9_-]{11}$/.test(id||'')?id:'';}catch{return ''}}
export function normalizeCard(input){
 const title=text(input?.title,85),description=text(input?.description,600),interactionRequest=text(input?.interactionRequest,500);
 const website=safeUrl(input?.website),image=safeUrl(input?.image||''),kind=text(input?.kind,25);
 const previewMode=input?.previewMode==='visual'?'visual':'interactive';
 if(input?.image&&(!image||(!/\.(?:png|jpe?g|gif|webp)$/i.test(new URL(image).pathname)&&!(new URL(image).hostname==='lsco.scene7.com'&&new URL(image).pathname.startsWith('/is/image/')))))return {error:'Use a public HTTPS PNG, JPG, WebP or GIF image URL you may share.'};
 if(title.length<3||description.length<12||interactionRequest.length<10||!website)return {error:'A title, official HTTPS website, description and interaction request are required.'};
 if(!['search','visit','video'].includes(kind))return {error:'Select a supported interaction.'};
 let searchTemplate='',videoId='';
 if(kind==='search'){
  searchTemplate=text(input?.searchTemplate,700);
  if(!searchTemplate.includes('{query}')||searchTemplate.split('{query}').length!==2)return {error:'A search card needs the site’s real search URL containing {query}.'};
  const probe=safeUrl(searchTemplate.replace('{query}','example'));
  if(!probe||new URL(probe).hostname!==new URL(website).hostname)return {error:'Search must use a confirmed URL on the same website; Bubbles cannot invent a site API.'};
 }
 if(kind==='video'){videoId=youtubeId(text(input?.video,500));if(!videoId)return {error:'Use a valid public YouTube URL for the video player.'};}
 return {card:{title,description,interactionRequest,website,image,kind,searchTemplate,videoId,previewMode}};
}
export const publicCard=row=>({
 slug:row.slug,title:row.title,description:row.description,interactionRequest:row.interaction_request,
 website:row.website,image:row.image||'',kind:row.kind,searchTemplate:row.search_template||'',
 videoId:row.video_id||'',previewMode:row.preview_mode==='visual'?'visual':'interactive',
 status:row.status,createdAt:row.created_at,cardUrl:origin+'/cards/'+row.slug
});
export function cardHtml(row){
 const card=publicCard(row), url=card.cardUrl;
 const title=htmlEscape(card.title),desc=htmlEscape(card.description),share=htmlEscape(url),
 img=htmlEscape(card.image);
 const noindex=card.status==='approved'?'index,follow':'noindex,follow';
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<title>'+title+' · QuantaPhi Quick Card</title><meta name="description" content="'+desc+'">'+
 '<meta name="robots" content="'+noindex+'"><link rel="canonical" href="'+share+'">'+
 '<meta property="og:type" content="website"><meta property="og:site_name" content="QuantaPhi"><meta property="og:title" content="'+title+' · Quick Card">'+
 '<meta property="og:description" content="'+desc+'"><meta property="og:url" content="'+share+'">'+
 (img?'<meta property="og:image" content="'+img+'"><meta property="og:image:alt" content="'+title+' Quick Card image">':'')+
 '<meta name="twitter:card" content="'+(img?'summary_large_image':'summary')+'"><meta name="twitter:title" content="'+title+' · Quick Card"><meta name="twitter:description" content="'+desc+'">'+
 (img?'<meta name="twitter:image" content="'+img+'"><meta name="twitter:image:alt" content="'+title+' Quick Card image">':'')+
 '<link rel="stylesheet" href="/published-quick-card.css?v=3">'+
 '</head><body><main id="publishedQuickCard" data-card-slug="'+htmlEscape(card.slug)+'"><p role="status">Loading Quick Card…</p></main>'+
 '<script type="module" src="/published-quick-card.js?v=4"></script></body></html>';
}
function validOrigin(request){const source=request.headers.get('Origin');return source===origin||source==='https://www.quantaphi.org';}
export default {async fetch(request,env){
 const url=new URL(request.url),path=url.pathname,method=request.method;
 const db=env.CARDS_DB;if(!db)return json({ok:false,error:'Card storage is not connected.'},503);
 if(path==='/api/quick-cards/health'&&method==='GET')return json({ok:true,storage:'connected',published:'moderated',xReader:'separate'});
 if(path==='/api/quick-cards'&&method==='POST'){
  if(!validOrigin(request))return json({ok:false,error:'Open the QuantaPhi card builder to publish.'},403);
  if(!(request.headers.get('content-type')||'').includes('application/json'))return json({ok:false,error:'JSON required.'},415);
  const raw=await request.text();if(raw.length>6000)return json({ok:false,error:'Card request too large.'},413);
  let body;try{body=JSON.parse(raw);}catch{return json({ok:false,error:'Invalid JSON.'},400)}
  const norm=normalizeCard(body);if(norm.error)return json({ok:false,error:norm.error},400);
  const ip=request.headers.get('CF-Connecting-IP')||'unknown';
  // 3 daily unlisted links per IP. No plaintext address persisted.
  const day=new Date().toISOString().slice(0,10),bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(day+'|'+ip+'|quick-card-ratelimit-v1'));
  const bucket=[...new Uint8Array(bytes)].map(v=>v.toString(16).padStart(2,'0')).join('').slice(0,36);
  try{
   const used=await db.prepare('SELECT count FROM card_publish_limits WHERE day=? AND ip_hash=?').bind(day,bucket).first();
   if((used?.count||0)>=3)return json({ok:false,error:'Daily publishing limit reached. Existing links remain available.'},429);
   const slugBase=norm.card.title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,42)||'quick-card';
   const tail=[...crypto.getRandomValues(new Uint8Array(5))].map(b=>b.toString(16).padStart(2,'0')).join('');
   const slug=slugBase+'-'+tail,stamp=new Date().toISOString(),c=norm.card;
   await db.batch([
    db.prepare("INSERT INTO quick_cards (slug,title,description,interaction_request,website,image,kind,search_template,video_id,preview_mode,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,'unlisted',?)")
      .bind(slug,c.title,c.description,c.interactionRequest,c.website,c.image,c.kind,c.searchTemplate,c.videoId,c.previewMode,stamp),
    db.prepare("INSERT INTO card_publish_limits(day,ip_hash,count) VALUES (?,?,1) ON CONFLICT(day,ip_hash) DO UPDATE SET count=count+1").bind(day,bucket)
   ]);
   return json({ok:true,slug,cardUrl:origin+'/cards/'+slug,status:'unlisted',discovery:'Submitted for moderation. Your card link works immediately.'},201);
  }catch{return json({ok:false,error:'Card could not be saved. Please retry.'},503)}
 }
 if(path==='/api/quick-cards'&&method==='GET'){
  try{const limit=Math.min(24,Math.max(1,Number(url.searchParams.get('limit'))||12));
   const results=await db.prepare("SELECT * FROM quick_cards WHERE status='approved' ORDER BY created_at DESC LIMIT ?").bind(limit).all();
   return json({ok:true,cards:(results.results||[]).map(publicCard),placement:'Quant ranking; approval does not guarantee immediate rotation'});}catch{return json({ok:false,error:'Discovery catalog unavailable.'},503)}
 }
 const match=path.match(/^\/(?:api\/quick-cards|cards)\/([a-z0-9-]{5,91})(?:\/(embed|manifest\.json))?$/);
 if(match&&isSlug(match[1])&&(method==='GET'||method==='HEAD')){
  const row=await db.prepare('SELECT * FROM quick_cards WHERE slug=?').bind(match[1]).first();
  if(!row||row.status==='removed')return json({ok:false,error:'Card not found.'},404);
  if(path.startsWith('/api/'))return json({ok:true,card:publicCard(row)});
  if(match[2]==='manifest.json')return json({name:row.title,description:row.description,website:row.website,interaction:row.kind,previewMode:row.preview_mode==='visual'?'visual':'interactive',
   canonical:origin+'/cards/'+row.slug,status:row.status});
  const html=cardHtml(row);
  return new Response(method==='HEAD'?null:html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=60','x-content-type-options':'nosniff','content-security-policy':"default-src 'none'; script-src 'self'; style-src 'self'; img-src https: data:; media-src https:; connect-src 'self'; frame-src https://www.youtube-nocookie.com; form-action 'none'; base-uri 'none'; frame-ancestors *", 'referrer-policy':'strict-origin-when-cross-origin'}});
 }
 return json({ok:false,error:'Route not found.'},404);
}};