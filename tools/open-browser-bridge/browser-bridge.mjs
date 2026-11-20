import { chromium } from 'playwright';
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { isAllowedUrl, parseAllowedHosts } from './policy.mjs';
import { resolvesOnlyPublicAddresses } from './dns-policy.mjs';
import { installRequestPolicy } from './request-policy.mjs';
import { torTransport } from './transport.mjs';

const raw=process.argv[2];
if(!raw)throw Error('Usage: node browser-bridge.mjs https://example.com');
const env=process.env;
if(env.BROWSER_TRANSPORT && !['direct','tor'].includes(env.BROWSER_TRANSPORT))
  throw Error('Unsupported browser transport');
const isolated=env.BROWSER_TRANSPORT==='tor';
const transport=isolated?torTransport(env,{
  ipv4:await readFile('/proc/net/route','utf8'),
  ipv6:await readFile('/proc/net/ipv6_route','utf8')
}):{mode:'direct'};
const allowed=parseAllowedHosts(env.BROWSER_ALLOWED_HOSTS||'example.com');
if(!isAllowedUrl(raw,allowed,{torIsolated:isolated}))
  throw Error('URL not permitted by exact-host and Tor-mode policy');
if(!isolated && !(await resolvesOnlyPublicAddresses(new URL(raw).hostname)))
  throw Error('DNS failed or resolved to a non-public network');
const receiptDir=env.BROWSER_RECEIPTS_DIR||(isolated?'/receipts':'receipts');
if(isolated&&receiptDir!=='/receipts')throw Error('Tor receipt directory must be isolated');

const browser=await chromium.launch({
  headless:true,
  chromiumSandbox:true,
  ...(isolated?{
    proxy:{server:transport.proxy},
    args:[
      '--disable-quic',
      '--proxy-bypass-list=<-loopback>',
      '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 172.30.211.2',
      '--force-webrtc-ip-handling-policy=disable_non_proxied_udp'
    ]
  }:{})
});
try{
  const context=await browser.newContext({acceptDownloads:false,serviceWorkers:'block'});
  if(isolated)await installRequestPolicy(context,allowed,undefined,{torIsolated:true});
  else await installRequestPolicy(context, allowed);
  const page=await context.newPage();
  await page.goto(raw,{waitUntil:'domcontentloaded',timeout:25000});
  if(!isAllowedUrl(page.url(),allowed,{torIsolated:isolated}))
    throw Error('Final URL not permitted by host policy');
  await mkdir(receiptDir,{recursive:true,mode:0o700});
  const screenshot=join(receiptDir,'last-visit.png');
  await page.screenshot({path:screenshot,fullPage:false});
  console.log(JSON.stringify({ok:true,mode:transport.mode,url:page.url(),title:await page.title(),screenshot}));
  await context.close();
}finally{await browser.close()}
