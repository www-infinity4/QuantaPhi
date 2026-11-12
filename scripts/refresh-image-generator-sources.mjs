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
/* Discovery is a proposal queue ONLY. No candidate is a public card until a
 * human verifies provider terms, source rights, safe image export and the
 * repo-local implementation, then commits it to the reviewed source database.
 */
export async function discoverGeneratorCandidates(raw,fetchImpl=fetch){
 const approved=new Set(normalizeGeneratorSources(raw).map(row=>row.sourceRepo.toLowerCase()));
 const seen=new Set(approved),candidates=[],errors=[];
 const queries=['svg image generator language:JavaScript','generative art language:JavaScript','pattern generator language:TypeScript'];
 for(const query of queries){
  const url=new URL('https://api.github.com/search/repositories');
  url.searchParams.set('q',query);url.searchParams.set('sort','stars');
  url.searchParams.set('order','desc');url.searchParams.set('per_page','12');
  try{
   const response=await fetchImpl(url.toString(),{headers:{Accept:'application/vnd.github+json','User-Agent':'QuantaPhi-Image-Generator-Source-Review'}});
   if(!response?.ok)throw Error('GitHub search HTTP '+(response?.status??'unknown'));
   const payload=await response.json();
   for(const item of (Array.isArray(payload.items)?payload.items:[])){
    const repo=String(item.full_name||'');
    if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)||seen.has(repo.toLowerCase()))continue;
    if(item.html_url!=='https://github.com/'+repo||item.archived||item.fork)continue;
    const license=item.license?.spdx_id;
    if(license!=='MIT'&&license!=='LGPL-2.1')continue;
    seen.add(repo.toLowerCase());
    let websiteUrl=null;
    try{
     const parsed=new URL(String(item.homepage||''));
     if(parsed.protocol==='https:'&&!parsed.username&&!parsed.password&&parsed.hostname.includes('.')&&parsed.hostname!=='localhost')
      websiteUrl=parsed.toString().slice(0,250);
    }catch{/* No valid homepage: needs review; never invent one. */}
    candidates.push({repository:repo,sourceUrl:item.html_url,websiteUrl,
     sourceLicense:license,description:String(item.description||'').slice(0,250),
     status:'candidate-review-only',reviewRequired:true,checkedAt:new Date().toISOString()});
    if(candidates.length>=24)break;
   }
  }catch(error){errors.push({query,error:String(error?.message||error).slice(0,180)})}
  if(candidates.length>=24)break;
 }
 return {candidateCount:candidates.length,published:0,candidates,errors,
  note:'Discovery results are metadata proposals; Bubbles must independently review sources, licenses, provider permissions and a working local implementation before adding to the published catalog.'};
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 const items=JSON.parse(await readFile(DEFAULT_DATA,'utf8'));
 const report=await scanGeneratorSources(items);
 report.discovery=await discoverGeneratorCandidates(items);
 const output=process.argv.includes('--output')?process.argv[process.argv.indexOf('--output')+1]:null;
 if(output)await writeFile(output,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({reviewed:report.reviewedCount,matches:report.matches,reviewRequired:report.reviewRequired,output:output||'stdout-only'}));
 // Unexpected failures go to the review artifact; never mutate the public catalog.
}
