import {test,expect} from '@playwright/test';
import {encodePublicCardDraft} from '../quick-card-gpt-draft.mjs';
const origin='http://127.0.0.1:8799';
test.use({viewport:{width:360,height:780}});
test('GPT-prepared public Quick Card opens original publisher form with no automatic publish',async({page})=>{
 const draft={
  title:'Antique Radio Finder',
  website:'https://example.org/radios',
  description:'Discover original-source vintage radio specifications.',
  interactionRequest:'Let visitors find radio model details using supported official URLs.',
  kind:'visit'
 };
 const link=encodePublicCardDraft(draft).replace('https://quantaphi.org',origin);
 const posts=[];page.on('request',req=>{if(req.method()==='POST'&&req.url().includes('/api/quick-cards'))posts.push(req.url())});
 await page.goto(link,{waitUntil:'domcontentloaded'});
 const form=page.locator('#quickCardCreate');
 for(const field of ['title','website','description','interactionRequest'])
  await expect(form.locator('[name="'+field+'"]')).toHaveValue(draft[field]);
 await expect(form.locator('[name="kind"]')).toHaveValue('visit');
 await expect(page.locator('#qcpResult')).toContainText('Nothing has been published');
 await expect.poll(()=>page.evaluate(()=>location.hash)).toBe('');
 expect(posts).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(4);
});
test('malformed ChatGPT draft cannot fill fields or publish on arrival',async({page})=>{
 const posts=[];page.on('request',req=>{if(req.method()==='POST'&&req.url().includes('/api/quick-cards'))posts.push(req.url())});
 await page.goto(origin+'/quick-card-builder.html#chatgpt-draft=invalid',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#quickCardCreate input[name="title"]')).toHaveValue('');
 await expect(page.locator('#qcpResult')).not.toContainText('draft loaded');
 expect(posts).toEqual([]);
});
