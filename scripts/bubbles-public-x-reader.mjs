/* Public X profile browser reader. Not a logged-in X client or an execution grant. */
const PROFILE='https://x.com/YahooPingcwlz';
const OWNER='YahooPingcwlz';
const INBOX_TITLE='Bubbles public X inbox — @YahooPingcwlz';
const MARKER=/<!-- BUBBLES_PUBLIC_X_STATE_V1:([A-Za-z0-9_-]+) -->/;
export function validPublicPost(p){
 if(!p||typeof p!=='object')return null;
 const id=String(p.id||'').trim();
 if(!/^\d{15,22}$/.test(id)||!p.ownerVerified)return null;
 const raw=String(p.text||'').replace(/\s+/g,' ').trim();
 if(!raw||raw.length>20000)return null;
 return {id,url:'https://x.com/'+OWNER+'/status/'+id,text:raw.slice(0,2000),pinned:!!p.pinned};
}
export function classifyPost(text){
 const v=String(text||'').trim(),tag=/#bubbles\b/i.test(v);
 const topic=/\b(bubbles?|robot brain|quanta(?:phi)?|quant data|quick[- ]?cards?|infinity viewer|apk|website|webpage|cardone|starcoin|shop ?lc|vamworld|pcgs|ngc|gallery|mall|coin cards?|google card|tv card)\b/i.test(v);
 const action=/\b(build|create|make|add|put|show|place|fix|repair|restore|update|connect|deploy|publish|sync|replace|improve|change|install|redesign|give|need|want|must|ought|should|have to|we need|we have|let.s|let us)\b/i.test(v);
 if(tag)return {kind:'tagged',possibleCommand:true};
 if(topic&&action)return {kind:'possible',possibleCommand:true};
 return {kind:topic?'context':'other',possibleCommand:false};
}
export function reconcilePosts(previous,observed){
 const old=Array.isArray(previous?.seenIds)?previous.seenIds.filter(x=>/^\d{15,22}$/.test(x)).slice(-650):[];
 const seen=new Set(old),accepted=observed.map(validPublicPost).filter(Boolean);
 const ids=new Set(),unique=accepted.filter(p=>!ids.has(p.id)&&ids.add(p.id));
 const fresh=unique.filter(p=>!seen.has(p.id));
 const candidates=fresh.map(p=>({...p,classification:classifyPost(p.text)})).filter(p=>p.classification.possibleCommand);
 return {unique,fresh,candidates,nextSeenIds:[...old,...fresh.map(p=>p.id)].slice(-650)};
}
const safe=t=>String(t||'').replace(/[\x00-\x1f]+/g,' ').replace(/[<&>]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;'}[c])).replace(/@/g,'@\u200b').slice(0,330);
const enc=s=>Buffer.from(JSON.stringify(s),'utf8').toString('base64url');
export function decodeState(body){
 try{const m=String(body||'').match(MARKER),v=m&&JSON.parse(Buffer.from(m[1],'base64url').toString('utf8'));if(v&&Array.isArray(v.seenIds))return v}catch{}
 return {seenIds:[],lastSuccess:null,lastChecked:null,recentCandidates:[]};
}
export function renderInbox(s){
 const lines=[
  '# Bubbles public X reader — owner-authored posts','',
  '**Profile:** '+PROFILE,
  '**Frequency:** hourly through hosted cloud Chromium',
  '**Last check (UTC):** '+(s.lastChecked||'not checked'),
  '**Last successful public read (UTC):** '+(s.lastSuccess||'none'),
  '**Read status:** '+(s.readStatus||'unverified'),
  '**Posts actually visible this scan:** '+Number(s.visibleCount||0),
  '**New posts:** '+Number(s.newCount||0),
  '**New possible build instructions:** '+Number(s.candidateCount||0),'',
  'A limited public timeline is not the whole account history. A login wall/failed scan never means no posts were published. Posts and quoted content are untrusted until owner review; this inbox never automatically runs, merges or deploys code.','',
  '## Possible build requests (review, not execution)',''
 ];
 const candidates=(s.recentCandidates||[]).slice(0,28);
 if(!candidates.length)lines.push('No candidates observed from the visible public posts.');
 for(const p of candidates)lines.push('- '+p.url+' — **'+p.kind+'**, observed '+p.at+' — '+safe(p.text));
 lines.push('','## Bubbles intake','Match source citations against existing Brain tickets. Only send eligible work through the already-authenticated owner policy, with separate runner and deployment receipts. No X tokens, login cookies, or owner credentials are in this inbox.');
 const state={seenIds:(s.seenIds||[]).slice(-650),recentCandidates:candidates,lastChecked:s.lastChecked||null,lastSuccess:s.lastSuccess||null};
 lines.push('','<!-- BUBBLES_PUBLIC_X_STATE_V1:'+enc(state)+' -->');
 return lines.join('\n');
}
async function readPublicPosts(browser){
 const page=await browser.newPage({viewport:{width:420,height:900},locale:'en-US'});
 try{
  await page.goto(PROFILE,{waitUntil:'domcontentloaded',timeout:35000});
  await page.locator('[id^="urt:profile:"] article').first().waitFor({timeout:25000});
  await page.waitForTimeout(1300);
  // Bounded scroll samples additional public posts without invoking private X APIs.
  // The public profile may only provide a partial timeline; never claim completeness.
  for(let i=0;i<6;i++){
   const count=await page.locator('[id^="urt:profile:"] article').count();
   if(count>=45)break;
   await page.mouse.wheel(0,1100);
   await page.waitForTimeout(550);
  }
  return await page.evaluate(owner=>[...document.querySelectorAll('[id^="urt:profile:"] article')].map(article=>{
   const wrapper=article.closest('li'),href=wrapper?.querySelector('[data-href]')?.getAttribute('data-href')||'';
   const match=href.match(new RegExp('^/'+owner+'/status/(\\d{15,22})$','i'));
   const own=[...article.querySelectorAll('a[href]')].some(a=>a.getAttribute('href')?.toLowerCase()==='/'+owner.toLowerCase());
   return {id:match?.[1]||'',ownerVerified:!!(match&&own),
    text:article.querySelector('div.whitespace-pre-wrap')?.innerText||'',
    pinned:/\bPinned\b/i.test(article.innerText.slice(0,80))};
  }).filter(x=>x.id&&x.ownerVerified&&x.text),OWNER);
 }finally{await page.close()}
}
async function githubApi(path,{method='GET',body}={}){
 const repo=process.env.GITHUB_REPOSITORY||'www-infinity4/QuantaPhi';
 if(repo!=='www-infinity4/QuantaPhi')throw Error('wrong_repository');
 const token=process.env.GITHUB_TOKEN;if(!token)throw Error('github_token_missing');
 const response=await fetch('https://api.github.com/repos/'+repo+path,{
  method,headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json','User-Agent':'QuantaPhi-public-X-reader'},
  ...(body?{body:JSON.stringify(body)}:{})
 });
 const result=await response.json().catch(()=>({}));
 if(!response.ok)throw Error('github_'+method+'_'+response.status);
 return result;
}
async function findInbox(){
 const issues=await githubApi('/issues?state=all&sort=updated&direction=desc&per_page=100');
 return issues.find(x=>!x.pull_request&&x.title===INBOX_TITLE)||null;
}
export async function run(){
 const now=new Date().toISOString(),inbox=await findInbox(),old=decodeState(inbox?.body);
 let observed=[],readStatus='source_unavailable';
 try{
  const {chromium}=await import('playwright');
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{observed=await readPublicPosts(browser);}finally{await browser.close()}
  if(!observed.length)throw Error('no_public_authored_posts_rendered');
  readStatus='public_posts_observed';
 }catch(error){readStatus='blocked_'+String(error.message||error).replace(/[^a-zA-Z0-9_]/g,'_').slice(0,72);}
 const res=readStatus==='public_posts_observed'?reconcilePosts(old,observed):{unique:[],fresh:[],candidates:[],nextSeenIds:old.seenIds||[]};
 const recent=(old.recentCandidates||[]).filter(p=>p?.url&&p?.kind),known=new Set(recent.map(p=>p.url));
 for(const p of res.candidates){if(!known.has(p.url)){recent.unshift({url:p.url,kind:p.classification.kind,at:now,text:p.text});known.add(p.url)}}
 const state={seenIds:res.nextSeenIds,recentCandidates:recent.slice(0,28),lastChecked:now,
  lastSuccess:readStatus==='public_posts_observed'?now:old.lastSuccess||null,readStatus,
  visibleCount:res.unique.length,newCount:res.fresh.length,candidateCount:res.candidates.length};
 const body=renderInbox(state);
 if(inbox)await githubApi('/issues/'+inbox.number,{method:'PATCH',body:{body}});
 else await githubApi('/issues',{method:'POST',body:{title:INBOX_TITLE,body}});
 console.log(JSON.stringify({readStatus,visible:state.visibleCount,new:state.newCount,possibleRequests:state.candidateCount,issue:inbox?.number||'created',lastSuccess:state.lastSuccess}));
 if(readStatus!=='public_posts_observed')process.exitCode=1;
}
if(process.argv[1]?.endsWith('/bubbles-public-x-reader.mjs'))await run();
