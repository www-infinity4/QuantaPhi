// Import reviewed public metadata and editorial summaries, without paid APIs.
// node scripts/import-creator-posts.mjs reviewed-posts.json [--write]
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {CREATOR_DATABASE,mergeCreatorPosts,validateCreatorPost} from '../creator-post-catalog.mjs';
export function prepareCreatorImport(input){
 if(input?.reviewed!==true||!Array.isArray(input.posts))throw new Error('A reviewed:true batch of source-checked post metadata is required');
 if(input.posts.some(p=>!validateCreatorPost(p)||Date.parse(p.checkedAt)>Date.now()+300000))throw new Error('Invalid post or future observation in reviewed import');
 const posts=mergeCreatorPosts(CREATOR_DATABASE.posts,input.posts);
 return {...CREATOR_DATABASE,coverage:{...CREATOR_DATABASE.coverage,complete:false,totalAvailable:null,
  checkedAt:new Date().toISOString(),method:'Reviewed public post metadata imports',
  reason:'Additional reviewed records may be indexed; an exhaustive account archive has not been established.'},posts};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  const args=process.argv.slice(2),file=args.find(a=>!a.startsWith('--'));
  if(!file||args.some(a=>a.startsWith('--')&&a!=='--write'))throw new Error('Usage: node scripts/import-creator-posts.mjs reviewed-posts.json [--write]');
  const next=prepareCreatorImport(JSON.parse(await readFile(file,'utf8')));
  if(args.includes('--write'))await writeFile(new URL('../data/creator-posts.mjs',import.meta.url),
   '// Reviewed public metadata and original editorial summaries; original posts remain on X.\nexport default '+JSON.stringify(next,null,2)+';\n');
  console.log(JSON.stringify({mode:args.includes('--write')?'written':'preview',indexed:next.posts.length,added:next.posts.length-CREATOR_DATABASE.posts.length,complete:false}));
 }catch(error){console.error(error.message);process.exitCode=1;}
}
