import {DatabaseSync} from 'node:sqlite';

// Exercise the handler's storage contract with actual commit/rollback, rather
// than a Map whose writes survive a rejected transaction. Queue operations as
// Durable Object storage does; transaction callbacks use the isolated view.
export function quickCardStorage(t){
 const db=new DatabaseSync(':memory:');
 db.exec('CREATE TABLE kv (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
 const read=db.prepare('SELECT value FROM kv WHERE key = ?');
 const write=db.prepare('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)');
 const get=key=>{const row=read.get(key);return row?JSON.parse(row.value):undefined};
 const put=(key,value)=>{write.run(key,JSON.stringify(value))};
 let tail=Promise.resolve(),failAt=0;
 const queue=fn=>{const result=tail.then(fn);tail=result.catch(()=>{});return result};
 t.after(async()=>{await tail;db.close()});
 return {
  get:key=>queue(()=>get(key)),
  put:(key,value)=>queue(()=>put(key,value)),
  entries:()=>queue(()=>db.prepare('SELECT key, value FROM kv ORDER BY key').all().map(row=>[row.key,JSON.parse(row.value)])),
  interruptNextTransactionAtWrite(number){failAt=number},
  transaction:fn=>queue(async()=>{
   const interrupt=failAt;failAt=0;let writes=0;
   db.exec('BEGIN IMMEDIATE');
   try{
    const result=await fn({get:async key=>get(key),put:async(key,value)=>{
     if(++writes===interrupt)throw Error('simulated_storage_write_failure');
     put(key,value);
    }});
    db.exec('COMMIT');return result;
   }catch(error){db.exec('ROLLBACK');throw error}
  })
 };
}

export function deferred(){
 let resolve;const promise=new Promise(done=>{resolve=done});
 return {promise,resolve};
}
