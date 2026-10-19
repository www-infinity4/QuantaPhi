'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.join(__dirname,'..');
const source=file=>fs.readFileSync(path.join(root,file),'utf8');
const cards=[
 ['physics-001','assets/julius-balloon-001.jpg'],
 ['physics-002','assets/julius-physics-002.png'],
 ['physics-003','assets/julius-physics-003.png'],
 ['physics-004','assets/julius-physics-004.png'],
 ['physics-005','assets/julius-physics-005.png'],
 ['physics-006','assets/julius-physics-006.png']
];

test('every built physics card has local artwork',()=>{
 const js=source('infinity-concepts.js');
 assert.doesNotThrow(()=>new vm.Script(js));
 assert.doesNotMatch(js,/e\.id==='physics-001'/);
 for(const [id,file] of cards){
  assert.ok(js.includes("'"+id+"':'/"+file+"'"),id+' must be mapped to '+file);
  assert.ok(fs.statSync(path.join(root,file)).size>100000,file+' should be a real card image');
 }
 assert.match(js,/image\.addEventListener\('error'/);
 assert.match(js,/media:absoluteArt\(e\)/);
});
