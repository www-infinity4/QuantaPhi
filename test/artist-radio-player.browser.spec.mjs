import {test,expect} from '@playwright/test';

const base='http://127.0.0.1:8799';
test.use({viewport:{width:360,height:800}});

test('official classic-rock player starts the selected recording in-card and Pink Floyd Next changes tracks',async({page})=>{
 await page.route('https://www.youtube.com/embed/**',route=>route.fulfill({
  contentType:'text/html',body:'<!doctype html><title>Video provider test stub</title><p>Embedded player</p>'}));
 await page.goto(base+'/?card=classicRockOfficialMusicCard',{waitUntil:'domcontentloaded'});
 const card=page.locator('#oracleCardStage #classicRockOfficialMusicCard');
 await expect(card).toBeVisible({timeout:25000});
 const play=card.locator('.cr-radio-play');
 await expect(play).toHaveAttribute('aria-label',/Play Pink Floyd Radio/);
 await play.click();
 const panel=card.locator('.cr-player-panel');
 await expect(panel).toBeVisible();
 const frame=panel.locator('iframe');
 await expect(frame).toHaveAttribute('src',/https:\/\/www\.youtube\.com\/embed\/K6qj09OHvjw\?/);
 await expect(card.locator('.cr-radio-name')).toHaveText('Pink Floyd Radio');

 const next=card.getByRole('button',{name:'Next Pink Floyd track'});
 await expect(next).toBeVisible();
 await next.click();
 await expect(frame).toHaveAttribute('src',/https:\/\/www\.youtube\.com\/embed\/HrxX9TBj2zY\?/);
 await expect(card.locator('.cr-radio-status')).toContainText('Another Brick in the Wall');
 await card.getByRole('button',{name:'Play Journey official music'}).click();
 await expect(frame).toHaveAttribute('src',/https:\/\/www\.youtube\.com\/embed\/VcjzHMhBtf0\?/);
 await expect(card.locator('.cr-radio-name')).toHaveText('Journey Radio');
 await expect(next).toBeHidden();
 await play.click();
 await expect(panel).toBeHidden();
 await expect(frame).not.toHaveAttribute('src');
 expect(await card.evaluate(el=>el.getBoundingClientRect().right<=innerWidth)).toBeTruthy();
});
