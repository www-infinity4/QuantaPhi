/* Android-width Chromium evidence for public Bubbles Family Safety Watch.
 * Uses local assets only; not proof of Qatar alerts, deployment or a physical Android device.
 */
import {chromium} from 'playwright';
import {strict as assert} from 'node:assert';
import {mkdirSync,writeFileSync} from 'node:fs';
const origin=process.env.BUBBLES_LOCAL_ORIGIN||'http://127.0.0.1:8765';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const receipts=[];
try{
 const page=await browser.newPage({viewport:{width:360,height:780},permissions:[]});
 const errors=[];const crossOrigin=[];
 page.on('pageerror',error=>errors.push(String(error.message).slice(0,180)));
 page.on('request',request=>{if(!request.url().startsWith(origin+'/'))crossOrigin.push(request.url());});
 const response=await page.goto(origin+'/bubbles-card-host.html?card=family-safety',{waitUntil:'domcontentloaded',timeout:25000});
 assert.equal(response.status(),200);
 await page.waitForFunction(()=>window.BubblesCardDiagnostics?.().loaded===true,null,{timeout:20000});
 assert.equal((await page.evaluate(()=>window.BubblesCardDiagnostics())).id,'family-safety');
 assert.equal(await page.locator('.fsw-source').count(),4,'four official notice sources');
 await page.locator('.fsw-summary').waitFor({state:'visible'});
 await page.waitForFunction(()=>document.querySelector('.fsw-summary')?.textContent.includes('No verified scheduled scan yet'),null,{timeout:15000});
 const links=await page.locator('.fsw-source a').evaluateAll(nodes=>nodes.map(n=>n.href));
 assert.equal(links.length,4);
 assert.ok(links.every(href=>href.startsWith('https://')&&!href.includes('example.com')));
 assert.equal(await page.locator('.fsw-source:visible').count(),4);
 await page.getByRole('button',{name:'Show changed pages only'}).click();
 assert.equal(await page.locator('.fsw-source:visible').count(),0,'no invented changes');
 await page.getByRole('button',{name:'Show all official sources'}).click();
 assert.equal(await page.locator('.fsw-source:visible').count(),4);
 await page.getByRole('button',{name:'Auto-check: off'}).click();
 assert.equal(await page.getByRole('button',{name:'Auto-check: on'}).getAttribute('aria-pressed'),'true');
 await page.getByRole('button',{name:'Auto-check: on'}).click();
 assert.equal(await page.getByRole('button',{name:'Auto-check: off'}).getAttribute('aria-pressed'),'false');
 const minTap=await page.locator('.fsw-controls button').evaluateAll(nodes=>nodes.map(el=>Math.round(el.getBoundingClientRect().height)));
 assert.ok(minTap.every(height=>height>=44),'touch controls must be at least 44px tall');
 const docWidth=await page.evaluate(()=>document.documentElement.scrollWidth);
 assert.ok(docWidth<=360,'mobile view must not overflow horizontally');
 assert.deepEqual(errors,[],'no runtime JS errors');
 assert.deepEqual(crossOrigin,[],'card must not make third-party browser requests');
 mkdirSync('test-results',{recursive:true});
 await page.screenshot({path:'test-results/family-safety-mobile.png',fullPage:true});
 receipts.push({route:'bubbles-card-host.html?card=family-safety',viewport:360,cardRendered:true,
    officialSources:4,emptyNoticeStateHonest:true,autoToggleWorks:true,controlHeights:minTap,
    horizontalOverflow:false,externalNetworkRequests:0,errors:[]});
 const full=await browser.newPage({viewport:{width:390,height:844}});
 const site=await full.goto(origin+'/family-safety.html',{waitUntil:'domcontentloaded',timeout:25000});
 assert.equal(site.status(),200,'standalone Family Safety page');
 await full.locator('#familySafetyQuickCard .fsw-headings h2').waitFor({state:'visible',timeout:18000});
 receipts.push({route:'family-safety.html',viewport:390,pageRendered:true});
 await full.close();await page.close();
}finally{
 mkdirSync('test-results',{recursive:true});
 writeFileSync('test-results/family-safety-browser.json',JSON.stringify({kind:'local_chromium_source_qa',productionVerified:false,androidDeviceVerified:false,receipts},null,2)+'\n');
 await browser.close();
}
console.log('Family Safety Watch: verified local browser card, mobile controls and standalone page.');
