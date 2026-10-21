import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {semanticDecision,validateSemanticDecision} from '../workers/bubbles-tools/semantic-intent.mjs';
const root='android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/';
const source=p=>fs.readFileSync(p,'utf8');
const catalog=[{id:'media-star',title:'Media Star',aliases:['fred radio']},{id:'fred-spaces',title:'Fred Spaces',aliases:['Fred Krueger']},{id:'infinity-radio',title:'Infinity Radio',aliases:['radio']}];

test('model interprets natural requests using real registered catalog instead of magic spoken words',async()=>{
 const transcripts=[
  ['I feel like hearing one of Fred\'s old Spaces tonight.',{kind:'play_card',cardId:'fred-spaces',confidence:.95}],
  ['Could you get that Media Star player here? I want to listen.',{kind:'open_card',cardId:'media-star',confidence:.93}],
  ['Show me what is happening on my actual Android display.',{kind:'phone_read',confidence:.92}]
 ];
 for(const [request,proposal] of transcripts){
  let called=false;
  const result=await semanticDecision({request,cards:catalog},async options=>{
   called=true;
   assert.match(JSON.stringify(options.messages),/registeredCards/);
   return {response:JSON.stringify(proposal)};
  });
  assert.equal(called,true);
  assert.deepEqual(result,proposal);
 }
});

test('unknown, confused, paid and invented tools cannot escape the semantic allowlist',async()=>{
 for(const reply of [
  '{"kind":"git_write","confidence":1,"repository":"www-infinity4/QuantaPhi"}',
  '{"kind":"open_card","cardId":"a-made-up-card","confidence":.99}',
  '{"kind":"open_card","cardId":"media-star","confidence":.5}',
  '{"kind":"tap","target":8,"confidence":1}',
  '{"kind":"none","confidence":1}',
  'I clicked the button',
  '<function call="github.create_repository"/>'
 ])assert.deepEqual(validateSemanticDecision(reply,catalog),{kind:'none'},reply);
 assert.deepEqual(validateSemanticDecision('{"kind":"open_card","cardId":"media-star","confidence":.98}',catalog),
  {kind:'open_card',cardId:'media-star',confidence:.98});
});

test('native overlay follows XRecorder-like edge dock and persists only after granted startup',()=>{
 const service=source(root+'BubblesService.java');
 const activity=source(root+'MainActivity.java');
 const panel=source(root+'FloatingOracleWindow.java');
 const manifest=source('android/bubbles-overlay/app/src/main/AndroidManifest.xml');
 assert.match(service,/EdgeDockPolicy.edgeX\(dockRight/);
 assert.match(service,/EdgeDockPolicy.dragX\(startX/);
 assert.match(service,/getBoolean\("orb_dock_right", true\)/);
 assert.match(service,/getInt\("orb_dock_y", 240\)/);
 assert.match(service,/setAlpha\(\.8f\)/);
 assert.match(service,/beginListening\(\)/);
 assert.match(service,/if\(!moved\)/);
 assert.match(activity,/getBoolean\("orb_auto_resume", true\)/);
 assert.match(activity,/if \(canTalk\(\) && !BubblesService.isSessionRunning\(\)/);
 assert.match(service,/putBoolean\("orb_auto_resume", false\)/);
 assert.match(panel,/Button bottomClose = button\("✕", false\)/);
 assert.match(panel,/bottomClose.setOnClickListener\(v -> hide\(\)\)/);
 assert.match(panel,/void hide\(\) \{[\s\S]*?root\.setVisibility\(View\.GONE\)/);
 assert.match(manifest,/SYSTEM_ALERT_WINDOW/);
 assert.match(manifest,/RECORD_AUDIO/);
 assert.doesNotMatch(manifest,/BOOT_COMPLETED|RECEIVE_BOOT_COMPLETED/);
});

test('frontend verifies selected registered tool and never executes model-proposed ownership or writes',()=>{
 const web=source('bubbles-ai.js'),worker=source('workers/bubbles-tools/worker.mjs');
 const card=source('bubbles-card-workspace.mjs');
 assert.match(worker,/url\.pathname==='\/v1\/intent'/);
 assert.match(worker,/semanticDecision\(body/);
 assert.match(worker,/executed:false,permissionGranted:false/);
 assert.match(web,/\/v1\/intent/);
 assert.match(web,/decision\.kind==='phone_read'/);
 assert.match(web,/module\.cards\.find\(c=>c\.id===decision\.cardId\)/);
 assert.match(web,/workspace\.handle\(\{action:decision\.kind==='play_card'\?'play':'open',card:target\}\)/);
 assert.match(card,/export \{cardIntent,cards\};/);
});
