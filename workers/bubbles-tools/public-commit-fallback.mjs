// Read-only public GitHub commit fallback when anonymous REST is rate-limited.
// Atom identifies the latest immutable SHA. The same official repository's
// .patch must confirm that SHA and contain real changed-file diff headers.
const SHA=/^[a-f0-9]{40}$/;
async function limitedRead(fetcher,url,accept,max){
 const response=await fetcher(url,{headers:{Accept:accept,'User-Agent':'QuantaPhi-Bubbles-Public-Commit'},redirect:'manual',signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw Error('github_public_http_'+response.status);
 if(Number(response.headers.get('Content-Length')||0)>max)throw Error('github_public_too_large');
 if(!response.body?.getReader)throw Error('github_public_body_unavailable');
 const reader=response.body.getReader(),decoder=new TextDecoder();
 let size=0,text='';
 try{
  while(true){
   const {done,value}=await reader.read();if(done)break;
   size+=value.byteLength;if(size>max)throw Error('github_public_too_large');
   text+=decoder.decode(value,{stream:true});
  }
  text+=decoder.decode();
 }finally{await reader.cancel().catch(()=>{});}
 return text;
}
export async function readPublicCommitFallback(repo,requestedSha,fetcher){
 if(!/^[a-z0-9][a-z0-9_.-]{0,38}\/[a-z0-9_][a-z0-9_.-]{0,99}$/i.test(repo))throw Error('github_public_repo_invalid');
 if(requestedSha&&!SHA.test(requestedSha))throw Error('github_public_sha_invalid');
 const base='https://github.com/'+repo;
 let sha=requestedSha;
 if(!sha){
  const atom=await limitedRead(fetcher,base+'/commits/main.atom','application/atom+xml',120000);
  const first=/<entry\b[^>]*>[\s\S]*?<\/entry>/i.exec(atom)?.[0]||'';
  const links=[...first.matchAll(/https:\/\/github\.com\/([a-z0-9_.-]+)\/([a-z0-9_.-]+)\/commit\/([a-f0-9]{40})/gi)];
  const verified=links.find(m=>(m[1]+'/'+m[2]).toLowerCase()===repo.toLowerCase());
  if(!verified)throw Error('github_public_feed_sha_unverified');
  sha=verified[3].toLowerCase();
 }
 const patch=await limitedRead(fetcher,base+'/commit/'+sha+'.patch','text/plain',230000);
 if(!patch.startsWith('From '+sha+' '))throw Error('github_public_patch_sha_mismatch');
 const diffs=[...patch.matchAll(/^diff --git a\/(.+?) b\/(.+)$/gm)];
 if(!diffs.length)throw Error('github_public_patch_files_missing');
 const files=diffs.slice(0,60).map((m,i)=>{
  const path=m[2],chunk=patch.slice(m.index,diffs[i+1]?.index??patch.length);
  if(!path||path.includes('..')||path.length>220||/[<>\r\n]/.test(path))throw Error('github_public_patch_path_unverified');
  const status=/^new file mode\s/m.test(chunk)?'added':/^deleted file mode\s/m.test(chunk)?'removed':'modified';
  const lines=chunk.split('\n');
  return {path,status,additions:lines.filter(l=>l.startsWith('+')&&!l.startsWith('+++')).length,
   deletions:lines.filter(l=>l.startsWith('-')&&!l.startsWith('---')).length};
 });
 const title=(patch.match(/^Subject:\s*\[PATCH[^\]]*\]\s*(.+)$/m)?.[1]||'').trim().slice(0,180);
 if(!title)throw Error('github_public_patch_title_unverified');
 return {sha,title,files};
}
