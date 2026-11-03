import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:8799';

test('department dropdown opens Santa’s five original cards, preserves controls, and shows real store links',async({page})=>{
 await page.setViewportSize({width:360,height:800});
 await page.goto(base+'/',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#oracleDepartment option[value="santas-helper"]')).toHaveCount(1);
 await page.locator('#oracleDepartment').selectOption('santas-helper');
 const stage=page.locator('#oracleCardStage');
 await expect(stage.locator('#santa-welcome')).toBeVisible({timeout:20000});
 await expect(stage.locator('img.santa-hero')).toBeVisible();
 await expect(stage.locator('img.santa-hero')).toHaveAttribute('src','/assets/santas-helper-welcome.svg');
 await stage.locator('#santaGiftRequest').fill('I want a gift for my mother. She loves books and plants. Budget $80.');
 await stage.getByRole('button',{name:'Find gift ideas'}).click();
 await expect(stage.locator('#santaGiftResults')).toContainText('your mother');
 await expect(stage.locator('#santaGiftResults')).toContainText('$80.00');
 await stage.locator('.santa-recommendation').first().getByRole('button',{name:'Explore this gift card'}).click();
 await expect(stage.locator('#santa-hobbies')).toBeVisible();
 await expect(stage.getByRole('link',{name:/Barnes & Noble/})).toHaveAttribute('href',/barnesandnoble.com/);
 await stage.getByRole('button',{name:'＋ Add gift idea'}).click();
 await expect(stage.getByText('Added to your local gift list.')).toBeVisible();
 await stage.getByRole('button',{name:'Talk to Santa'}).click();
 await expect(stage.locator('#santa-welcome')).toBeVisible();
 await expect(stage.locator('#santaShortlist')).toContainText('1 gift ideas');
 await expect(page.locator('#oracleDepartment')).toHaveValue('santas-helper');
 await page.locator('#oracleCardNext').click();
 await expect(stage.locator('.santa-card')).toHaveCount(1);
 await expect(stage.locator('[data-age-restricted="true"]')).toHaveCount(0);
 for(const width of [320,393,430]){
  await page.setViewportSize({width,height:800});
  expect(await stage.evaluate(el=>el.getBoundingClientRect().right<=innerWidth+2),'Santa card fits '+width+'px').toBeTruthy();
 }
});

test('recipient photo remains optional browser-only preview and removal revokes the local view',async({page})=>{
 await page.setViewportSize({width:360,height:780});
 await page.goto(base+'/',{waitUntil:'domcontentloaded'});
 await page.locator('#oracleDepartment').selectOption('santas-helper');
 const stage=page.locator('#oracleCardStage');
 await expect(stage.locator('#santa-welcome')).toBeVisible({timeout:20000});
 await expect(stage.getByText(/No upload, face identification, AI analysis/)).toBeVisible();
 const tinyPng=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL3AAAAAElFTkSuQmCC','base64');
 await stage.locator('#santaGiftPhoto').setInputFiles({name:'gift-preview.png',mimeType:'image/png',buffer:tinyPng});
 await expect(stage.locator('#santaPhotoPreview img')).toBeVisible();
 await expect(stage.locator('#santaPhotoPreview img')).toHaveAttribute('src',/^blob:/);
 await stage.getByRole('button',{name:'Remove photo'}).click();
 await expect(stage.locator('#santaPhotoPreview img')).toHaveCount(0);
 await expect(stage.locator('#santaGiftPhoto')).toHaveValue('');
});
