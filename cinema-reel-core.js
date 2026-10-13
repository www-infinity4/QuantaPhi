/* Pure timeline operations: source timestamps stay authoritative. */
(function(root){
'use strict';
function seconds(s){const v=String(s).trim().replace(',', '.').split(':').map(Number);if(!v.every(Number.isFinite))return NaN;return v.length===3?v[0]*3600+v[1]*60+v[2]:v.length===2?v[0]*60+v[1]:NaN}
function captions(text){
 const rows=[];const blocks=String(text).replace(/\r/g,'').split(/\n\s*\n/);
 for(const block of blocks){const lines=block.split('\n');const at=lines.findIndex(l=>l.includes('-->'));if(at<0)continue;
  const [a,b]=lines[at].split('-->');const start=seconds(a),end=seconds(b.trim().split(/\s/)[0]);const copy=lines.slice(at+1).join(' ').replace(/<[^>]*>/g,'').trim();
  if(Number.isFinite(start)&&Number.isFinite(end)&&end>start&&start>=0&&copy)rows.push({start,end,text:copy.slice(0,1200)});
 }return rows.sort((a,b)=>a.start-b.start).slice(0,10000);
}
function matches(rows,term){const q=String(term).trim().toLowerCase();if(!q)return[];return rows.filter(r=>r.text.toLowerCase().includes(q)).map(r=>({start:Math.max(0,r.start-2),duration:15,text:r.text})).filter((r,i,a)=>!i||r.start-a[i-1].start>=15)}
function clip(source,start,duration=15){
 const s=Number(start),d=Number(duration);if(!source||!Number.isFinite(s)||s<0||!Number.isFinite(d)||d<=0||d>15)throw Error('A clip needs a source and a start time; duration is at most 15 seconds.');
 return {sourceId:String(source.id),title:String(source.title),start:s,duration:d,sourceUrl:source.watchUrl||'',mediaUrl:source.mediaUrl||'',provider:source.provider,licenseUrl:source.licenseUrl||''};
}
async function finalizeWebM(blob,durationSeconds){
 if(!blob.type.startsWith('video/webm')||!Number.isFinite(durationSeconds)||durationSeconds<=0)return blob;
 const bytes=new Uint8Array(await blob.arrayBuffer());
 function vint(at,id=false){let mask=128,len=1;while(len<=8&&!(bytes[at]&mask)){mask>>=1;len++}if(len>8||at+len>bytes.length)return null;let value=id?bytes[at]:bytes[at]&(mask-1);for(let i=1;i<len;i++)value=value*256+bytes[at+i];const unknown=!id&&value===Math.pow(2,7*len)-1;return {len,value:unknown?Infinity:value}}
 function element(at){const id=vint(at,true);if(!id)return null;const size=vint(at+id.len);if(!size)return null;return {id:id.value,start:at,sizeAt:at+id.len,size,data:at+id.len+size.len}}
 function encodeSize(value,len){if(value>=Math.pow(2,7*len)-1)return null;const out=new Uint8Array(len);for(let i=len-1;i>=0;i--){out[i]=value%256;value=Math.floor(value/256)}out[0]|=1<<(8-len);return out}
 let segment=null;for(let at=0;at<bytes.length;){const x=element(at);if(!x)break;if(x.id===0x18538067){segment=x;break}if(!Number.isFinite(x.size.value))break;at=x.data+x.size.value}
 if(!segment)return blob;let info=null;const limit=Math.min(bytes.length,segment.data+4096);for(let at=segment.data;at<limit;){const x=element(at);if(!x)break;if(x.id===0x1549a966){info=x;break}if(!Number.isFinite(x.size.value))break;at=x.data+x.size.value}
 if(!info||!Number.isFinite(info.size.value)||info.data+info.size.value>bytes.length)return blob;
 let scale=1000000;for(let at=info.data;at<info.data+info.size.value;){const x=element(at);if(!x||!Number.isFinite(x.size.value))return blob;if(x.id===0x4489)return blob;if(x.id===0x2ad7b1){scale=0;for(let i=0;i<x.size.value;i++)scale=scale*256+bytes[x.data+i]}at=x.data+x.size.value}
 if(scale<=0)return blob;const infoSize=encodeSize(info.size.value+11,info.size.len);const segmentSize=Number.isFinite(segment.size.value)?encodeSize(segment.size.value+11,segment.size.len):null;if(!infoSize||(Number.isFinite(segment.size.value)&&!segmentSize))return blob;
 const out=new Uint8Array(bytes.length+11),end=info.data+info.size.value;out.set(bytes.subarray(0,end));out.set(bytes.subarray(end),end+11);out.set(infoSize,info.sizeAt);if(segmentSize)out.set(segmentSize,segment.sizeAt);
 out.set([0x44,0x89,0x88],end);new DataView(out.buffer).setFloat64(end+3,durationSeconds*1e9/scale,false);return new Blob([out],{type:blob.type});
}
const api={seconds,captions,matches,clip,finalizeWebM};root.PhiCinemaTimeline=Object.freeze(api);if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
