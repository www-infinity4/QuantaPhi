import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { isAllowedUrl, parseAllowedHosts } from './policy.mjs';

const raw = process.argv[2];
if (!raw) throw new Error('Usage: node browser-bridge.mjs https://example.com');
const allowed = parseAllowedHosts(process.env.BROWSER_ALLOWED_HOSTS || 'example.com');
if (!isAllowedUrl(raw, allowed)) throw new Error('URL not permitted by HTTPS hostname policy');
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ acceptDownloads: false, serviceWorkers: 'block' });
  const page = await context.newPage();
  await page.route('**/*', route => {
    if (!isAllowedUrl(route.request().url(), allowed)) return route.abort();
    return route.continue();
  });
  await page.goto(raw, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await mkdir('receipts', { recursive: true });
  const screenshot = 'receipts/last-visit.png';
  await page.screenshot({ path: screenshot, fullPage: false });
  console.log(JSON.stringify({ ok: true, url: page.url(), title: await page.title(), screenshot }));
  await context.close();
} finally { await browser.close(); }
