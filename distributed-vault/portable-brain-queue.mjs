// Private, offline migration rehearsal. Not an HTTP endpoint or claim adapter.
// The caller must supply a trusted owner scope; a hash is not authentication.
import {DatabaseSync} from 'node:sqlite';
import {statSync} from 'node:fs';
import {readRunnerQueue} from '../workers/infinity-brain-clock/runner-candidate-page.mjs';

export async function readPortableQueue({dbPath,ownerHash,order='newest',requestedTicketId=''}={}){
 if(typeof ownerHash!=='string'||!ownerHash.trim()||!['newest','oldest'].includes(order))throw Error('runner_queue_scope_invalid');
 if(typeof dbPath!=='string'||!dbPath||!statSync(dbPath).isFile())throw Error('private_snapshot_required');
 const db=new DatabaseSync(dbPath,{readOnly:true});
 try{
  db.exec('PRAGMA query_only=ON; BEGIN');
  // Keep all pages in one read transaction. No write methods are exposed.
  const adapter={prepare(sql){
   const statement=db.prepare(sql);
   return {bind(...args){return {
    all:async()=>({results:statement.all(...args)}),
    first:async()=>statement.get(...args)??null
   };}};
  }};
  return await readRunnerQueue(adapter,{ownerHash,order,requestedTicketId});
 }finally{db.close();}
}
