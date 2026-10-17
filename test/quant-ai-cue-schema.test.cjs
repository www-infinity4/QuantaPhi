const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=name=>JSON.parse(fs.readFileSync(path.join(__dirname,'..','production',name),'utf8'));
const spec=read('quant-ai-commercial.schema.json');
const production=read('quant-ai-commercial.json');

test('44 Quant AI cues have documented, unambiguous field names and defaults',()=>{
 const cueSpec=spec.properties.scenes.items;
 assert.equal(production.scenes.length,44);
 assert.equal(cueSpec.additionalProperties,false);
 assert.deepEqual(cueSpec.required,['id','title','lyric_marker','action','start_seconds']);
 assert.equal(cueSpec.properties.start_seconds.default,null);
 assert.deepEqual(cueSpec.properties.start_seconds.type,['number','null']);
 for(const [index,cue] of production.scenes.entries()){
  assert.equal(cue.id,'CUE-'+(index+1));
  assert.deepEqual(Object.keys(cue).sort(),[...cueSpec.required].sort());
  assert.ok(cue.title&&cue.action&&cue.lyric_marker);
  assert.ok(cue.start_seconds===null||(Number.isFinite(cue.start_seconds)&&cue.start_seconds>=0));
 }
});
test('production jobs explicitly point the Yellow, Green, Pink readers at the saved cue schema',()=>{
 assert.equal(production.cue_schema_path,'production/quant-ai-commercial.schema.json');
 assert.equal(production.jobs.length,3);
 for(const job of production.jobs){
  assert.match(job.instructions,/production\/quant-ai-commercial\.schema\.json/);
  assert.match(job.instructions,/Do not block on owner_input_required/);
 }
 assert.deepEqual(production.jobs.map(j=>j.dependencies),[[],['TASK-1'],['TASK-1','TASK-2']]);
});
