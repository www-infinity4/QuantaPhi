import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:8799';
test.use({viewport:{width:360,height:800}});

for(const magazine of [
 {id:'easyriders-magazine',title:'Harley-Davidson Evolves Racing Strategy',next:'Michelle & The Wizard',domain:'easyriders.com'},
 {id:'motorcycle-magazine',title:'Indian Motorcycle Introduces ARO Parts Lineup',next:'2026 Zero XE: Electric Dirt Bike Review',domain:'www.motorcycle-magazine.com'},
 {id:'high-times-magazine',title:'Why Is It Called Mushroom Jazz?',next:'The Ducks Running Pest Control at a Colorado Farm',domain:'hightimes.com'}
]){
 test(magazine.id+' is a readable in-page magazine reader on Android width',async({page})=>{
  await page.goto(base+'/source-quick-card.html?card='+magazine.id,{waitUntil:'domcontentloaded'});
  const reader=page.locator('.qcx-magazine-reader');
  await expect(reader).toBeVisible();
  await expect(reader.locator('.qcx-magazine-title')).toHaveText(magazine.title);
  await expect(reader.locator('.qcx-magazine-summary')).not.toBeEmpty();
  await expect(reader.locator('.qcx-magazine-original')).toHaveAttribute('href',new RegExp('^https://'+magazine.domain.replaceAll('.','\\.')+'/'));
  await expect(reader.getByText('Story 1 of')).toBeVisible();
  const firstLink=await reader.locator('.qcx-magazine-original').getAttribute('href');
  await reader.getByRole('button',{name:'Next story'}).click();
  await expect(reader.locator('.qcx-magazine-title')).toHaveText(magazine.next);
  expect(await reader.locator('.qcx-magazine-original').getAttribute('href')).not.toBe(firstLink);
  await reader.getByRole('button',{name:'Previous story'}).click();
  await expect(reader.locator('.qcx-magazine-title')).toHaveText(magazine.title);
  const width=await reader.evaluate(el=>el.getBoundingClientRect().right<=innerWidth+1);
  expect(width).toBeTruthy();
 });
}
test('magazines are discoverable inside the existing public Oracle swipe collection',async({page})=>{
 await page.goto(base+'/?card=easyriders-magazine',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#oracleCardDeck')).toBeVisible();
 const card=page.locator('#oracleCardStage .qcx-magazine-reader');
 await expect(card).toBeVisible({timeout:15000});
 await expect(card.locator('.qcx-magazine-title')).toHaveText('Harley-Davidson Evolves Racing Strategy');
 await expect(page.locator('.oracle-card-deck-stage .qca-toolbar')).toBeVisible();
});
