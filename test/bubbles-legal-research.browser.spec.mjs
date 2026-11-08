import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:8799';
test.use({viewport:{width:360,height:780}});
test.beforeEach(async({page})=>{
 await page.route('https://quantaphi.org/**',route=>route.abort());
});
test('Bubbles legal research Quick Card prepares a local attorney packet on Android without external submissions',async({page})=>{
 const requests=[];page.on('request',request=>{
  if(request.method()==='POST')requests.push(request.url());
 });
 await page.goto(base+'/bubbles-legal-research.html',{waitUntil:'domcontentloaded'});
 await expect(page.getByRole('heading',{name:'Bubbles Legal Research Desk'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Open Bubbles Legal Research'})).toBeVisible();
 await expect(page.locator('.quantaphi-bubbles-embed-launcher')).toBeVisible();
 const note=page.locator('#legalNotes');
 await note.fill('Please review code ownership and trademarks. <script>bad</script>');
 await expect(page.locator('#legalPacketPreview')).toContainText('Please review code ownership');
 await expect(page.locator('#legalPacketPreview')).toContainText('<script>bad</script>');
 await expect(page.locator('#legalPacketPreview script')).toHaveCount(0);
 await expect(page.locator('#legalSources a')).toHaveCount(8);
 await expect(page.locator('#legalSources a').first()).toHaveAttribute('rel','noopener noreferrer');
 await expect(page.locator('#legalPacketPreview')).toContainText('not legal advice');
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
 expect(overflow).toBeLessThanOrEqual(4);
 await page.locator('#legalClearPacket').click();
 await expect(note).toHaveValue('');
 await expect(page.locator('#legalPacketPreview')).not.toContainText('Please review code ownership');
 await page.reload({waitUntil:'domcontentloaded'});
 await expect(page.locator('#legalNotes')).toHaveValue('');
 expect(requests.filter(url=>/\/api\/|\/mcp|\/owner\//.test(url))).toEqual([]);
});
test('manual Open Bubbles uses original local page launcher rather than an external fake lawyer',async({page})=>{
 await page.goto(base+'/bubbles-legal-research.html',{waitUntil:'domcontentloaded'});
 const button=page.getByRole('button',{name:'Open Bubbles Legal Research'});
 await expect(page.locator('.quantaphi-bubbles-embed-launcher')).toHaveAttribute('aria-expanded','false');
 await button.click();
 await expect(page.locator('.quantaphi-bubbles-embed-launcher')).toHaveAttribute('aria-expanded','true');
 await expect(page.locator('iframe[data-bubble-id="bubbles-legal-research"]')).toHaveCount(1);
});
