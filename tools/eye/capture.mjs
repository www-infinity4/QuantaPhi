// GitHub Actions side of Bubbles Eye. Cloudflare runs Chrome via its existing
// BROWSER binding; no Playwright/npm/Anthropic API key or browser credentials.
import {mkdir,writeFile,stat} from 'node:fs/promises';
import {diagnoseCapsule} from './diagnose.mjs';
const endpoint='https://bubbles-cloud-browser.marvaseater.workers.dev/v1/eye/capture';
const origin='https://quantaphi.org/bubbles.html';
function selectedUrl(value){
 if(!value)return origin;
 const u=new URL(value);
 if(!['quantaphi.org','www.quantaphi.org'].includes(u.hostname)||u.protocol!=='https:'||
  u.pathname!=='/bubbles.html'||u.search||u.hash||u.username||u.password||u.port)
  throw Error('only_public_bubbles_url_allowed');
 return u.href;
}
async function identity(){
 if(!process.env.ACTIONS_ID_TOKEN_REQUEST_URL||!process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN)
  throw Error('github_oidc_unavailable');
 const url=new URL(process.env.ACTIONS_ID_TOKEN_REQUEST_URL);
 url.searchParams.set('audience','bubbles-eye-public-capture');
 const r=await fetch(url,{headers:{Authorization:'Bearer '+process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN},
  redirect:'error',signal:AbortSignal.timeout(12000)});
 if(!r.ok)throw Error('github_oidc_not_issued');
 const token=(await r.json()).value;
 if(typeof token!=='string'||!token)throw Error('github_oidc_empty');
 return token;
}
function png(value){
 if(typeof value!=='string'||value.length>6000000)throw Error('invalid_browser_image');
 const data=Buffer.from(value,'base64');
 if(data.length<8||data.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('not_png');
 return data;
}
async function capture(mode,token){
 const r=await fetch(endpoint,{method:'POST',redirect:'error',headers:{Authorization:'Bearer '+token,
  'Content-Type':'application/json'},body:JSON.stringify({mode}),signal:AbortSignal.timeout(90000)});
 const result=await r.json().catch(()=>({}));
 if(!r.ok||result.ok!==true||result.mode!==mode||result.purple?.accepted!==true)
  throw Error('cloudflare_eye_'+String(result.error||r.status).replace(/[^a-z0-9_]/gi,'').slice(0,64));
 return {...result,screenBytes:{fold:png(result.screenshots?.fold),full:png(result.screenshots?.full)}};
}
export async function run(){
 selectedUrl(process.argv[2]||process.env.BUBBLES_URL||origin);
 const token=await identity();
 const output='eye-out';await mkdir(output,{recursive:true});
 const observed={};
 for(const mode of ['mobile','desktop']){
  const data=await capture(mode,token);
  observed[mode]={red:data.red,yellow:data.yellow,orange:data.orange,errors:data.errors,
   fullHeightClipped:data.fullHeightClipped};
  await writeFile(output+'/'+mode+'-fold.png',data.screenBytes.fold);
  await writeFile(output+'/'+mode+'-full.png',data.screenBytes.full);
 }
 const orange={overflow:false,offscreenRight:[],brokenImages:[],overlaps:[],blankCanvases:[]};
 const errors=[];
 for(const mode of ['mobile','desktop']){
  const x=observed[mode];
  orange.overflow ||= x.orange?.overflow===true;
  for(const key of ['offscreenRight','brokenImages','overlaps','blankCanvases'])
   orange[key].push(...(Array.isArray(x.orange?.[key])?x.orange[key]:[]).map(item=>({mode,...item})));
  errors.push(...(x.errors||[]).map(item=>({mode,...item})));
 }
 const lengths=await Promise.all(['mobile','desktop'].flatMap(mode=>['fold','full'].map(kind=>stat(output+'/'+mode+'-'+kind+'.png').then(f=>f.size))));
 const accepted=lengths.every(s=>s>8);
 const capsule={version:1,target:origin,red:{mobile:observed.mobile.red,desktop:observed.desktop.red},
  yellow:{mobile:observed.mobile.yellow,desktop:observed.desktop.yellow},orange,errors,
  purple:{accepted,reason:accepted?'four_screenshots_present':'screenshots_missing'},
  fullHeightClipped:{mobile:observed.mobile.fullHeightClipped,desktop:observed.desktop.fullHeightClipped}};
 await writeFile(output+'/capsule.json',JSON.stringify(capsule,null,2)+'\n');
 await writeFile(output+'/diagnosis.json',JSON.stringify(diagnoseCapsule(capsule),null,2)+'\n');
 if(!accepted)throw Error('eye_capture_unverified');
 console.log('BUBBLES_EYE_ACCEPTED '+JSON.stringify({accepted:true,viewports:['mobile','desktop'],images:4,
  problems:diagnoseCapsule(capsule).evidence.length,patchApplied:false}));
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 run().catch(e=>{console.error('BUBBLES_EYE_BLOCKED '+String(e.message||'failed').slice(0,100));process.exitCode=1});
}
