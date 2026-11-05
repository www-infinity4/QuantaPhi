#!/usr/bin/env node
// Public no-credential continuity probe for the Gary & Family page.
// Run with Node >=20 on a schedule. Never log cookies, accounts or private content.
// Fails on real web-origin/source mismatches, not on speculative ad/view metrics.
import {writeFileSync,mkdirSync} from 'node:fs';

const ORIGIN='https://quantaphi.org';
const checks=[
  {path:'/gary/index.html',type:'text/html',need:['id="gary-family-hero"','id="gary-birthday-hero"','/gary/presentation-init.mjs','/gary/octaves.css','id="family-cast-panel"','id="family-lounge"']},
  {path:'/family/index.html',type:'text/html',need:['Gary & Family','/gary/index.html','http-equiv="refresh"']},
  {path:'/gary/lounge.mjs',type:'javascript',need:['castAction(','family-cast-panel','bubbles-embed.js','forecastSevenDays','sourceCardForIntent']},
  {path:'/gary/presentation.mjs',type:'javascript',need:['2026-11-06T06:00:00.000Z','familyPresentationAt','castInstructions']},
  {path:'/gary/presentation-init.mjs',type:'javascript',need:['familyPresentationAt(new Date())','document.title']},
  {path:'/gary/octaves.css',type:'text/css',need:['color-scheme:light','family-spotlight','family-cast-panel']},
  {path:'/gary/main.mjs',type:'javascript',need:['createEmbedUrl','archive']},
  {path:'/infinity-radio/oracle-track-feed.json',type:'application/json',need:['"tracks"']}
];

async function inspect({path,type,need}){
  const started=Date.now();
  try{
    const url=ORIGIN+path+'?family_ci=1';
    const response=await fetch(url,{
      method:'GET',redirect:'follow',cache:'no-store',
      headers:{'Accept':'text/html,application/javascript,text/css,application/json'},
      signal:AbortSignal.timeout(12_000)
    });
    if(!response.ok)throw Error('HTTP '+response.status);
    const contentType=response.headers.get('content-type')||'';
    if(!contentType.includes(type) && !(type==='javascript'&&contentType.includes('text/plain')))
      throw Error('unexpected_content_type '+contentType.slice(0,60));
    const final=new URL(response.url);
    if(final.origin!==ORIGIN)throw Error('unexpected_origin '+final.origin);
    const body=(await response.text()).slice(0,1_500_000);
    const missing=need.filter(value=>!body.includes(value));
    if(missing.length)throw Error('source_mismatch '+missing.join(', '));
    return {path,ok:true,http_status:response.status,duration_ms:Date.now()-started};
  }catch(error){
    return {path,ok:false,error:String(error.message||error).slice(0,240),duration_ms:Date.now()-started};
  }
}

const results=[];
for(const entry of checks)results.push(await inspect(entry));
const problems=results.filter(x=>!x.ok);
const receipt={
  schema:'gary-family-public-smoke/v1',
  checked_at:new Date().toISOString(),
  site:ORIGIN+'/gary/index.html',
  friendly_url:ORIGIN+'/family/index.html',
  ok:problems.length===0,
  results,
  problems,
  next_action:problems.length?'Review failed public paths, recent GitHub Pages propagation, Cloudflare edge cache and source CI before re-deployment. Never claim live health until readback succeeds.':'No verified source or origin regressions found. Scheduled checks do not certify Chromecast, licensing or individualized AI quality.'
};
const out=process.env.GARY_FAMILY_REPORT||'/tmp/gary-family-health.json';
try{mkdirSync(new URL('.', 'file://'+out).pathname,{recursive:true})}catch{}
writeFileSync(out,JSON.stringify(receipt,null,2)+'\n');
for(const item of results)console.log((item.ok?'PASS ':'FAIL ')+item.path+(item.error?' · '+item.error:''));
console.log('Health: '+(receipt.ok?'PASS':'FAIL')+' · '+receipt.checked_at+' · '+problems.length+' failed checks');
if(problems.length)process.exitCode=1;
