import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:8799',now='2026-10-29T01:00:00Z';
const feed=status=>({dates:[{games:[{gamePk:849799,gameDate:'2026-10-29T00:00:00Z',status:{abstractGameState:status,detailedState:status==='Live'?'In Progress':status},teams:{away:{team:{id:158},score:2},home:{team:{id:139},score:1}},linescore:{currentInningOrdinal:'3rd',inningHalf:'Top'}}]}]});
test.use({viewport:{width:360,height:800},reducedMotion:'reduce'});
async function prepare(page,state){
 await page.clock.setFixedTime(new Date(now));
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url());
  if(u.origin===base)return route.continue();
  if(u.hostname==='statsapi.mlb.com')return route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(feed(state.value))});
  if(u.hostname==='www.youtube-nocookie.com')return route.fulfill({contentType:'text/html',body:'<!doctype html><title>Provider test fixture</title><p>Official player request fixture. Playback is not verified by this test.</p>'});
  return route.abort();
 });
}
test('a verified live game opens first, stays reachable, and unpins on final',async({page})=>{
 const state={value:'Live'};await prepare(page,state);await page.goto(base+'/',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#oracleCardStage #liveFoxGameCard')).toBeVisible();
 await expect(page.locator('#liveFoxGameCard h2')).toHaveText('KYOU · FOX 15.1');
 await expect(page.locator('#liveFoxGameCard .ltv-state')).toHaveText('LIVE GAME · Top 3rd');
 await expect(page.locator('#oracleCardLive')).toBeVisible();
 await expect(page.locator('#oracleCardChooser optgroup').first()).toHaveAttribute('label','Live game · pinned first');
 await expect(page.locator('#liveFoxGameCard')).toContainText('FOX game video is not available inside this card.');
 await expect(page.locator('#liveFoxGameCard iframe')).toHaveCount(0);
 state.value='Final';await page.clock.setFixedTime(new Date(Date.parse(now)+300001));
 await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
 await expect(page.locator('#liveFoxGameCard .ltv-state')).toHaveText('FINAL');
 await expect(page.locator('#oracleCardLive')).toBeHidden();
});
test('a direct card choice is preserved, news starts inline without a Play button, and leaving stops it',async({page})=>{
 await prepare(page,{value:'Live'});await page.goto(base+'/?card=google',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#oracleCardStage').getByRole('searchbox',{name:'Search Google'})).toBeVisible();
 await expect(page.locator('#oracleCardLive')).toBeVisible();
 await page.locator('#oracleCardInventory').click();
 await page.locator('#oracleCardChooser').selectOption('liveFoxNewsCard');
 const frame=page.locator('#liveFoxNewsCard iframe');await expect(frame).toBeVisible();
 const src=new URL(await frame.getAttribute('src'));
 expect(src.searchParams.get('autoplay')).toBe('1');expect(src.searchParams.get('mute')).toBe('1');
 await expect(page.locator('#liveFoxNewsCard')).toContainText('The World Series game is a separate FOX broadcast.');
 await expect(page.locator('#liveFoxNewsCard button').filter({hasText:/^(?:Play|Watch|Start)/})).toHaveCount(0);
 const overflow=await page.locator('#liveFoxNewsCard').evaluate(n=>n.getBoundingClientRect().width>innerWidth);
 expect(overflow).toBe(false);
 expect(await frame.evaluate(n=>n.getBoundingClientRect().height)).toBeGreaterThanOrEqual(200);
 await page.locator('#oracleCardLive').click();
 await expect(page.locator('#oracleCardStage #liveFoxGameCard')).toBeVisible();
 await expect(page.locator('#liveFoxNewsCard iframe')).toHaveCount(0);
});
test('final and unavailable games never get a live pin',async({page})=>{
 await prepare(page,{value:'Final'});await page.goto(base+'/?card=fox-live-game',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#liveFoxGameCard .ltv-state')).toHaveText('FINAL');
 await expect(page.locator('#oracleCardLive')).toBeHidden();
 await expect(page.locator('#oracleCardChooser optgroup[label="Live game · pinned first"]')).toHaveCount(0);
});
test('KYOU referrals retain source attribution and record clicks without claiming broadcast views',async({page})=>{
 await prepare(page,{value:'Live'});await page.goto(base+'/?card=fox-live-game',{waitUntil:'domcontentloaded'});
 const station=page.locator('#liveFoxGameCard'),a=station.getByRole('link',{name:'KYOU live newscasts',exact:true});
 await expect(a).toHaveAttribute('rel','noopener');
 await expect(a).toHaveAttribute('referrerpolicy','strict-origin-when-cross-origin');
 const u=new URL(await a.getAttribute('href'));
 expect(u.origin+u.pathname).toBe('https://www.kyoutv.com/livestream/');expect(u.searchParams.get('utm_source')).toBe('quantaphi');
 await a.evaluate(n=>{n.addEventListener('click',e=>e.preventDefault(),{once:true});n.click()});
 const events=await page.evaluate(()=>window.dataLayer.filter(v=>v[0]==='event'&&String(v[1]).startsWith('partner_')).map(v=>[v[1],v[2]]));
 expect(events).toContainEqual(['partner_referral_click',{partner:'kyou',card_id:'fox-live-game',link_id:'live'}]);
 expect(events.every(v=>['partner_card_open','partner_referral_click'].includes(v[0]))).toBe(true);
 await expect(station).toContainText('KYOU controls its player, ads and audience reporting.');
 await expect(station.locator('iframe,video')).toHaveCount(0);
});
