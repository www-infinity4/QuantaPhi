'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const base='https://quantaphi.org';
async function live(path){
  const url=base+path+(path.includes('?')?'&':'?')+'qa='+Date.now().toString();
  const response=await fetch(url,{redirect:'follow',headers:{Accept:'text/html,text/css,*/*','Cache-Control':'no-cache'},signal:AbortSignal.timeout(20000)});
  const text=await response.text();
  assert.equal(response.status,200, 'Live '+url+' status='+response.status+' '+text.slice(0,150));
  assert.ok(text.length>70,'Empty response '+url);
  return {text,headers:response.headers};
}
test('live QuantaPhi homepage leads to Bubbles',async()=>{
 const {text}=await live('/');
 assert.match(text,/class="q-bubbles-entry"/);
 assert.match(text,/href="\/bubbles\.html">Open Bubbles/);
 assert.match(text,/href="\/bubbles-chrome\.html">Install in Chrome/);
});
test('live Bubbles landing leads to functioning workspace before unreleased films',async()=>{
 const {text}=await live('/bubbles.html');
 assert.match(text,/class="bubbles-workspace"/);
 assert.ok(text.indexOf('id="bubblesAICard"')<text.indexOf('class="bubbles-development"'));
 assert.match(text,/Film and commercial development · not released/);
 assert.match(text,/bubbles-product\.css/);
 assert.doesNotMatch(text,/aria-label="Finished Bubbles commercial"/);
});
test('live Chrome install retains button and linked product styles',async()=>{
 const {text}=await live('/bubbles-chrome.html');
 assert.match(text,/id="bubblesInstallChrome"/);
 assert.match(text,/bubbles-product\.css/);
 const styles=(await live('/bubbles-product.css')).text;
 assert.match(styles,/color:#fff!important/);
 assert.match(styles,/\.bubbles-actions a:visited/);
});
test('old live homepage and Bubbles commit pin not deployed',async()=>{
 const html=await live('/bubbles/');
 assert.match(html.text,/class="bubbles-workspace"/);
 assert.doesNotMatch(html.text,/aria-label="Finished Bubbles commercial"/);
});
