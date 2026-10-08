#!/usr/bin/env node
// Rebuild/review the source-controlled expansion of the isolated D1 word index.
// Usage: node workers/reads-realms/generate-seed.cjs > additional-sector-topics.sql
// Requires Node only; prints SQL, never connects to production or Cloudflare.
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const base=__dirname;
const paths=['sectors-02-06.json','sectors-07-12.json','sectors-13-18.json','sectors-19-24.json','sectors-25-30.json'];
const norm=v=>String(v).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,' ').trim();
const esc=v=>String(v).replace(/'/g,"''");
function load(){
 const entries=new Map();
 for(const name of paths){
  const source=JSON.parse(fs.readFileSync(path.join(base,'topics',name),'utf8'));
  for(const [key,terms] of Object.entries(source.sectors)){
   const sector=Number(key);
   if(sector<2||sector>30||!Number.isInteger(sector)||entries.has(sector))throw Error('Invalid or repeated sector '+key);
   if(!Array.isArray(terms)||terms.length<100)throw Error('Sector '+sector+' under 100 topics');
   const known=new Set();
   for(const term of terms){
    const normalized=norm(term);
    if(!normalized||known.has(normalized)||normalized.length>150)throw Error('Duplicate/invalid '+sector+' '+term);
    known.add(normalized);
   }
   entries.set(sector,terms);
  }
 }
 if(entries.size!==29)throw Error('29 sector files required, got '+entries.size);
 const energySql=fs.readFileSync(path.join(base,'seed-index.sql'),'utf8');
 const energyCount=(energySql.match(/INSERT OR IGNORE INTO rr_topics\(sector_id,term,normalized,origin,reviewed\) VALUES \(1,/g)||[]).length;
 if(energyCount<100)throw Error('Energy vocabulary has fewer than 100 subjects: '+energyCount);
 return {entries,energyCount};
}
function generate(){
 const {entries,energyCount}=load();
 const lines=['-- Generated idempotent topic expansion for the isolated Infinity Reads & Realms D1 database.',
  '-- Run schema.sql and seed-index.sql first; no existing tables are deleted.',
  '-- Energy terms: '+energyCount,'-- Remaining sectors: '+entries.size];
 let rows=0;
 for(const [sector,terms] of [...entries].sort((a,b)=>a[0]-b[0])){
  lines.push('-- Sector '+sector+' ('+terms.length+' curated subjects)');
  for(const term of terms){
   lines.push("INSERT OR IGNORE INTO rr_topics(sector_id,term,normalized,origin,reviewed) VALUES ("+
    sector+",'"+esc(term)+"','"+esc(norm(term))+"','editorial_sector_seed',1);");
   rows++;
  }
 }
 return {sql:lines.join('\n')+'\n',rows,sectors:entries.size,energyCount};
}
if(require.main===module){
 try{ const result=generate();process.stdout.write(result.sql); }
 catch(error){console.error(error.message);process.exitCode=1}
}
module.exports={load,generate,norm};
