// Android card acceptance browser: mocked data only, never a real search or paid action.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const output='oracle-browser-evidence';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true});
const report={when:new Date().toISOString(),mockedResearch:false,live:[],warnings:[],screenshots:[]};
try{
 const context=await browser.newContext({viewport:{width:360,height:800},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 const page=await context.newPage();
 // Everything here is a fixture. No production wallet, minted Quant or live search.
 await page.route('https://orange-brook-a2ac.marvaseater.workers.dev/**',async route=>{
  const term=new URL(route.request().url()).searchParams.get('q')||'unknown';
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({results:[{title:'Indexed research for '+term,url:'https://example.org/'+encodeURIComponent(term),content:'Search snippet for '+term}]})});
 });
 await page.route('https://infinity-rogers.marvaseater.workers.dev/**',async route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,output_text:'RadioShack Brand covers manufacturer and company identity. RadioShack Model covers catalog models and product families. Both categories belong to this RadioShack research record, but their evidence is distinct and requires source checking.'})}));
 await page.setContent('<head><base href="https://quantaphi.org/"></head><main id="result"><div id="overview"><section class="qzone qzoneRed"><h3>AI Overview</h3><p>RadioShack was an electronics retail brand.</p></section><section class="qzone qzoneYellow"><h3>Data extraction</h3><ul id="qYellowDataList"><li><a href="/?q=Brand">Brand</a></li><li><a href="/?q=Model">Model</a></li></ul></section></div><input id="q" value="RadioShack"></main>');
 await page.evaluate(()=>{window.__qActiveTokenId='quant-demo';window.__testTokens=[{id:'quant-demo',query:'RadioShack',payload:{findings:[]},dataExtraction:{}}];window.QuantaUnifiedTokenLedger={mutate:async fn=>fn(window.__testTokens),load:async()=>window.__testTokens};window.QuantaInfinityCredit={persistResearch:async()=>true};window.PhiAssimilation={ingest:async()=>true,signal:()=>true};window.QuantaStarCredit=()=>false;});
 await page.addStyleTag({path:'phi-scholastic-data.css'});
 await page.addScriptTag({path:'phi-scholastic-data.js'});
 assert.equal(await page.locator('.q-oracle-reader img').count(),0,'Scholastic Reader must not contain book illustration');
 assert.equal(await page.locator('.qdata-select').count(),2);
 await page.locator('.qdata-select').first().click();
 const go=await page.locator('.qdata-open').first().getAttribute('href'),u=new URL(go);
 assert.equal(u.searchParams.get('q'),'RadioShack Brand');
 assert.equal(u.searchParams.get('from'),'quant-demo');
 await page.locator('.qdata-select').nth(1).click();
 await page.getByRole('button',{name:'Compare selected'}).click();
 await page.waitForSelector('.qdata-comparison-table tbody tr');
 assert.equal(await page.locator('.qdata-comparison-table tbody tr').count(),2,'Both selected subjects must have an evidence row');
 const queries=await page.locator('.qdata-comparison-table tbody tr td:nth-child(2)').allTextContents();
 assert.deepEqual(queries.map(x=>x.trim()),['RadioShack Brand','RadioShack Model']);
 const comparison=await page.evaluate(()=>window.__testTokens[0].dataExtraction?.comparisons?.[0]);
 assert.ok(comparison);assert.equal(comparison.terms.length,2);
 await page.getByRole('button',{name:'Extract',exact:true}).click();
 await page.waitForFunction(()=>window.__testTokens[0].dataExtraction?.selectedEntries?.length===2);
 const extraction=await page.evaluate(()=>window.__testTokens[0].dataExtraction.selectedEntries);
 assert.equal(extraction[0].originQuery,'RadioShack');
 assert.equal(extraction[0].sourceQuery,'RadioShack Brand');
 const height=await page.locator('.qdata-compare').evaluate(e=>Math.round(e.getBoundingClientRect().height));
 assert.ok(height>=44,'Compare touch target must be 44px or more');
 await page.screenshot({path:output+'/reader-comparison-android.png',animations:'disabled'});
 report.mockedResearch=true;report.screenshots.push('reader-comparison-android.png');
 await context.close();
 if(process.env.ORACLE_BROWSER_LIVE==='1'){
  for(const target of [
   {name:'QuantaPhi',url:'https://quantaphi.org/',selector:'#q'},
   {name:'Infinity Radio',url:'https://www-infinity4.github.io/Alien-Radio/',selector:'body'},
   {name:'Omni Phi',url:'https://www-infinity4.github.io/Omni-Phi/',selector:'body'}
  ]){
   const ctx=await browser.newContext({viewport:{width:360,height:800},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
   const tab=await ctx.newPage();const entry={name:target.name,url:target.url};
   try{
    const response=await tab.goto(target.url,{waitUntil:'domcontentloaded',timeout:25000});
    entry.http=response?.status()||0;entry.title=await tab.title();
    if(entry.http!==200||!await tab.locator(target.selector).count())entry.status='failed';
    else entry.status='passed';
    const buttons=await tab.locator('button').count();entry.controls=buttons;
    const unnamed=await tab.locator('button').evaluateAll(bs=>bs.filter(b=>!b.textContent?.trim()&&!b.getAttribute('aria-label')&&!b.getAttribute('title')).length);
    entry.unnamedButtons=unnamed;
    if(unnamed>0)report.warnings.push(target.name+': '+unnamed+' controls have no textual label');
    await tab.screenshot({path:output+'/'+target.name.toLowerCase().replace(/\s/g,'-')+'-mobile.png',animations:'disabled'});
    report.screenshots.push(target.name.toLowerCase()+'-mobile.png');
   }catch(error){entry.status='unavailable';entry.error=String(error.message||error).slice(0,250);}
   report.live.push(entry);await ctx.close();
  }
  if(report.live.some(x=>x.status!=='passed'))process.exitCode=1;
 }
}catch(error){report.error=String(error.stack||error);process.exitCode=1}
finally{await fs.writeFile(output+'/report.json',JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify(report));}
