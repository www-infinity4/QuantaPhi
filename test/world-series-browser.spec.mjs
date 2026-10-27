import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:8799';
test.use({viewport:{width:390,height:844}});
const now=new Date().toISOString();
const feed={
 schema_version:1,topic:'2026 World Series',checked_at:now,
 articles:[{
  title:'Brewers and Rays: Four key World Series Game 2 questions',
  publisher:'MLB.com',kind:'Analysis',published_at:now,
  summary:'Short independently attributed publisher teaser.',
  url:'https://www.mlb.com/news/world-series-game-2-2026',
  image_url:'https://img.mlbstatic.com/mlb-photos/g2.jpg',
  author:'MLB Analysis Desk'
 },{
  title:'Rays respond to Brewers after opening game',
  publisher:'ESPN',kind:'Reporting',published_at:now,
  summary:'Attributed headline, not an invented article body.',
  url:'https://www.espn.com/mlb/story/_/id/12345/rays-brewers-world-series',
  image_url:'',
  author:'ESPN Reporter'
 }]
};
test('World Series source reporting shows real feed image, analysts, usable link and item actions',async({page})=>{
 await page.route('**/data/world-series-latest.json**',route=>route.fulfill({
  status:200,contentType:'application/json',body:JSON.stringify(feed),
  headers:{'access-control-allow-origin':'*'}
 }));
 await page.route('https://img.mlbstatic.com/**',route=>route.fulfill({status:200,contentType:'image/svg+xml',
  body:'<svg xmlns="http://www.w3.org/2000/svg" width="480" height="300"><rect width="480" height="300" fill="#123"/></svg>'}));
 await page.goto(base+'/?card=mlb',{waitUntil:'domcontentloaded'});
 const news=page.locator('#googleTrendMlb .ws-news');
 await expect(news).toBeVisible({timeout:20000});
 await expect(news.locator('.ws-news-story')).toHaveCount(2,{timeout:20000});
 const first=news.locator('.ws-news-story').first();
 await expect(first.getByText('Four key World Series Game 2 questions')).toBeVisible();
 await expect(first.locator('.ws-news-photo')).toHaveAttribute('src',/img\.mlbstatic\.com/);
 await expect(first.getByRole('link',{name:/Read the original report/})).toHaveAttribute('href',/mlb\.com\/news/);
 for(const part of ['Star','Collect','Share','+1 Build'])
  await expect(first.locator('.qca-toolbar').getByText(part,{exact:false}).first()).toBeVisible();
 await news.getByLabel('Filter World Series news').selectOption('Reporting');
 await expect(news.locator('.ws-news-story')).toHaveCount(1);
 await expect(news.getByText('Rays respond to Brewers')).toBeVisible();
 await expect(page.locator('#q')).toBeVisible();
});
test('Cardone standalone property has original imagery, five actions and real Bubbles specialist',async({page})=>{
 await page.goto(base+'/cardone-capital.html',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#cardoneQuickActions .qca-toolbar')).toBeVisible({timeout:20000});
 const actions=page.locator('#cardoneQuickActions');
 for(const part of ['Star','Collect','Share','+1 Build'])
  await expect(actions.getByText(part,{exact:false}).first()).toBeVisible();
 await expect(page.getByRole('link',{name:/Explore the official property/})).toHaveAttribute('href',/cardonecapital\.com\/westshoresouth/);
 await expect(page.locator('script[data-bubble-role="specialist"]')).toHaveAttribute('src',/bubbles-embed\.js/);
});
