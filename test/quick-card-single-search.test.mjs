import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=(file)=>readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('action toolbar honors the existing explicit no-generic-search contract',()=>{
 const actions=source('quanta-card-actions.mjs');
 assert.match(actions,/if\(options\.showSearch!==false\)mountTinyFishCardReader\(bar,card\)/);
 assert.match(actions,/bar\.append\(status\);host\.append\(bar\);return bar/);
 assert.match(actions,/const follow=b\(/);
 assert.match(actions,/const collect=b\(/);
});

test('TikTok and YouTube lead with in-card player and one optional discovery lookup',()=>{
 const experience=source('quanta-card-experience.mjs');
 assert.match(experience,/if\(id==='youtube'\|\|id==='tiktok'\)\{/);
 assert.match(experience,/mediaPlayer\(root,id\)/);
 assert.match(experience,/const discover=node\('details','qcx-discover-details'\)/);
 assert.match(experience,/if\(searchTool\(discover,card\)\)/);
 assert.match(experience,/mountCardActions\(root,card,\{showSearch:false\}\)/);
 assert.match(source('quanta-card-experience.css'),/qcx-discover-details summary/);
});

test('source cards with direct search never duplicate a generic TinyFish input',()=>{
 const experience=source('quanta-card-experience.mjs');
 assert.match(experience,/const alreadyHasSearch=searchTool\(root,card\)/);
 assert.match(experience,/showSearch:!alreadyHasSearch&&!liveSourceProfile\(id\)/);
 assert.match(experience,/searchTool\(root,card\);mountCardActions\(root,card,\{showSearch:false\}\);return/);
 // Non-search toolbar actions remain reachable on the same original card.
 assert.match(source('quanta-card-actions.mjs'),/mountCardActions/);
});
