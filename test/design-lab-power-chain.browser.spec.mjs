import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:8799';
test.use({viewport:{width:390,height:844}});
function broker(page){
 let calls=0;
 page.route('https://orange-brook-a2ac.marvaseater.workers.dev/search**',route=>{
  calls++;
  const u=new URL(route.request().url()),target=(u.searchParams.get('q')||'').split(' ')[0].slice(5);
  return route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},
   body:JSON.stringify({results:[
    {title:'Original '+target+' public result',url:'https://www.'+target+'/discover/real',content:'Source-linked research index result.'},
    {title:'Spoofed result',url:'https://'+target+'.attacker.example/steal'}
   ]})});
 });
 return ()=>calls;
}
test('full Power Chain is a visible functional 3D workbench on Android',async({page})=>{
 const count=broker(page);
 await page.goto(base+'/design-lab/index.html',{waitUntil:'domcontentloaded'});
 await expect(page.getByRole('heading',{name:/Invent the impossible-looking/})).toBeVisible();
 await expect(page.locator('.lab-scene .lab-disc')).toHaveCount(3);
 await expect(page.getByRole('button',{name:'Run Power Chain',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Collect'})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'AUTO-WIRE ↗'}).click();
 await expect(page.locator('#intentReason')).toContainText('Collector terminology');
 await page.getByRole('button',{name:/RUN POWER CHAIN/}).click();
 await expect(page.getByText(/Run finished\./)).toBeVisible({timeout:30000});
 await expect(page.locator('.lab-result')).toHaveCount(10);
 await expect(page.locator('.lab-result a').first()).toHaveAttribute('href',/^https:\/\//);
 await expect(page.getByText('Spoofed result')).toHaveCount(0);
 expect(count()).toBe(10);
 const horizontal=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);
 expect(horizontal).toBe(false);
});
test('intent routing and Stop visibly prevent fabricated completion',async({page})=>{
 await page.goto(base+'/design-lab/index.html',{waitUntil:'domcontentloaded'});
 await page.locator('#chainIntent').fill('latest climate and technology news');
 await page.locator('#autoWire').click();
 await expect(page.getByRole('button',{name:'Signal'})).toHaveAttribute('aria-pressed','true');
 await page.route('https://orange-brook-a2ac.marvaseater.workers.dev/search**',()=>new Promise(()=>{}));
 await page.locator('#runPower').click();
 await expect(page.locator('#stopPower')).toBeEnabled();
 await page.locator('#stopPower').click();
 await expect(page.locator('#monitorMode')).toHaveText('STOPPED',{timeout:15000});
 await expect(page.locator('#countChecked')).not.toHaveText('10');
});
test('Oracle homepage registers real Power Chain card without a second fake viewer',async({page})=>{
 broker(page);
 await page.goto(base+'/?card=power-chain',{waitUntil:'domcontentloaded'});
 const card=page.locator('#oracleCardDeck .lab-quick-card');
 await expect(card).toBeVisible({timeout:20000});
 await expect(card.getByRole('button',{name:/RUN 10-SOURCE CHAIN/})).toBeVisible();
 await card.locator('.lab-card-go').click();
 await expect(card.locator('.lab-card-result').first()).toBeVisible({timeout:30000});
 await expect(card.locator('.lab-card-result').first()).toHaveAttribute('href',/^https:\/\//);
 await expect(card.getByRole('link',{name:/Full design lab/})).toHaveAttribute('href','/design-lab/index.html');
 const horizontal=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);
 expect(horizontal).toBe(false);
});
