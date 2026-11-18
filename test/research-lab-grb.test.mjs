import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const page=name=>readFileSync(new URL(`../research-lab/${name}`, import.meta.url),'utf8');
test('GRB science lab has three source-backed accessible pages',()=>{
 for(const filename of ['index.html','esp32-grb.html','grb-history.html']){
  const html=page(filename);
  assert.match(html,/<!doctype html>/i);
  assert.match(html,/name="viewport"/);
  assert.match(html,/<main\b/);
  assert.match(html,/<h1\b/);
  assert.match(html,/href="\/bubbles\.html"/);
  assert.match(html,/href="\/research-lab\//);
 }
});
test('science claims separate nuclear events, cosmic bursts and electrical pulses',()=>{
 const protocol=page('esp32-grb.html');
 assert.match(protocol,/ESP32 does not detect gamma rays on its own/);
 assert.match(protocol,/external radiation detector/);
 assert.match(protocol,/cannot establish another person.s thoughts, identity, or intentions/);
 assert.match(protocol,/No reading proves or disproves a spiritual experience/);
 assert.match(protocol,/docs\.espressif\.com/);
 assert.match(protocol,/science\.nasa\.gov/);
});
test('historical cards link original institutional sources, not people in photos',()=>{
 const history=page('grb-history.html');
 for(const name of ['Vela','BATSE','Swift','Fermi','GCN','scintillation'])assert.ok(history.includes(name),name);
 for(const domain of ['science.nasa.gov','heasarc.gsfc.nasa.gov','fermi.gsfc.nasa.gov','gcn.nasa.gov','epa.gov'])assert.ok(history.includes(domain),domain);
 assert.doesNotMatch(history,/(?:<img|facial recognition|identify students|police detector)/i);
});
test('static source-only pages do not upload images, perform profiling or claim live measurement',()=>{
 for(const filename of ['index.html','esp32-grb.html','grb-history.html']){
  const html=page(filename);
  assert.doesNotMatch(html,/<form\b|<input\s+type="file"|fetch\(|getUserMedia|face-api|tensorflow/i);
  assert.doesNotMatch(html,/data-bubble-role="executor"/);
  assert.match(html,/source|Source/i);
 }
});