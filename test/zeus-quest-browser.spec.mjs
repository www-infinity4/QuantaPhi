import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:8799';
test.use({viewport:{width:390,height:844}});

// Stub the provider boundary, never claim this proves real hosted model availability.
// The test proves one user gesture reaches the iframe through its expected protocol.
async function fakeBubbles(page,mode='complete'){
 await page.route('**/bubbles.html?**',async route=>{
  const body=`<!doctype html><html><head><meta charset="utf-8"></head><body>
  <h1>Controlled Bubbles test conversation</h1><div id="received"></div>
  <script>
  window.addEventListener('message',event=>{
   if(event.origin!==location.origin||event.source!==parent)return;
   const d=event.data;
   if(d?.type!=='quantaphi:bubbles:quest')return;
   document.getElementById('received').textContent=d.prompt;
   const state='${mode}';
   parent.postMessage({type:'quantaphi:bubbles:quest-ack',
    id:d.id,requestId:d.requestId,status:state==='busy'?'busy':'accepted'},event.origin);
   if(state!=='busy'&&state!=='accepted-only'){
    parent.postMessage({type:'quantaphi:bubbles:quest-result',
     id:d.id,requestId:d.requestId,status:state==='failed'?'failed':'complete',
     reply:state==='failed'?'':'Controlled fixture reply to: '+d.prompt},event.origin);
   }
  });
  </script></body></html>`;
  await route.fulfill({status:200,contentType:'text/html',body});
 });
}
test('one Send waits for a terminal Bubbles result before clearing the draft',async({page})=>{
 await fakeBubbles(page);
 await page.goto(base+'/coliseum/',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#zeusQuestInput')).toBeVisible();
 await expect(page.getByRole('button',{name:'Send',exact:true})).toBeVisible();
 const msg='Help me plan a neighborhood science workshop';
 await page.locator('#zeusQuestInput').fill(msg);
 await page.getByRole('button',{name:'Send',exact:true}).click();
 await expect(page.locator('#zeusQuestStatus')).toContainText('Answer received');
 await expect(page.locator('#zeusQuestReply')).toHaveText('Controlled fixture reply to: '+msg);
 await expect(page.locator('#zeusQuestInput')).toHaveValue('');
 await expect(page.frameLocator('#zeusAssistantFrame').locator('#received')).toHaveText(msg);
 await expect(page.locator('#chatPane')).toBeVisible();
 await expect(page.locator('#zeusQuestSend')).toBeEnabled();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
});
test('Bubbles busy refuses delivery without deleting the user question',async({page})=>{
 await fakeBubbles(page,'busy');
 await page.goto(base+'/coliseum/',{waitUntil:'domcontentloaded'});
 const msg='Make a restoration checklist for a vintage radio';
 await page.locator('#zeusQuestInput').fill(msg);
 await page.locator('#zeusQuestInput').press('Enter');
 await expect(page.locator('#zeusQuestStatus')).toContainText('Bubbles is busy');
 await expect(page.locator('#zeusQuestInput')).toHaveValue(msg);
 await expect(page.locator('#zeusQuestSend')).toBeEnabled();
});
test('Shift Enter remains a newline; Send works without starting a local note',async({page})=>{
 await fakeBubbles(page);
 await page.goto(base+'/coliseum/',{waitUntil:'domcontentloaded'});
 await page.locator('#zeusQuestInput').fill('First idea');
 await page.locator('#zeusQuestInput').press('Shift+Enter');
 await expect(page.locator('#zeusQuestInput')).toHaveValue('First idea\n');
 await page.locator('#zeusQuestInput').type('Second idea');
 await page.locator('#zeusQuestInput').press('Enter');
 await expect(page.frameLocator('#zeusAssistantFrame').locator('#received')).toHaveText('First idea\nSecond idea');
 await expect(page.locator('#zeusQuestInput')).toHaveValue('');
 await expect(page.locator('#chatLog')).not.toContainText('First idea');
});

test('acknowledgment alone never clears the draft or displays a fake response',async({page})=>{
 await fakeBubbles(page,'accepted-only');
 await page.goto(base+'/coliseum/',{waitUntil:'domcontentloaded'});
 await page.locator('#zeusQuestInput').fill('Will my input remain visible?');
 await page.locator('#zeusQuestSend').click();
 await expect(page.locator('#zeusQuestStatus')).toContainText('waiting for an actual Bubbles reply');
 await expect(page.locator('#zeusQuestInput')).toHaveValue('Will my input remain visible?');
 await expect(page.locator('#zeusQuestReply')).toBeHidden();
 await expect(page.locator('#zeusQuestSend')).toBeDisabled();
});
test('failed real completion preserves a retryable draft and restores Send',async({page})=>{
 await fakeBubbles(page,'failed');
 await page.goto(base+'/coliseum/',{waitUntil:'domcontentloaded'});
 await page.locator('#zeusQuestInput').fill('Retry this failed prompt');
 await page.locator('#zeusQuestSend').click();
 await expect(page.locator('#zeusQuestStatus')).toContainText('could not confirm an answer');
 await expect(page.locator('#zeusQuestInput')).toHaveValue('Retry this failed prompt');
 await expect(page.locator('#zeusQuestReply')).toBeHidden();
 await expect(page.locator('#zeusQuestSend')).toBeEnabled();
});
test('typed draft survives a Zeus page refresh and is never auto-sent',async({page})=>{
 await fakeBubbles(page);
 await page.goto(base+'/coliseum/',{waitUntil:'domcontentloaded'});
 await page.locator('#zeusQuestInput').fill('An unsent multiline plan');
 await page.reload({waitUntil:'domcontentloaded'});
 await expect(page.locator('#zeusQuestInput')).toHaveValue('An unsent multiline plan');
 await expect(page.locator('#zeusQuestReply')).toBeHidden();
});
