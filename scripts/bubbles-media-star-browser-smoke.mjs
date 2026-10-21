/* A real Chromium DOM/browser check, not a synthetic unit mock, owner sign-in,
 * Android APK or proof of X audio. Uses only local public card assets.
 */
import {chromium} from 'playwright';
import {strict as assert} from 'node:assert';
import {writeFileSync,mkdirSync} from 'node:fs';
const origin=process.env.BUBBLES_LOCAL_ORIGIN||'http://127.0.0.1:8765';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
const results=[];
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
  results.push({probe:'bubbles_chat_spoken_command',status:'passed',card:'media-star',iframeRendered:true,playerLinkedToX:true});
  // Now execute a FOLLOW-UP ordinary tap. Bubbles must use its real action
  // adapter and must not fake in-chat X playback or open a paid replay.
  let externalPopups=0;
  chat.on('popup',()=>externalPopups++);
  await field.fill('Bubbles tap Play');
  await chat.locator('.ba-panel .ba-send').first().click();
  const last=chat.locator('.ba-panel .ba-message.ba-assistant').last();
  await last.waitFor({state:'visible',timeout:12000});
  const tapAnswer=await last.innerText();
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
 if(errors.length)results.push({probe:'public_host_page_errors',status:'observed',errors:errors.slice(0,8)});
}finally{
 mkdirSync('test-results',{recursive:true});
 writeFileSync('test-results/bubbles-media-star-browser.json',JSON.stringify({platform:'hosted chromium, local QuantaPhi public sources',audioVerified:false,androidDeviceVerified:false,results},null,2)+'\n');
 await browser.close();
}
console.log('Verified Media Star and Fred replay controls rendered inside real Chromium Bubbles chat; playback remains on X.');
