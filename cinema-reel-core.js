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
const api={seconds,captions,matches,clip};root.PhiCinemaTimeline=Object.freeze(api);if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
