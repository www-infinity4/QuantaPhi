import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:8799';
const root='#zeusSessionHistory';
const first=(page,selector)=>page.locator(root+' '+selector);

for(const width of [320,360,393,720]){
 test('Zeus history layout is readable and stays within '+width+'px viewport',async({page})=>{
  await page.setViewportSize({width,height:850});
  await page.goto(base+'/coliseum/',{waitUntil:'domcontentloaded'});
  await expect(page.getByRole('heading',{name:'Session history & work dots'})).toBeVisible();
  await expect(page.locator(root+' .zeus-legend-pair')).toHaveCount(5);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
 });
}
test('red work, green completion, browsable old session and orange continuation keep receipts',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto(base+'/coliseum/',{waitUntil:'domcontentloaded'});
 await first(page,'input[aria-label="New project or topic title"]').fill('Radio repairs');
 await page.getByRole('button',{name:'Create project thread'}).click();
 await expect(first(page,'.zeus-current-head')).toContainText('Radio repairs');
 await expect(first(page,'.zeus-status')).toContainText('Unfinished');
 await first(page,'textarea[aria-label="Write a task or paste the exact extract"]').fill('Check the microphone repair workflow');
 await page.getByRole('button',{name:'Add work to this session'}).click();
 await first(page,'input[aria-label^="Result, URL"]').fill('Issue #17 repaired with passing local tests');
 await page.getByRole('button',{name:'Record outcome'}).click();
 await page.getByRole('button',{name:'Finish session · green'}).click();
 await expect(first(page,'.zeus-status')).toContainText('Completed with recorded evidence');
 await page.getByRole('button',{name:'Start next session'}).click();
 await expect(first(page,'.zeus-status')).toContainText('Unfinished');
 await expect(first(page,'.zeus-session-entry')).toHaveCount(2);
 await first(page,'.zeus-session-entry').first().click();
 await expect(first(page,'.zeus-history-detail')).toContainText('Check the microphone repair workflow');
 await expect(page.getByRole('button',{name:'Return to active session'})).toBeVisible();
 await page.getByRole('button',{name:'Return to active session'}).click();
 page.once('dialog',dialog=>dialog.accept());
 await page.getByRole('button',{name:'Thread full · orange handoff'}).click();
 await expect(first(page,'.zeus-status')).toContainText('Unfinished');
 await expect(first(page,'.zeus-history-threads')).toContainText('Radio repairs · continuation');
 await page.reload({waitUntil:'domcontentloaded'});
 await expect(first(page,'.zeus-history-threads')).toContainText('Radio repairs · continuation');
 await first(page,'.zeus-history-threads .zeus-thread').last().click();
 await expect(first(page,'.zeus-status')).toContainText('Thread full / continuation');
});
test('yellow extraction exactly routes to blue pending import without inventing a completed import',async({page})=>{
 await page.goto(base+'/coliseum/',{waitUntil:'domcontentloaded'});
 await first(page,'input[aria-label="New project or topic title"]').fill('Source extraction');
 await page.getByRole('button',{name:'Create project thread'}).click();
 await first(page,'select[aria-label="Work classification"]').selectOption('extraction');
 const raw='  Verbatim original wording.\nLine two has extra spacing.  ';
 await first(page,'textarea[aria-label="Write a task or paste the exact extract"]').fill(raw);
 await first(page,'input[aria-label="Source reference (required for yellow extraction)"]').fill('Original owner note #22');
 await page.getByRole('button',{name:'Add work to this session'}).click();
 await expect(first(page,'.zeus-status')).toContainText('Extraction point');
 await page.getByRole('button',{name:'Open focused thread'}).click();
 await expect(first(page,'.zeus-status')).toContainText('Import or AI answer needed');
 await expect(first(page,'.zeus-work-text')).toHaveText(raw);
 await expect(first(page,'.zeus-source')).toContainText('Local extraction');
 await page.getByRole('button',{name:'Show handoff for copying'}).click();
 await expect(first(page,'#zeusHandoffText')).toHaveValue(/Verbatim original wording/);
 await page.reload({waitUntil:'domcontentloaded'});
 await expect(first(page,'.zeus-status')).toContainText('Import or AI answer needed');
});
