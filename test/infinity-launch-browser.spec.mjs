import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:8799';
test.use({viewport:{width:390,height:844}});
test('Portable StarMaker mini card has real controls, source feature handoffs and copyable embed snippet',async({page})=>{
 await page.goto(base+'/starmaker-embed.html',{waitUntil:'domcontentloaded'});
 await expect(page.getByRole('searchbox',{name:'Search verified StarMaker songs'})).toBeVisible();
 await expect(page.getByRole('link',{name:/Duets & collabs/})).toHaveAttribute('href',/play\.google\.com\/store\/apps\/details/);
 await expect(page.getByRole('link',{name:/Sign in at StarMaker/})).toHaveAttribute('href','https://www.starmakerstudios.com/en/web-login');
 await expect(page.locator('details.qcx-recording-details')).not.toHaveAttribute('open');
 await expect(page.locator('#smEmbedCode')).toHaveValue(/<iframe/);
 await page.getByRole('button',{name:'Copy website embed'}).click();
 await expect(page.locator('#smShareStatus')).toContainText(/copied|manually/i);
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
 expect(overflow).toBe(false);
});
test('Outreach page embeds its real same-origin StarMaker card and links working QuantaPhi software',async({page})=>{
 await page.goto(base+'/infinity-launch.html',{waitUntil:'domcontentloaded'});
 await expect(page.getByRole('heading',{name:/StarMaker meets the Infinity Quick Card/})).toBeVisible();
 const frame=page.frameLocator('.demo-stage iframe');
 await expect(frame.getByRole('searchbox',{name:'Search verified StarMaker songs'})).toBeVisible();
 await expect(page.getByRole('link',{name:/Open Bubbles AI/})).toHaveAttribute('href','/bubbles/');
 await expect(page.getByText(/Neither Visa nor Chime is represented/)).toBeVisible();
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
 expect(overflow).toBe(false);
});
