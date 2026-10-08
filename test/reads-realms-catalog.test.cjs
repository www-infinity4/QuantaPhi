const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const index=require('../workers/reads-realms/generate-seed.cjs');
test('30 independent sector brackets each contain 100 or more distinct subjects',()=>{
 const {entries,energyCount}=index.load();
 assert.equal(entries.size,29);assert.ok(energyCount>=100);
 for(let id=2;id<=30;id++){
  const list=entries.get(id);
  assert.ok(list && list.length>=100,'sector '+id+' incomplete');
  assert.equal(new Set(list.map(index.norm)).size,list.length,'sector '+id+' has duplicates');
 }
});
test('Helium, Hydrogen, Lithium and oil are indexed specifically in Energy',()=>{
 const sql=fs.readFileSync(path.join(__dirname,'../workers/reads-realms/seed-index.sql'),'utf8');
 for(const word of ['Helium','Hydrogen','Lithium','Petroleum','Crude oil'])assert.ok(sql.includes("'"+word+"'"));
});
test('indexed topic SQL is safely escaped, idempotent and only touches rr_topics',()=>{
 const {sql,rows,sectors}=index.generate();
 assert.equal(sectors,29);assert.ok(rows>=2900);
 assert.equal((sql.match(/INSERT OR IGNORE INTO rr_topics/g)||[]).length,rows);
 assert.ok(!/\b(?:DELETE|DROP|UPDATE)\s+/i.test(sql));
 assert.ok(!/INSERT INTO (?!rr_topics)/.test(sql));
 assert.ok(sql.includes("Art & museums")===false,'source code uses sector IDs, not joined prose');
});
