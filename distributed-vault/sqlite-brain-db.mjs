// D1's small prepared-statement contract over an EXISTING private SQLite DB.
// No export, schema migration, credential reset or network fallback occurs here.
import {DatabaseSync} from 'node:sqlite';
import {lstatSync} from 'node:fs';

export function requirePrivateDatabase(file){
 let info;
 try{info=lstatSync(file);}catch{throw Error('private_database_required');}
 if(!info.isFile()||(info.mode&0o077)!==0)throw Error('private_database_required');
}

export function openBrainDatabase(file){
 requirePrivateDatabase(file);
 const db=new DatabaseSync(file,{enableForeignKeyConstraints:true});
 try{
  const columns=new Set(db.prepare('PRAGMA table_info(work_tickets)').all().map(x=>x.name));
  for(const name of ['id','owner_hash','context_json','request','created_at','updated_at','status']){
   if(!columns.has(name))throw Error('existing_brain_schema_required');
  }
  if(db.prepare('PRAGMA quick_check').get().quick_check!=='ok')throw Error('brain_database_integrity_failed');
  db.exec('PRAGMA busy_timeout=5000; PRAGMA synchronous=FULL');
 }catch(error){db.close();throw error;}
 let closed=false;
 const statements=new WeakMap();
 const ensureOpen=()=>{if(closed)throw Error('brain_database_closed');};
 function prepare(sql,args=[]){
  ensureOpen();
  const native=db.prepare(sql);
  const statement=Object.freeze({
   bind(...values){return prepare(sql,values);},
   async first(column){ensureOpen();const row=native.get(...args);return row?(column===undefined?row:row[column]??null):null;},
   async all(){ensureOpen();return {success:true,results:native.all(...args),meta:{}};},
   async run(){ensureOpen();const result=native.run(...args);return {success:true,results:[],meta:{changes:Number(result.changes),last_row_id:Number(result.lastInsertRowid)}};}
  });
  statements.set(statement,()=>{
   const result=native.run(...args);
   return {success:true,results:[],meta:{changes:Number(result.changes),last_row_id:Number(result.lastInsertRowid)}};
  });
  return statement;
 }
 return Object.freeze({prepare,
  async batch(batch){
   ensureOpen();
   if(!Array.isArray(batch)||batch.some(x=>!statements.has(x)))throw Error('invalid_brain_batch');
   db.exec('BEGIN IMMEDIATE');
   try{const results=batch.map(x=>statements.get(x)());db.exec('COMMIT');return results;}
   catch(error){db.exec('ROLLBACK');throw error;}
  },
  close(){if(!closed){closed=true;db.close();}}
 });
}
