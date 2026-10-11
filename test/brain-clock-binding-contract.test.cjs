const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const config=fs.readFileSync(path.join(__dirname,'../workers/infinity-brain-clock/wrangler.toml'),'utf8');
test('Brain Clock deployment retains verified D1, model and wallet bindings',()=>{
  assert.match(config,/binding\s*=\s*"WORK_DB"[\s\S]*database_name\s*=\s*"rogers-consensus"/);
  assert.match(config,/database_id\s*=\s*"4aa6a463-02c6-48c3-854f-a87c0ca5f41c"/);
  assert.match(config,/binding\s*=\s*"MODELS"[\s\S]*service\s*=\s*"infinity-rogers"[\s\S]*environment\s*=\s*"production"/);
  assert.match(config,/binding\s*=\s*"BOT_WALLET"[\s\S]*service\s*=\s*"unified-wallet"[\s\S]*environment\s*=\s*"production"/);
  assert.match(config,/class_name\s*=\s*"BrainClock"/);
  assert.match(config,/binding\s*=\s*"WRITER_AI"/);
});
test('No owner credential or wallet settlement secret is checked into the Worker TOML',()=>{
  const uncommented=config.split('\n').filter(line=>!/^\s*#/.test(line)).join('\n');
  assert.doesNotMatch(uncommented,/\b(?:BOT_WORK_SECRET|WRITER_OWNER_HASH)\s*=/);
  assert.doesNotMatch(uncommented,/Bearer\s+[A-Za-z0-9._-]{12,}/i);
});
