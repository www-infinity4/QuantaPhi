import {execFileSync} from 'node:child_process';
import {previewFiles,validatePreview} from '../workers/infinity-brain-clock/preview-contract.mjs';
export {validatePreview};
export function sourceSection(html){
 const start=html.indexOf('<section id="quantaAgentIterations"');
 if(start<0)throw Error('Preview component missing');
 const tags=/<\/?section\b[^>]*>/gi;tags.lastIndex=start;let depth=0,match;
 while((match=tags.exec(html))){depth+=match[0].startsWith('</')?-1:1;if(depth===0)return html.slice(start,tags.lastIndex);}
 throw Error('Preview section is incomplete');
}
export async function capturePair({baseSha,commitSha,paths,summary,jobId,status='source_preview',runUrl},options={}){
 const source=options.source||((ref,path)=>execFileSync('git',['show',ref+':'+path],{encoding:'utf8',maxBuffer:2*1024*1024}));
 const {chromium}=options.browserModule||await import('playwright');
 const browser=await chromium.launch({headless:true});
 const images={};
 try{for(const [side,ref]of [['before',baseSha],['after',commitSha]]){
  const context=await browser.newContext({viewport:{width:360,height:800},isMobile:true,hasTouch:true,serviceWorkers:'block'});
  try{
   const markup=sourceSection(source(ref,'index.html'));
   const resources=Object.fromEntries(previewFiles.map(path=>[path,source(ref,path)]));
   await context.addInitScript(()=>localStorage.setItem('infinity-work-ticket-owner-v1','isolated-preview-fixture'));
   // All services are disconnected. The owner-visible component is rendered with an explicit local fixture.
   await context.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.origin==='https://preview.invalid'){
     const path=url.pathname.slice(1);
     if(path==='')return route.fulfill({contentType:'text/html; charset=utf-8',body:'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:8px;background:#f6f1e8;font:14px system-ui}*,*::before,*::after{box-sizing:border-box}#quantaAgentIterations{display:block!important}</style><link rel="stylesheet" href="/quanta-agent-iterations.css"><link rel="stylesheet" href="/robot-directions.css">'+markup+'<script src="/quanta-agent-iterations.js"></script><script src="/robot-directions.js"></script>'});
     if(Object.hasOwn(resources,path))return route.fulfill({contentType:path.endsWith('.css')?'text/css':'application/javascript',body:resources[path]});
    }
    const body=url.pathname==='/health'?{ok:true}:url.pathname==='/v1/tickets/list'?{ok:true,tickets:[]}:{schemaVersion:2,jobs:[],messages:[],items:[]};
    return route.fulfill({contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*'},body:JSON.stringify(body)});
   });
   const page=await context.newPage();await page.goto('https://preview.invalid/',{waitUntil:'networkidle'});
   await page.locator('#robotDirections').waitFor({timeout:15000});
   await page.evaluate(()=>{document.querySelectorAll('*').forEach(el=>{el.style.animation='none';el.style.transition='none'})});
   const area=await page.locator('#quantaAgentIterations').boundingBox();
   if(!area||area.height<100)throw Error('Preview did not render');
   const clip={x:Math.max(0,area.x),y:Math.max(0,area.y),width:Math.min(360-area.x,area.width),height:Math.min(1800,area.height)};
   let jpeg;for(const quality of [65,45,25]){jpeg=await page.screenshot({type:'jpeg',quality,clip});if(jpeg.length<=44000)break;}
   if(jpeg.length>44000)throw Error('Preview image exceeds storage bound');
   images[side]='data:image/jpeg;base64,'+jpeg.toString('base64');
  }finally{await context.close()}
 }}finally{await browser.close()}
 return validatePreview({schemaVersion:1,repository:'www-infinity4/QuantaPhi',baseSha,commitSha,paths,summary:summary.slice(0,500),jobId:jobId||'recorded bot repair',status,runUrl,when:new Date().toISOString(),viewport:'360x800',renderMode:'isolated-source-component',note:'Exact before/after source rendered with disconnected service fixtures. These images do not prove live deployment or wallet behavior.',...images});
}
