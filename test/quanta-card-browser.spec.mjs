import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:8799';
test.use({viewport:{width:390,height:844}});
test('Public / For You / Following uses polished functional card on homepage',async({page})=>{
 await page.goto(base+'/',{waitUntil:'domcontentloaded'});
 const feed=page.locator('#quantaDiscoveryFeed');
 await expect(feed.locator('.qf-tabs')).toBeVisible({timeout:15000});
 await expect(feed.locator('.qcx-art').first()).toBeVisible();
 await expect(feed.locator('.qcx-experience').first()).toBeVisible();
 const art=feed.locator('.qcx-art').first();
 await expect(art).not.toHaveText(/^✦$/);
 const overflow=await art.evaluate(e=>e.getBoundingClientRect().width>window.innerWidth);
 expect(overflow).toBeFalsy();
 await feed.getByRole('tab',{name:'For You'}).click();
 await expect(feed.getByRole('tab',{name:'For You'})).toHaveAttribute('aria-selected','true');
 await feed.getByRole('tab',{name:'Following'}).click();
 await expect(feed.getByText('No followed cards yet')).toBeVisible();
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
 await page.route('https://en.wikipedia.org/w/api.php**',route=>route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({query:{pages:{'100':{index:1,title:'Philco',extract:'A verified encyclopedia test article.',fullurl:'https://en.wikipedia.org/wiki/Philco'}}}}})}));
 await page.goto(base+'/quanta-feed-card.html?card=wikipedia',{waitUntil:'domcontentloaded'});
 await page.getByLabel('Wikipedia search').fill('Philco');
 await page.getByRole('button',{name:'Load articles'}).click();
 await expect(page.getByText('A verified encyclopedia test article.')).toBeVisible();
 await expect(page.getByRole('link',{name:/Read and verify at Wikipedia/})).toHaveAttribute('href','https://en.wikipedia.org/wiki/Philco');
});
test('Google trends refresh displays only a dated and attributed Google RSS snapshot',async({page})=>{
 const body={source:'Google Trends Trending Now RSS',region:'US',checked_at:'2026-10-24T04:00:00Z',source_url:'https://trends.google.com/trending/rss?geo=US',topics:[{query:'Philco radios',approx_searches:'20K+',published_at:'2026-10-24T02:00:00Z'}]};
 await page.route('**/data/google-trends-latest.json',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)}));
 await page.goto(base+'/source-quick-card.html?card=google',{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:/Refresh verified topics/}).click();
 await expect(page.getByText('Philco radios')).toBeVisible();
 await expect(page.getByText(/20K\+ approximate Google searches/)).toBeVisible();
 await expect(page.getByText(/Google U.S. search-volume buckets/)).toBeVisible();
});
test('StarMaker microphone is off until explicit start and a stop control is provided',async({page})=>{
 await page.goto(base+'/source-quick-card.html?card=starmaker',{waitUntil:'domcontentloaded'});
 await expect(page.getByText('Microphone is off')).toBeVisible();
 await expect(page.getByRole('button',{name:'● Start recording'})).toBeEnabled();
 await expect(page.getByRole('button',{name:'■ Stop'})).toBeDisabled();
});
