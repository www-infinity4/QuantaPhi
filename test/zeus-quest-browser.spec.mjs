import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:8799';
test.use({viewport:{width:390,height:844}});

// Stub the provider boundary, never claim this proves real hosted model availability.
// The test proves one user gesture reaches the iframe through its expected protocol.
async function fakeBubbles(page,mode='accepted'){
 await page.route('**/bubbles.html?**',async route=>{
  const body=`<!doctype html><html><head><meta charset="utf-8"></head><body>
  <h1>Controlled Bubbles test conversation</h1><div id="received"></div>
  <script>
  window.addEventListener('message',event=>{
   if(event.origin!==location.origin||event.source!==parent)return;
   const d=event.data;
   if(d?.type!=='quantaphi:bubbles:quest')return;
   document.getElementById('received').textContent=d.prompt;
   parent.postMessage({type:'quantaphi:bubbles:quest-ack',
    id:d.id,requestId:d.requestId,status:'${mode}'},event.origin);
  });
  </script></body></html>`;
  await route.fulfill({status:200,contentType:'text/html',body});
 });
}
test('one Send starts Zeus quest in the Bubbles iframe and clears only after acceptance',async({page})=>{
 await fakeBubbles(page);
 await page.goto(base+'/coliseum/',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#zeusQuestInput')).toBeVisible();
 await expect(page.getByRole('button',{name:'Send',exact:true})).toBeVisible();
 const msg='Help me plan a neighborhood science workshop';
 await page.locator('#zeusQuestInput').fill(msg);
 await page.getByRole('button',{name:'Send',exact:true}).click();
 await expect(page.locator('#zeusQuestStatus')).toContainText('Question accepted');
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
 await expect(page.locator('#zeusQuestStatus')).toContainText('Bubbles is working');
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
