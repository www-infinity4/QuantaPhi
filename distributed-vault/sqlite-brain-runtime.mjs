// Host the SAME signed Brain runner on private SQLite. This is an inactive
// cutover target, not an automatic failover or a replacement owner identity.
import {register} from 'node:module';
import {realpathSync} from 'node:fs';
import {createServer} from 'node:http';
import {pathToFileURL} from 'node:url';
import {openPortableBrainState} from './portable-brain-state.mjs';
import {openBrainDatabase,requirePrivateDatabase} from './sqlite-brain-db.mjs';
import {loadBrainHostBindings} from './brain-host-bindings.mjs';
import {serveBrainRequest} from './brain-http.mjs';

let source;
async function loadBrain(){
 if(!source){
  register('./sqlite-brain-loader.mjs',import.meta.url);
  source=import('../workers/infinity-brain-clock/worker.js');
 }
 return source;
}

export async function createSqliteBrain({workDbPath,statePath,ownerHash,writerEnabled=false,bindings={}}={}){
 if(!/^[a-f0-9]{64}$/.test(ownerHash||''))throw Error('owner_scope_required');
 if(typeof writerEnabled!=='boolean')throw Error('writer_mode_invalid');
 requirePrivateDatabase(workDbPath);requirePrivateDatabase(statePath);
 if(realpathSync(workDbPath)===realpathSync(statePath))throw Error('separate_brain_databases_required');
 const db=openBrainDatabase(workDbPath);
 let state;
 try{state=openPortableBrainState(statePath);}catch(error){db.close();throw error;}
 let closed=false,tail=Promise.resolve(),server;
 const serialized=fn=>{const next=tail.then(fn);tail=next.catch(()=>{});return next;};
 try{
  if(await state.get('bubbles-github-credential-v1')&&
    (typeof bindings.BOT_WORK_SECRET!=='string'||bindings.BOT_WORK_SECRET.length<16))
   throw Error('existing_credential_encryption_key_required');
  const {default:worker,BrainClock}=await loadBrain();
  const env={...bindings,WORK_DB:db,WRITER_OWNER_HASH:ownerHash};
  const clock=new BrainClock({storage:state,blockConcurrencyWhile:fn=>fn()},env);
  env.CLOCK=Object.freeze({idFromName:name=>name,get:id=>{
   if(id!=='infinity-main')throw Error('brain_identity_invalid');
   return {fetch:(input,init)=>clock.fetch(new Request(input,init))};
  }});
  const fetchRequest=request=>serialized(async()=>{
   if(closed)throw Error('sqlite_brain_closed');
   const path=new URL(request.url).pathname;
   if(request.method==='GET'&&path==='/local/health')
    return Response.json({ok:true,storage:'private-sqlite',writerEnabled,modelConfigured:typeof env.WRITER_AI?.run==='function',productionVerified:false},{headers:{'Cache-Control':'no-store'}});
   // Never expose the DO's internal fetch handler or unrelated wallet/phone
   // routes. The outer Worker verifies every runner JWT and rewrites identity.
   if(!path.startsWith('/runner/'))return new Response('Not found',{status:404});
   if(!writerEnabled)return Response.json({ok:false,error:'sqlite_writer_cutover_required'},{status:503});
   return worker.fetch(request,env);
  });
  return Object.freeze({fetch:fetchRequest,
   async listen(port=0,host='127.0.0.1'){
    if(closed||server)throw Error('sqlite_brain_listener_unavailable');
    if(!['127.0.0.1','::1'].includes(host))throw Error('loopback_required');
    if(!Number.isInteger(port)||port<0||port>65535)throw Error('invalid_brain_port');
    server=createServer({requestTimeout:190000,headersTimeout:10000,maxHeaderSize:20000},(req,res)=>void serveBrainRequest({fetch:fetchRequest},req,res));
    try{await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,host,()=>{server.off('error',reject);resolve();});});}
    catch(error){server=undefined;throw error;}
    const bound=server.address();
    return 'http://'+(host==='::1'?'[::1]':host)+':'+bound.port;
   },
   async close(){
    if(closed)return;
    closed=true;
    if(server)await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
    await tail;await state.close();db.close();
   }
  });
 }catch(error){await state.close();db.close();throw error;}
}

export async function createConfiguredBrain(env=process.env){
 if(env.BRAIN_SQLITE_WRITER_ENABLED!==undefined&&!['0','1'].includes(env.BRAIN_SQLITE_WRITER_ENABLED))throw Error('writer_mode_invalid');
 const bindings=await loadBrainHostBindings({modulePath:env.BRAIN_BINDINGS_MODULE,expectedSha256:env.BRAIN_BINDINGS_SHA256});
 const writerEnabled=env.BRAIN_SQLITE_WRITER_ENABLED==='1';
 if(writerEnabled&&!bindings.WRITER_AI)throw Error('existing_model_binding_required');
 return createSqliteBrain({workDbPath:env.BRAIN_WORK_DB,statePath:env.BRAIN_STATE_DB,ownerHash:env.WRITER_OWNER_HASH,
  writerEnabled,bindings:{...bindings,BOT_WORK_SECRET:env.BOT_WORK_SECRET}});
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  // Explicit private snapshot paths prevent a typo from replacing the original
  // Brain with empty state. Import/fence/reconciliation is a separate operation.
  const brain=await createConfiguredBrain();
  try{const url=await brain.listen(Number(process.env.BRAIN_PORT||18789));console.log('Existing Brain source serving '+url+'; production acceptance remains unverified.');}
  catch(error){await brain.close();throw error;}
  const stop=()=>void brain.close().catch(()=>{process.exitCode=1;});
  process.once('SIGINT',stop);process.once('SIGTERM',stop);
 }catch(error){console.error('SQLite Brain startup blocked: '+(error.code==='EADDRINUSE'?'port_in_use_existing_server_preserved':error.message));process.exitCode=78;}
}
