import {test,expect} from '@playwright/test';

test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});

async function ready(page){
 await page.goto('http://127.0.0.1:8799/?card=google',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#oracleCardNext')).toBeVisible({timeout:18000});
 await expect(page.locator('#oracleCardStage > *').first()).toBeVisible({timeout:18000});
}

test('Android proximity sections and arrows do not forcibly move viewport',async({page})=>{
 await ready(page);
 const nav=page.locator('#oracleCardDeck .oracle-card-deck-nav');
 // Chromium may serialize the default "proximity" strictness as just "y".
 await expect.poll(()=>page.evaluate(()=>getComputedStyle(document.documentElement).scrollSnapType)).toMatch(/^y(?: proximity)?$/);
 await page.locator('#oracleCardNext').scrollIntoViewIfNeeded();
 const scrollBefore=await page.evaluate(()=>window.scrollY);
 const before=await page.locator('#oracleCardNow').textContent();
 await page.locator('#oracleCardNext').evaluate(button=>button.click());
 await expect(page.locator('#oracleCardNow')).not.toHaveText(before||'');
 expect(Math.abs(await page.evaluate(()=>window.scrollY)-scrollBefore)).toBeLessThan(30);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBeTruthy();
 await page.emulateMedia({reducedMotion:'reduce'});
 await expect.poll(()=>page.evaluate(()=>getComputedStyle(document.documentElement).scrollSnapType)).toBe('none');
});

test("populated Following feed stays at the user's scroll position after a card change",async({page})=>{
 await ready(page);
 await page.evaluate(()=>{
  const feed=document.getElementById('oracleFollowingFeed');
  feed.hidden=false;
  feed.innerHTML='<p>Layout-only synthetic followed publisher fixtures</p>'+Array.from({length:18},(_,i)=>'<article style="min-height:130px">Publisher '+i+'</article>').join('');
  window.scrollTo(0,0);
 });
 const nav=page.locator('#oracleCardDeck .oracle-card-deck-nav');
 const before=await page.locator('#oracleCardNow').textContent();
 // Dispatch through the existing click handler without Playwright's auto-scroll.
 await page.locator('#oracleCardNext').evaluate(button=>button.click());
 await expect(page.locator('#oracleCardNow')).not.toHaveText(before||'');
 // Automatic card changes may not scroll a long feed up to the arrow row.
 expect(await page.evaluate(()=>window.scrollY)).toBeLessThan(20);
 await expect(nav).toBeVisible();
});

test.describe('fine-pointer narrow desktop',()=>{
 test.use({viewport:{width:390,height:844},isMobile:false,hasTouch:false});
 test('arrow clicks do not trigger touch-only snap or reanchor',async({page})=>{
  await ready(page);
  await expect.poll(()=>page.evaluate(()=>matchMedia('(pointer: coarse)').matches)).toBe(false);
  await expect.poll(()=>page.evaluate(()=>getComputedStyle(document.documentElement).scrollSnapType)).toBe('none');
  await page.evaluate(()=>window.scrollTo(0,0));
  const before=await page.locator('#oracleCardNow').textContent();
  await page.locator('#oracleCardNext').evaluate(button=>button.click());
  await expect(page.locator('#oracleCardNow')).not.toHaveText(before||'');
  expect(await page.evaluate(()=>window.scrollY)).toBeLessThan(20);
 });
});

test('Android header stays reachable and manual scroll can settle on carousel',async({page})=>{
 await ready(page);
 const header=page.locator('main.app > .qtop');
 const search=page.locator('main.app > .search');
 await expect(header).toBeVisible();
 await expect.poll(()=>header.evaluate(e=>getComputedStyle(e).scrollSnapAlign)).toBe('start');
 await expect.poll(()=>search.evaluate(e=>getComputedStyle(e).scrollSnapAlign)).toBe('none');
 await page.locator('#oracleCardNext').click();
 const nav=page.locator('#oracleCardDeck .oracle-card-deck-nav');
 await expect(nav).toBeVisible();
 await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
 // Mobile Chromium proximity-snap may leave an 11px offset even when the
 // complete header and search field are both visibly in the viewport.
 // Verify actual visibility below rather than rejecting that harmless offset.
 await expect.poll(()=>page.evaluate(()=>window.scrollY),{timeout:4000}).toBeLessThan(16);
 await expect(header).toBeInViewport({ratio:0.95});
 await expect(page.locator('#q')).toBeInViewport();
 // Simulate a short downward user scroll from the restored top, without
 // jumping to the destination programmatically. The nearby deck must settle
 // with its controls visible; the search row must not steal the snap.
 const deck=page.locator('#oracleCardDeck');
 await page.mouse.move(2,Math.min(420,page.viewportSize().height/2));
 // Proximity snap intentionally does not jump 400+ pixels to a distant section.
 // Extra content above the deck can require more than one real user wheel gesture.
 // Approach the deck in bounded gestures, never scrollIntoView or teleport.
 for(let gesture=0;gesture<4;gesture++){
  const distance=await deck.evaluate(e=>e.getBoundingClientRect().top);
  if(distance<110)break;
  await page.mouse.wheel(0,Math.min(480,Math.max(120,Math.round(distance-70))));
  await page.waitForTimeout(140);
 }
 // The tabs and family shortcuts precede the arrow row inside the deck;
 // the correct resting point is the deck section start, not the arrows.
 await expect.poll(async()=>Math.abs(await deck.evaluate(e=>e.getBoundingClientRect().top-12)),{timeout:6000}).toBeLessThan(40);
 await expect(nav).toBeInViewport();
});
