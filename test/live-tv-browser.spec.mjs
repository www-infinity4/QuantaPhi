import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:8799',now='2026-10-29T01:00:00Z';
const feed=status=>({dates:[{games:[{gamePk:849799,gameDate:'2026-10-29T00:00:00Z',status:{abstractGameState:status,detailedState:status==='Live'?'In Progress':status},teams:{away:{team:{id:158},score:2},home:{team:{id:139},score:1}},linescore:{currentInningOrdinal:'3rd',inningHalf:'Top'}}]}]});
test.use({viewport:{width:360,height:800},reducedMotion:'reduce'});
async function prepare(page,state){
 await page.clock.setFixedTime(new Date(now));
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url());
  if(u.origin===base)return route.continue();
  if(u.hostname==='statsapi.mlb.com'){
   if(state.offline)return route.abort();
   if(state.wait)await state.wait;
   return route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(feed(state.value))}).catch(()=>{});
  }
  if(u.hostname==='www.kyoutv.com'&&u.pathname==='/livestream/')return route.fulfill({contentType:'text/html',body:'<!doctype html><title>Station page fixture</title><h1>KYOU official-site request fixture</h1><p>Navigation, player, advertising and consent belong to the station. This fixture does not establish actual video playback.</p>'});
  if(u.hostname==='www.youtube-nocookie.com')return route.fulfill({contentType:'text/html',body:'<!doctype html><title>Provider test fixture</title><p>Official player request fixture. Playback is not verified by this test.</p>'});
  return route.abort();
 });
}
test('a verified live game opens first, stays reachable, and unpins on final',async({page})=>{
 const state={value:'Live'};await prepare(page,state);await page.goto(base+'/',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#oracleCardStage #phiChannelCards')).toBeVisible();
 const actions=page.locator('#oracleCardStage .oracle-card-actions');
 await expect(actions.locator('[data-action="follow"]')).toBeVisible();
 for(const action of ['star','collect','share','build'])await expect(actions.locator('[data-action="'+action+'"]')).toHaveCount(1);
 // The direct KYOU viewer must not open a second nested player as a preview.
 await expect(actions.locator('[data-action="preview"]')).toHaveCount(0);
 await expect(actions.locator('[data-action="star"]')).toHaveCSS('background-color','rgb(255, 243, 212)');
 await expect(actions.locator('[data-action="collect"]')).toHaveCSS('background-color','rgb(230, 247, 238)');
 await expect(actions.locator('[data-action="share"]')).toHaveCSS('background-color','rgb(29, 64, 95)');
 const overflow=await actions.evaluate(n=>n.getBoundingClientRect().right>innerWidth);
 expect(overflow).toBe(false);
 await expect(page.locator('#liveFoxGameCard h2')).toHaveText('KYOU · FOX 15.1');
 await expect(page.locator('#liveFoxGameCard .ltv-state')).toHaveText('LIVE GAME · Top 3rd');
 await expect(page.locator('#oracleCardLive')).toBeVisible();
 await expect(page.locator('#oracleCardChooser optgroup').first()).toHaveAttribute('label','Live game · pinned first');
 await expect(page.locator('#liveFoxGameCard')).toContainText('FOX game video is not available inside this card.');
 const destinations=page.locator('#liveFoxGameCard .ltv-access > .ltv-link');
 await expect(destinations).toHaveCount(4);
 await expect(destinations.first()).toHaveCSS('background-color','rgb(7, 91, 152)');
 await expect(destinations.last()).toHaveCSS('background-color','rgb(25, 47, 76)');
 await expect(page.locator('#liveFoxGameCard .ltv-access')).toHaveCSS('grid-template-columns',/repeat\(2,\s*minmax/);
 await expect(page.locator('#phiChannelCards .channelphi-kyou iframe')).toHaveAttribute('src',/^https:\/\/www\.kyoutv\.com\/livestream\/\?utm_source=quantaphi/);
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
 await expect(page.locator('#liveFoxGameCard iframe')).toHaveCount(0);
 const frame=page.locator('#liveFoxNewsCard iframe');await expect(frame).toBeVisible();
 const src=new URL(await frame.getAttribute('src'));
 expect(src.searchParams.get('autoplay')).toBe('1');expect(src.searchParams.get('mute')).toBe('1');
 await expect(page.locator('#liveFoxNewsCard')).toContainText('The World Series game is a separate FOX broadcast.');
 await expect(page.locator('#liveFoxNewsCard button').filter({hasText:/^(?:Play|Watch|Start)/})).toHaveCount(0);
 const overflow=await page.locator('#liveFoxNewsCard').evaluate(n=>n.getBoundingClientRect().width>innerWidth);
 expect(overflow).toBe(false);
 expect(await frame.evaluate(n=>n.getBoundingClientRect().height)).toBeGreaterThanOrEqual(200);
 await page.locator('#oracleCardLive').click();
 await expect(page.locator('#oracleCardStage #phiChannelCards')).toBeVisible();
 await expect(page.locator('#liveFoxNewsCard iframe')).toHaveCount(0);
});
test('KYOU opens automatically above StarQuest in the shared live viewer and hands off one player at a time',async({page})=>{
 await prepare(page,{value:'Live'});await page.goto(base+'/infinity-tv/kyou.html',{waitUntil:'domcontentloaded'});
 const wall=page.locator('#phiChannelCards'),kyou=wall.locator('.channelphi-kyou'),star=wall.locator('.channelphi-starquest');
 await expect(wall.locator('.channelphi-grid > article').first()).toHaveClass(/channelphi-kyou/);
 await expect(kyou.getByRole('heading',{name:'KYOU · FOX 15.1',exact:true})).toBeVisible();
 await expect(kyou.locator('iframe')).toHaveAttribute('src',/^https:\/\/www\.kyoutv\.com\/livestream\//);
 await expect(kyou.locator('.channelphi-screen')).toBeHidden();
 const controls=kyou.locator('.channelphi-kyou-controls');
 await expect(controls.locator('button')).toHaveCount(2);
 await expect(controls.locator('a')).toHaveCount(1);
 await expect(controls.getByRole('button',{name:/Sound/})).toHaveCount(0);
 await expect(controls.getByRole('button',{name:/Refresh station/})).toBeVisible();
 await expect(controls.getByRole('link',{name:/KYOU website/})).toHaveAttribute('href',/^https:\/\/www\.kyoutv\.com\/livestream\//);
 await expect(controls.locator('.channelphi-next')).toHaveCSS('background-color','rgb(7, 91, 152)');
 await expect(controls.locator('.channelphi-stop')).toHaveCSS('background-color','rgb(123, 38, 56)');
 await expect(kyou.locator('.channelphi-hint')).toContainText('volume are controlled inside KYOU');
 expect(await kyou.evaluate(n=>n.getBoundingClientRect().top)).toBeLessThan(await star.evaluate(n=>n.getBoundingClientRect().top));
 await star.getByRole('button',{name:'Watch StarQuest video in this card'}).click();
 await expect(kyou.locator('iframe')).toHaveCount(0);await expect(star.locator('iframe')).toHaveCount(1);
 await kyou.getByRole('button',{name:'Watch KYOU · FOX 15.1 video in this card'}).click();
 await expect(kyou.locator('iframe')).toHaveCount(1);await expect(star.locator('iframe')).toHaveCount(0);
 await kyou.getByRole('button',{name:'■ Stop',exact:true}).click();
 await expect(wall.locator('iframe,video')).toHaveCount(0);
});
test('final and unavailable games never get a live pin',async({page})=>{
 await prepare(page,{value:'Final'});await page.goto(base+'/?card=fox-live-game',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#liveFoxGameCard .ltv-state')).toHaveText('FINAL');
 await expect(page.locator('#oracleCardLive')).toBeHidden();
 await expect(page.locator('#oracleCardChooser optgroup[label="Live game · pinned first"]')).toHaveCount(0);
});
test('fresh home and refresh show Infinity TV before the score feed responds, then remember final',async({page})=>{
 let release;const state={value:'Live',wait:new Promise(r=>{release=r})};await prepare(page,state);
 await page.goto(base+'/',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#oracleCardStage #phiChannelCards')).toBeVisible();
 await expect(page.locator('#liveFoxGameCard .ltv-state')).toHaveText('Checking MLB game status…');
 release();await expect(page.locator('#liveFoxGameCard .ltv-state')).toContainText('LIVE GAME');
 state.wait=new Promise(r=>{release=r});await page.reload({waitUntil:'domcontentloaded'});
 await expect(page.locator('#oracleCardStage #phiChannelCards')).toBeVisible();
 release();await expect(page.locator('#liveFoxGameCard .ltv-state')).toContainText('LIVE GAME');
 state.wait=null;state.value='Final';await page.clock.setFixedTime(new Date(Date.parse(now)+300001));
 await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
 await expect(page.locator('#liveFoxGameCard .ltv-state')).toHaveText('FINAL');await expect(page.locator('#oracleCardLive')).toBeHidden();
 await page.reload({waitUntil:'domcontentloaded'});await expect(page.locator('#liveFoxGameCard .ltv-state')).toHaveText('FINAL');await expect(page.locator('#oracleCardLive')).toBeHidden();
});
test('a temporary score outage keeps the requested TV placement without a false live score',async({page})=>{
 await prepare(page,{offline:true});await page.goto(base+'/',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#oracleCardStage #phiChannelCards')).toBeVisible();await expect(page.locator('#oracleCardLive')).toBeVisible();
 await expect(page.locator('#liveFoxGameCard .ltv-state')).toHaveText('MLB status unavailable');
 await expect(page.locator('#liveFoxGameCard .ltv-numbers')).toHaveText('— – —');
});
test('KYOU referrals retain source attribution and record clicks without claiming broadcast views',async({page})=>{
 await prepare(page,{value:'Live'});await page.goto(base+'/?card=kyou',{waitUntil:'domcontentloaded'});
 const station=page.locator('#liveFoxGameCard'),a=station.getByRole('link',{name:'KYOU live newscasts',exact:true});
 await expect(a).toHaveAttribute('rel','noopener');
 await expect(a).toHaveAttribute('referrerpolicy','strict-origin-when-cross-origin');
 const u=new URL(await a.getAttribute('href'));
 expect(u.origin+u.pathname).toBe('https://www.kyoutv.com/livestream/');expect(u.searchParams.get('utm_source')).toBe('quantaphi');
 await a.evaluate(n=>{n.addEventListener('click',e=>e.preventDefault(),{once:true});n.click()});
 const events=await page.evaluate(()=>window.dataLayer.filter(v=>v[0]==='event'&&String(v[1]).startsWith('partner_')).map(v=>[v[1],v[2]]));
 expect(events).toContainEqual(['partner_referral_click',{partner:'kyou',card_id:'fox-live-game',link_id:'live'}]);
 expect(events.every(v=>['partner_card_open','partner_referral_click','partner_site_frame_request'].includes(v[0]))).toBe(true);
 await expect(station).toContainText('KYOU controls its player, ads and audience reporting.');
 await expect(station.locator('video')).toHaveCount(0);
 await station.locator('.ltv-station-window').scrollIntoViewIfNeeded();
 const frame=station.locator('iframe.ltv-station-frame');
 await expect(frame).toHaveAttribute('allow',/autoplay/);
 await expect(frame).toHaveAttribute('src',/^https:\/\/www\.kyoutv\.com\/livestream\//);
 await expect(frame).toHaveAttribute('referrerpolicy','strict-origin-when-cross-origin');
 await page.locator('#oracleCardInventory').click();
 await page.locator('#oracleCardChooser').selectOption('liveFoxNewsCard');
 await expect(station.locator('iframe')).toHaveCount(0);
});
