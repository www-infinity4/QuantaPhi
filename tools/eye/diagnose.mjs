// Deterministic anomalies first. No paid model or speculative source patch.
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
export function diagnoseCapsule(capsule){
 if(capsule?.purple?.accepted!==true)return {status:'capture_unverified',looks_ok:false,severity:'blocked',evidence:['capture_not_accepted'],patch_hypothesis:null};
 const e=[],a=capsule.orange||{};
 if(a.overflow)e.push('horizontal_overflow');
 for(const [k,reason] of [['offscreenRight','offscreen_right'],['brokenImages','broken_images'],['overlaps','overlapping_controls'],['blankCanvases','blank_canvases']]){
  if(Array.isArray(a[k])&&a[k].length)e.push(reason+':'+a[k].length);
 }
 if(Array.isArray(capsule.errors)&&capsule.errors.length)e.push('browser_errors:'+capsule.errors.length);
 return {status:e.length?'issues_observed':'clean',looks_ok:e.length===0,
  severity:e.length>3?'high':e.length?'medium':'none',evidence:e,patch_hypothesis:null};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const dir=process.argv[2]||'eye-out';
 const capsule=JSON.parse(await readFile(dir+'/capsule.json','utf8'));
 await writeFile(dir+'/diagnosis.json',JSON.stringify(diagnoseCapsule(capsule),null,2)+'\n');
}
