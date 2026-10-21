// Real Chromium acceptance on local sources. No owner credentials or live writes.
import {chromium} from 'playwright';
import {strict as assert} from 'node:assert';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {cards} from '../bubbles-card-catalog.mjs';
const origin=process.env.BUBBLES_LOCAL_ORIGIN||'http://127.0.0.1:8765';
const report={source:'local repository in Chromium',physicalAndroidVerified:false,liveOwnerSessionVerified:false,
 components:cards.map(card=>({id:card.id,repository:card.repository,url:card.url,
  assetsVerified:[...(card.scripts||[]),...(card.styles||[])].every(existsSync),
  opening:'not_exercised',tapping:'not_exercised',generation:'not_exercised'})),tests:[]};
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 // Deterministic local UI coverage: no paid generation, private account or
 // external provider request is needed to enumerate and tap these controls.
 await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.fulfill({status:503,body:'External network excluded from local component test'}));
 await page.goto(origin+'/bubbles-card-host.html?card=story-writer');
 await page.waitForFunction(()=>window.BubblesCardDiagnostics?.().loaded===true);
 const result=await page.evaluate(async()=>{
  const {CardWorkspace}=await import('/bubbles-card-workspace.mjs');
  const {findCard}=await import('/bubbles-card-catalog.mjs');
  const {resolveToolAction}=await import('/bubbles-action-driver.mjs');
  const host=document.createElement('section');document.body.append(host);
  const workspace=new CardWorkspace(host);
  await workspace.open(findCard('Story Writer'),false);
  const doc=workspace.active.frame.contentDocument;
  const toggle=doc.querySelector('#sw-view-stories');
  const before=toggle.getAttribute('aria-expanded');
  const action=resolveToolAction('Could you tap View Stories in this card?',{activeCard:'Story Writer'});
  const receipt=await workspace.pressControl(action.label);
  const after=toggle.getAttribute('aria-expanded');
  const diagnostic=workspace.diagnose().snapshot;
  // A real embedded same-origin viewer, with an accessible-name-only button.
  const viewer=doc.createElement('iframe');
  viewer.srcdoc='<span id="label">Expand details</span><button aria-labelledby="label" aria-expanded="false" onclick="this.setAttribute(\'aria-expanded\',\'true\')">+</button>';
  const loaded=new Promise(resolve=>viewer.onload=resolve);doc.body.append(viewer);await loaded;
  const nested=await workspace.pressControl('Expand details');
  const nestedChanged=viewer.contentDocument.querySelector('button').getAttribute('aria-expanded');
  const duplicate=doc.createElement('button');duplicate.textContent='Expand details';doc.body.append(duplicate);
  const ambiguous=await workspace.pressControl('Expand details');duplicate.remove();
  const button=viewer.contentDocument.querySelector('button');button.setAttribute('aria-disabled','true');
  const disabled=await workspace.pressControl('Expand details');
  const denied=await workspace.pressControl('Delete all');
  const hidden=doc.createElement('button');hidden.textContent='Hidden action';hidden.style.visibility='hidden';doc.body.append(hidden);
  const hiddenReceipt=await workspace.pressControl('Hidden action');
  const foreign=doc.createElement('iframe');foreign.setAttribute('sandbox','allow-scripts');foreign.srcdoc='<button>External control</button>';
  const foreignLoaded=new Promise(resolve=>foreign.onload=resolve);doc.body.append(foreign);await foreignLoaded;
  const external=await workspace.pressControl('External control');
  return {before,after,receipt,diagnostic, nested,nestedChanged,ambiguous,disabled,denied,hiddenReceipt,external};
 });
 assert.equal(result.receipt.status,'safe_click');assert.notEqual(result.before,result.after);
 assert.equal(result.after,'true');
 assert.ok(result.diagnostic.controls.some(c=>/Stories/i.test(c.label)&&c.visible));
 assert.equal(result.nested.status,'safe_click');assert.equal(result.nestedChanged,'true');
 assert.equal(result.ambiguous.status,'control_ambiguous');
 assert.equal(result.disabled.status,'control_not_found');assert.equal(result.denied.status,'manual_approval_required');
 assert.equal(result.hiddenReceipt.status,'control_not_found');assert.equal(result.external.status,'control_not_found');
 report.tests.push({name:'Story Writer ordinary request → actual control → observed expanded state',status:'passed',before:result.before,after:result.after},
  {name:'same-origin viewer accessible button tap',status:'passed',after:result.nestedChanged},
  {name:'duplicate, disabled, hidden, external and sensitive controls do not execute',status:'passed'});
 Object.assign(report.components.find(c=>c.id==='story-writer'),{opening:'passed',tapping:'passed',generation:'not_exercised'});
 mkdirSync('test-results',{recursive:true});
 await page.screenshot({path:'test-results/bubbles-component-tap.png',fullPage:true});
 // Open every locally mounted catalog component and enumerate the same controls
 // the tap adapter sees. Provider generation/payment is deliberately separate.
 for(const card of cards.filter(card=>card.mount)){
  const entry=report.components.find(item=>item.id===card.id);
  const probe=await browser.newPage({viewport:{width:390,height:844}});
  await probe.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.fulfill({status:503,body:'External service excluded from local inspection'}));
  try{
   await probe.goto(origin+card.url,{waitUntil:'domcontentloaded',timeout:12000});
   await probe.waitForFunction(()=>window.BubblesCardDiagnostics?.().loaded===true,null,{timeout:6000});
   const observed=await probe.evaluate(async()=>{
    const {safeCardControls}=await import('/bubbles-action-driver.mjs');
    return {diagnostic:window.BubblesCardDiagnostics(),controls:safeCardControls(document).map(({label,disabled,visible,tag})=>({label,disabled,visible,tag}))};
   });
   entry.opening='passed';entry.inspection='passed';entry.controls=observed.controls;
  }catch(error){entry.opening='failed';entry.error=String(error.message).slice(0,300);}
  finally{await probe.close();}
 }
 assert.deepEqual(report.components.filter(item=>item.opening==='failed').map(item=>item.id),[], 'Every locally mounted component must open; see JSON errors');
}catch(error){report.tests.push({name:'component browser acceptance',status:'failed',error:String(error.message)});throw error;}
finally{mkdirSync('test-results',{recursive:true});writeFileSync('test-results/bubbles-components.json',JSON.stringify(report,null,2));await browser.close();}
console.log('Component inventory recorded; Story Writer and embedded viewer taps changed actual DOM state. Unexercised components remain explicitly marked.');
