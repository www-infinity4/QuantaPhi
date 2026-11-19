// GitHub Actions side of Bubbles Eye. Cloudflare runs Chrome via its existing
// BROWSER binding; no Playwright/npm/Anthropic API key or browser credentials.
import {mkdir,writeFile,stat} from 'node:fs/promises';
import {diagnoseCapsule} from './diagnose.mjs';
import {inflateSync} from 'node:zlib';
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
// Check actual PNG bytes, not just its signature. Bound inflation before decoding.
function crc32(buf){
 let c=0xffffffff;
 for(const byte of buf){c^=byte;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}
 return (c^0xffffffff)>>>0;
}
function png(value){
 if(typeof value!=='string'||value.length>6000000||!/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value))
  throw Error('invalid_png_base64');
 const bytes=Buffer.from(value,'base64');
 if(bytes.length<45||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')
  throw Error('invalid_png_signature');
 let offset=8,width=0,height=0,depth=0,color=0,header=false,ended=false;
 const compressed=[];
 while(offset+12<=bytes.length){
  const length=bytes.readUInt32BE(offset);
  const dataStart=offset+8,dataEnd=dataStart+length,chunkEnd=dataEnd+4;
  if(length>bytes.length||chunkEnd>bytes.length)throw Error('invalid_png_chunk');
  const kind=bytes.toString('ascii',offset+4,offset+8);
  if(crc32(bytes.subarray(offset+4,dataEnd))!==bytes.readUInt32BE(dataEnd))
   throw Error('invalid_png_crc');
  if(kind==='IHDR'){
   if(header||length!==13||offset!==8)throw Error('invalid_png_header');
   header=true;width=bytes.readUInt32BE(dataStart);height=bytes.readUInt32BE(dataStart+4);
   depth=bytes[dataStart+8];color=bytes[dataStart+9];
   if(bytes[dataStart+10]!==0||bytes[dataStart+11]!==0||bytes[dataStart+12]!==0)
    throw Error('invalid_png_encoding');
  }else if(kind==='IDAT'){
   if(!header||ended)throw Error('invalid_png_idat');
   compressed.push(bytes.subarray(dataStart,dataEnd));
  }else if(kind==='IEND'){
   if(length!==0)throw Error('invalid_png_end');
   ended=true;
  }
  offset=chunkEnd;
  if(ended)break;
 }
 if(!header||!ended||!compressed.length||offset!==bytes.length||!width||!height||depth!==8||![2,6].includes(color))
  throw Error('invalid_png_structure');
 const rowBytes=1+width*(color===6?4:3),rawLength=rowBytes*height;
 if(!Number.isSafeInteger(rawLength)||rawLength>24000000)throw Error('invalid_png_dimensions');
 let raw;
 try{raw=inflateSync(Buffer.concat(compressed),{maxOutputLength:rawLength});}
 catch{throw Error('invalid_png_decode');}
 if(raw.length!==rawLength)throw Error('invalid_png_decode');
 for(let row=0;row<height;row++)if(raw[row*rowBytes]>4)throw Error('invalid_png_scanline');
 return {bytes,width,height};
}
export function validateEyeCapture(data,mode){
 const spec={mobile:{width:390,height:844,dpr:2},desktop:{width:1280,height:800,dpr:1}}[mode];
 if(!spec||data?.ok!==true||data.mode!==mode||data.purple?.accepted!==true)
  throw Error('eye_capture_unverified');
 const red=data.red,orange=data.orange;
 if(!red||red.url!==origin||red.readyState!=='complete')
  throw Error('eye_capture_target_not_ready');
 if(red.width!==spec.width||red.height!==spec.height||
    !Number.isFinite(red.docHeight)||red.docHeight<spec.height||
    !Number.isFinite(red.docWidth)||red.docWidth<spec.width)
  throw Error('eye_capture_geometry_invalid');
 if(!Array.isArray(data.yellow)||!Array.isArray(data.errors)||!orange||
    typeof orange.overflow!=='boolean'||
    !['offscreenRight','brokenImages','overlaps','blankCanvases'].every(k=>Array.isArray(orange[k])))
  throw Error('eye_capture_layout_evidence_missing');
 const fold=png(data.screenshots?.fold),full=png(data.screenshots?.full);
 const factor=fold.width/spec.width;
 if(![1,spec.dpr].includes(factor)||fold.height!==spec.height*factor||
    full.width!==fold.width||full.height<fold.height||
    full.height>Math.ceil(Math.min(3000,Math.max(spec.height,red.docHeight)))*factor)
  throw Error('eye_capture_image_dimensions_invalid');
 return {...data,screenBytes:{fold:fold.bytes,full:full.bytes}};
}

async function capture(mode,token){
 const r=await fetch(endpoint,{method:'POST',redirect:'error',headers:{Authorization:'Bearer '+token,
  'Content-Type':'application/json'},body:JSON.stringify({mode}),signal:AbortSignal.timeout(90000)});
 const result=await r.json().catch(()=>({}));
 if(!r.ok||result.ok!==true||result.mode!==mode||result.purple?.accepted!==true)
  throw Error('cloudflare_eye_'+String(result.error||r.status).replace(/[^a-z0-9_]/gi,'').slice(0,64));
 return validateEyeCapture(result,mode);
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
