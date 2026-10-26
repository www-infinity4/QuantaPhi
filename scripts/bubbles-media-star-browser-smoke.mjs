/* A real Chromium DOM/browser check, not a synthetic unit mock, owner sign-in,
 * Android APK or proof of X audio. Uses only local public card assets.
 */
import {chromium} from 'playwright';
import {strict as assert} from 'node:assert';
import {writeFileSync,mkdirSync} from 'node:fs';
const origin=process.env.BUBBLES_LOCAL_ORIGIN||'http://127.0.0.1:8765';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
const results=[];
// The card behavior is tested behind a synthetic, server-shaped account gate.
// This fixture never authenticates a person or grants production owner access.
async function prepareSyntheticSignedIn(page){
 const token='sq_'+'t'.repeat(40);
 await page.addInitScript(value=>{
  window.QuantaCloudConnectionDisableAutoRecovery=true;
  window.QuantaCloudConnection={ready:Promise.resolve(),resolveDeviceToken:async()=>value};
 },token);
 await page.route('**/cloud-wallet-client.js*',route=>route.fulfill({contentType:'application/javascript',body:''}));
 await page.route('**/robot-brain-owner.js*',route=>route.fulfill({contentType:'application/javascript',body:''}));
 await page.route('**/api/bubbles/connections/gate/status',route=>route.fulfill({
  status:200,contentType:'application/json',body:JSON.stringify({ok:true,ready:true,mode:'required',
   integra:{status:'passed'},providers:{
    github:{configured:true,connected:true,permissionsApproved:true,label:'Synthetic GitHub'},
    cloudflare:{configured:true,connected:true,permissionsApproved:true,label:'Synthetic Cloudflare'}
   }})
 }));
}
try{
 const page=await browser.newPage({viewport:{width:390,height:844},permissions:[]});
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message.slice(0,220)));
 const start=await page.goto(origin+'/bubbles-card-host.html?card=media-star',{waitUntil:'domcontentloaded',timeout:25000});
 assert.equal(start.status(),200,'card host must return OK');
 await page.waitForFunction(()=>window.BubblesCardDiagnostics?.().loaded===true,{timeout:20000});
 assert.equal(await page.locator('#fredSpacesRadio .fs-media-star').count(),1,'Fred player must render');
 assert.equal(await page.locator('#followingSpacesRadio .fsr-person-picker').count(),1,'Media Star person picker must render');
 const replay=page.locator('#fredSpacesRadio .fs-play');
 assert.equal(await replay.count(),1,'Fred replay control must be present');
 const url=await replay.getAttribute('href');
 assert.match(url,/^https:\/\/(?:www\.)?(?:x|twitter)\.com\/i\/spaces\//);
 assert.equal(await page.locator('#fredSpacesRadio audio').count(),0,'No invented audio player');
 const diag=await page.evaluate(()=>window.BubblesCardDiagnostics?.());
 assert.equal(diag.loaded,true);assert.equal(diag.id,'media-star');
 results.push({probe:'direct_card_host',status:'passed',card:diag.id,fredReplayLink:url,audioHosted:false,controlsVerified:true});
 // Also verify the actual Bubbles chat submission, not just a card URL.
 const chat=await browser.newPage({viewport:{width:390,height:844},permissions:[]});
 let chatError='';
 try{
  await prepareSyntheticSignedIn(chat);
  const response=await chat.goto(origin+'/bubbles.html',{waitUntil:'domcontentloaded',timeout:25000});
  assert.equal(response.status(),200);
  await chat.locator('.ba-launcher').first().waitFor({state:'attached',timeout:20000});
  await chat.locator('.ba-launcher').first().click({timeout:9000});
  const field=chat.locator('.ba-panel textarea[aria-label="Message Bubbles"]').first();
  await field.waitFor({state:'visible',timeout:10000});
  await field.fill('Bubbles, bring the Media Star card into chat so I can listen to Fred\'s Space');
  await chat.locator('.ba-panel .ba-send').first().click();
  const workspace=chat.locator('.ba-panel .ba-card-workspace');
  await workspace.waitFor({state:'visible',timeout:20000});
  assert.match(await workspace.locator('h3').innerText(),/Media Star/i);
  await workspace.locator('iframe[title="Media Star"]').waitFor({state:'attached',timeout:20000});
  const nested=chat.frameLocator('.ba-panel .ba-card-workspace iframe[title="Media Star"]');
  await nested.locator('#fredSpacesRadio .fs-media-star').waitFor({state:'visible',timeout:20000});
  assert.equal(await nested.locator('#followingSpacesRadio .fsr-person-picker').count(),1);
  assert.match(await workspace.locator('p[role="status"]').first().innerText(),/open in chat/i);
  results.push({probe:'bubbles_chat_spoken_command',status:'passed',card:'media-star',iframeRendered:true,playerLinkedToX:true,accountGate:'synthetic'});
  // Now execute a FOLLOW-UP ordinary tap. Bubbles must use its real action
  // adapter and must not fake in-chat X playback or open a paid replay.
  let externalPopups=0;
  chat.on('popup',()=>externalPopups++);
  await chat.waitForFunction(()=>document.querySelector('.ba-panel .ba-send')?.disabled===false,{timeout:12000});
  const before=await chat.locator('.ba-panel .ba-message.ba-assistant').count();
  await field.fill('Bubbles tap Play');
  await chat.locator('.ba-panel .ba-send').first().click();
  await chat.waitForFunction(
   count=>document.querySelectorAll('.ba-panel .ba-message.ba-assistant').length>count,
   before,{timeout:12000});
  const tapAnswer=await chat.locator('.ba-panel .ba-message.ba-assistant').nth(before).innerText();
  assert.match(tapAnswer,/original X replay|original X.*replay/i);
  assert.match(tapAnswer,/no in-chat audio|no audio playback/i);
  assert.equal(externalPopups,0,'outside publisher playback cannot open without a user tap');
  results.push({probe:'bubbles_action_driver_fred_play',status:'passed',externalPopups,actualReply:tapAnswer.slice(0,200),audioVerified:false});
 }catch(error){
  chatError=String(error?.message||error).slice(0,450);
  results.push({probe:'bubbles_chat_spoken_command',status:'failed',reason:chatError});
  await chat.screenshot({path:'/tmp/bubbles-media-star-chat-failure.png'}).catch(()=>{});
 }
 await chat.close();
 if(chatError)throw Error('Bubbles chat could not open the Media Star player: '+chatError);

 // A disposable radio fixture isolates iframe lifecycle from external streams.
 // A browser reload loses its clicked state, reproducing the hosted radio bug.
 const radio=await browser.newPage({viewport:{width:390,height:844}});
 let radioLoads=0;
 await radio.route(origin+'/infinity-radio/',async route=>{
  radioLoads++;
  await route.fulfill({contentType:'text/html',body:'<!doctype html><title>Radio lifecycle fixture</title><header id="site-header">Full website navigation</header><main class="player"><button id="play-btn" onclick="document.body.dataset.played=\'yes\'">Play</button></main><footer>Website footer</footer>'});
 });
 await prepareSyntheticSignedIn(radio);
 await radio.goto(origin+'/bubbles.html',{waitUntil:'domcontentloaded',timeout:25000});
 await radio.locator('.ba-launcher').first().click({timeout:15000});
 const radioField=radio.locator('.ba-panel textarea[aria-label="Message Bubbles"]').first();
 await radioField.fill('Play Infinity Radio');
 await radio.locator('.ba-panel .ba-send').first().click();
 await radio.waitForFunction(()=>document.querySelector('.ba-card-workspace')?.textContent.includes('Playback requested')&&!document.querySelector('.ba-panel .ba-send')?.disabled,{timeout:25000});
 const radioFrame=radio.frameLocator('iframe[title="Infinity Radio"]');
 await radioFrame.locator('body[data-played="yes"]').waitFor({state:'attached',timeout:5000});
 assert.equal(radioLoads,1,'chat must not reload the radio after clicking Play');
 assert.equal(await radioFrame.locator('#site-header').isVisible(),false,'card hides site navigation');
 assert.equal(await radioFrame.locator('#play-btn').isVisible(),true,'actual player remains visible');
 await radio.locator('.ba-card-toolbar button').filter({hasText:'Open webpage'}).click();
 const full=radio.frameLocator('iframe[title="Infinity Radio"]:not([hidden])');
 await full.locator('#site-header').waitFor({state:'visible',timeout:15000});
 assert.equal(radioLoads,2,'full webpage has a separate frame');
 results.push({probe:'radio_playback_survives_chat_reply',status:'passed',radioLoads,playControlClicked:true,audioVerified:false});
 await radio.close();

 if(errors.length)results.push({probe:'public_host_page_errors',status:'observed',errors:errors.slice(0,8)});
}finally{
 mkdirSync('test-results',{recursive:true});
 writeFileSync('test-results/bubbles-media-star-browser.json',JSON.stringify({platform:'hosted chromium, local QuantaPhi public sources, synthetic required account gate',audioVerified:false,androidDeviceVerified:false,results},null,2)+'\n');
 await browser.close();
}
console.log('Verified Media Star and Fred replay controls rendered inside real Chromium Bubbles chat; playback remains on X.');
