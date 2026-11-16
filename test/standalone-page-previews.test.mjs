import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const cases=[["test-ground-ai/index.html","test-ground-ai","/test-ground-ai/","Test Ground AI | Verify Bubbles Tools"],["avatarai/index.html","avatar-ai","/avatarai/","Avatar AI | QuantaPhi Project Guide"],["continuitybuilder/index.html","continuity-builder","/continuitybuilder/","GPT Continuity Builder | QuantaPhi"],["design-lab/index.html","design-lab","/design-lab/","Design Lab | QuantaPhi"],["pixie/index.html","pixie-stories","/pixie/","Pixie Stories | Original Storybook"],["bubbles-agent-workshop/index.html","agent-workshop","/bubbles-agent-workshop/","Bubbles Agent Workshop | QuantaPhi"],["project-workspace/index.html","project-workspace","/project-workspace/","Project Workspace | Code Phi + Create Phi"],["apps/index.html","chrome-apps","/apps/","Infinity Chrome Apps | QuantaPhi"],["resonance.html","resonance","/resonance.html","Infinity Resonance Calculator | QuantaPhi"],["quick-card-builder.html","quick-card-builder","/quick-card-builder.html","Create a Quick Card | QuantaPhi"],["gary/index.html","gary-family","/gary/","Gary & Family | Infinity Living Room"],["studio/index.html","sing-record","/studio/","Sing & Record | QuantaPhi Studio"],["terriphi/index.html","terriphi","/terriphi/","TerriPhi | Halloween Arcade"],["petriphi/index.html","petriphi","/petriphi/","PetriPhi | Halloween Art Studio"],["wireless/index.html","infinity-wireless","/wireless/","Infinity Wireless | Bubbles Planning"],["short-ad-lab.html","micro-ad-lab","/short-ad-lab.html","QuantaPhi Micro-Ad Lab | Original Concepts"]];
for(const [path,slug,route,title] of cases){
 test('original crawler-visible social preview for '+route,()=>{
  const html=fs.readFileSync(path,'utf8');
  const head=html.match(/<head\\b[^>]*>([\\s\\S]*?)<\\/head>/i)?.[1];
  assert.ok(head,'head must exist');
  const img='https://quantaphi.org/assets/share/pages/'+slug+'.png?v=20261115';
  const canonical='https://quantaphi.org'+route;
  for(const marker of ['property="og:title"','property="og:description"','property="og:image"','name="twitter:card" content="summary_large_image"','name="twitter:image"','name="twitter:title"','name="twitter:description"','content="'+img+'"','href="'+canonical+'"'])assert.ok(head.includes(marker),path+' missing '+marker);
  assert.ok(head.includes('content="'+title.replace(/&/g,'&amp;')+'"'),path+' unique title');
  assert.equal((head.match(/name="twitter:card"/g)||[]).length,1);
  assert.equal((head.match(/property="og:image"/g)||[]).length,1);
  assert.ok(!head.includes('/preview.png'),path+' generic artwork forbidden');
  const source='assets/share/pages/'+slug+'.svg';
  const raster='assets/share/pages/'+slug+'.png';
  assert.ok(fs.statSync(source).size>1300,'original artwork source required');
  assert.ok(fs.existsSync(raster),'actual PNG must be rendered before merge: '+raster);
  assert.ok(fs.statSync(raster).size>2000,'PNG must contain actual content');
 });
}
