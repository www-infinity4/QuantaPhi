import {test,expect} from '@playwright/test';
import {attractionSourceId} from '../attractions-quant-ai.mjs';
const API='https://quantaphi-attractions-directory.marvaseater.workers.dev';
const home='http://127.0.0.1:8799';
test.use({viewport:{width:393,height:830}});
test('Alaska source records become individually actionable Oracle Quick Cards',async({page})=>{
 const items=[
  {id:'curated:alaska-kenai-fjords-center',name:'Kenai Fjords Visitor Center',city:'Seward',state:'AK',
   category:'visitor_center',confidence:.95,website:'https://www.nps.gov/kefj/index.htm',
   source_name:'National Park Service',source_url:'https://www.nps.gov/kefj/contacts.htm',
   license:'US-government-information',image_url:'',last_seen:'2026-11-03T01:26:00Z'},
  {id:'curated:alaska-sitka-history',name:'Sitka National Historical Park',city:'Sitka',state:'AK',
   category:'historic_site',confidence:.9,website:'https://www.nps.gov/sitk/index.htm',
   source_name:'National Park Service',source_url:'https://www.nps.gov/sitk/index.htm',
   license:'US-government-information',image_url:'',last_seen:'2026-11-03T01:26:00Z'}
 ];
 await page.route(API+'/api/attractions/feed?state=AK&page=0',route=>route.fulfill({
  status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},
  body:JSON.stringify({state:'AK',items,has_more:false})
 }));
 await page.route(API+'/api/attractions/search**',route=>route.fulfill({
  status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},
  body:JSON.stringify({state:'AK',items,has_more:false})
 }));
 await page.goto(home+'/?card=attractions-directory&state=AK',{waitUntil:'domcontentloaded'});
 await expect(page.locator('.ad-rec-card')).toHaveCount(2,{timeout:15000});
 const item=page.locator('.ad-rec-card').filter({hasText:'Sitka National Historical Park'});
 await expect(item.locator('.ad-rec-title')).toHaveText('Sitka National Historical Park');
 await expect(item.locator('a.ad-rec-source-link').filter({hasText:'Original visitor site'})).toHaveAttribute('href',/^https:\/\/www\.nps\.gov/);
 await expect(item.locator('a.ad-rec-source-link').filter({hasText:'Directions'})).toHaveAttribute('href',/maps\/search/);
 await expect(item.locator('.ad-rec-disclosure')).toContainText('No paid placement');
 await expect(item.locator('.ad-rec-actions')).toHaveCount(1);
 const id=await item.getAttribute('data-source-id');
 await page.goto(home+'/?card='+id+'&state=AK',{waitUntil:'domcontentloaded'});
 const opened=page.locator('#oracleCardStage [data-source-id="'+id+'"]');
 await expect(opened).toBeVisible({timeout:20000});
 await expect(opened.getByRole('link',{name:'Original visitor site'})).toHaveAttribute('href',/^https:\/\/www\.nps\.gov/);
 await expect(opened.getByRole('link',{name:'Directions'})).toHaveAttribute('href',/maps\/search/);
 await expect(opened.locator('.ad-rec-actions')).toBeVisible();
});

test('Quant AI fetches Alaska once, reopens shared Colorado source cards and never duplicates the active card',async({page})=>{
 const row={
  id:'overture:123e4567-e89b-12d3-a456-426614174000',
  name:'Sourced Mountain Museum',city:'Denver',state:'CO',category:'museum',confidence:.9,
  website:'',source_name:'Overture Maps',source_url:'https://overturemaps.org/',
  license:'CDLA-Permissive-2.0',image_url:'',last_seen:'2026-11-02T00:00:00Z'
 };
 const id=attractionSourceId(row);
 let akFetchCount=0,itemFetchCount=0;
 await page.route(API+'/api/attractions/feed?state=AK&page=0',route=>{
  akFetchCount++;
  return route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({state:'AK',items:[]})});
 });
 await page.route(API+'/api/attractions/item**',route=>{
  itemFetchCount++;
  return route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({item:row})});
 });
 await page.route(API+'/api/attractions/search**',route=>route.fulfill({
  status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},
  body:JSON.stringify({state:'CO',items:[row],has_more:false})
 }));
 await page.goto(home+'/?card='+id+'&attraction='+encodeURIComponent(row.id),{waitUntil:'domcontentloaded'});
 const article=page.locator('#oracleCardStage [data-source-id="'+id+'"]');
 await expect(article).toBeVisible({timeout:20000});
 await expect(article.locator('.ad-rec-title')).toHaveText(row.name);
 await expect(article.getByRole('link',{name:'Source listing'})).toHaveAttribute('href','https://overturemaps.org/');
 expect(itemFetchCount).toBe(1);
 expect(akFetchCount).toBe(1);
 await page.evaluate(()=>document.querySelector('[data-source-id="attractions-directory"]')?.dispatchEvent(new Event('oracle:activate')));
 await expect(page.locator('[data-source-id="attractions-directory"] .ad-status')).toContainText('sourced attractions',{timeout:15000});
 await expect(page.locator('.ad-rec-card[data-source-id="'+id+'"]')).toHaveCount(1);
});