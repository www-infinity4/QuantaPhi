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

test('StarMaker card offers original on-device karaoke effects and a licensed backing file picker',async({page})=>{
 await page.goto(base+'/starmaker-embed.html',{waitUntil:'domcontentloaded'});
 const details=page.locator('details.qcx-recording-details');
 await expect(details).not.toHaveAttribute('open');
 await details.locator('summary').click();
 await expect(page.getByText('Microphone is off',{exact:true})).toBeVisible();
 const effect=page.getByRole('combobox',{name:'Voice effect'});
 await expect(effect).toBeVisible();
 await effect.selectOption('room');
 await expect(effect).toHaveValue('room');
 await page.getByRole('slider',{name:'Backing mix volume'}).fill('60');
 const input=page.getByLabel('Backing audio (optional · your licensed file)');
 await input.setInputFiles({name:'my-demo-track.wav',mimeType:'audio/wav',buffer:Buffer.from([82,73,70,70,36,0,0,0,87,65,86,69,102,109,116,32])});
 await expect(page.getByText('Backing audio ready from your device. Microphone is off.')).toBeVisible();
 await expect(page.getByRole('button',{name:'● Start recording'})).toBeEnabled();
 await expect(page.getByRole('button',{name:'■ Stop'})).toBeDisabled();
 await expect(page.getByText(/No StarMaker songs are downloaded/)).toBeVisible();
});
