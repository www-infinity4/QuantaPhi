import {test,expect} from '@playwright/test';
const BASE='http://127.0.0.1:8799';
test.use({viewport:{width:393,height:852}});

test('Integra introduces X using real topics and controls at Android width',async({page})=>{
 await page.goto(BASE+'/source-quick-card.html?card=x',{waitUntil:'domcontentloaded'});
 const tour=page.locator('#sourceQuickCardDetail .qcx-integra-tour');
 await expect(tour).toBeVisible();
 await expect(tour.getByRole('heading',{name:'Explore X with Integra'})).toBeVisible();
 await expect(tour.getByText('not a live @IntegraAI chat',{exact:false})).toBeVisible();
 await expect(tour.getByText('STEP 1 OF 7')).toBeVisible();
 await tour.getByRole('button',{name:'Next'}).click();
 await expect(tour.getByRole('heading',{name:'Your Following timeline'})).toBeVisible();
 await expect(tour.getByText('STEP 2 OF 7')).toBeVisible();
 await tour.getByLabel('Choose an X tour topic').selectOption('developer');
 await expect(tour.getByRole('heading',{name:'Build with the X APIs'})).toBeVisible();
 await expect(tour.getByRole('link',{name:/Official X developer documentation/})).toHaveAttribute('href','https://docs.x.com/');
 await expect(tour.getByText(/web sign-in alone does not give QuantaPhi API permission/)).toBeVisible();
 const dimensions=await tour.evaluate(node=>({right:node.getBoundingClientRect().right,screen:window.innerWidth}));
 expect(dimensions.right).toBeLessThanOrEqual(dimensions.screen+1);
});

test('Integra tour keeps the consented post editor and does not fake account authorization',async({page})=>{
 await page.goto(BASE+'/source-quick-card.html?card=x',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#sourceQuickCardDetail .qca-x-composer textarea')).toBeVisible();
 await expect(page.locator('#sourceQuickCardDetail .qca-x-review')).toHaveAttribute('aria-disabled','true');
 await expect(page.locator('#sourceQuickCardDetail .qca-signin')).toHaveAttribute('href','https://x.com/i/flow/login');
 await expect(page.getByText('No social message is sent by these controls.')).toBeVisible();
 await expect(page.locator('#sourceQuickCardDetail .qcx-integra-tour iframe')).toHaveCount(0);
});
