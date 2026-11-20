import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Runner-level guard: no success receipt may be issued before the final URL
// is checked. This is a static guard, not a substitute for Chromium E2E tests.
test('runner checks final navigation destination before screenshot and success receipt', async () => {
  const source = await readFile(new URL('./browser-bridge.mjs', import.meta.url), 'utf8');
  const navigation = source.indexOf('await page.goto(raw,');
  const finalCheck = source.indexOf('if(!isAllowedUrl(page.url(),allowed,{torIsolated:isolated}))');
  const screenshot = source.indexOf('await page.screenshot(');
  const receipt = source.indexOf('console.log(JSON.stringify({ok:true');
  assert.ok(navigation >= 0 && finalCheck > navigation, 'final URL must be checked after navigation');
  assert.ok(screenshot > finalCheck, 'screenshot must follow final URL check');
  assert.ok(receipt > screenshot, 'success receipt must follow screenshot');
});

test('runner fails closed on missing or non-2xx HTTP response before screenshot or receipt', async () => {
  const source = await readFile(new URL('./browser-bridge.mjs', import.meta.url), 'utf8');
  const goto = source.indexOf('const response=await page.goto(');
  const guard = source.indexOf('if(!response || response.status()<200 || response.status()>=300)');
  const screenshot = source.indexOf('await page.screenshot(');
  const receipt = source.indexOf('console.log(JSON.stringify({ok:true');
  assert.ok(goto >= 0 && guard > goto && guard < screenshot && screenshot < receipt);
  assert.match(source, /status:response\.status\(\)/);
});
