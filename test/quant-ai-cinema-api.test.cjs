const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const api=require('../cinema-reel-core.js');
const plan=JSON.parse(fs.readFileSync(path.join(__dirname,'..','production','quant-ai-commercial.json'),'utf8'));

test('Quant AI instructions reference the real existing timeline API without invented export functions',()=>{
 assert.deepEqual(Object.keys(api).sort(),['seconds','captions','matches','clip','finalizeWebM'].sort());
 assert.equal(typeof api.finalizeWebM,'function');
 assert.equal(typeof api.exportVideo,'undefined');
 assert.equal(typeof api.exportV,'undefined');
 const task=plan.jobs.find(x=>x.id==='TASK-2');
 assert.match(task.instructions,/quant-ai-cinema-api\.md/);
 assert.match(task.instructions,/MediaRecorder canvas export directly/);
 assert.match(task.instructions,/NOT exportVideo\/exportV/);
});
test('timeline metadata helper never pretends to record or encode video',async()=>{
 const blob=new Blob(['not-webm'],{type:'video/mp4'});
 assert.equal(await api.finalizeWebM(blob,35),blob);
});
