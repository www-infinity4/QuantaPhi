// Explicit trusted host code, never code supplied by a ticket or model.
// Load the owner's existing run(model, input) adapter without selecting a
// provider, changing the model, passing credentials to prompts or adding grants.
import {lstatSync,openSync,closeSync,fstatSync,readFileSync,constants} from 'node:fs';
import {isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {register} from 'node:module';

export async function loadBrainHostBindings({modulePath,expectedSha256}={}){
 if(!modulePath){if(expectedSha256)throw Error('brain_binding_source_required');return {};}
 if(typeof modulePath!=='string'||!isAbsolute(modulePath)||!modulePath.endsWith('.mjs'))throw Error('private_brain_binding_required');
 let fd,bytes;
 try{
  if(!lstatSync(modulePath).isFile())throw Error();
  fd=openSync(modulePath,constants.O_RDONLY|constants.O_NOFOLLOW);
  const info=fstatSync(fd);
  if(!info.isFile()||(info.mode&0o077)!==0||info.size>512*1024||typeof process.getuid==='function'&&info.uid!==process.getuid())throw Error();
  bytes=readFileSync(fd);if(bytes.length>512*1024)throw Error();
 }catch{throw Error('private_brain_binding_required');}
 finally{if(fd!==undefined)closeSync(fd);}
 const hash=createHash('sha256').update(bytes).digest('hex');
 if(expectedSha256!==undefined&&(!/^[a-f0-9]{64}$/.test(expectedSha256)||expectedSha256!==hash))throw Error('brain_binding_source_mismatch');
 try{
  const entry=pathToFileURL(modulePath).href+'?source='+hash;
  const identity=createHash('sha256').update(entry).digest('hex');
  // Import the bytes already checked, not a second read of a replaceable path.
  // A unique hook instance retains each entrypoint's captured source.
  register(new URL('./brain-host-binding-loader.mjs?binding='+identity,import.meta.url),import.meta.url,
   {data:{entry,source:new TextDecoder('utf-8',{fatal:true}).decode(bytes)}});
  const module=await import(entry);
  if(Object.keys(module).some(key=>key!=='WRITER_AI')||typeof module.WRITER_AI?.run!=='function')throw Error();
  const writer=module.WRITER_AI,run=writer.run;
  return Object.freeze({WRITER_AI:Object.freeze({run:(...args)=>Reflect.apply(run,writer,args)})});
 }catch{throw Error('brain_binding_import_failed');}
}
