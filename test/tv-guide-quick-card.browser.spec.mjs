import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:8799';
const image='https://static.tvmaze.com/uploads/images/original_untouched/1/2.jpg';
const ep=(id,hour,network,title)=>({
 id,name:'Episode '+id,airdate:'2026-10-31',airtime:hour+':00',
 airstamp:'2026-10-31T'+hour+':00:00-05:00',runtime:45,season:2,number:id,
 url:'https://www.tvmaze.com/episodes/'+id+'/episode',
 summary:'<p>Current sourced episode description</p>',
 image:{original:image},
 show:{name:title,network:{name:network},image:null,summary:'<p>Show synopsis</p>'}
});
const episodes=[ep(1,'09','ABC','Morning News'),ep(2,'19','FOX','Saturday Drama'),ep(3,'20','FOX','Evening Documentary')];
test.use({viewport:{width:360,height:800},timezoneId:'America/Chicago',reducedMotion:'reduce'});
async function setup(page,{offline=false}={}){
 await page.clock.setFixedTime(new Date('2026-10-31T12:00:00-05:00'));
 await page.route('**/*',route=>{
  const u=new URL(route.request().url());
  if(u.origin===base)return route.continue();
  if(u.hostname==='api.tvmaze.com'){
   if(offline)return route.fulfill({status:503,body:'unavailable'});
   return route.fulfill({status:200,headers:{'access-control-allow-origin':'*'},contentType:'application/json',body:JSON.stringify(episodes)});
  }
  if(u.hostname==='static.tvmaze.com')return route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900"><rect width="1600" height="900" fill="#246a9e"/></svg>'});
  return route.abort();
 });
 await page.goto(base+'/source-quick-card.html?card=tv-guide',{waitUntil:'domcontentloaded'});
}
test('TV Guide opens sourced seven-day carousel and filters network, time and episode details',async({page})=>{
 await setup(page);
 const guide=page.locator('.itg-guide');
 await expect(guide).toBeVisible();
 await expect(page.locator('.itg-program')).toHaveCount(3);
 await expect(page.locator('.itg-program img').first()).toHaveAttribute('alt','Artwork for Morning News');
 await expect(guide.getByLabel('Day')).toBeVisible();
 await expect(guide.getByLabel('Day').locator('option')).toHaveCount(7);
 await guide.getByLabel('Network').selectOption('FOX');
 await expect(page.locator('.itg-program')).toHaveCount(2);
 await guide.getByLabel('Time slot').selectOption('prime');
 await expect(page.locator('.itg-counter')).toHaveText('1 / 2');
 await guide.getByRole('button',{name:'Next program'}).click();
 await expect(page.locator('.itg-counter')).toHaveText('2 / 2');
 await expect(page.locator('.itg-program').last()).toContainText('Evening Documentary');
 await expect(guide).toContainText('TVmaze');
 await expect(guide).toContainText('full local TV Guide listings');
 expect(await guide.evaluate(e=>e.getBoundingClientRect().width<=innerWidth)).toBe(true);
});
test('TV Guide does not manufacture content when provider is unavailable',async({page})=>{
 await setup(page,{offline:true});
 await expect(page.locator('.itg-status')).toContainText('could not be loaded');
 await expect(page.locator('.itg-program')).toHaveCount(0);
 await expect(page.getByRole('link',{name:'Open full local TV Guide listings'})).toHaveAttribute('href','https://www.tvguide.com/listings/');
});
