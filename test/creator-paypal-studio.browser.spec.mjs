import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';

const base='http://127.0.0.1:8799';
test.use({viewport:{width:360,height:800}});

test('500 creator cards export one unverified PayPal merchant template with zero financial actions',async({page})=>{
 const externalPosts=[];
 page.on('request',r=>{if(r.method()==='POST')externalPosts.push(r.url())});
 await page.goto(base+'/creator-paypal-studio.html',{waitUntil:'domcontentloaded'});
 await expect(page.getByRole('heading',{name:'Creator PayPal Studio'})).toBeVisible();
 await expect(page.getByText('PayPal not connected.')).toBeVisible();
 const signupHeight=await page.locator('a.link-action').evaluate(link=>link.getBoundingClientRect().height);
 expect(signupHeight).toBeGreaterThanOrEqual(44);
 await expect(page.locator('#creatorPayPalExport')).toBeDisabled();
 await page.locator('#creatorPayPalSlug').fill('fred');
 await page.locator('#creatorPayPalPrice').fill('1.00');
 const cardIds=Array.from({length:500},(_,i)=>'fred-card-'+String(i+1).padStart(4,'0'));
 await page.locator('#creatorPayPalCardIds').fill(cardIds.join('\n'));
 await page.locator('#creatorPayPalPreview').click();
 await expect(page.locator('#creatorPayPalStatus')).toContainText('500 card pricing drafts prepared locally');
 await expect(page.locator('#creatorPayPalExport')).toBeEnabled();
 const [download]=await Promise.all([
  page.waitForEvent('download'),
  page.locator('#creatorPayPalExport').click()
 ]);
 const file=JSON.parse(readFileSync(await download.path(),'utf8'));
 expect(file.cards).toHaveLength(500);
 expect(file.cards[0].creatorSlug).toBe('fred');
 expect(file.cards.at(-1).cardId).toBe('fred-card-0500');
 expect(file.merchantConnection).toEqual({provider:'paypal',status:'not_connected',linked:false});
 expect(file.cards.every(x=>x.canCharge===false)).toBe(true);
 expect(file.cards.every(x=>x.priceCents===100)).toBe(true);
 expect(file.canStartCheckout).toBe(false);
 expect(externalPosts).toEqual([]);
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
 expect(overflow).toBeLessThanOrEqual(4);
});
test('changing a draft invalidates export, and card form does not auto-create PayPal orders',async({page})=>{
 await page.goto(base+'/creator-paypal-studio.html',{waitUntil:'domcontentloaded'});
 await page.locator('#creatorPayPalSlug').fill('fred');
 await page.locator('#creatorPayPalCardIds').fill('fred-a\nfred-b');
 await page.locator('#creatorPayPalPrice').fill('2.00');
 await page.locator('#creatorPayPalPreview').click();
 await expect(page.locator('#creatorPayPalExport')).toBeEnabled();
 await page.locator('#creatorPayPalPrice').fill('3.00');
 await expect(page.locator('#creatorPayPalExport')).toBeDisabled();
 await page.locator('#creatorPayPalPreview').click();
 await expect(page.locator('#creatorPayPalOutput')).toContainText('300');
 await page.locator('#creatorPayPalCardIds').fill('fred-a\nfred-a');
 await page.locator('#creatorPayPalPreview').click();
 await expect(page.locator('#creatorPayPalStatus')).toContainText('duplicate_card_id');
 await expect(page.locator('#creatorPayPalExport')).toBeDisabled();
});
