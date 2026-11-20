/**
 * QuantaPhi site integrity guard.
 * Reads tracked HTML + a bounded public-browser route set. A single formally
 * constrained HTML text-node rule is automatically repairable on index.html.
 * All other findings are evidence for review, NOT code-writing instructions.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const SAFE_AUTO_FILES = new Set(['index.html','platinum/index.html']);
const LIVE_ORIGIN = 'https://quantaphi.org';
const LIVE_PATHS = ['/', '/platinum/', '/physics-card.html', '/storybook/', '/disability-housing.html', '/coliseum/index.html', '/quick-card-builder.html'];
const PUBLIC_ASSET_PROBES = ['/TV-Database/js/auth.js','/TV-Database/js/starquest-cloud-ledger.js','/physics-card.css'];
const REPORT_DIR = 'site-integrity-evidence';
const digest = s => crypto.createHash('sha256').update(s).digest('hex');
export const isRepairableFile = file => SAFE_AUTO_FILES.has(file);

// Keep exact offsets while excluding code examples, comments and script/style text.
function outsideInlineCode(source) {
 const chars=source.split('');
 const mask=(start,end)=>{for(let i=start;i<end;i++)if(chars[i]!=='\n'&&chars[i]!=='\r')chars[i]=' ';};
 for(const m of source.matchAll(/<!--[\s\S]*?-->/g))mask(m.index,m.index+m[0].length);
 // Preserve actual script/link markup and src references; mask only script and style contents.
 for(const m of source.matchAll(/(<(script|style)\b[^>]*>)([\s\S]*?)(<\/\2\s*>)/gi))
  mask(m.index+m[1].length,m.index+m[1].length+m[3].length);
 return chars.join('');
}
// No fuzzy rewriting, no regex repair of JavaScript, wallet/auth, CSS, or URLs.
const LITERAL_ESCAPE = /(<\/(?:section|article|div)>)(\\[nr])([ \t]*)(?=<(?:section|article|div)\b)/gi;
function escapedMatches(source) {
 return [...outsideInlineCode(source).matchAll(LITERAL_ESCAPE)].map(m=>({
  index:m.index, length:m[0].length,
  before:source.slice(m.index,m.index+m[0].length),
  after:source.slice(m.index,m.index+m[0].length).replace('\\n','\n').replace('\\r','\n')
 }));
}
function attribute(tag,name) {
 const m=tag.match(new RegExp('(?:^|\\s)'+name+'\\s*=\\s*(["\'])(.*?)\\1','i'));
 return m?m[2]:null;
}
export function scanHtml(source,file,trackedPaths=null) {
 if(typeof source!=='string'||typeof file!=='string')throw TypeError('HTML source and path required');
 const findings=[];
 for(const m of escapedMatches(source))findings.push({kind:'literal_escaped_newline',severity:isRepairableFile(file)?'auto_fix':'review',file,offset:m.index});
 const masked=outsideInlineCode(source);
 const ids=new Map();
 for(const m of masked.matchAll(/\bid\s*=\s*(["'])([^"']+)\1/gi)) {
  const id=m[2];
  if(ids.has(id))findings.push({kind:'duplicate_id',severity:'review',file,id,offset:m.index});
  else ids.set(id,m.index);
 }
 for(const m of masked.matchAll(/<(img|script|link)\b[^>]*>/gi)) {
  const tag=m[0],type=m[1].toLowerCase();
  const key=type==='link'?'href':'src',src=attribute(tag,key);
  if(type==='img'&&src==='')findings.push({kind:'empty_image_src',severity:'review',file,offset:m.index});
  if(!trackedPaths||!src||!/^\/?(?:[\w.\/-]+)\.(?:js|mjs|css|png|jpg|jpeg|webp|svg|gif|ico|avif|woff2?)($|[?#])/i.test(src))continue;
  if(type==='link'&&!/\bstylesheet\b/i.test(attribute(tag,'rel')||''))continue;
  const local=src.split(/[?#]/,1)[0];
  const normalized=path.posix.normalize(local.startsWith('/')?local.slice(1):path.posix.join(path.posix.dirname(file),local));
  if(normalized.startsWith('../')||!trackedPaths.has(normalized))findings.push({kind:'untracked_local_asset',severity:'review',file,asset:local,offset:m.index});
 }
 return findings;
}
export function repairHtml(source,file) {
 if(!isRepairableFile(file))return {source,fixes:[]};
 const matches=escapedMatches(source);
 let result=source;
 for(const m of matches.reverse())result=result.slice(0,m.index)+m.after+result.slice(m.index+m.length);
 const fixes=matches.reverse().map(m=>({kind:'literal_escaped_newline',file,offset:m.index,before:m.before,after:m.after}));
 return {source:result,fixes};
}
export function evaluateLivePage({url,pageErrors=[],responses=[],images=[]}) {
 const findings=[];
 for(const message of pageErrors.slice(0,12))findings.push({kind:'page_exception',severity:'review',url,message:String(message).slice(0,180)});
 for(const response of responses){
  let u;try{u=new URL(response.url)}catch{continue}
  if(u.origin===LIVE_ORIGIN && response.status>=400)findings.push({kind:'same_origin_http_failure',severity:'review',url,responseUrl:u.origin+u.pathname,status:response.status});
 }
 for(const img of images){
  if(img.complete===true&&img.naturalWidth===0)findings.push({kind:'broken_image',severity:'review',url,imageUrl:String(img.src).slice(0,220)});
 }
 return findings;
}
async function scanTrackedSources(root,apply) {
 const files=execFileSync('git',['ls-files','-z','--','*.html','*.js','*.mjs','*.css','*.png','*.jpg','*.jpeg','*.webp','*.svg','*.gif','*.ico','*.avif','*.woff','*.woff2'],{cwd:root,encoding:'utf8',maxBuffer:8_000_000}).split('\0').filter(Boolean);
 const tracked=new Set(files);
 const htmlFiles=files.filter(f=>f.endsWith('.html')&&!f.startsWith('node_modules/')&&!f.startsWith('vendor/')).slice(0,400);
 const report={filesChecked:0,totalHtmlFiles:files.filter(f=>f.endsWith('.html')).length,findings:[],fixes:[]};
 for(const file of htmlFiles) {
  let original;try{const stat=await fs.lstat(path.join(root,file));if(stat.isSymbolicLink()||stat.size>3_000_000)continue;original=await fs.readFile(path.join(root,file),'utf8')}catch{continue}
  report.filesChecked++;
  report.findings.push(...scanHtml(original,file,tracked));
  if(!apply||!isRepairableFile(file))continue;
  const fixed=repairHtml(original,file);
  if(!fixed.fixes.length)continue;
  // Only write when the entire proposed delta is the known repair, and the
  // exact file bytes have not changed between read and write.
  const reread=await fs.readFile(path.join(root,file),'utf8');
  if(digest(original)!==digest(reread))throw Error('stale_source_abort:'+file);
  if(scanHtml(fixed.source,file).some(x=>x.kind==='literal_escaped_newline'))throw Error('repair_did_not_resolve:'+file);
  await fs.writeFile(path.join(root,file),fixed.source,'utf8');
  report.fixes.push(...fixed.fixes.map(x=>({...x,fromSha256:digest(original),toSha256:digest(fixed.source)})));
 }
 if(htmlFiles.length<report.totalHtmlFiles)report.findings.push({kind:'scan_limit',severity:'review',checked:htmlFiles.length,total:report.totalHtmlFiles});
 return report;
}
export async function scanLiveSite({origin=LIVE_ORIGIN,paths=LIVE_PATHS}={}) {
 if(origin!==LIVE_ORIGIN)throw Error('origin_not_allowlisted');
 const {chromium}=await import('playwright');
 const browser=await chromium.launch({headless:true});
 const result={pages:[],assets:[],findings:[]};
 try {
  const context=await browser.newContext({viewport:{width:393,height:850},isMobile:true,hasTouch:true,serviceWorkers:'block'});
  for(const route of paths.slice(0,8)) {
   const url=new URL(route,origin);
   if(url.origin!==LIVE_ORIGIN)throw Error('cross_origin_navigation_rejected');
   const page=await context.newPage(),pageErrors=[],responses=[];
   page.on('pageerror',e=>pageErrors.push(e.message));
   page.on('response',r=>{if(responses.length<160)responses.push({url:r.url(),status:r.status()})});
   try{
    const response=await page.goto(url.href,{waitUntil:'domcontentloaded',timeout:18000});
    await page.waitForTimeout(900);
    const images=await page.locator('img').evaluateAll(nodes=>nodes.filter(n=>!n.hidden&&n.getClientRects().length&&n.loading!=='lazy').slice(0,60).map(n=>({src:n.currentSrc||n.src,complete:n.complete,naturalWidth:n.naturalWidth})));
    if(!response||response.status()>=400)result.findings.push({kind:'page_http_failure',severity:'review',url:url.href,status:response?.status()??0});
    result.findings.push(...evaluateLivePage({url:url.href,pageErrors,responses,images}));
    result.pages.push({url:url.href,status:response?.status()??0,checked:true});
   }catch(error){result.findings.push({kind:'navigation_failure',severity:'review',url:url.href,error:String(error.message).slice(0,180)});result.pages.push({url:url.href,checked:false});}
   finally{await page.close()}
  }
  // Source checkout may not include assets served by a Cloudflare mapping or
  // another repository. HTTP response is the authority for live availability.
  for(const route of PUBLIC_ASSET_PROBES){
   const url=new URL(route,origin);
   try{
    const response=await context.request.get(url.href,{timeout:12000,failOnStatusCode:false});
    result.assets.push({url:url.href,status:response.status()});
    if(response.status()>=400)result.findings.push({kind:'public_asset_http_failure',severity:'review',url:url.href,status:response.status()});
   }catch(error){result.findings.push({kind:'public_asset_check_unavailable',severity:'review',url:url.href,error:String(error.message).slice(0,160)});}
  }
 }finally{await browser.close()}
 return result;
}
export async function main(args=process.argv.slice(2)) {
 const root=path.resolve(args.includes('--root')?args[args.indexOf('--root')+1]:path.join(path.dirname(fileURLToPath(import.meta.url)),'..'));
 const apply=args.includes('--apply'),live=args.includes('--live');
 const source=await scanTrackedSources(root,apply);
 const browser=live?await scanLiveSite():{pages:[],findings:[]};
 const report={checkedAt:new Date().toISOString(),mode:apply?'guarded_autofix':'read_only',source,browser,confirmedDeployment:false};
 const dir=path.join(root,REPORT_DIR);await fs.mkdir(dir,{recursive:true});
 await fs.writeFile(path.join(dir,'report.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({files:source.filesChecked,sourceFindings:source.findings.length,autoFixed:source.fixes.length,livePages:browser.pages.length,assetProbes:browser.assets?.length||0,liveFindings:browser.findings.length}));
 return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e.message);process.exitCode=1});
