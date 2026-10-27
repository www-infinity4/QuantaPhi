import {test,expect} from '@playwright/test';
// Use existing Android QA invocation for the new wiring study and hidden-login cases.
import './quick-card-wiring-browser.spec.mjs';
const base='http://127.0.0.1:8799';
test.use({viewport:{width:390,height:844}});
test('original single-card Oracle viewer replaces the giant feed on Android width',async({page})=>{
 await page.goto(base+'/?card=google',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#quantaDiscoveryFeed')).toBeHidden();
 await expect(page.locator('#siteQuickCards')).toBeHidden();
 await expect(page.locator('#scienceQuickCards')).toBeHidden();
 const oracle=page.locator('#oracleCardDeck');
 await expect(oracle).toBeVisible();
 await expect(oracle.getByRole('tab',{name:'Public'})).toBeVisible();
 await expect(oracle.getByRole('tab',{name:'For You'})).toBeVisible();
 await expect(oracle.getByRole('tab',{name:'Following'})).toBeVisible();
 await expect(oracle.locator('.oracle-card-deck-stage .qcx-google-wordmark')).toHaveAttribute('src',/www\.google\.com\/images\/branding\/googlelogo/,{timeout:15000});
 const input=oracle.getByRole('searchbox',{name:'Search Google'});
 await expect(input).toBeVisible();
 const overflow=await oracle.locator('.oracle-card-deck-stage').evaluate(e=>e.getBoundingClientRect().width>window.innerWidth);
 expect(overflow).toBeFalsy();
});
test('Google query opens actual attributed engine listings within Infinity Viewer',async({page})=>{
 page.on('pageerror',error=>console.log('INFINITY PAGE ERROR',error.message));
 page.on('console',message=>{if(message.type()==='error')console.log('INFINITY CONSOLE ERROR',message.text())});
 page.on('requestfailed',request=>{if(request.url().includes('orange-brook'))console.log('INFINITY REQUEST FAILED',request.url(),request.failure()?.errorText)});
 await page.route('https://orange-brook-a2ac.marvaseater.workers.dev/search**',route=>{
  return route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},
   body:JSON.stringify({results:[{title:'Philco model 90 historical radio',url:'https://example.org/philco-90',content:'Real linked listing from a Google engine test fixture.',engine:'google'}]})});
 });
 await page.goto(base+'/?card=google',{waitUntil:'domcontentloaded'});
 const oracle=page.locator('#oracleCardDeck');
 await oracle.getByRole('searchbox',{name:'Search Google'}).fill('Philco radio');
 await oracle.locator('.qcx-native-search button').click();
 await expect(page.locator('#siteViewer')).toBeVisible();
 await expect(page.locator('#siteViewerFrame')).toHaveAttribute('src',/infinity-search-results\.html\?engine=google&(?:amp;)?q=Philco/);
 const view=page.frameLocator('#siteViewerFrame');
 const statusText=await view.locator('#status').textContent({timeout:7000}).catch(e=>'NO STATUS '+e.message);
 const bodyText=await view.locator('body').innerText({timeout:5000}).catch(e=>'NO BODY '+e.message);
 console.log('VIEWER QA DIAGNOSTIC',JSON.stringify({statusText,bodyText:bodyText.slice(0,900)}));
 await expect(view.getByText('Philco model 90 historical radio')).toBeVisible();
 await expect(view.getByText('Google engine results via Infinity search broker')).toBeVisible();
 await expect(view.getByRole('link',{name:'Philco model 90 historical radio'})).toHaveAttribute('href','https://example.org/philco-90');
 await page.locator('#siteViewerClose').click();
 await expect(page.locator('#siteViewer')).toBeHidden();
 await expect(oracle.getByRole('searchbox',{name:'Search Google'})).toHaveValue('Philco radio');
});
test('YouTube card embeds an actual validated video only after visitor action',async({page})=>{
 await page.goto(base+'/source-quick-card.html?card=youtube',{waitUntil:'domcontentloaded'});
 await expect(page.locator('.qcx-art')).toBeVisible();
 await expect(page.locator('.qcx-video')).toHaveCount(0);
 await page.getByLabel('Public media URL').fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
 await page.getByRole('button',{name:'Play in card'}).click();
 await expect(page.locator('iframe.qcx-video')).toHaveAttribute('src','https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
});
test('Wikipedia previews render real API-supplied text and source links, not invented posts',async({page})=>{
 await page.route('https://en.wikipedia.org/w/api.php**',route=>{
  const result={query:{pages:{100:{index:1,title:'Philco',extract:'A verified encyclopedia test article.',fullurl:'https://en.wikipedia.org/wiki/Philco'}}}};
  return route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(result)});
 });
 await page.goto(base+'/quanta-feed-card.html?card=wikipedia',{waitUntil:'domcontentloaded'});
 await page.getByLabel('Wikipedia search').fill('Philco');
 await page.getByRole('button',{name:'Load articles'}).click();
 await expect(page.getByText('A verified encyclopedia test article.')).toBeVisible();
 await expect(page.getByRole('link',{name:/Read and verify at Wikipedia/})).toHaveAttribute('href','https://en.wikipedia.org/wiki/Philco');
});
test('Google card prioritizes source search, not unrelated trends or a fake embedded website',async({page})=>{
 await page.goto(base+'/source-quick-card.html?card=google',{waitUntil:'domcontentloaded'});
 await expect(page.locator('.qcx-google-wordmark')).toHaveAttribute('src',/googlelogo_color/);
 await expect(page.getByRole('searchbox',{name:'Search Google'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Search',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:/Refresh verified topics/})).toHaveCount(0);
 await expect(page.locator('#sourceQuickCardDetail .qcx-tools iframe')).toHaveCount(0);
});
test('StarMaker displays song search and keeps the local microphone off until the visitor opens recording',async({page})=>{
 await page.goto(base+'/source-quick-card.html?card=starmaker',{waitUntil:'domcontentloaded'});
 await expect(page.getByRole('searchbox',{name:'Search verified StarMaker songs'})).toBeVisible();
 await expect(page.getByText('Recommendations off. Listening history stays private.')).toBeVisible();
 await expect(page.locator('details.qcx-recording-details')).not.toHaveAttribute('open');
 await page.locator('details.qcx-recording-details summary').click();
 await expect(page.getByText('Microphone is off')).toBeVisible();
 await expect(page.getByRole('button',{name:'● Start recording'})).toBeEnabled();
 await expect(page.getByRole('button',{name:'■ Stop'})).toBeDisabled();
});
test('StarMaker opt-in uses real local Music Quant listening song to prioritize a verified karaoke link',async({page})=>{
 await page.addInitScript(()=>{
  localStorage.setItem('musicPhi:listeningQuants:v1',JSON.stringify([{id:'mq_test',kind:'listening',song:'Ed Sheeran - Perfect',createdAt:'2026-10-26T12:00:00Z'}]));
 });
 await page.goto(base+'/source-quick-card.html?card=starmaker',{waitUntil:'domcontentloaded'});
 await page.getByRole('checkbox',{name:'Use my Music Quant listening history for singing suggestions'}).check();
 await expect(page.getByText(/Music Quant match found/)).toBeVisible();
 const first=page.locator('.qcx-song-picks .qcx-result').first();
 await expect(first.getByText('Perfect',{exact:true})).toBeVisible();
 await expect(first.getByRole('link',{name:/Sing/})).toHaveAttribute('href','https://www.starmakerstudios.com/en/song/ed-sheeran-perfect-lyrics/611752105016719259');
 await page.getByRole('checkbox',{name:'Use my Music Quant listening history for singing suggestions'}).uncheck();
 await expect(page.getByText('Recommendations off. Listening history stays private.')).toBeVisible();
});

test('FOX One original advertisement and five interactive controls are present',async({page})=>{
 await page.route('https://platform.twitter.com/widgets.js',route=>route.abort());
 await page.goto(base+'/source-quick-card.html?card=fox-one',{waitUntil:'domcontentloaded'});
 await expect(page.locator('.qcx-fox-one-brand')).toHaveText('FOX ONE');
 await expect(page.locator('.twitter-tweet a')).toHaveAttribute('href','https://x.com/foxone/status/2113352129427730641');
 const actions=page.locator('#sourceQuickCardDetail .qca-toolbar');
 for(const label of ['Star','Collect','Share','+1 Build','Quick Search'])await expect(actions.getByText(label,{exact:false}).first()).toBeVisible();
 await actions.getByRole('button',{name:/Star/}).click();
 await expect(actions.getByRole('button',{name:/Starred/})).toBeVisible();
 await actions.getByRole('button',{name:/Collect/}).click();
 await expect(actions.getByRole('button',{name:/Collected/})).toBeVisible();
});

test('FOX One live news card has its own post, official FOX News viewing link, and interactive actions',async({page})=>{
 await page.route('https://platform.twitter.com/widgets.js',route=>route.abort());
 await page.goto(base+'/source-quick-card.html?card=fox-one-live-news',{waitUntil:'domcontentloaded'});
 await expect(page.locator('.qcx-fox-one-brand')).toHaveText('FOX ONE');
 await expect(page.getByText('FOX One video spot · FOX News')).toBeVisible();
 await expect(page.locator('.twitter-tweet a')).toHaveAttribute('href','https://x.com/foxone/status/2070282166190408122');
 await expect(page.getByRole('link',{name:/Watch FOX News live at FOX One/})).toHaveAttribute('href','https://www.fox.com/stream/fox-news');
 const actions=page.locator('#sourceQuickCardDetail .qca-toolbar');
 for(const label of ['Star','Collect','Share','+1 Build','Quick Search'])await expect(actions.getByText(label,{exact:false}).first()).toBeVisible();
 await actions.getByRole('button',{name:/Collect/}).click();
 await expect(actions.getByRole('button',{name:/Collected/})).toBeVisible();
});

test('Pepe Jeans product photographs, exact merchant links, and all five actions rotate in Public',async({page})=>{
 // CI checks the exact manufacturer image URL, not third-party CDN uptime.
 await page.route('https://images.pepejeans.com/**',route=>route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="#dedad2"/></svg>'}));
 await page.goto(base+'/?card=pepe-brooke',{waitUntil:'domcontentloaded'});
 const viewer=page.locator('#oracleCardStage');
 const card=viewer.locator('[data-source-id="pepe-brooke"]');
 await expect(card).toBeVisible({timeout:20000});
 await expect(card.locator('img.qbp-photo')).toHaveAttribute('src',/PL2050628_4UA_000_06_MO/);
 await expect(card.getByRole('link',{name:/Shop this exact item/})).toHaveAttribute('href',/pepejeans\.com\/uk\/en_gb\/pd\/iconic-brooke/);
 for(const label of ['Star','Collect','Share','+1 Build','Quick Search'])
  await expect(card.locator('.qca-toolbar').getByText(label,{exact:false}).first()).toBeVisible();
 await expect(page.locator('#brandProductCards')).toBeHidden();
 await page.locator('#oracleCardNext').click();
 await expect(viewer.locator('[data-source-id="pepe-brooke"]')).toHaveCount(0);
});

test('GUESS real denim purchase card and app-installer disclosure remain distinct from Bubbles orb',async({page})=>{
 await page.goto(base+'/?card=guess-g11-light',{waitUntil:'domcontentloaded'});
 const card=page.locator('#oracleCardStage [data-source-id="guess-g11-light"]');
 await expect(card).toBeVisible({timeout:20000});
 await expect(card.locator('img.qbp-photo')).toHaveAttribute('src',/W4BA0YD5CCA-GJRV/);
 await expect(card.getByText('$89.00',{exact:false})).toBeVisible();
 await expect(page.locator('details.q-install-details')).not.toHaveAttribute('open');
 await page.locator('details.q-install-details summary').click();
 await expect(page.getByRole('link',{name:'Install Bubbles in Chrome'})).toBeVisible();
 await expect(page.locator('#q')).toBeVisible();
});
