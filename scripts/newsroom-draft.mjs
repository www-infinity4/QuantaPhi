// Review-gated automated intake: drafts never change the public newsroom or its sitemap.
import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'..');
const ENDPOINT='https://news-phi-feed.marvaseater.workers.dev/v1/news';
const MAX_SOURCE_AGE=24*3600000;
const plain=(s,max=900)=>String(s||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
function sourceUrl(value){
 try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password)return null;
 const host=u.hostname.toLowerCase();if(host!=='nasa.gov'&&!host.endsWith('.nasa.gov'))return null;
 u.hash='';return u.href;
 }catch{return null;}
}
export function selectDraftCandidate(rows,existing=[],now=Date.now()){
 const seen=new Set((Array.isArray(existing)?existing:[]).map(x=>sourceUrl(x.sourceUrl)).filter(Boolean));
 const candidates=[];
 for(const a of Array.isArray(rows)?rows:[]){
  const url=sourceUrl(a?.url),when=Date.parse(String(a?.publishedAt||''));
  if(!url||seen.has(url)||!Number.isFinite(when)||when>now+300000||now-when>MAX_SOURCE_AGE||
    plain(a.title,210).length<20||plain(a.extract,500).length<35)continue;
  seen.add(url);candidates.push({...a,url,publishedAt:new Date(when).toISOString()});
 }
 return candidates.sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt))[0]||null;
}
export function verifyDraftReport(data,source){
 if(!data||data.ok!==true||data.researchMode!=='gpt-source-grounded'||data.sourceUrl!==source)return false;
 const paragraphs=data.paragraphs;
 if(!Array.isArray(paragraphs)||paragraphs.length<6||paragraphs.length>12)return false;
 const cleaned=paragraphs.map(x=>plain(x,2000));
 if(cleaned.some(x=>x.length<175||/\b(?:pornography|explicit sex|fabricated quote)\b/i.test(x)))return false;
 if(cleaned.join(' ').length<1500||new Set(cleaned).size!==cleaned.length)return false;
 return true;
}
async function getJson(url,options){
 const res=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(30000),...options});
 if(!res.ok)throw Error('News Phi request failed with HTTP '+res.status);
 return res.json();
}
async function main(){
 const manifest=JSON.parse(readFileSync(join(root,'newsroom/latest.json'),'utf8'));
 const folder=join(root,'newsroom/drafts');mkdirSync(folder,{recursive:true});
 const prior=readdirSync(folder).filter(x=>/\.json$/.test(x)).map(x=>{
  try{return JSON.parse(readFileSync(join(folder,x),'utf8'));}catch{return null;}
 }).filter(Boolean);
 const feed=await getJson(ENDPOINT+'/feed');
 if(feed.cloud!==true||!Array.isArray(feed.articles))throw Error('Cloudflare source authenticity guard');
 const reserved=[...(manifest.articles||[]),...prior];
 let rows=feed.articles.slice();
 let drafted=false;
 for(let attempt=0;attempt<4;attempt++){
  const article=selectDraftCandidate(rows,reserved);
  if(!article)break;
  reserved.push({sourceUrl:article.url});
  let report;
  try{report=await getJson(ENDPOINT+'/read',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:article.url})});}
  catch(error){console.log('Source unavailable; trying another NASA report');continue;}
  if(!verifyDraftReport(report,article.url)){console.log('No complete source-grounded report; trying another');continue;}
  const slug=createHash('sha256').update(article.url).digest('hex').slice(0,12);
  const date=new Date().toISOString().slice(0,10);
  const draft={
   schemaVersion:1,status:'editorial_review_required',public:false,
   draftCreatedAt:new Date().toISOString(),sourcePublishedAt:article.publishedAt,
   sourceUrl:article.url,sourceTitle:plain(article.title,180),sourceExtract:plain(article.extract,500),
   suggestedHeadline:plain(article.title,180),
   attribution:'AI-assisted QuantaPhi draft; must be independently fact-checked before publication',
   researchMode:report.researchMode,paragraphs:report.paragraphs.map(x=>plain(x,2000)),
   checklist:['Confirm each assertion against the original publisher','Check dates, evidence and uncertainty','Verify rights, attribution and sensitive claims','Edit independent wording','Only then publish with the true site publication date']
  };
  const dest=join(folder,date+'-'+slug+'.json');
  writeFileSync(dest,JSON.stringify(draft,null,2)+'\n',{flag:'wx'});
  console.log('Created review-only draft: '+dest.replace(root+'/',''));
  drafted=true;break;
 }
 if(!drafted)console.log('No sufficiently detailed NEW NASA article met all safeguards. Nothing stale was published.');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(error=>{console.error(error.message);process.exitCode=1;});
