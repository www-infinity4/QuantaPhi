/* QuantaPhi Developer Library — data-only discovery and reviewed-proposal boundaries.
 * GitHub's supported Search API, official sources, and owner review are NOT
 * executable plugins or permission to modify QuantaPhi production.
 */
export const DEVELOPMENT_TOPICS=Object.freeze([
 ['profiles','Profiles & identity','profile in:name,description'],
 ['carousels','Carousels & sliders','carousel in:name,description'],
 ['buttons','Buttons & controls','button component in:name,description'],
 ['power-chains','Power chains & workflows','workflow automation in:name,description'],
 ['quick-cards','Quick Cards & widgets','widget card in:name,description'],
 ['design-systems','Design systems','design-system in:name,description'],
 ['mobile','Android & PWA','progressive-web-app in:name,description'],
 ['authentication','Sign-in & OAuth','oauth in:name,description'],
 ['forms','Forms & validation','form validation in:name,description'],
 ['media','Music players','audio-player in:name,description'],
 ['video','Video players','video-player in:name,description'],
 ['search','Search & discovery','search-ui in:name,description'],
 ['maps','Maps & locations','maps component in:name,description'],
 ['shopping','Shopping cards','ecommerce frontend in:name,description'],
 ['payments','Checkout interfaces','checkout ui in:name,description'],
 ['analytics','Analytics dashboards','analytics dashboard in:name,description'],
 ['publishing','Site publishers & CMS','headless-cms in:name,description'],
 ['ai','AI assistants','ai-chat interface in:name,description'],
 ['accessibility','Accessibility','accessibility components in:name,description'],
 ['dashboards','Dashboard layouts','dashboard template in:name,description'],
 ['community','Communities & feeds','community platform in:name,description'],
 ['chat','Messaging & chat','chat-ui in:name,description'],
 ['menus','Menus & navigation','navigation component in:name,description'],
 ['themes','Themes & styles','theme css in:name,description']
].map(([id,label,query])=>Object.freeze({id,label,query})));

export const OFFICIAL_DEVELOPER_SOURCES=Object.freeze([
 ['google-web','web.dev · Web UI','https://web.dev/learn','Google-maintained web platform learning resources','design-systems'],
 ['google-accessibility','web.dev · Accessibility','https://web.dev/learn/accessibility','Accessible forms, navigation and interface patterns','accessibility'],
 ['google-identity','Google Identity','https://developers.google.com/identity/gsi/web/guides/overview','Google Identity Services; authorized sign-in implementation','authentication'],
 ['google-firebase','Firebase for Web','https://firebase.google.com/docs/web/setup','Official Firebase app setup; check quotas and costs before integration','profiles'],
 ['google-maps','Google Maps JavaScript','https://developers.google.com/maps/documentation/javascript/overview/','Official web maps documentation; may require API key and billing','maps'],
 ['google-android','Android Developers','https://developer.android.com/develop','Android application and UI development guidance','mobile'],
 ['google-chrome','Chrome for Developers','https://developer.chrome.com/docs','Chromium and Chrome platform engineering guidance','mobile'],
 ['google-material','Material Design','https://m3.material.io/','Official Material 3 component specifications','design-systems'],
 ['google-cloud','Google Cloud Documentation','https://cloud.google.com/docs','Official infrastructure, APIs and architecture guides; pricing varies','power-chains']
].map(([id,label,url,description,category])=>Object.freeze({
 id,source:'Official documentation',label,url,description,category,
 image:'https://www.google.com/s2/favicons?domain='+new URL(url).hostname+'&sz=128',
 license:'Documentation — review source terms',licenseStatus:'review-license-before-reuse'
})));

export const EXISTING_CAPABILITIES=Object.freeze({
 profiles:{status:'partial',note:'Ordinary session-only profile UI exists; authenticated saved profiles, consent scopes and private identity storage are not complete (issue #1506).'},
 carousels:{status:'present',note:'Oracle Octaves and Developer carousel already exist; review proposed changes against working mobile behaviors.'},
 buttons:{status:'present',note:'Quick Card actions and button builders already exist; validate a concrete gap before replacing controls.'},
 'power-chains':{status:'partial',note:'Power Chain ideas and draft workflows exist; authenticated permission and actual execution still require review.'},
 'quick-cards':{status:'present',note:'Quick Card creator and moderated public-discovery flow exist; reuse the original publisher.'},
 authentication:{status:'partial',note:'Provider connections exist in parts; do not introduce new scopes, secret handling or token storage without separate security review.'},
 payments:{status:'restricted',note:'Never auto-modify wallet, payment, checkout, credits, or settlement systems from a visitor proposal.'}
});
export const existingCapabilityFor=id=>EXISTING_CAPABILITIES[id]||{
 status:'unverified',note:'No site-wide verified implementation inventory for this specific request; inspect existing code before declaring a feature missing.'
};
export const cleanProposalText=value=>String(value||'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,1200);

export function buildGithubSearchURL(topicId,page=1,terms=''){
 const topic=DEVELOPMENT_TOPICS.find(x=>x.id===topicId);
 if(!topic)throw Error('invalid topic');
 if(!Number.isInteger(page)||page<1||page>10)throw Error('invalid page');
 const phrase=String(terms||'').normalize('NFKC').replace(/[^a-zA-Z0-9 \-_.]/g,' ').trim().slice(0,72);
 const q=[phrase,topic.query,'stars:>=5','archived:false','fork:false'].filter(Boolean).join(' ');
 const url=new URL('https://api.github.com/search/repositories');
 url.searchParams.set('q',q);
 url.searchParams.set('sort','stars');
 url.searchParams.set('order','desc');
 url.searchParams.set('per_page','40');
 url.searchParams.set('page',String(page));
 return url.href;
}
const ghName=/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
export function normalizeGithubResult(row,category=''){
 if(!row||!Number.isSafeInteger(row.id)||row.id<=0||typeof row.full_name!=='string'||!ghName.test(row.full_name))return null;
 if(row.fork||row.archived||row.disabled)return null;
 const expected='https://github.com/'+row.full_name;
 let link,image;
 try{
  link=new URL(String(row.html_url||''));
  image=new URL(String(row.owner?.avatar_url||''));
  if(link.href.replace(/\/$/,'').toLowerCase()!==expected.toLowerCase()||
   image.protocol!=='https:'||image.hostname!=='avatars.githubusercontent.com')return null;
 }catch{return null;}
 const spdx=String(row.license?.spdx_id||'').slice(0,36).replace(/[^A-Za-z0-9+.()-]/g,'')||'Unspecified';
 const text=String(row.description||'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,240);
 return Object.freeze({
  id:'github-'+row.id,source:'GitHub',label:row.name?.slice(0,90)||row.full_name.split('/')[1],
  description:text||'Original public repository · examine source, maintenance and integration before using.',
  url:expected,image:image.href,category,license:spdx,
  licenseStatus:'review-license-before-reuse',stars:Number.isFinite(row.stargazers_count)?Math.max(0,row.stargazers_count):null,
  pushedAt:typeof row.pushed_at==='string'?row.pushed_at.slice(0,10):'',
  repo:row.full_name
 });
}
/* Revalidate every stored public metadata record before showing it on site.
 * An approved catalog PR still cannot grant permission to run third-party code. */
export function validateIndexedResource(raw){
 if(!raw||raw.source!=='GitHub'||!/^github-[1-9]\d{0,17}$/.test(String(raw.id||'')))return null;
 if(!ghName.test(String(raw.repo||''))||!DEVELOPMENT_TOPICS.some(x=>x.id===raw.category))return null;
 const original='https://github.com/'+raw.repo;
 let avatar;
 try{
  const link=new URL(String(raw.url||'')),a=new URL(String(raw.image||''));
  if(link.protocol!=='https:'||link.hostname!=='github.com'||link.pathname.replace(/\/$/,'')!=='/'+raw.repo)return null;
  if(a.protocol!=='https:'||a.hostname!=='avatars.githubusercontent.com')return null;
  avatar=a.href;
 }catch{return null;}
 const label=String(raw.label||'').trim().slice(0,90);
 if(!label||forbiddenSourceText(label+' '+String(raw.description||'')))return null;
 return Object.freeze({
  id:raw.id,source:'GitHub',label,
  url:original,image:avatar,repo:raw.repo,category:raw.category,
  description:String(raw.description||'').slice(0,240),
  license:String(raw.license||'Unspecified').slice(0,36),
  licenseStatus:'review-license-before-reuse',
  stars:Number.isFinite(raw.stars)?Math.max(0,Math.trunc(raw.stars)):null,
  pushedAt:typeof raw.pushedAt==='string'?raw.pushedAt.slice(0,10):''
 });
}
const forbiddenSourceText=value=>/\b(?:pornography|porn|nudes?|hentai|dick.pics)\b/i.test(value);

export function summarizeGithubPage(result,category=''){
 const rows=Array.isArray(result?.items)?result.items:[];
 const seen=new Set(),items=[];
 for(const row of rows){
  const item=normalizeGithubResult(row,category);
  if(!item||seen.has(item.id))continue;
  seen.add(item.id);items.push(item);
 }
 const reportedMatches=Number.isFinite(result?.total_count)?Math.max(0,Math.floor(result.total_count)):0;
 return {items,reportedMatches,searchCap:1000,incomplete:result?.incomplete_results===true};
}
const forbidden=/(?:\bdick\s*pics?\b|\bporn(?:ography|ographic)?\b|\bexplicit\s+nudes?\b|\bsexual\s+images?\b|\bgenitals?\s+(?:all|every|across|over)\b|\bsteal\s+(?:user\s+)?(?:passwords?|tokens?|cookies?|credentials?)\b|\bdisable\s+(?:all\s+)?(?:moderation|security|safety)\b|\bremove\s+(?:all\s+)?(?:moderation|safety)\b|<\s*\/?\s*(?:script|iframe|object|svg)\b|javascript\s*:|\bonerror\s*=)/i;
const sensitive=/(?:\b\d{3}[- ]\d{2}[- ]\d{4}\b|\b(?:sk|ghp|gho|github_pat|xoxb)[-_][A-Za-z0-9_-]{15,}\b|\b(?:password|secret|private\s+key)\s*[:=]\s*\S{6,})/i;
export function classifyProposal(topicId,idea){
 const text=cleanProposalText(idea);
 const capability=existingCapabilityFor(topicId);
 if(!DEVELOPMENT_TOPICS.some(x=>x.id===topicId)||text.length<12||text.length>1100)
  return {status:'blocked',reason:'Describe a concrete safe feature in 12–1100 characters.',reviewRequired:true,autoPublish:false,capability};
 if(forbidden.test(text)||sensitive.test(text))
  return {status:'blocked',reason:'This request needs safety or privacy review and cannot be submitted through the public builder.',reviewRequired:true,autoPublish:false,capability};
 if(capability.status==='restricted')
  return {status:'restricted_review',reason:capability.note,reviewRequired:true,autoPublish:false,capability};
 const status=capability.status==='partial'?'review_existing_partial':capability.status==='present'?'review_existing':'review_unverified_gap';
 return {status,reason:capability.note,reviewRequired:true,autoPublish:false,capability};
}
function safeSourceUrl(source){
 if(!source||typeof source.url!=='string')return '';
 try{
  const u=new URL(source.url);
  if(u.protocol!=='https:'||u.username||u.password||u.port)return '';
  if(u.hostname==='github.com'&&/^\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/.test(u.pathname))return u.href;
  if(OFFICIAL_DEVELOPER_SOURCES.some(x=>x.url===u.href))return u.href;
 }catch{}
 return '';
}
export function buildReviewIssueURL({topic,idea,source}){
 const verdict=classifyProposal(topic,idea);
 if(verdict.status==='blocked'||verdict.status==='restricted_review')return null;
 const topicEntry=DEVELOPMENT_TOPICS.find(x=>x.id===topic);
 const input=cleanProposalText(idea);
 const evidence=safeSourceUrl(source);
 const sourcePart=evidence?'Source to examine: '+evidence+'\n':'Source to examine: none supplied\n';
 const body=[
  'Visitor-created QuantaPhi Developer proposal — REVIEW ONLY',
  'Category: '+topicEntry.label,
  'Requested change: '+input,
  sourcePart.trim(),
  'Existing site status: '+verdict.capability.status+' — '+verdict.capability.note,
  'Requires owner approval, rights review, safe design checks, focused tests and a reviewed PR before any production change.',
  'No permission to deploy, run imported scripts, access wallets, collect sensitive identity fields or auto-merge.',
  'Owner/agents must verify this is a genuine missing or improvable feature against the current site source.'
 ].join('\n\n');
 const url=new URL('https://github.com/www-infinity4/QuantaPhi/issues/new');
 url.searchParams.set('title','Developer proposal: '+topicEntry.label+' — '+input.slice(0,60));
 url.searchParams.set('body',body);
 return url.href;
}
