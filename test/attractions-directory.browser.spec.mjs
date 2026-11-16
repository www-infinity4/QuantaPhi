import {test,expect} from '@playwright/test';
const API='https://quantaphi-attractions-directory.marvaseater.workers.dev';
const base='http://127.0.0.1:8799';
test.use({viewport:{width:393,height:820}});
test('Attractions Quick Card opens the real API search field and source-backed Colorado result',async({page})=>{
 await page.route(API+'/api/attractions/search**',route=>route.fulfill({
  status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},
  body:JSON.stringify({state:'CO',page:0,count:1,has_more:false,items:[{
   id:'curated:colorado-rocky-mountain',name:'Rocky Mountain National Park',city:'Estes Park',state:'CO',
   category:'national_park',website:'https://www.nps.gov/romo/index.htm',
   source_name:'National Park Service',source_url:'https://www.nps.gov/romo/index.htm',
   license:'US-government-information',image_url:'',last_seen:'2026-11-01T00:00:00Z'
  }]})
 }));
 await page.goto(base+'/?card=attractions-directory',{waitUntil:'domcontentloaded'});
 const card=page.locator('#oracleCardStage [data-source-id="attractions-directory"]');
 await expect(card).toBeVisible({timeout:20000});
 await expect(card.getByRole('heading',{name:'Find an adventure, museum, park or scenic stop'})).toBeVisible();
 await expect(card.locator('.ad-info h3')).toHaveText('Rocky Mountain National Park',{timeout:12000});
 await expect(card.getByRole('link',{name:'Official destination'})).toHaveAttribute('href',/nps.gov/);
 await expect(card.getByRole('link',{name:'Open full Infinity Quick Card'})).toHaveAttribute('href','/?card=colorado-rocky-mountain');
 await expect(card.locator('.ad-photo-note')).toBeVisible();
 await expect(card.locator('.ad-nav button').last()).toBeDisabled();
});
test('Queued states cannot appear to contain invented attraction inventory',async({page})=>{
 await page.route(API+'/api/attractions/search**',route=>{
  const u=new URL(route.request().url());
  route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},
   body:JSON.stringify({state:u.searchParams.get('state'),count:0,has_more:false,items:[]})});
 });
 await page.goto(base+'/?card=attractions-directory',{waitUntil:'domcontentloaded'});
 const card=page.locator('#oracleCardStage [data-source-id="attractions-directory"]');
 await expect(card).toBeVisible({timeout:20000});
 await card.locator('select').selectOption('AK');
 await card.locator('button[type="submit"]').click();
 await expect(card.locator('.ad-status')).toContainText('No verified entries yet in Alaska');
 await expect(card.locator('.ad-nav button').last()).toBeDisabled();
});
test('Attractions pagination keeps submitted filters, locks navigation while loading and returns to the previous last item',async({page})=>{
 const requests=[];
 await page.route(API+'/api/attractions/search**',async route=>{
  const url=new URL(route.request().url()),number=Number(url.searchParams.get('page')||0);
  requests.push({state:url.searchParams.get('state'),query:url.searchParams.get('q'),page:number});
  if(number===1)await new Promise(resolve=>setTimeout(resolve,400));
  const count=number===0?24:2;
  const items=Array.from({length:count},(_,i)=>({
   id:'overture:colorado-attraction-'+String(number*24+i+1).padStart(4,'0'),
   name:'Attraction '+(number*24+i+1),city:'Denver',state:'CO',category:'museum',
   source_name:'Overture Maps',source_url:'https://overturemaps.org/',
   license:'CDLA-Permissive-2.0',image_url:'',last_seen:'2026-11-01T00:00:00Z'
  }));
  await route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},
   body:JSON.stringify({state:'CO',page:number,has_more:number===0,items})});
 });
 await page.goto(base+'/?card=attractions-directory',{waitUntil:'domcontentloaded'});
 const card=page.locator('#oracleCardStage [data-source-id="attractions-directory"]');
 await expect(card.locator('.ad-info h3')).toHaveText('Attraction 1',{timeout:20000});
 const next=card.locator('.ad-nav button').last(),prev=card.locator('.ad-nav button').first();
 await card.locator('select').selectOption('AK');
 await card.locator('input[type="search"]').fill('unsent changes');
 for(let i=0;i<23;i++)await next.click();
 await expect(card.locator('.ad-info h3')).toHaveText('Attraction 24');
 await next.click();
 await expect(next).toBeDisabled();
 await expect(prev).toBeDisabled();
 await expect(card.locator('.ad-info h3')).toHaveText('Attraction 25',{timeout:10000});
 const second=requests.find(r=>r.page===1);
 expect(second).toEqual({state:'CO',query:'',page:1});
 await prev.click();
 await expect(card.locator('.ad-info h3')).toHaveText('Attraction 24',{timeout:10000});
 await card.locator('summary').filter({hasText:'Prepare destination card brief'}).click();
 await expect(card.locator('textarea.ad-build-draft')).toBeVisible();
 await expect(card.locator('textarea.ad-build-draft')).toHaveValue(/Attraction 24/);
});
