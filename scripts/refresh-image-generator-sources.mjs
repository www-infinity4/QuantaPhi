/* Read-only GitHub repository metadata scan for the reviewed Quick Card source DB.
 * Never scrape artwork, mirror copyrighted websites, load arbitrary remote scripts
 * or auto-publish newly found entries. The artifact is a candidate review receipt.
 */
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {normalizeGeneratorSources,parseGitHubSource} from '../image-generator-source-core.mjs';
const DEFAULT_DATA=new URL('../data/image-generator-sources.json',import.meta.url);
export async function scanGeneratorSources(raw,fetchImpl=fetch){
 const sources=normalizeGeneratorSources(raw),report=[];
 for(const card of sources){
  const repo=parseGitHubSource(card.sourceUrl);
  const endpoint='https://api.github.com/repos/'+repo;
  try{
   const response=await fetchImpl(endpoint,{headers:{Accept:'application/vnd.github+json','User-Agent':'QuantaPhi-Image-Generator-Source-Review'}});
   if(!response?.ok)throw Error('GitHub returned HTTP '+(response?.status??'unknown'));
   const payload=await response.json();
   const observed={
    sourceId:card.id,repository:repo,sourceUrl:card.sourceUrl,
    observedRepository:payload.full_name||null,observedLicense:payload.license?.spdx_id||null,
    archived:payload.archived===true,sourceUpdatedAt:payload.updated_at||null,
    sourceAvailable:true,checkedAt:new Date().toISOString()
   };
   observed.reviewStatus=payload.full_name===repo&&payload.license?.spdx_id===card.sourceLicense&&!observed.archived?'matches-approved-record':'review-required';
   observed.message=observed.reviewStatus==='matches-approved-record'?'Metadata agrees. No new runtime/provider permissions granted.':'Repository name, license or archived state changed; manual review required before any publication.';
   report.push(observed);
  }catch(error){
   report.push({sourceId:card.id,repository:repo,sourceUrl:card.sourceUrl,sourceAvailable:false,
    reviewStatus:'unverified',checkedAt:new Date().toISOString(),message:String(error?.message||error).slice(0,180)});
  }
 }
 return {kind:'image-generator-source-review',catalogVersion:'2026-11-07',reviewedCount:sources.length,
  matches:report.filter(x=>x.reviewStatus==='matches-approved-record').length,
  reviewRequired:report.filter(x=>x.reviewStatus!=='matches-approved-record').length,
  note:'This is read-only official GitHub metadata research; it does not prove website embedding permission, API uptime or image-generator browser acceptance.',
  rows:report};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 const items=JSON.parse(await readFile(DEFAULT_DATA,'utf8'));
 const report=await scanGeneratorSources(items);
 const output=process.argv.includes('--output')?process.argv[process.argv.indexOf('--output')+1]:null;
 if(output)await writeFile(output,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({reviewed:report.reviewedCount,matches:report.matches,reviewRequired:report.reviewRequired,output:output||'stdout-only'}));
 // Unexpected failures go to the review artifact; never mutate the public catalog.
}
