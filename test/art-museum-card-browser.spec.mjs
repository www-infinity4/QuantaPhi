import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:8799';
test.use({viewport:{width:360,height:800}});
const first={id:27992,title:'A Sunday on La Grande Jatte',artist_title:'Georges Seurat',
 image_id:'2d484387-2509-5e8e-2c43-22f9981972eb',date_display:'1884',medium_display:'Oil on canvas',is_public_domain:true};
test('museum original becomes a real mobile Oracle card with picture and contextual controls',async({page})=>{
 await page.route('https://api.artic.edu/api/v1/artworks/search**',route=>{
  const pageNumber=Number(new URL(route.request().url()).searchParams.get('page'));
  return route.fulfill({contentType:'application/json',headers:{'access-control-allow-origin':'*'},
   body:JSON.stringify({config:{iiif_url:'https://www.artic.edu/iiif/2'},data:pageNumber===1?[first,
    {...first,id:10,title:'Not public domain',is_public_domain:false},
    {...first,id:11,title:'No photo',image_id:null}]:[{...first,id:28560,title:'The Bedroom'}]})});
 });
 await page.route('https://www.artic.edu/iiif/2/**',route=>route.fulfill({
  status:200,contentType:'image/svg+xml',headers:{'access-control-allow-origin':'*'},
  body:'<svg xmlns="http://www.w3.org/2000/svg" width="843" height="480"><rect width="843" height="480" fill="#e8cc9f"/></svg>'
 }));
 await page.goto(base+'/?card=aic-gallery-loader',{waitUntil:'domcontentloaded'});
 const stage=page.locator('#oracleCardStage');
 await expect(stage.locator('[data-source-id="aic-gallery-loader"]')).toBeVisible({timeout:15000});
 await expect(stage.getByText('1 source-backed artwork cards loaded')).toBeVisible({timeout:15000});
 await page.locator('.oracle-card-library summary').click();
 await page.locator('#oracleCardChooser').selectOption('source-aic-27992');
 await expect(stage.locator('.aic-art-image')).toBeVisible();
 await expect(stage.getByRole('link',{name:'View the original museum record'})).toHaveAttribute('href','https://www.artic.edu/artworks/27992');
 for(const action of ['Images','History','Market'])await expect(stage.getByRole('link',{name:action,exact:true})).toBeVisible();
 await expect(stage.locator('.qca-search-input')).toHaveCount(0);
 await expect(page.locator('#oracleCardChooser option[value="source-aic-10"]')).toHaveCount(0);
 await expect(page.locator('#oracleCardChooser option[value="source-aic-11"]')).toHaveCount(0);
 await page.locator('#oracleCardChooser').selectOption('source-aic-gallery-loader');
 await stage.getByRole('button',{name:'Discover more artworks'}).click();
 await expect(stage.getByText('2 source-backed artwork cards loaded')).toBeVisible({timeout:15000});
 await expect(page.locator('#oracleCardChooser option[value="source-aic-28560"]')).toHaveCount(1);
});
