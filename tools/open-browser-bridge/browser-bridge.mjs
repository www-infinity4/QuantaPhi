import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { isAllowedUrl, parseAllowedHosts } from './policy.mjs';
import { resolvesOnlyPublicAddresses } from './dns-policy.mjs';
import { installRequestPolicy } from './request-policy.mjs';

const raw = process.argv[2];
if (!raw) throw new Error('Usage: node browser-bridge.mjs https://example.com');
const allowed = parseAllowedHosts(process.env.BROWSER_ALLOWED_HOSTS || 'example.com');
if (!isAllowedUrl(raw, allowed)) throw new Error('URL not permitted by HTTPS hostname policy');
// Preflight does not pin Chromium DNS: real network isolation is still required.
if (!(await resolvesOnlyPublicAddresses(new URL(raw).hostname))) {
  throw new Error('DNS failed or resolved to a non-public network');
}
const browser = await chromium.launch({ headless: true, chromiumSandbox: true });
try {
  const context = await browser.newContext({ acceptDownloads: false, serviceWorkers: 'block' });
  // Context-wide interception covers the first navigation of popups/new tabs;
  // page.route() does not. Install before any page can make a request.
  await installRequestPolicy(context, allowed);
  const page = await context.newPage();
  await page.goto(raw, { waitUntil: 'domcontentloaded', timeout: 20000 });
  // A navigation can end on a different URL; never issue a successful receipt for an unapproved destination.
  if (!isAllowedUrl(page.url(), allowed)) throw new Error('Final URL not permitted by HTTPS hostname policy');
  await mkdir('receipts', { recursive: true });
  const screenshot = 'receipts/last-visit.png';
  await page.screenshot({ path: screenshot, fullPage: false });
  console.log(JSON.stringify({ ok: true, url: page.url(), title: await page.title(), screenshot }));
  await context.close();
} finally { await browser.close(); }
