// Anonymous GitHub HTML is a read-only fallback when its REST API is limited.
// Trust only the fixed HTTPS host plus matching public repository/tree metadata.
const REPOSITORY=/^[a-z0-9][a-z0-9_.-]{0,38}\/[a-z0-9_][a-z0-9_.-]{0,99}$/i;
const SHA=/^[a-f0-9]{40}$/i;
const MAX_BYTES=1000000;
export function parsePublicGithubRoot(html,repository){
 if(!REPOSITORY.test(repository)||typeof html!=='string'||new TextEncoder().encode(html).length>MAX_BYTES)
  throw Error('github_public_root_invalid');
 const [owner,name]=repository.split('/');
 for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)){
  if(!/(?:^|\s)data-target\s*=\s*["']react-app\.embeddedData["']/i.test(match[1])||
   !/(?:^|\s)type\s*=\s*["']application\/json["']/i.test(match[1]))continue;
  let payload;try{payload=JSON.parse(match[2]).payload}catch{continue;}
  const route=payload?.codeViewRepoRoute,repo=payload?.codeViewLayoutRoute?.repo;
  const tree=route?.tree,ref=route?.refInfo;
  if(repo?.public!==true||repo?.private!==false||repo.ownerLogin?.toLowerCase()!==owner.toLowerCase()||
   repo.name?.toLowerCase()!==name.toLowerCase()||route?.path!=='/'||
   !SHA.test(ref?.currentOid||'')||ref?.name!==repo.defaultBranch||
   typeof repo.defaultBranch!=='string'||!/^[-a-z0-9_./]{1,140}$/i.test(repo.defaultBranch)||
   repo.defaultBranch.includes('..')||!Array.isArray(tree?.items)||
   !Number.isSafeInteger(tree.totalCount)||tree.totalCount<1||tree.totalCount>1000||
   tree.items.length!==tree.totalCount)continue;
  const contents=[];
  for(const item of tree.items){
   if(!item||!['file','directory'].includes(item.contentType)||typeof item.path!=='string'||
    item.path.length>240||item.name!==item.path||/[\\\x00-\x1f\x7f]/.test(item.path)||
    item.path.split('/').some(part=>!part||part==='.'||part==='..')||
    (item.path.includes('/')&&(item.contentType!=='directory'||item.hasSimplifiedPath!==true)))
    throw Error('github_public_root_entries_invalid');
   contents.push({name:item.path.split('/')[0],type:item.contentType==='directory'?'dir':'file'});
  }
  if(new Set(contents.map(x=>x.name)).size!==contents.length)throw Error('github_public_root_entries_invalid');
  return {repository,defaultBranch:repo.defaultBranch,headSha:ref.currentOid,contents,
   sourceUrl:'https://github.com/'+repository+'/tree/'+ref.currentOid};
 }
 throw Error('github_public_root_not_verified');
}

export async function readPublicGithubRoot(repository,fetcher=fetch){
 if(!REPOSITORY.test(repository))throw Error('github_public_root_invalid');
 const url='https://github.com/'+repository;
 const response=await fetcher(url,{redirect:'manual',headers:{Accept:'text/html','User-Agent':'QuantaPhi-Bubbles-Reader'},signal:AbortSignal.timeout(9000)});
 if(response.status!==200||!/^text\/html\b/i.test(response.headers.get('content-type')||''))
  throw Error('github_public_root_unavailable');
 if(response.url&&response.url.replace(/\/$/,'').toLowerCase()!==url.toLowerCase())throw Error('github_public_root_redirected');
 if(Number(response.headers.get('content-length')||0)>MAX_BYTES)throw Error('github_public_root_too_large');
 const reader=response.body?.getReader();if(!reader)throw Error('github_public_root_missing_body');
 const chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;
  if(size>MAX_BYTES){await reader.cancel();throw Error('github_public_root_too_large');}chunks.push(value);
 }}finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 return parsePublicGithubRoot(new TextDecoder('utf-8',{fatal:true}).decode(bytes),repository);
}

// Documentation must remain visible to the next validated read, even in a
// large root with many matching Bubbles filenames. No new path is invented.
export function githubRootSummary(contents,limit=26){
 const docs=contents.filter(x=>x.type==='file'&&/^readme(?:\.(?:md|markdown|txt))?$/i.test(x.name));
 const relevant=contents.filter(x=>/bubbles|brain|worker|code|\.json$|index\.html$/i.test(x.name));
 return [...docs,...relevant,...contents].filter((x,i,all)=>all.findIndex(y=>y.name===x.name)===i).slice(0,limit);
}
