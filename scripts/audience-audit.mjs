// Evidence-only public site health and discovery audit.
// No visitor tracking, scraping private accounts, wallet writes or indexing claims.
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

export const TARGETS=[
  '/', '/explore/', '/bubbles.html', '/video-studio.html',
  '/about.html', '/learn/', '/learn/ruthenium/', '/learn/atomic-number/'
];
const SITE='https://quantaphi.org';
const meaningful=s=>String(s||'').trim().length>0;
const attr=(tag,name)=>tag.match(new RegExp("\\b"+name+"\\s*=\\s*([\"'])(.*?)\\1","i"))?.[2]||'';
const tags=(html,type)=>[...String(html).matchAll(new RegExp('<'+type+'\\b[^>]*>','gi'))].map(x=>x[0]);
export function inspectPage({html,status,url}){
  const findings=[];const add=(code,detail)=>findings.push({code,detail});
  if(status!==200)add('http_status','Expected HTTP 200; observed '+status);
  const text=String(html||'');
  const metas=tags(text,'meta'),links=tags(text,'link');
  const title=text.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim()||'';
  const desc=metas.find(x=>attr(x,'name').toLowerCase()==='description');
  const description=attr(desc||'','content');
  const canonicalTag=links.find(x=>attr(x,'rel').toLowerCase()==='canonical');
  const canonical=attr(canonicalTag||'','href');
  const robots=metas.filter(x=>attr(x,'name').toLowerCase()==='robots').map(x=>attr(x,'content')).join(',');
  const og=metas.filter(x=>attr(x,'property').startsWith('og:')).map(x=>attr(x,'property'));
  if(!meaningful(title)||title.length<14)add('title','Missing or overly short page title');
  if(description.length<50)add('description','Missing or short description');
  if(canonical!==url)add('canonical','Expected '+url+', observed '+(canonical||'(absent)'));
  if(/noindex/i.test(robots))add('noindex','robots meta blocks indexing');
  if(!og.includes('og:title'))add('og_title','Social title is missing');
  if(!og.includes('og:description'))add('og_description','Social description is missing');
  if(!og.includes('og:image'))add('og_image','Social image is missing');
  if(!/<h1\b/i.test(text))add('heading','Visible H1 heading missing');
  return {url,status,title,canonical,descriptionLength:description.length,findings,healthy:findings.length===0};
}
export function checkSitemap(xml,expected){
  const locs=[...String(xml||'').matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)].map(x=>x[1].trim());
  const missing=expected.filter(u=>!locs.includes(u));
  return {url:SITE+'/sitemap.xml',count:locs.length,missing,healthy:missing.length===0&&locs.length===new Set(locs).size};
}
export async function runAudit({fetcher=fetch,now=new Date().toISOString()}={}){
  const pages=[];
  for(const pathname of TARGETS){
    const url=SITE+pathname;
    try{
      const response=await fetcher(url,{redirect:'follow',signal:AbortSignal.timeout(15000)});
      const page=inspectPage({url,status:response.status,html:await response.text()});
      pages.push({...page,finalUrl:response.url||url});
    }catch(e){
      pages.push({url,status:null,healthy:false,findings:[{code:'fetch_failed',detail:String(e.message||e).slice(0,180)}]});
    }
  }
  let sitemap;
  try{
    const response=await fetcher(SITE+'/sitemap.xml',{signal:AbortSignal.timeout(15000)});
    sitemap=checkSitemap(await response.text(),TARGETS.map(x=>SITE+x));
    sitemap.status=response.status;
    if(response.status!==200)sitemap.healthy=false;
  }catch(e){sitemap={healthy:false,url:SITE+'/sitemap.xml',error:String(e.message||e).slice(0,180)}}
  const unhealthy=pages.filter(p=>!p.healthy);
  return {schemaVersion:1,checkedAt:now,status:unhealthy.length||!sitemap.healthy?'needs_work':'healthy',
    source:'public HTTP and static page metadata; no Google/Cloudflare analytics access',
    scope:'site availability, discoverability basics and share metadata; not a statement of search rank, audience, payment or video playback',
    pages,sitemap,summary:{pagesChecked:pages.length,healthyPages:pages.length-unhealthy.length,unhealthyPages:unhealthy.length}};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const report=await runAudit();
  await fs.mkdir('audience-evidence',{recursive:true});
  await fs.writeFile('audience-evidence/latest.json',JSON.stringify(report,null,2)+'\n','utf8');
  console.log(JSON.stringify({checkedAt:report.checkedAt,status:report.status,summary:report.summary,sitemap:report.sitemap},null,2));
  if(report.status!=='healthy')process.exitCode=1;
}
