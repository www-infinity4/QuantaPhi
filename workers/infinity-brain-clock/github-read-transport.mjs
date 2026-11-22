/**
 * Cloudflare-supported GitHub GET transport: never follow redirects with a
 * bearer token, and never accept a redirect as verified source evidence.
 */
export async function githubReadNoRedirect(url,options={},fetchImpl=fetch){
 let target;
 try{target=new URL(url)}catch{throw Error('github_read_invalid_origin')}
 if(target.protocol!=='https:'||target.hostname!=='api.github.com'||target.port||target.username||target.password)
  throw Error('github_read_invalid_origin');
 const response=await fetchImpl(url,{...options,redirect:'manual'});
 if(response.status>=300&&response.status<400)throw Error('github_read_redirect_refused_'+response.status);
 return response;
}
