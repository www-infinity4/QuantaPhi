import {writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve,join} from 'node:path';
import {performance} from 'node:perf_hooks';

// This public site checker is not a general-purpose URL fetcher.
const ORIGIN='https://quantaphi.org';
const MAX_ENTRIES=4,MAX_LINKS=40,MAX_HTML_BYTES=1_000_000,TIMEOUT_MS=8000;
const DEFAULT_ENTRIES=[ORIGIN+'/',ORIGIN+'/about.html',ORIGIN+'/learn/',ORIGIN+'/storybook/'];

function approvedUrl(input){
 let url;
 try{url=new URL(input)}catch{throw new TypeError('URL must use the approved https origin')}
 if(url.origin!==ORIGIN||url.username||url.password||url.protocol!=='https:')
  throw new TypeError('URL must use the approved https origin');
 url.hash='';
 return url.href;
}

function extractInternalLinks(html,baseUrl){
 const links=[],seen=new Set(),regex=/<a[^>]+href=["']([^"'>#]+)["']/gi;
 let match;
 while((match=regex.exec(html))!==null&&links.length<MAX_LINKS){
  try{
   const href=approvedUrl(new URL(match[1],baseUrl).href);
   if(!seen.has(href)){seen.add(href);links.push(href)}
  }catch{ /* External and malformed URLs are not crawled. */ }
 }
 return links;
}

async function readLimitedHtml(response){
 const declared=Number(response.headers.get('content-length'));
 if(Number.isFinite(declared)&&declared>MAX_HTML_BYTES)throw new Error('HTML size limit exceeded');
 if(!response.body)return '';
 const reader=response.body.getReader(),chunks=[];
 let total=0;
 try{
  while(true){
   const {done,value}=await reader.read();
   if(done)break;
   total+=value.byteLength;
   if(total>MAX_HTML_BYTES)throw new Error('HTML size limit exceeded');
   chunks.push(value);
  }
 }catch(error){await reader.cancel().catch(()=>{});throw error}
 const buffer=new Uint8Array(total);
 let offset=0;
 for(const chunk of chunks){buffer.set(chunk,offset);offset+=chunk.byteLength}
 return new TextDecoder().decode(buffer);
}

async function fetchInfo(url,fetchImpl){
 const start=performance.now();
 try{
  // Manual redirects: never follow an origin-changing Location header.
  const response=await fetchImpl(url,{redirect:'manual',signal:AbortSignal.timeout(TIMEOUT_MS)});
  const status=response.status;
  return {url,status,timeMs:Math.round(performance.now()-start),
   finalUrl:status>=300&&status<400?null:url,
   response:status>=200&&status<300?response:null,
   error:status>=300&&status<400?'Redirect not followed':undefined};
 }catch(error){
  return {url,status:null,timeMs:Math.round(performance.now()-start),
   finalUrl:null,error:String(error?.message||error)};
 }
}

// Fixed public diagnostic targets; never accept caller-provided network URLs.
// Status-only observations do not establish inference, identity or global uptime.
const AVAILABILITY_TARGETS=Object.freeze([
 ['custom-domain','https://quantaphi.org/'],
 ['github-static-origin','https://www-infinity4.github.io/QuantaPhi/'],
 ['bubbles-tools-health','https://bubbles-tools.marvaseater.workers.dev/health']
]);
export async function compareAvailability({fetchImpl=globalThis.fetch}={}){
 if(typeof fetchImpl!=='function')throw new TypeError('fetchImpl must be a function');
 const targets=[];
 for(const [service,url] of AVAILABILITY_TARGETS){
  let status=null,retryAfterSeconds=null;
  const start=performance.now();
  try{
   const response=await fetchImpl(url,{method:'GET',redirect:'manual',credentials:'omit',signal:AbortSignal.timeout(TIMEOUT_MS)});
   status=response.status;
   const raw=response.headers.get('retry-after');
   if(raw&&/^\d{1,9}$/.test(raw))retryAfterSeconds=Number(raw);
   if(response.body)await response.body.cancel().catch(()=>{});
  }catch{ /* A transport failure is an unknown HTTP status, not a quota receipt. */ }
  targets.push({service,url,status,retryAfterSeconds,timeMs:Math.round(performance.now()-start)});
 }
 return {generatedAt:new Date().toISOString(),scope:'public-http-status-only',targets,
  originReachableWhileEdgeLimited:targets[0].status===429&&targets[1].status>=200&&targets[1].status<300,
  inferenceVerified:false,ownerSessionVerified:false};
}

/** Crawl only approved public QuantaPhi pages; never arbitrary user-supplied hosts.
 * fetchImpl and writeReport support deterministic isolated tests, not extra origins.
 */
export async function run(entryUrls,options={}){
 const urls=entryUrls===undefined||entryUrls===null?DEFAULT_ENTRIES:entryUrls;
 if(!Array.isArray(urls)||!urls.length||urls.length>MAX_ENTRIES)
  throw new TypeError('Expected 1 to 4 approved entry URLs');
 const entries=urls.map(approvedUrl);
 const fetchImpl=options.fetchImpl||globalThis.fetch;
 if(typeof fetchImpl!=='function')throw new TypeError('fetchImpl must be a function');
 const report={generatedAt:new Date().toISOString(),pages:[],links:[]};
 const seenLinks=new Set();
 pagesLoop: for(const pageUrl of entries){
  const info=await fetchInfo(pageUrl,fetchImpl);
  const page={url:pageUrl,status:info.status,timeMs:info.timeMs,finalUrl:info.finalUrl};
  if(info.error)page.error=info.error;
  report.pages.push(page);
  if(info.status===429)break;
  if(!info.response||!String(info.response.headers.get('content-type')||'').toLowerCase().includes('text/html'))continue;
  let html;
  try{html=await readLimitedHtml(info.response)}
  catch(error){page.error=String(error.message||error);continue}
  for(const href of extractInternalLinks(html,pageUrl)){
   if(report.links.length>=MAX_LINKS)break;
   if(seenLinks.has(href))continue;
   seenLinks.add(href);
   const link=await fetchInfo(href,fetchImpl);
   const item={sourcePage:pageUrl,href,status:link.status,timeMs:link.timeMs};
   if(link.error||!link.status||link.status>=400)item.error=link.error||('HTTP '+link.status);
   report.links.push(item);
   if(link.response?.body)await link.response.body.cancel().catch(()=>{});
   if(link.status===429)break pagesLoop;
  }
 }
 if(options.writeReport!==false){
  const reportsDir=fileURLToPath(new URL('../reports/',import.meta.url));
  await mkdir(reportsDir,{recursive:true});
  await writeFile(join(reportsDir,'site-health-'+report.generatedAt.slice(0,10).replace(/-/g,'')+'.json'),
   JSON.stringify(report,null,2),'utf8');
 }
 return report;
}

// Node 22 does not support import.meta.main; use a portable direct-entry check.
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 const task=process.argv[2]==='--availability'?compareAvailability().then(report=>console.log(JSON.stringify(report,null,2))):run();
 task.then(()=>{process.exitCode=0}).catch(error=>{
  console.error('Site health watcher failed:',error);
  process.exitCode=1;
 });
}
