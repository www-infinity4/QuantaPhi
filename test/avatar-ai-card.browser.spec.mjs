import {test,expect} from '@playwright/test';

test('Avatar AI remains a real readable portable prompt Quick Card on 360px Android layout',async({page})=>{
 await page.setViewportSize({width:360,height:760});
 await page.goto('http://127.0.0.1:8799/source-quick-card.html?card=avatar-ai');
 const card=page.locator('.avatar-ai-suggestion');
 await expect(card).toBeVisible();
 await expect(card.getByRole('heading',{name:'Avatar AI'})).toBeVisible();
 await expect(card.locator('.avatar-ai-prompt')).toHaveValue(/Act as my Avatar AI continuity partner/);
 await expect(card.locator('.avatar-ai-open')).toHaveAttribute('href','https://chatgpt.com/');
 const buttons=card.locator('.avatar-ai-controls').locator('button,a');
 await expect(buttons).toHaveCount(2);
 for(const element of await buttons.all()){
  const size=await element.boundingBox();
  expect(size?.height||0).toBeGreaterThanOrEqual(44);
 }
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
 expect(overflow).toBe(false);
 await card.locator('.avatar-ai-focus').fill('My original computer carts');
 await expect(card.locator('.avatar-ai-prompt')).toHaveValue(/My optional focus: My original computer carts/);
 const dragged=await page.evaluate(()=>{
  const transfer=new DataTransfer();
  document.querySelector('.avatar-ai-drag').dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer:transfer}));
  return transfer.getData('text/plain');
 });
 expect(dragged).toContain('My optional focus: My original computer carts');
 await card.getByRole('button',{name:'Copy Avatar AI prompt'}).click();
 await expect(card.locator('.avatar-ai-status')).toContainText(/Prompt copied|Select the highlighted/);
});
