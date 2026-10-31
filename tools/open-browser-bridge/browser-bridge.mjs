import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const raw = process.argv[2];
if (!raw) throw new Error('Usage: node browser-bridge.mjs https://example.com');
const url = new URL(raw);
const allowed = new Set((process.env.BROWSER_ALLOWED_HOSTS || 'example.com').split(',').map(s => s.trim()).filter(Boolean));
if (url.protocol !== 'https:' || !allowed.has(url.hostname)) throw new Error('HTTPS hostname is not on BROWSER_ALLOWED_HOSTS');
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ acceptDownloads: false });
  const page = await context.newPage();
  await page.route('**/*', route => {
    const req = new URL(route.request().url());
    if (req.protocol !== 'https:' || !allowed.has(req.hostname)) return route.abort();
    return route.continue();
  });
  await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await mkdir('receipts', { recursive: true });
  const screenshot = 'receipts/last-visit.png';
  await page.screenshot({ path: screenshot, fullPage: false });
  console.log(JSON.stringify({ ok: true, url: page.url(), title: await page.title(), screenshot }));
  await context.close();
} finally {
  await browser.close();
}
