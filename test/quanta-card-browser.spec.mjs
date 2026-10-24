import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:8799';
test.use({viewport:{width:390,height:844}});
test('original single-card Oracle viewer replaces the giant feed on Android width',async({page})=>{
 await page.goto(base+'/',{waitUntil:'domcontentloaded'});
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
 await page.route('https://orange-brook-a2ac.marvaseater.workers.dev/search**',route=>{
  return route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},
   body:JSON.stringify({results:[{title:'Philco model 90 historical radio',url:'https://example.org/philco-90',content:'Real linked listing from a Google engine test fixture.',engine:'google'}]})});
 });
 await page.goto(base+'/',{waitUntil:'domcontentloaded'});
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
test('StarMaker microphone is off until explicit start and a stop control is provided',async({page})=>{
 await page.goto(base+'/source-quick-card.html?card=starmaker',{waitUntil:'domcontentloaded'});
 await expect(page.getByText('Microphone is off')).toBeVisible();
 await expect(page.getByRole('button',{name:'● Start recording'})).toBeEnabled();
 await expect(page.getByRole('button',{name:'■ Stop'})).toBeDisabled();
});
