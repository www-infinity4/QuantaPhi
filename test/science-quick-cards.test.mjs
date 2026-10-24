import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SCIENCE_CARDS,scienceCard,scienceCardValid} from '../science-quick-cards.mjs';
const root=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
test('five independent Muse, Webb and science/technology cards use valid primary HTTPS links',()=>{
 assert.deepEqual(SCIENCE_CARDS.map(x=>x.id),['muse-ai','webb','nasa-science','ars-science','ars-technology']);
 assert.equal(new Set(SCIENCE_CARDS.map(x=>x.id)).size,SCIENCE_CARDS.length);
 for(const c of SCIENCE_CARDS){
  assert.ok(scienceCardValid(c),c.id);assert.equal(scienceCard(c.id),c);
  assert.ok(c.role.length>45);assert.ok(c.description.length>60);
 }
 assert.equal(scienceCard('invented-card'),null);
 assert.equal(scienceCardValid({id:'invalid',url:'http://not-secure.example'}),false);
});
test('real NASA and Meta URLs are source actions rather than fabricated feeds',()=>{
 assert.equal(scienceCard('muse-ai').url,'https://muse.ai/');
 assert.equal(scienceCard('webb').url,'https://science.nasa.gov/mission/webb/multimedia/images/');
 const script=root('science-quick-cards.mjs');
 assert.match(script,/Bubbles specialist/);
 assert.match(script,/No private site monitoring|cannot watch or modify a private Muse account/);
 assert.match(script,/document\.createElement\('script'\)/);
 assert.match(script,/src='\/bubbles-embed\.js'/);
 assert.match(script,/type='button'/);
 assert.match(script,/Copy the draft into the Bubbles specialist chat/);
 assert.doesNotMatch(script,/localStorage\.|document\.cookie|OAuth|setInterval\(|fetch\(/);
});
test('home, source detail, Oracle rotation and Bubbles catalog expose the cards',()=>{
 assert.match(root('index.html'),/id="scienceQuickCards"/);
 assert.match(root('index.html'),/science-quick-cards\.mjs\?v=/);
 assert.match(root('science-quick-card.html'),/id="scienceQuickDetail"/);
 assert.match(root('oracle-card-deck.js'),/\['scienceQuickCards','Muse AI, NASA Webb/);
 for(const id of ['muse-ai','nasa-webb','nasa-science','ars-science','ars-tech'])
  assert.ok(root('bubbles-card-catalog.mjs').includes("app('"+id+"'"));
 assert.match(root('science-quick-cards.mjs'),/classList\.add\('inPageSite'\)/);
});
