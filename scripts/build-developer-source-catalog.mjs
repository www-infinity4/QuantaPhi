/* GitHub metadata importer for a REVIEWABLE Developer Library data PR.
 * No website scraping, arbitrary code download, auto-publishing or permissions.
 * Search data is candidate source metadata only. No GitHub content executes.
 */
import {writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {DEVELOPMENT_TOPICS,buildGithubSearchURL,summarizeGithubPage} from '../developer-discovery-core.mjs';

const delay=ms=>new Promise(done=>setTimeout(done,ms));
const unsafeName=/\b(?:pornography|porn|nudes?|hentai|sexually.explicit|dick.pics)\b/i;

export async function collectDeveloperSources({
 fetchImpl=fetch,topics=DEVELOPMENT_TOPICS,pause=()=>Promise.resolve(),at=new Date()
}={}){
 const all=[],ids=new Set(),reported={},failures=[];
 for(const topic of topics){
  const href=new URL(buildGithubSearchURL(topic.id,1));
  href.searchParams.set('per_page','100');
  try{
   const response=await fetchImpl(href.href,{headers:{Accept:'application/vnd.github+json'}});
   if(!response.ok){
    failures.push({topic:topic.id,status:response.status});
    if(response.status===403||response.status===429)break;
    continue;
   }
   const data=summarizeGithubPage(await response.json(),topic.id);
   reported[topic.id]={matches:data.reportedMatches,returned:data.items.length,incomplete:data.incomplete};
   for(const resource of data.items){
    if(ids.has(resource.id)||unsafeName.test(resource.label+' '+resource.description))continue;
    ids.add(resource.id);
    all.push(resource);
   }
  }catch{
   failures.push({topic:topic.id,status:'unavailable'});
  }
  await pause();
 }
 return {
  schema_version:1,
  generated_at:at.toISOString(),
  source:'GitHub REST API /search/repositories',
  status:'review-required',
  fetched_topics:Object.keys(reported).length,
  reported_by_topic:reported,
  records:all.length,
  errors:failures,
  items:all
 };
}

if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const token=process.env.GITHUB_TOKEN;
 if(!token)throw Error('GITHUB_TOKEN is required for rate-controlled candidate import');
 const snapshot=await collectDeveloperSources({
  fetchImpl:(url,options)=>fetch(url,{
   ...options,headers:{...options?.headers,Authorization:'Bearer '+token,'X-GitHub-Api-Version':'2022-11-28'},
   signal:AbortSignal.timeout(25000)
  }),
  pause:()=>delay(2200)
 });
 if(snapshot.records<1000||snapshot.fetched_topics<18||snapshot.errors.length>6)
  throw Error('Candidate import incomplete: no catalog file written; results='+snapshot.records+', topics='+snapshot.fetched_topics+', failures='+snapshot.errors.length);
 await mkdir('data',{recursive:true});
 await writeFile('data/developer-source-catalog.json',JSON.stringify(snapshot,null,1)+'\n');
 process.stdout.write('Candidate catalog prepared for review: '+snapshot.records+' real GitHub repos in '+snapshot.fetched_topics+' topic queries\n');
}
