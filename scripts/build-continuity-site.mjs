import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
export const ASSETS=['index.html','style.css','app.mjs','engine.mjs','router.mjs','README.md','ARCHITECTURE.md','owner/index.html','owner/app.mjs','owner/client-model.mjs'];
export async function buildContinuitySite(root,out,sourceRef){
 if(!/^[a-f0-9]{40}$/.test(sourceRef))throw Error('pinned_source_required');
 const assets={},manifest={sourceRef,files:{}};
 for(const name of ASSETS){const content=await readFile(path.join(root,'continuity',name),'utf8');assets[name]=content;manifest.files['continuity/'+name]=createHash('sha256').update(content).digest('hex');}
 const worker=await readFile(path.join(root,'workers/continuity-site/worker.mjs'),'utf8');
 manifest.files['workers/continuity-site/worker.mjs']=createHash('sha256').update(worker).digest('hex');
 await mkdir(out,{recursive:true});
 await writeFile(path.join(out,'worker.mjs'),worker);
 await writeFile(path.join(out,'index.mjs'),"import {createContinuitySite} from './worker.mjs';\nexport default createContinuitySite("+JSON.stringify(assets)+','+JSON.stringify(sourceRef)+');\n');
 await writeFile(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 return manifest;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const root=fileURLToPath(new URL('../',import.meta.url));
 const sourceRef=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
 const dirty=execFileSync('git',['status','--porcelain','--untracked-files=all','--',...ASSETS.map(p=>'continuity/'+p),'workers/continuity-site/worker.mjs'],{cwd:root,encoding:'utf8'}).trim();
 if(dirty)throw Error('clean_reviewed_source_required');
 const manifest=await buildContinuitySite(root,path.resolve(process.argv[2]||'/tmp/continuity-site-bundle'),sourceRef);
 console.log(JSON.stringify({sourceRef:manifest.sourceRef,files:Object.keys(manifest.files).length}));
}
