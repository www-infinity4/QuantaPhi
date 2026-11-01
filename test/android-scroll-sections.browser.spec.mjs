import {test,expect} from '@playwright/test';

test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});

test('Android sections settle softly and card arrows return to navigation',async({page})=>{
 await page.goto('http://127.0.0.1:8799/?card=google',{waitUntil:'domcontentloaded'});
 const deck=page.locator('#oracleCardDeck');
 const next=page.locator('#oracleCardNext');
 await expect(next).toBeVisible({timeout:18000});
 await expect(page.locator('#oracleCardStage > *').first()).toBeVisible({timeout:18000});
 await expect.poll(()=>page.evaluate(()=>getComputedStyle(document.documentElement).scrollSnapType)).toBe('y proximity');
 const before=await page.locator('#oracleCardNow').textContent();
 await next.click();
 await expect(page.locator('#oracleCardNow')).not.toHaveText(before||'');
 await expect.poll(async()=>Math.abs(await deck.evaluate(e=>e.getBoundingClientRect().top)),{timeout:6000}).toBeLessThan(30);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBeTruthy();
 await page.emulateMedia({reducedMotion:'reduce'});
 await expect.poll(()=>page.evaluate(()=>getComputedStyle(document.documentElement).scrollSnapType)).toBe('none');
});
