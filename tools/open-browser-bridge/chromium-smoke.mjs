// Real Chromium smoke in Docker's isolated browser network. No external URL visits.
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {torTransport} from './transport.mjs';
import {installRequestPolicy} from './request-policy.mjs';
import {parseAllowedHosts} from './policy.mjs';

const tor=torTransport(process.env,{
  ipv4:await readFile('/proc/net/route','utf8'),
  ipv6:await readFile('/proc/net/ipv6_route','utf8')
});
const browser=await chromium.launch({
  headless:true,
  chromiumSandbox:true,
  proxy:{server:tor.proxy},
  args:['--disable-quic','--proxy-bypass-list=<-loopback>',
    '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 172.30.211.2',
    '--force-webrtc-ip-handling-policy=disable_non_proxied_udp']
});
try{
  const context=await browser.newContext({acceptDownloads:false,serviceWorkers:'block'});
  await installRequestPolicy(context,parseAllowedHosts('example.com'),undefined,{torIsolated:true});
  const page=await context.newPage();
  await page.setContent('<h1>Chromium sandbox and route policy active</h1>');
  if(await page.locator('h1').textContent()!=='Chromium sandbox and route policy active')
    throw Error('Sandboxed Chromium did not render offline page');
  try{
    await page.goto('http://169.254.169.254/',{timeout:2500});
    throw Error('Browser allowed metadata-IP navigation');
  }catch(err){
    if(String(err.message).includes('Browser allowed'))throw err;
  }
  console.log('PASS real sandboxed Chromium launched with Tor SOCKS proxy and blocked metadata navigation');
  await context.close();
}finally{await browser.close()}
