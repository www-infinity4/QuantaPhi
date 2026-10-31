/* Real local Chromium acceptance of fresh-on-open Bubbles conversation lifecycle.
 * Tests DOM, localStorage, sessionStorage and deliberate History navigation.
 * No owner login, Cloudflare Worker, native mic, or paid GitHub tool is called.
 */
import {chromium} from 'playwright';
import {strict as assert} from 'node:assert';
import {mkdirSync,writeFileSync} from 'node:fs';
const origin=process.env.BUBBLES_LOCAL_ORIGIN||'http://127.0.0.1:8765';
const key='quantaphi:bubbles:threads:v2';
const oldId='bubbles_shared_main_v1';
const oldText='PRESERVED_OLD_GITHUB_TOOL_LIMIT_RESPONSE';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const results=[];
try{
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.addInitScript(({key,oldId,oldText})=>{
  if(location.pathname!=='/bubbles.html')return;
  const entries=[{id:oldId,title:'Earlier saved chat',updated:1000}];
  if(!localStorage.getItem(key))
   localStorage.setItem(key,JSON.stringify(entries));
  if(!localStorage.getItem(key+':'+oldId))
   localStorage.setItem(key+':'+oldId,JSON.stringify([
    {id:'saved_old_message_0001',role:'assistant',text:oldText,at:1000}
   ]));
  if(!sessionStorage.getItem(key+':tab'))
   sessionStorage.setItem(key+':tab',oldId);
  if(!sessionStorage.getItem(key+':tab:explicit'))
   sessionStorage.setItem(key+':tab:explicit','1');
 },{key,oldId,oldText});
 const page=await context.newPage();
 const resp=await page.goto(origin+'/bubbles.html',{waitUntil:'domcontentloaded',timeout:25000});
 assert.equal(resp.status(),200);
 await page.locator('.ba-launcher').waitFor({state:'attached',timeout:20000});
 const before=await page.evaluate(key=>sessionStorage.getItem(key+':tab'),key);
 assert.match(before,/^chat_[a-f0-9]{32}$/);
 assert.notEqual(before,oldId);
 await page.locator('.ba-launcher').click({timeout:15000});
 await page.locator('.ba-panel textarea[aria-label="Message Bubbles"]').waitFor({state:'visible',timeout:10000});
 assert.equal((await page.locator('.ba-messages').innerText()).includes(oldText),false);
 results.push({probe:'startup_after_saved_session',status:'passed',previousVisible:false,uniqueNewSession:true});
 // The owner may intentionally reopen old history, with no deleted data.
 await page.locator('.ba-conversation-folders > summary').click();
 const old=page.locator('.ba-folder-entry[data-session-id="'+oldId+'"]');
 await old.waitFor({state:'attached',timeout:10000});
 await old.click();
 // Cloud History may take up to 12s to fail over to the verified device copy.
 // Keep the real DOM assertion; on failure report the visible state rather than
 // treating a click as successful or silently skipping the History check.
 try{
  await page.waitForFunction(text=>{
   const shown=document.querySelector('.ba-messages')?.innerText.includes(text);
   const fenced=document.querySelector('.ba-conversation-folders .ba-muted')?.innerText.includes('Owner connection changed');
   return shown||fenced;
  },oldText,{timeout:20000});
  if(!(await page.locator('.ba-messages').innerText()).includes(oldText)){
   // The first attempt may race a legitimate wallet verification. The source
   // must fail closed and preserve the current chat, then permit a deliberate
   // second History click once the owner connection has stabilized.
   assert.notEqual(await page.evaluate(key=>sessionStorage.getItem(key+':tab'),key),oldId);
   await old.click();
   await page.waitForFunction(text=>document.querySelector('.ba-messages')?.innerText.includes(text),oldText,{timeout:20000});
  }
 }catch(error){
  const diagnostic=await page.evaluate(key=>({
   activeThread:sessionStorage.getItem(key+':tab'),
   visibleMessages:document.querySelector('.ba-messages')?.innerText.slice(-500)||'',
   folderStatus:document.querySelector('.ba-conversation-folders .ba-muted')?.innerText||'',
   folderEntries:[...document.querySelectorAll('.ba-folder-entry')].map(x=>x.dataset.sessionId).slice(0,8)
  }),key);
  throw Error('Saved History did not reopen: '+JSON.stringify(diagnostic),{cause:error});
 }
 results.push({probe:'owner_reopens_history',status:'passed',preserved:true});
 // Closing and reopening resets the visible transcript and stale status,
 // but leaves saved message bytes intact for deliberate History selection.
 await page.locator('.ba-close').click();
 await page.locator('.ba-launcher').click();
 const reopened=await page.evaluate(key=>sessionStorage.getItem(key+':tab'),key);
 assert.notEqual(reopened,oldId);
 assert.notEqual(reopened,before);
 assert.equal((await page.locator('.ba-messages').innerText()).includes(oldText),false);
 const stored=await page.evaluate(({key,oldId})=>JSON.parse(localStorage.getItem(key+':'+oldId)||'[]'),{key,oldId});
 assert.equal(stored[0]?.text,oldText);
 results.push({probe:'website_bubble_reopen',status:'passed',fresh:true,historyPreserved:true});
 // Manual page reopening/reload should not inherit the last tab's selected
 // conversation. The special updater marker is NOT set on this path.
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('.ba-launcher').waitFor({state:'attached',timeout:20000});
 const reloaded=await page.evaluate(key=>sessionStorage.getItem(key+':tab'),key);
 assert.match(reloaded,/^chat_[a-f0-9]{32}$/);
 assert.notEqual(reloaded,reopened);
 results.push({probe:'new_page_visit',status:'passed',fresh:true});
 await page.close();
 await context.close();
}finally{
 mkdirSync('test-results',{recursive:true});
 writeFileSync('test-results/bubbles-fresh-chat-browser.json',
  JSON.stringify({scope:'local Chromium website DOM',androidDeviceVerified:false,ownerCloudSyncVerified:false,results},null,2)+'\n');
 await browser.close();
}
console.log('Local Chromium verified new chat on website open/reopen, prior Chats restore, and manual refresh.');
